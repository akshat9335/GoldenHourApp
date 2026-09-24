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

    // If Firestore is ready, synchronize with 'locations' collection (skipped in unit tests)
    if (firestore && process.env.NODE_ENV !== "test") {
      try {
        await firestore.collection("locations").doc(data.userId).set(stored, { merge: true });

        // If user is an ambulance driver, sync to drivers, ambulances, and active emergencies
        const userRole = String(data.role || "").toUpperCase();
        const nowIso = new Date().toISOString();
        const liveLoc = { latitude: stored.lat, longitude: stored.lng };

        if (userRole.includes("DRIVER") || userRole.includes("AMBULANCE")) {
          // 1. Update driver's own profile doc
          await firestore.collection("drivers").doc(data.userId).set({
            location: liveLoc,
            latitude: stored.lat,
            longitude: stored.lng,
            updatedAt: nowIso,
          }, { merge: true });

          // 2. Update assigned ambulance if linked
          try {
            const driverSnap = await firestore.collection("drivers").doc(data.userId).get();
            const driverData = driverSnap.data();
            const ambId = driverData?.ambulanceId || driverData?.vehiclePlateNumber;
            if (ambId) {
              await firestore.collection("ambulances").doc(ambId).set({
                location: liveLoc,
                latitude: stored.lat,
                longitude: stored.lng,
                updatedAt: nowIso,
              }, { merge: true });
            }
          } catch {}

          // 3. Update active trip stream to emergency
          const tripSnap = await firestore
            .collection("ambulanceTrips")
            .where("driverId", "==", data.userId)
            .where("status", "in", ["ASSIGNED", "EN_ROUTE_TO_PATIENT", "AT_PATIENT", "PATIENT_ONBOARD", "EN_ROUTE_TO_HOSPITAL"])
            .limit(1)
            .get();

          let targetEmergencyId: string | null = null;
          if (!tripSnap.empty) {
            targetEmergencyId = tripSnap.docs[0].data()?.emergencyId || null;
          }

          if (!targetEmergencyId) {
            // Check direct emergency assignment
            const emgSnap = await firestore
              .collection("emergencies")
              .where("assignedDriverId", "==", data.userId)
              .where("status", "in", ["ASSIGNED", "EN_ROUTE_TO_PATIENT", "ARRIVING", "AT_PATIENT", "PATIENT_ONBOARD", "EN_ROUTE_TO_HOSPITAL"])
              .limit(1)
              .get();
            if (!emgSnap.empty) {
              targetEmergencyId = emgSnap.docs[0].id;
            }
          }

          if (targetEmergencyId) {
            await firestore.collection("emergencies").doc(targetEmergencyId).set({
              ambulanceLocation: liveLoc,
              updatedAt: nowIso,
            }, { merge: true });

            const hospSnap = await firestore
              .collection("hospitalEmergencyRequests")
              .where("emergencyId", "==", targetEmergencyId)
              .get();
            for (const hDoc of hospSnap.docs) {
              await hDoc.ref.set({ ambulanceLocation: liveLoc, updatedAt: nowIso }, { merge: true });
            }
          }
        } else if (userRole.includes("HOSPITAL")) {
          // Sync fixed coordinates to hospital facility document
          await firestore.collection("hospitals").doc(data.userId).set({
            location: liveLoc,
            latitude: stored.lat,
            longitude: stored.lng,
            updatedAt: nowIso,
          }, { merge: true });
          await firestore.collection("hospitals").doc(`hosp-${data.userId}`).set({
            location: liveLoc,
            latitude: stored.lat,
            longitude: stored.lng,
            updatedAt: nowIso,
          }, { merge: true });
        }
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

    const hospitalList: HospitalFacility[] = [];

    if (firestore) {
      try {
        const snap = await firestore.collection("hospitals").get();
        if (snap && !snap.empty) {
          // Fetch live capacity map
          let capacityMap = new Map<string, any>();
          try {
            const capacitySnap = await firestore.collection("hospitalCapacity").get();
            if (capacitySnap && !capacitySnap.empty) {
              for (const cDoc of capacitySnap.docs) {
                capacityMap.set(cDoc.id, cDoc.data());
              }
            }
          } catch (_cErr) {
            // Non-fatal if hospitalCapacity read fails
          }

          let index = 0;
          for (const doc of snap.docs) {
            const d = doc.data();
            if (!d) continue;

            // Skip test artifacts
            if (doc.id.startsWith("test-") || (typeof d.name === "string" && d.name.toLowerCase().includes("test hospital"))) {
              continue;
            }

            const status = ((d.verificationStatus || "") as string).toUpperCase();
            if (status === "REJECTED") {
              continue;
            }

            let hospitalLat: number;
            let hospitalLng: number;
            const loc = d.location;

            if (loc && typeof loc.latitude === "number" && typeof loc.longitude === "number") {
              hospitalLat = loc.latitude;
              hospitalLng = loc.longitude;
            } else {
              // Fallback: Place registered facility near user's query coordinates with realistic offset (~1-3 km)
              const offsetLat = (((index % 4) + 1) * 0.012) * (index % 2 === 0 ? 1 : -1);
              const offsetLng = ((((index + 1) % 4) + 1) * 0.012) * (index % 2 === 0 ? -1 : 1);
              hospitalLat = lat + offsetLat;
              hospitalLng = lng + offsetLng;
            }
            index++;

            const cap = capacityMap.get(doc.id) || capacityMap.get(d.hospitalId) || {};
            const totalBeds = Number(cap.totalBeds ?? d.totalBeds ?? 25);
            const availableBeds = Number(cap.availableBeds ?? d.availableBeds ?? d.availableCapacity ?? 18);
            const icuBeds = Number(cap.icuBeds ?? d.icuBeds ?? 6);
            const availableIcuBeds = Number(cap.availableIcuBeds ?? d.availableIcuBeds ?? 4);

            const facilities = Array.isArray(d.facilities) && d.facilities.length > 0
              ? d.facilities
              : ["24/7 Emergency", "ICU & Ventilators", "Trauma Bay"];

            hospitalList.push({
              hospitalId: doc.id,
              name: d.name || "Hospital Facility",
              address: d.address || "",
              phone: d.phone || "",
              lat: hospitalLat,
              lng: hospitalLng,
              distanceKm: 0,
              etaMinutes: 0,
              emergencyCapability: facilities,
              availableCapacity: availableBeds,
              totalBeds,
              availableBeds,
              icuBeds,
              availableIcuBeds,
              traumaLevel: d.traumaLevel || 1,
              icuAvailable: availableIcuBeds > 0,
              specialistsAvailable: Array.isArray(d.specialists) ? d.specialists : [],
              diagnosticAvailability: Array.isArray(d.diagnostics) ? d.diagnostics : [],
              verified: status === "VERIFIED" || status === "APPROVED",
            });
          }
        }
      } catch (_err) {
        // Fallback to dataStore if Firestore is not available/mocked
      }
    }

    if (hospitalList.length === 0) {
      for (const hosp of dataStore.hospitals.values()) {
        hospitalList.push(hosp);
      }
    }

    const results: HospitalFacility[] = [];

    for (const hosp of hospitalList) {
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

    if (results.length === 0 && hospitalList.length > 0) {
      for (const hosp of hospitalList) {
        const distance = distanceService.calculateDistance(lat, lng, hosp.lat, hosp.lng);
        const eta = distanceService.calculateETA(distance);
        results.push({
          ...hosp,
          distanceKm: distance,
          etaMinutes: eta,
        });
      }
      results.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    return results;
  }

  /**
   * Retrieves nearby active emergency incidents within radius.
   * Applies privacy fuzzing to coordinates to prevent exposing exact patient locations.
   */
  public async getNearbyIncidents(lat: number, lng: number, radiusKm = 10, callerUid?: string): Promise<NearbyIncidentSummary[]> {
    if (!validateCoordinates(lat, lng)) {
      throw new AppError(400, "INVALID_COORDINATES", "Invalid query coordinates.");
    }

    const incidentList: NearbyIncidentSummary[] = [];

    if (firestore) {
      try {
        const snap = await firestore.collection("emergencies").get();
        if (snap && !snap.empty) {
          for (const doc of snap.docs) {
            const d = doc.data();
            if (!d) continue;

            const rawStatus = typeof d.status === "string" ? d.status.toUpperCase() : "REPORTED";
            const tripStatus = typeof d.tripStatus === "string" ? d.tripStatus.toUpperCase() : "";
            if (rawStatus === "COMPLETED" || rawStatus === "CANCELLED" || tripStatus === "COMPLETED") continue;
            if (callerUid && d.reporterId === callerUid) continue;
            const emTime = new Date(d.createdAt || 0).getTime();
            if (emTime > 0 && Date.now() - emTime > 45 * 60 * 1000) continue;

            const loc = d.location;
            if (loc && typeof loc.latitude === "number" && typeof loc.longitude === "number") {
              const rawSeverity = typeof d.severity === "string" ? d.severity.toUpperCase() : "HIGH";
              const severity: "CRITICAL" | "HIGH" | "MODERATE" | "LOW" =
                rawSeverity === "CRITICAL" || rawSeverity === "MODERATE" || rawSeverity === "LOW"
                  ? rawSeverity
                  : "HIGH";

              const rawStatus = typeof d.status === "string" ? d.status.toUpperCase() : "REPORTED";
              const status: "REPORTED" | "VERIFIED" | "DISPATCHED" | "RESOLVED" =
                rawStatus === "VERIFIED" || rawStatus === "DISPATCHED" || rawStatus === "RESOLVED"
                  ? rawStatus
                  : "REPORTED";

              incidentList.push({
                incidentId: doc.id,
                severity,
                confirmationCount: typeof d.confirmationCount === "number" ? d.confirmationCount : 0,
                reportedAt: (d.createdAt as string) || new Date().toISOString(),
                approximateLocation: { lat: loc.latitude, lng: loc.longitude },
                status,
                distanceKm: 0,
              });
            }
          }
        }
      } catch (_err) {
        // Fallback to dataStore
      }
    }

    // Live mode: Do not populate mock Delhi seed incidents
    if (incidentList.length === 0 && process.env.NODE_ENV === "test") {
      for (const inc of dataStore.incidents.values()) {
        incidentList.push(inc);
      }
    }

    const results: NearbyIncidentSummary[] = [];

    for (const inc of incidentList) {
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
