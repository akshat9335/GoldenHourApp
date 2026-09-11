import { UserLocationUpdate, StoredLocation, HospitalFacility, NearbyIncidentSummary } from "../../types/location";
import { AppError } from "../../utils/AppError";
import { validateCoordinates, fuzzCoordinates } from "../../utils/geoutils";
import { distanceService } from "./distance.service";
import { dataStore } from "../../models/dataStore";
import { firestore } from "../../config/firebase";

export class LocationService {
  /**
   * Validates and updates user's live location.
   * Invalid coordinates or missing GPS are rejected.
   */
  public async updateUserLocation(data: UserLocationUpdate): Promise<StoredLocation> {
    if (!data.userId || typeof data.userId !== "string") {
      throw new AppError(400, "INVALID_INPUT", "Field 'userId' is required.");
    }

    if (!validateCoordinates(data.lat, data.lng)) {
      throw new AppError(
        400,
        "INVALID_COORDINATES",
        `Invalid GPS coordinates: lat must be between -90 and 90, lng between -180 and 180. Received lat: ${data.lat}, lng: ${data.lng}`
      );
    }

    if (data.accuracy !== undefined && (typeof data.accuracy !== "number" || data.accuracy < 0)) {
      throw new AppError(400, "INVALID_ACCURACY", "GPS accuracy must be a non-negative number.");
    }

    const stored: StoredLocation = {
      userId: data.userId,
      lat: Number(data.lat.toFixed(6)),
      lng: Number(data.lng.toFixed(6)),
      accuracy: data.accuracy ? Number(data.accuracy.toFixed(2)) : undefined,
      timestamp: data.timestamp || Date.now(),
      role: data.role || "user",
      updatedAt: new Date().toISOString(),
    };

    // Store in local memory store
    dataStore.locations.set(data.userId, stored);

    // If Firestore is ready, synchronize with 'locations' collection
    if (firestore) {
      try {
        await firestore.collection("locations").doc(data.userId).set(stored, { merge: true });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[location] Failed to sync location to Firestore:", err);
      }
    }

    return stored;
  }

  /**
   * Retrieves hospitals within the specified radius, sorted by distance.
   * Calculates distance and ETA dynamically for each facility.
   */
  public async getNearbyHospitals(lat: number, lng: number, radiusKm = 20): Promise<HospitalFacility[]> {
    if (!validateCoordinates(lat, lng)) {
      throw new AppError(400, "INVALID_COORDINATES", "Invalid query coordinates.");
    }

    const results: HospitalFacility[] = [];

    for (const hosp of dataStore.hospitals.values()) {
      const distance = distanceService.calculateDistance(lat, lng, hosp.lat, hosp.lng);
      if (distance <= radiusKm) {
        const eta = distanceService.calculateETA(distance);
        results.push({
          ...hosp,
          distanceKm: distance,
          etaMinutes: eta,
        });
      }
    }

    // Sort by proximity
    results.sort((a, b) => a.distanceKm - b.distanceKm);
    return results;
  }

  /**
   * Retrieves nearby active emergency incidents within radius.
   * Applies privacy fuzzing to coordinates to prevent exposing exact patient locations.
   */
  public async getNearbyIncidents(lat: number, lng: number, radiusKm = 10): Promise<NearbyIncidentSummary[]> {
    if (!validateCoordinates(lat, lng)) {
      throw new AppError(400, "INVALID_COORDINATES", "Invalid query coordinates.");
    }

    const results: NearbyIncidentSummary[] = [];

    for (const inc of dataStore.incidents.values()) {
      const distance = distanceService.calculateDistance(
        lat,
        lng,
        inc.approximateLocation.lat,
        inc.approximateLocation.lng
      );

      if (distance <= radiusKm) {
        const fuzzed = fuzzCoordinates(inc.approximateLocation.lat, inc.approximateLocation.lng);
        results.push({
          ...inc,
          approximateLocation: fuzzed,
          distanceKm: distance,
        });
      }
    }

    results.sort((a, b) => a.distanceKm - b.distanceKm);
    return results;
  }
}

export const locationService = new LocationService();
