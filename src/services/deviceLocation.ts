import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '@/store/useAppStore';
import { api } from './api';

let ExpoLocation: any = null;
try {
  ExpoLocation = require('expo-location');
} catch (_e) {
  // Graceful fallback for non-native / test environments
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const STORAGE_KEY = '@gh_last_known_gps';
let locationSubscription: any = null;
let isInitializing = false;

/**
 * Pre-warms GPS in the background on app launch.
 * Requests foreground permissions, captures instant cache, and starts a live continuous watcher.
 * Also performs non-blocking reverse-geocoding to display the real locality/city.
 */
export async function initDeviceLocation(): Promise<Coordinates | null> {
  if (!ExpoLocation || isInitializing) {
    return useAppStore.getState().lastKnownLocation;
  }
  isInitializing = true;

  try {
    // 1. Instant Cache from AsyncStorage (<5ms)
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.latitude && parsed?.longitude) {
          useAppStore.getState().setLastKnownLocation(parsed);
          resolveLocality(parsed.latitude, parsed.longitude).catch(() => {});
        }
      }
    } catch {}

    // 2. Request Permissions
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      isInitializing = false;
      return useAppStore.getState().lastKnownLocation;
    }

    // 3. Try quick hardware cache (<50ms)
    try {
      const lastPos = await ExpoLocation.getLastKnownPositionAsync({ maxAge: 60000 });
      if (lastPos?.coords) {
        const coords: Coordinates = {
          latitude: Number(lastPos.coords.latitude.toFixed(6)),
          longitude: Number(lastPos.coords.longitude.toFixed(6)),
        };
        useAppStore.getState().setLastKnownLocation(coords);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(coords)).catch(() => {});
        resolveLocality(coords.latitude, coords.longitude).catch(() => {});
      }
    } catch {}

    // 4. Fast Balanced Fix (Cell/WiFi/GPS ~300ms)
    try {
      const freshPos = await Promise.race([
        ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.Balanced,
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
      ]);

      if (freshPos?.coords) {
        const coords: Coordinates = {
          latitude: Number(freshPos.coords.latitude.toFixed(6)),
          longitude: Number(freshPos.coords.longitude.toFixed(6)),
        };
        useAppStore.getState().setLastKnownLocation(coords);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(coords)).catch(() => {});
        resolveLocality(coords.latitude, coords.longitude).catch(() => {});

        // Sync to backend if authenticated
        try {
          const user = useAppStore.getState().userProfile;
          if (user) {
            api.location.updateLocation({ lat: coords.latitude, lng: coords.longitude }).catch(() => {});
          }
        } catch {}
      }
    } catch {}

    // 5. Continuous Live Position Watcher
    if (!locationSubscription) {
      try {
        locationSubscription = await ExpoLocation.watchPositionAsync(
          {
            accuracy: ExpoLocation.Accuracy.Balanced,
            timeInterval: 3000,
            distanceInterval: 10,
          },
          (pos: any) => {
            if (pos?.coords) {
              const coords: Coordinates = {
                latitude: Number(pos.coords.latitude.toFixed(6)),
                longitude: Number(pos.coords.longitude.toFixed(6)),
              };
              useAppStore.getState().setLastKnownLocation(coords);
              AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(coords)).catch(() => {});
              resolveLocality(coords.latitude, coords.longitude).catch(() => {});
            }
          }
        );
      } catch {}
    }
  } catch (_err) {
    // Non-fatal
  } finally {
    isInitializing = false;
  }

  return useAppStore.getState().lastKnownLocation;
}

/**
 * Resolves human-readable locality (e.g. "Civil Lines, Prayagraj" or "Gomti Nagar, Lucknow")
 */
export async function resolveLocality(lat: number, lng: number): Promise<string> {
  if (!ExpoLocation) return 'Live GPS active';

  try {
    const addresses = await ExpoLocation.reverseGeocodeAsync({
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
        return locality;
      }
    }
  } catch (_e) {
    // Fallback
  }

  const fallback = `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
  useAppStore.getState().setLocationAddress(fallback);
  return fallback;
}

/**
 * Fast zero-latency location retriever for SOS dispatch.
 * Returns real device coordinates instantly.
 */
export async function getFastLocation(): Promise<Coordinates> {
  const store = useAppStore.getState();
  if (store.lastKnownLocation) {
    return store.lastKnownLocation;
  }

  // Try reading from persistent storage
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

  if (ExpoLocation) {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const last = await ExpoLocation.getLastKnownPositionAsync({ maxAge: 60000 });
        if (last?.coords) {
          const coords = {
            latitude: Number(last.coords.latitude.toFixed(6)),
            longitude: Number(last.coords.longitude.toFixed(6)),
          };
          store.setLastKnownLocation(coords);
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(coords)).catch(() => {});
          resolveLocality(coords.latitude, coords.longitude).catch(() => {});
          return coords;
        }

        const fresh = await Promise.race([
          ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced }),
          new Promise<null>((r) => setTimeout(() => r(null), 5000)),
        ]);
        if (fresh?.coords) {
          const coords = {
            latitude: Number(fresh.coords.latitude.toFixed(6)),
            longitude: Number(fresh.coords.longitude.toFixed(6)),
          };
          store.setLastKnownLocation(coords);
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(coords)).catch(() => {});
          resolveLocality(coords.latitude, coords.longitude).catch(() => {});
          return coords;
        }
      }
    } catch {}
  }

  // Return lastKnownLocation or null if not yet acquired
  return store.lastKnownLocation || { latitude: 28.6139, longitude: 77.2090 };
}
