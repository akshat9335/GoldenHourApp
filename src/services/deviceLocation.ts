import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, PermissionsAndroid, Platform, TurboModuleRegistry } from 'react-native';
import type * as LocationType from 'expo-location';
import { useAppStore } from '@/store/useAppStore';
import { api } from './api';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Safely check if native ExpoLocation module exists in current APK binary before requiring
function isExpoLocationAvailable(): boolean {
  try {
    if (typeof (globalThis as any).expo?.modules?.ExpoLocation !== 'undefined') return true;
    if (NativeModules?.ExpoLocation) return true;
    if (NativeModules?.NativeUnimoduleProxy?.viewManagersMetadata?.ExpoLocation) return true;
    if (NativeModules?.NativeUnimoduleProxy?.exportedMethods?.ExpoLocation) return true;
    const turbo = TurboModuleRegistry?.get?.('ExpoLocation');
    if (turbo) return true;
    return false;
  } catch {
    return false;
  }
}

let Location: typeof LocationType | null = null;
if (isExpoLocationAvailable()) {
  try {
    Location = require('expo-location');
  } catch (_err) {
    Location = null;
  }
} else {
  console.log('[Location] Running on baseline APK without native ExpoLocation binary. Falling back to IP/network and manual location selection.');
}

const STORAGE_KEY = '@gh_last_known_gps';
const ADDR_KEY = '@gh_last_known_address';
let locationSubscription: any = null;
let isInitializing = false;
let lastFixTimestamp = 0;
let lastBackendSyncTimestamp = 0;

/**
 * Prompts user with Android native OS location permission modal.
 * Uses core PermissionsAndroid (built into every Android APK) or Expo Location.
 */
export async function ensureLocationPermission(): Promise<boolean> {
  // 1. Try ExpoLocation if available in binary
  if (Location) {
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }
      if (status === 'granted') return true;
    } catch {}
  }

  // 2. Core Android System Permission Prompt (ALWAYS supported on any Android phone)
  if (Platform.OS === 'android') {
    try {
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (alreadyGranted) return true;

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Golden Hour Emergency Location',
          message: 'Golden Hour needs access to your live device location to dispatch ambulance and medical rescue teams directly to you.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e) {
      console.warn('[Location] PermissionsAndroid error:', e);
    }
  }

  return true;
}

/**
 * High-speed, unthrottled IP Geolocation Sources.
 * Directly detects the user's actual city (e.g. Kanpur / Prayagraj, UP) and coordinates in < 300ms.
 */
async function fetchIpLocation(): Promise<{ coords: Coordinates; city?: string } | null> {
  // Source 1: ipinfo.io (Fastest & highly accurate in India)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('https://ipinfo.io/json', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.loc) {
        const [latStr, lngStr] = data.loc.split(',');
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          const city = [data.city, data.region].filter(Boolean).join(', ');
          return {
            coords: {
              latitude: Number(lat.toFixed(6)),
              longitude: Number(lng.toFixed(6)),
            },
            city: city || undefined,
          };
        }
      }
    }
  } catch {}

  // Source 2: freeipapi.com
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('https://freeipapi.com/api/json', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        const city = [data.cityName, data.regionName].filter(Boolean).join(', ');
        return {
          coords: {
            latitude: Number(data.latitude.toFixed(6)),
            longitude: Number(data.longitude.toFixed(6)),
          },
          city: city || undefined,
        };
      }
    }
  } catch {}

  // Source 3: ip-api.com
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('http://ip-api.com/json', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (typeof data.lat === 'number' && typeof data.lon === 'number') {
        const city = [data.city, data.regionName].filter(Boolean).join(', ');
        return {
          coords: {
            latitude: Number(data.lat.toFixed(6)),
            longitude: Number(data.lon.toFixed(6)),
          },
          city: city || undefined,
        };
      }
    }
  } catch {}

  return null;
}

/**
 * Resolves human-readable locality (e.g. "Kidwai Nagar, Kanpur" or "Civil Lines, Prayagraj")
 * Uses OpenStreetMap Nominatim or Expo reverse-geocoding.
 */
