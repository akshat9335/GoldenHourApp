import { Coordinates, RouteInfo } from "../../types/location";
import { env, isMapsConfigured } from "../../config/env";
import { distanceService } from "./distance.service";

export class MapsService {
  /**
   * Fetches route between origin and destination.
   * If GOOGLE_MAPS_SERVER_API_KEY is configured, queries Google Maps Directions API.
   * Otherwise falls back gracefully to standardized Haversine road-model estimation.
   */
  public async getRoute(origin: Coordinates, destination: Coordinates): Promise<RouteInfo> {
    if (isMapsConfigured()) {
      try {
        const apiKey = env.googleMapsServerApiKey;
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&departure_time=now&traffic_model=best_guess&key=${apiKey}`;

        const response = await fetch(url);
        const data = (await response.json()) as {
          status: string;
          routes?: Array<{
            summary?: string;
            legs?: Array<{
              distance?: { value: number }; // meters
              duration_in_traffic?: { value: number }; // seconds
              duration?: { value: number }; // seconds
            }>;
          }>;
        };

        if (data.status === "OK" && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const leg = route.legs?.[0];
          if (leg) {
            const distanceMeters = leg.distance?.value || 0;
            const durationSec = leg.duration_in_traffic?.value || leg.duration?.value || 0;

            return {
              origin,
              destination,
              distanceKm: Number((distanceMeters / 1000).toFixed(2)),
              durationMin: Math.max(1, Math.ceil(durationSec / 60)),
              summary: route.summary || "Fastest route via Google Maps",
              provider: "google_maps",
            };
          }
        }
      } catch (err) {
        // Fall back gracefully if external Google Maps request fails
        // eslint-disable-next-line no-console
        console.warn("[maps] Google Maps API request failed, falling back to internal estimation:", err);
      }
    }

    // Fallback estimation using Haversine with 1.35x road curvature factor
    const distanceKm = distanceService.calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    const durationMin = distanceService.calculateETA(distanceKm);

    return {
      origin,
      destination,
      distanceKm,
      durationMin,
      summary: `Estimated emergency corridor (${distanceKm} km)`,
      provider: "standard_haversine",
    };
  }
}

export const mapsService = new MapsService();
