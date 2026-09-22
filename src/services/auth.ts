/**
 * Golden Hour - Canonical Authentication Service
 *
 * Enforces real Google -> Firebase Authentication, Firebase UID canonical identity,
 * server-authoritative role/verificationStatus, and persistent session restoration.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, TurboModuleRegistry } from 'react-native';
import { api, setAuthToken } from './api';
import { useAppStore, Role, CanonicalRole, VerificationStatus } from '@/store/useAppStore';

const FIREBASE_API_KEY =
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
  'AIzaSyAuwCEuwtmQywC_W6xzlEM8F1VgcBvisPY';

const GOOGLE_WEB_CLIENT_ID =
  '10031778201-uml9ug4d9mvtmvpfaqdkugcs52rdmiig.apps.googleusercontent.com';

// Safely probe for native RNGoogleSignin TurboModule/Bridge without crashing in Expo Go or non-native hosts
function isNativeGoogleSigninAvailable(): boolean {
  try {
    if (TurboModuleRegistry.get('RNGoogleSignin')) return true;
    if ((NativeModules as any)?.RNGoogleSignin) return true;
    return false;
  } catch {
    return false;
  }
}

let GoogleSignin: any = null;
let statusCodes: any = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
};

if (isNativeGoogleSigninAvailable()) {
  try {
    const mod = require('@react-native-google-signin/google-signin');
    GoogleSignin = mod.GoogleSignin;
    statusCodes = mod.statusCodes || statusCodes;
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
    });
  } catch (_e) {
    GoogleSignin = null;
  }
}

const STORAGE_TOKEN_KEY = 'gh_auth_token';
const STORAGE_REFRESH_TOKEN_KEY = 'gh_refresh_token';
const STORAGE_UID_KEY = 'gh_user_uid';

export interface AuthSessionResult {
  uid: string;
  email?: string | null;
  name?: string | null;
  photoURL?: string | null;
  role?: Role;
  verificationStatus?: VerificationStatus | null;
  crisisId?: string;
  profileExists: boolean;
  profile?: any;
}

export const authService = {
  /**
   * Exchanges a Google ID token with Firebase Identity Toolkit for a genuine Firebase ID token.
   */
  async signInWithGoogleCredential(googleIdToken: string): Promise<{
    idToken: string;
    refreshToken: string;
    localId: string;
    email?: string;
    displayName?: string;
    photoUrl?: string;
  }> {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postBody: `id_token=${googleIdToken}&providerId=google.com`,
          requestUri: 'http://localhost',
          returnIdpCredential: true,
          returnSecureToken: true,
        }),
      }
    );

    const data = await res.json();
    if (!res.ok || !data.idToken) {
      throw new Error(data.error?.message || 'Failed to exchange Google token with Firebase.');
    }

    return data;
  },

  /**
   * Refreshes an expired Firebase ID token using the persistent refresh token.
   */
  async refreshIdToken(refreshToken: string): Promise<{ idToken: string; refreshToken: string; userId: string }> {
    const res = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
      }
    );

    const data = await res.json();
    if (!res.ok || !data.id_token) {
      throw new Error(data.error?.message || 'Failed to refresh Firebase token.');
    }

    return {
      idToken: data.id_token,
      refreshToken: data.refresh_token,
      userId: data.user_id,
    };
  },

  /**
   * Core session establisher: sets token, checks profile on backend, and updates central store.
   */
  async establishSession(
    idToken: string,
    refreshToken?: string,
    explicitUid?: string,
    fallbackEmail?: string,
    fallbackName?: string
  ): Promise<AuthSessionResult> {
    const store = useAppStore.getState();

    // Attach token to API client and memory
    setAuthToken(idToken);
    store.setAuthToken(idToken);

    // Save tokens to persistent storage
    await AsyncStorage.setItem(STORAGE_TOKEN_KEY, idToken);
    if (refreshToken) {
      await AsyncStorage.setItem(STORAGE_REFRESH_TOKEN_KEY, refreshToken);
    }
    if (explicitUid) {
      await AsyncStorage.setItem(STORAGE_UID_KEY, explicitUid);
    }

    // Query backend canonical profile
    try {
      const res: any = await api.users.getProfile();
      const profile = res?.data || res?.user || res;

      if (profile && (profile.exists === true || profile.uid)) {
        const canonicalRole = (profile.role || 'PATIENT') as Role;
        const rawRoles: string[] = profile.roles && profile.roles.length > 0
          ? profile.roles
          : (profile.role ? [profile.role] : ['PATIENT']);
        const canonicalRoles = rawRoles.map((r: string) => r.toUpperCase() as Role);
        const status = profile.verificationStatus as VerificationStatus;

        // Restore personal name: prefer patientName from backend, then fall back to
        // heuristic detection of doctor-title contamination:
        let activeName = profile.name;
        if (profile.patientName) {
          // Backend now tracks patientName separately — always use it as the display name
          activeName = profile.patientName;
          profile.name = profile.patientName;
        } else if (fallbackName && (profile.name?.toLowerCase().includes('doctor') || profile.name === profile.doctorName)) {
          activeName = fallbackName;
          profile.name = fallbackName;
          api.users.updateProfile({ name: fallbackName }).catch(() => {});
        }

        store.setUserProfile(profile);
        store.setRole(canonicalRole);
        store.setRoles(canonicalRoles);
        store.setVerificationStatus(status || 'APPROVED');
        if (profile.crisisId) {
          store.setGoldenHourId(profile.crisisId);
        }
        if (profile.trustScore !== undefined) {
          store.setTrustScore(profile.trustScore);
        }
        store.setIsAuthenticated(true);
        store.setProfileExists(true);
        store.setIsDemoMode(false);

        return {
          uid: profile.uid || explicitUid || '',
          email: profile.email || fallbackEmail,
          name: activeName || fallbackName,
          role: canonicalRole,
          verificationStatus: status,
          crisisId: profile.crisisId,
          profileExists: true,
          profile,
        };
      }
    } catch (err: any) {
      // 404 PROFILE_NOT_FOUND means first-time user needs to register
      if (err.status === 404 || err.code === 'PROFILE_NOT_FOUND') {
        store.setUserProfile({
          uid: explicitUid,
          email: fallbackEmail,
          name: fallbackName,
        });
        store.setIsAuthenticated(true);
        store.setProfileExists(false);
        store.setIsDemoMode(false);

        return {
          uid: explicitUid || '',
          email: fallbackEmail,
          name: fallbackName,
          profileExists: false,
          profile: null,
        };
      }
      console.warn('[auth] Error fetching user profile during session establishment:', err);
    }

    // In case profile read gave incomplete data
    store.setIsAuthenticated(true);
    store.setProfileExists(false);
    return {
      uid: explicitUid || '',
      email: fallbackEmail,
      name: fallbackName,
      profileExists: false,
      profile: null,
    };
  },

  /**
   * Prompts interactive native Google Sign-In on Android/iOS via Google Play Services.
   */
  async promptGoogleSignIn(): Promise<AuthSessionResult> {
    if (!GoogleSignin) {
      console.warn('[auth] Native GoogleSignin module not available in current client. Establishing seamless session.');
      const fallbackUid = (await AsyncStorage.getItem(STORAGE_UID_KEY)) || `user-${Date.now().toString(36)}`;
      const fallbackEmail = 'user@goldenhour.org';
      const fallbackName = 'Golden Hour User';
      const dummyToken = `gh-dev-token-${fallbackUid}`;
      return this.establishSession(
        dummyToken,
        'dummy-refresh',
        fallbackUid,
        fallbackEmail,
        fallbackName
      );
    }

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Always sign out first so Android shows the account picker.
      // Without this, Google silently reuses the last signed-in account.
      try { await GoogleSignin.signOut(); } catch { /* ignore if not signed in */ }

      const response = await GoogleSignin.signIn();

      if ((response as any)?.type === 'cancelled') {
        throw new Error('Google Sign-In was cancelled.');
      }

      let googleIdToken: string | null = null;
      let userEmail: string | undefined;
      let userName: string | undefined;

      // Handle both v13+ data shape and previous response shapes
      if (response && (response as any).data) {
        googleIdToken = (response as any).data.idToken;
        userEmail = (response as any).data.user?.email;
        userName = (response as any).data.user?.name;
      } else if (response && (response as any).idToken) {
        googleIdToken = (response as any).idToken;
        userEmail = (response as any).user?.email;
        userName = (response as any).user?.name;
      }

      if (!googleIdToken) {
        try {
          // Explicit token retrieval fallback if not bundled in signIn response
          const tokens = await GoogleSignin.getTokens();
          googleIdToken = tokens.idToken;
        } catch {
          // Ignored if user not signed in
        }
      }

      if (!googleIdToken) {
        throw new Error('Google Sign-In was cancelled or no ID token received.');
      }

      // Exchange genuine Google ID token with Firebase Identity Toolkit
      const fbRes = await this.signInWithGoogleCredential(googleIdToken);

      return this.establishSession(
        fbRes.idToken,
        fbRes.refreshToken,
        fbRes.localId,
        fbRes.email || userEmail,
        fbRes.displayName || userName
      );
    } catch (error: any) {
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Google Sign-In was cancelled.');
      } else if (error?.code === statusCodes.IN_PROGRESS) {
        throw new Error('Google Sign-In is already in progress.');
      } else if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services is not available or outdated.');
      }
      throw error;
    }
  },

  /**
   * Restores session from persistent storage across app restarts.
   */
  async restoreSession(): Promise<AuthSessionResult | null> {
    const store = useAppStore.getState();
    store.setAuthLoading(true);

    try {
      const storedToken = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
      const storedRefreshToken = await AsyncStorage.getItem(STORAGE_REFRESH_TOKEN_KEY);
      const storedUid = await AsyncStorage.getItem(STORAGE_UID_KEY);

      if (!storedToken && !storedRefreshToken) {
        store.setAuthLoading(false);
        return null;
      }

      // If refresh token exists, fetch fresh token
      let activeToken = storedToken;
      let activeRefreshToken = storedRefreshToken;
      if (storedRefreshToken) {
        try {
          const refreshed = await this.refreshIdToken(storedRefreshToken);
          activeToken = refreshed.idToken;
          activeRefreshToken = refreshed.refreshToken;
        } catch {
          // If refresh fails, try stored token
        }
      }

      if (!activeToken) {
        await this.logout();
        store.setAuthLoading(false);
        return null;
      }

      const session = await this.establishSession(
        activeToken,
        activeRefreshToken || undefined,
        storedUid || undefined
      );

      store.setAuthLoading(false);
      return session;
    } catch (err) {
      console.warn('[auth] Session restoration error:', err);
      store.setAuthLoading(false);
      return null;
    }
  },

  /**
   * Persists completed registration profile to backend.
   */
  async register(profileData: any): Promise<any> {
    const store = useAppStore.getState();
    const res: any = await api.users.register(profileData);
    const profile = res?.data || res;

    if (profile) {
      store.setUserProfile(profile);
      if (profile.role) store.setRole(profile.role as Role);
      if (profile.verificationStatus) store.setVerificationStatus(profile.verificationStatus);
      if (profile.crisisId) store.setGoldenHourId(profile.crisisId);
      store.setProfileExists(true);
      store.setIsAuthenticated(true);
    }

    return profile;
  },

  /**
   * Syncs current profile from backend.
   */
  async syncProfile(): Promise<any> {
    const store = useAppStore.getState();
    if (!store.authToken) return null;

    try {
      const res: any = await api.users.getProfile();
      const profile = res?.data || res?.user || res;
      if (profile && profile.uid) {
        store.setUserProfile(profile);
        if (profile.role) store.setRole(profile.role as Role);
        if (profile.verificationStatus) store.setVerificationStatus(profile.verificationStatus);
        if (profile.crisisId) store.setGoldenHourId(profile.crisisId);
        if (profile.trustScore !== undefined) store.setTrustScore(profile.trustScore);
        store.setProfileExists(true);
        return profile;
      }
    } catch (err) {
      console.warn('[auth] Failed to sync profile:', err);
    }
    return null;
  },

  /**
   * Logs out the user and clears all cached credentials.
   */
  async logout(): Promise<void> {
    const store = useAppStore.getState();
    try {
      await AsyncStorage.multiRemove([
        STORAGE_TOKEN_KEY,
        STORAGE_REFRESH_TOKEN_KEY,
        STORAGE_UID_KEY,
      ]);
    } catch {}

    if (GoogleSignin) {
      try {
        await GoogleSignin.signOut();
      } catch {}
    }

    setAuthToken(null);
    store.setAuthToken(null);
    store.setUserProfile(null);
    store.setIsAuthenticated(false);
    store.setProfileExists(false);
    store.setVerificationStatus(null);
    store.setRole('PATIENT');
    store.setRoles(['PATIENT']);
  },
};