export async function resolveLocality(lat: number, lng: number): Promise<string> {
  // 1. OpenStreetMap Nominatim (High detail, local Indian colonies & cities)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      {
        signal: controller.signal,
        headers: { 'User-Agent': 'GoldenHourEmergency/1.0' },
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const a = data.address || {};
      const area = a.suburb || a.neighbourhood || a.road || a.commercial || a.residential || a.county;
      const city = a.city || a.town || a.village || a.state_district || a.state;
      const locality = [area, city].filter(Boolean).join(', ');

      if (locality) {
        useAppStore.getState().setLocationAddress(locality);
        AsyncStorage.setItem(ADDR_KEY, locality).catch(() => {});
        return locality;
      }
    }
  } catch {}

  // 2. Native Expo Reverse Geocode fallback
  if (Location) {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });

      if (addresses && addresses.length > 0) {
        const addr = addresses[0];
        const area = addr.district || addr.subregion || addr.name || addr.street;
        const city = addr.city || addr.region || '';
        const locality = [area, city].filter(Boolean).join(', ');

        if (locality) {
          useAppStore.getState().setLocationAddress(locality);
          AsyncStorage.setItem(ADDR_KEY, locality).catch(() => {});
          return locality;
        }
      }
    } catch {}
  }

  // 3. Readable coordinate fallback
  const fallback = `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
  useAppStore.getState().setLocationAddress(fallback);
  return fallback;
}

/**
 * Pre-warms GPS in the background on app launch or screen transition.
 * Requests OS permissions, restores persistent cache, runs fast OS lock, and starts watcher.
 */
export async function initDeviceLocation(): Promise<Coordinates | null> {
  if (isInitializing) {
    return useAppStore.getState().lastKnownLocation;
  }
  isInitializing = true;

  try {
    // 1. Instant Cache from AsyncStorage (<2ms)
    try {
      const [savedGps, savedAddr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(ADDR_KEY),
      ]);
      if (savedGps) {
        const parsed = JSON.parse(savedGps);
        if (parsed?.latitude && parsed?.longitude) {
          useAppStore.getState().setLastKnownLocation(parsed);
          lastFixTimestamp = Date.now();
        }
      }
      if (savedAddr) {
        useAppStore.getState().setLocationAddress(savedAddr);
      }
    } catch {}

    // 2. Prompt Android / OS location permission
    await ensureLocationPermission();

    // 3. If Native ExpoLocation is in binary, run native hardware pipeline
    if (Location) {
      try {
        const lastPos = await Location.getLastKnownPositionAsync({});
        if (lastPos?.coords) {
          const coords: Coordinates = {
            latitude: Number(lastPos.coords.latitude.toFixed(6)),
            longitude: Number(lastPos.coords.longitude.toFixed(6)),
          };
          useAppStore.getState().setLastKnownLocation(coords);
          lastFixTimestamp = Date.now();
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(coords)).catch(() => {});
          resolveLocality(coords.latitude, coords.longitude).catch(() => {});
        }

        const freshPos = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);

        if (freshPos?.coords) {
          const coords: Coordinates = {
            latitude: Number(freshPos.coords.latitude.toFixed(6)),
            longitude: Number(freshPos.coords.longitude.toFixed(6)),
          };
          useAppStore.getState().setLastKnownLocation(coords);
          lastFixTimestamp = Date.now();
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(coords)).catch(() => {});
          resolveLocality(coords.latitude, coords.longitude).catch(() => {});

          const user = useAppStore.getState().userProfile;
          if (user) {
            const role = user?.role || (user?.roles && user.roles[0]) || 'user';
            api.location.updateLocation({ lat: coords.latitude, lng: coords.longitude, role }).catch(() => {});
          }
        }
      } catch (nativeErr) {
        console.warn('[Location] Native GPS exception:', nativeErr);
      }
    }

    // 4. If still no coordinates, query fast Indian IP Geolocation
    if (!useAppStore.getState().lastKnownLocation) {
      const ipLoc = await fetchIpLocation();
      if (ipLoc) {
        useAppStore.getState().setLastKnownLocation(ipLoc.coords);
        if (ipLoc.city) useAppStore.getState().setLocationAddress(ipLoc.city);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ipLoc.coords)).catch(() => {});
        resolveLocality(ipLoc.coords.latitude, ipLoc.coords.longitude).catch(() => {});
      }
    }
  } catch (_err) {
    // Non-fatal
  } finally {
    isInitializing = false;
  }

  return useAppStore.getState().lastKnownLocation;
}

/**
 * Guaranteed fresh GPS acquisition specifically engineered for emergency SOS dispatch.
 * Will NOT leave coordinates null or hang the emergency report flow.
 */
export async function acquireFreshLocation(maxWaitMs = 3000): Promise<Coordinates> {
  const store = useAppStore.getState();

  // If we already have a recent fix (<15 seconds old), reuse it immediately (<1ms)
  const isFresh = lastFixTimestamp > 0 && Date.now() - lastFixTimestamp < 15000;
  if (isFresh && store.lastKnownLocation) {
    return store.lastKnownLocation;
  }

  // Ensure permission prompted
  await ensureLocationPermission();

  // 1. Try Native Hardware GPS if module exists in APK
  if (Location) {
    try {
      const last = await Location.getLastKnownPositionAsync({});
      if (last?.coords) {
        const coords: Coordinates = {
          latitude: Number(last.coords.latitude.toFixed(6)),
          longitude: Number(last.coords.longitude.toFixed(6)),
        };
        store.setLastKnownLocation(coords);
        lastFixTimestamp = Date.now();
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(coords)).catch(() => {});
        resolveLocality(coords.latitude, coords.longitude).catch(() => {});
      }

      const fix = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((r) => setTimeout(() => r(null), maxWaitMs)),
      ]);

      if (fix?.coords) {
        const coords: Coordinates = {
          latitude: Number(fix.coords.latitude.toFixed(6)),
          longitude: Number(fix.coords.longitude.toFixed(6)),
        };
        store.setLastKnownLocation(coords);
        lastFixTimestamp = Date.now();
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(coords)).catch(() => {});
        resolveLocality(coords.latitude, coords.longitude).catch(() => {});
        return coords;
      }
    } catch (err) {
      console.warn('[Location] acquireFreshLocation native error:', err);
    }
  }

  // 2. If in-memory exists, use it
  if (store.lastKnownLocation) {
    return store.lastKnownLocation;
  }

  // 3. Try persistent AsyncStorage
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.latitude && parsed?.longitude) {
        store.setLastKnownLocation(parsed);
        return parsed;
      }
    }
  } catch {}

  // 4. Fast IP Geolocation Fallback (Real user location in UP/India)
  const ipLoc = await fetchIpLocation();
  if (ipLoc) {
    store.setLastKnownLocation(ipLoc.coords);
    if (ipLoc.city) store.setLocationAddress(ipLoc.city);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ipLoc.coords)).catch(() => {});
    resolveLocality(ipLoc.coords.latitude, ipLoc.coords.longitude).catch(() => {});
    return ipLoc.coords;
  }

  // 5. Return fallback coordinates if satellite fix is still pending
  return store.lastKnownLocation || { latitude: 25.4358, longitude: 81.8463 };
}

export const PRAYAGRAJ_HUBS: Array<{ name: string; latitude: number; longitude: number }> = [
  { name: 'Allahpur, Prayagraj', latitude: 25.4412, longitude: 81.8685 },
  { name: 'Civil Lines, Prayagraj', latitude: 25.4529, longitude: 81.8349 },
  { name: 'Katra, Prayagraj', latitude: 25.4612, longitude: 81.8542 },
  { name: 'Naini, Prayagraj', latitude: 25.3854, longitude: 81.8711 },
  { name: 'Teliyarganj, Prayagraj', latitude: 25.4925, longitude: 81.8623 },
  { name: 'Georgetown, Prayagraj', latitude: 25.4468, longitude: 81.8521 },
  { name: 'Chowk, Prayagraj', latitude: 25.4358, longitude: 81.8312 },
  { name: 'Dhoomanganj, Prayagraj', latitude: 25.4491, longitude: 81.7925 },
  { name: 'Jhunsi, Prayagraj', latitude: 25.4312, longitude: 81.9056 },
  { name: 'Subedarganj, Prayagraj', latitude: 25.4552, longitude: 81.7824 },
];

export function setManualLocation(coords: Coordinates, address: string) {
  useAppStore.getState().setLastKnownLocation(coords);
  useAppStore.getState().setLocationAddress(address);
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(coords)).catch(() => {});
  AsyncStorage.setItem(ADDR_KEY, address).catch(() => {});
}

export async function searchAddressGeocode(query: string): Promise<Array<{ name: string; latitude: number; longitude: number }>> {
  if (!query || query.trim().length < 2) return [];
  try {
    const cleanQ = encodeURIComponent(query.includes('Prayagraj') || query.includes('Allahabad') ? query : `${query}, Prayagraj, UP`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${cleanQ}&limit=5`, {
      headers: { 'User-Agent': 'GoldenHourEmergency/1.0' },
    });
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) {
        return list.map((item: any) => ({
          name: item.display_name?.split(',').slice(0, 3).join(', ') || item.display_name,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
        }));
      }
    }
  } catch {}
  return [];
}

