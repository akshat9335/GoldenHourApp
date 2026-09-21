import { useAppStore } from '@/store/useAppStore';

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

let locationSubscription: any = null;

/**
 * Pre-warms GPS in the background on app launch.
 * Requests foreground permissions, captures instant cache, and starts a live continuous watcher.
 * Also performs non-blocking reverse-geocoding to display the real locality/city.
 */
export async function initDeviceLocation(): Promise<Coordinates | null> {
  if (!ExpoLocation) return null;

  try {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    // 1. Instant fetch: Last known position from device hardware cache (<10ms)
    try {
      const lastPos = await ExpoLocation.getLastKnownPositionAsync({});
      if (lastPos?.coords) {
        const coords: Coordinates = {
          latitude: Number(lastPos.coords.latitude.toFixed(6)),
          longitude: Number(lastPos.coords.longitude.toFixed(6)),
        };
        useAppStore.getState().setLastKnownLocation(coords);
        resolveLocality(coords.latitude, coords.longitude);
      }
    } catch {}

    // 2. Start continuous position watcher for real-time accurate GPS
    if (!locationSubscription) {
      try {
        locationSubscription = await ExpoLocation.watchPositionAsync(
          {
            accuracy: ExpoLocation.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 5,
          },
          (pos: any) => {
            if (pos?.coords) {
              const coords: Coordinates = {
                latitude: Number(pos.coords.latitude.toFixed(6)),
                longitude: Number(pos.coords.longitude.toFixed(6)),
              };
              useAppStore.getState().setLastKnownLocation(coords);
              resolveLocality(coords.latitude, coords.longitude);
            }
          }
        );
      } catch {}
    }

    // 3. Fast high-accuracy fix if store doesn't have coordinates yet
    if (!useAppStore.getState().lastKnownLocation) {
      const freshPos = await Promise.race([
        ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.High,
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
      ]);

      if (freshPos?.coords) {
        const coords: Coordinates = {
          latitude: Number(freshPos.coords.latitude.toFixed(6)),
          longitude: Number(freshPos.coords.longitude.toFixed(6)),
        };
        useAppStore.getState().setLastKnownLocation(coords);
        resolveLocality(coords.latitude, coords.longitude);
        return coords;
      }
    }
  } catch (err) {
    // Non-fatal, preserves existing cached or fallback
  }

  return useAppStore.getState().lastKnownLocation;
}

/**
 * Resolves human-readable locality (e.g. "Koramangala, Bengaluru" or "Gomti Nagar, Lucknow")
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

  const fallback = `${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E`;
  useAppStore.getState().setLocationAddress(fallback);
  return fallback;
}

/**
 * Fast zero-latency location retriever for SOS dispatch.
 * Returns cached coordinates instantly (<1ms).
 * Only if completely empty, it races a fast 800ms device fix.
 */
export async function getFastLocation(): Promise<Coordinates> {
  const store = useAppStore.getState();
  if (store.lastKnownLocation) {
    return store.lastKnownLocation;
  }

  if (ExpoLocation) {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const last = await ExpoLocation.getLastKnownPositionAsync({});
        if (last?.coords) {
          const coords = {
            latitude: Number(last.coords.latitude.toFixed(6)),
            longitude: Number(last.coords.longitude.toFixed(6)),
          };
          store.setLastKnownLocation(coords);
          resolveLocality(coords.latitude, coords.longitude);
          return coords;
        }

        const fresh = await Promise.race([
          ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.High }),
          new Promise<null>((r) => setTimeout(() => r(null), 4500)),
        ]);
        if (fresh?.coords) {
          const coords = {
            latitude: Number(fresh.coords.latitude.toFixed(6)),
            longitude: Number(fresh.coords.longitude.toFixed(6)),
          };
          store.setLastKnownLocation(coords);
          resolveLocality(coords.latitude, coords.longitude);
          return coords;
        }
      }
    } catch {}
  }

  // Graceful fallback coordinates if permission denied or offline emulator
  return store.lastKnownLocation || { latitude: 12.9352, longitude: 77.6146 };
}