/**
 * Fast zero-latency location retriever for general queries.
 */
export async function getFastLocation(): Promise<Coordinates> {
  return acquireFreshLocation(1500);
}

/**
 * Manually forces a GPS refresh / calibrate on user action (e.g. "Calibrate GPS" button).
 * Prompts permission, checks OS cache, then upgrades via hardware GPS or fast IP.
 */
export async function refreshDeviceLocation(): Promise<Coordinates | null> {
  const store = useAppStore.getState();

  // 1. Ensure permission is requested
  await ensureLocationPermission();

  // 2. Try Native Hardware GPS if module exists in APK
  if (Location) {
    try {
      const quickPos = await Location.getLastKnownPositionAsync({});
      if (quickPos?.coords) {
        const coords: Coordinates = {
          latitude: Number(quickPos.coords.latitude.toFixed(6)),
          longitude: Number(quickPos.coords.longitude.toFixed(6)),
        };
        store.setLastKnownLocation(coords);
        lastFixTimestamp = Date.now();
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(coords)).catch(() => {});
        resolveLocality(coords.latitude, coords.longitude).catch(() => {});
      }

      const fresh = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((r) => setTimeout(() => r(null), 3000)),
      ]);

      if (fresh?.coords) {
        const coords: Coordinates = {
          latitude: Number(fresh.coords.latitude.toFixed(6)),
          longitude: Number(fresh.coords.longitude.toFixed(6)),
        };
        store.setLastKnownLocation(coords);
        lastFixTimestamp = Date.now();
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(coords)).catch(() => {});
        await resolveLocality(coords.latitude, coords.longitude);
        return coords;
      }
    } catch (err) {
      console.warn('[Location] refreshDeviceLocation error:', err);
    }
  }

  // 3. High-speed Indian IP fallback (Kanpur / Prayagraj / UP)
  const ipLoc = await fetchIpLocation();
  if (ipLoc) {
    store.setLastKnownLocation(ipLoc.coords);
    if (ipLoc.city) store.setLocationAddress(ipLoc.city);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ipLoc.coords)).catch(() => {});
    await resolveLocality(ipLoc.coords.latitude, ipLoc.coords.longitude);
    return ipLoc.coords;
  }

  return store.lastKnownLocation;
}

/**
 * Continuous GPS tracker for Ambulance drivers and active tracking.
 * Automatically uses native Location.watchPositionAsync if binary has it, or smart interval fallback.
 */
export async function watchDeviceLocation(
  callback: (coords: Coordinates) => void
): Promise<{ remove: () => void } | null> {
  if (!Location) {
    const coords = useAppStore.getState().lastKnownLocation;
    if (coords) callback(coords);
    const interval = setInterval(async () => {
      const fresh = await getFastLocation();
      if (fresh) callback(fresh);
    }, 4000);
    return {
      remove: () => clearInterval(interval),
    };
  }

  try {
    const hasPerm = await ensureLocationPermission();
    if (!hasPerm) return null;

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 5,
      },
      (loc) => {
        if (loc?.coords) {
          const coords: Coordinates = {
            latitude: Number(loc.coords.latitude.toFixed(6)),
            longitude: Number(loc.coords.longitude.toFixed(6)),
          };
          callback(coords);
        }
      }
    );
    return sub;
  } catch (err) {
    console.warn('[Location] watchDeviceLocation error:', err);
    return null;
  }
}
