import { firestore } from "../../config/firebase";
import { AppError } from "../../utils/AppError";
import { emergencyAlertService } from "../notifications/emergencyAlert.service";
import { locationService } from "../location/location.service";
import { analyzeEmergency } from "../ai/aiService";

const USERS_COLLECTION = "users";
const EMERGENCIES_COLLECTION = "emergencies";
const HOSPITAL_REQUESTS_COLLECTION = "hospitalEmergencyRequests";

export type EmergencyStatus =
  | "REPORTED"
  | "CONFIRMING"
  | "HOSPITAL_SEARCH"
  | "HOSPITAL_ACCEPTED"
  | "AMBULANCE_ASSIGNED"
  | "EN_ROUTE"
  | "EN_ROUTE_TO_PATIENT"
  | "ARRIVING"
  | "AT_PATIENT"
  | "PATIENT_ONBOARD"
  | "EN_ROUTE_TO_HOSPITAL"
  | "AT_HOSPITAL"
  | "PATIENT_ARRIVED"
  | "TREATMENT"
  | "COMPLETED";

export interface EmergencyLocation {
  latitude: number;
  longitude: number;
}

export interface CreateEmergencyInput {
  incidentType: string;
  description?: string;
  voiceTranscript?: string;
  imageUrl?: string;
  location: EmergencyLocation;
  locationAddress?: string | null;
  severity?: string | null;
  aiResult?: unknown;
}

export interface Emergency {
  id: string;
  reporterId: string;
  crisisId: string;
  incidentType: string;
  description?: string | null;
  voiceTranscript?: string | null;
  imageUrl?: string | null;
  location: EmergencyLocation;
  locationAddress?: string | null;
  status: EmergencyStatus;
  severity?: string | null;
  aiResult?: unknown;
  confirmationCount: number;
  assignedDriverId?: string | null;
  assignedAmbulanceId?: string | null;
  assignedHospitalId?: string | null;
  assignedStaffIds?: string[];
  ambulanceLocation?: EmergencyLocation | null;
  assignedHospitalLocation?: EmergencyLocation | null;
  assignedHospitalName?: string | null;
  assignedHospitalPhone?: string | null;
  assignedDriverName?: string | null;
  assignedDriverPhone?: string | null;
  patientName?: string | null;
  patientPhone?: string | null;
  dismissedBy?: string[];
  hospitalCandidates?: any[];
  alertedCandidateIndex?: number;
  alertedHospitalId?: string | null;
  alertedHospitalName?: string | null;
  alertedAt?: string | null;
  matchScore?: number;
  triageSummary?: string | null;
  escalationMessage?: string | null;
  fallbackMode?: string | null;
  createdAt: unknown;
  updatedAt: unknown;
}

function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function computeHospitalMatchScore(
  hosp: { name?: string; facilities?: string[]; availableBeds?: number; availableIcuBeds?: number; totalBeds?: number },
  distanceKm: number,
  reqCaps: string[],
  specialtyNeeded: string,
  severity: string = "MEDIUM",
  hasEquippedFacilityNearby: boolean = true,
): { score: number; matchReason: string; isStabilizationOnly: boolean } {
  let score = 0;
  const facilities = (hosp.facilities || []).map((f) => String(f).toLowerCase());
  const hospName = String(hosp.name || "").toLowerCase();

  const hasIcu = (hosp.availableIcuBeds ?? 0) > 0 || facilities.some((f) => f.includes("icu"));
  const hasCathLab = facilities.some((f) => f.includes("cath") || f.includes("cardiac") || hospName.includes("heart") || hospName.includes("medanta"));
  const hasTrauma = facilities.some((f) => f.includes("trauma") || f.includes("ortho") || hospName.includes("trauma") || hospName.includes("srn"));

  let capabilityMatch = 30; // base emergency capability
  let isStabilizationOnly = false;
  let matchReason = "General Emergency Services";

  if (severity === "CRITICAL" || severity === "HIGH") {
    if (specialtyNeeded === "CARDIOLOGY") {
      if (hasCathLab) {
        capabilityMatch = 50;
        matchReason = "Equipped Cardiac & Cath Lab Resuscitation Center";
      } else if (hasIcu) {
        capabilityMatch = 35;
        matchReason = "ICU Resuscitation Bed Available";
      } else {
        isStabilizationOnly = true;
        if (hasEquippedFacilityNearby) {
          capabilityMatch = 5;
          matchReason = "Bypassed: Lacks Cardiac/Cath Lab (Equipped Center Nearby)";
        } else {
          capabilityMatch = 25;
          matchReason = "Primary Stabilization Center (Airway & Anti-Shock Prepped)";
        }
      }
    } else if (specialtyNeeded === "TRAUMA_ORTHO") {
      if (hasTrauma) {
        capabilityMatch = 50;
        matchReason = "Equipped Level-1 Trauma & Orthopedic Center";
      } else if (hasIcu) {
        capabilityMatch = 35;
        matchReason = "ICU Trauma Resuscitation Available";
      } else {
        isStabilizationOnly = true;
        if (hasEquippedFacilityNearby) {
          capabilityMatch = 5;
          matchReason = "Bypassed: Lacks Major Trauma Unit (Equipped Center Nearby)";
        } else {
          capabilityMatch = 25;
          matchReason = "Primary Stabilization Center (Hemorrhage & Fracture Control)";
        }
      }
    } else if (reqCaps.includes("ICU") || reqCaps.includes("ICU_STANDBY")) {
      if (hasIcu) {
        capabilityMatch = 45;
        matchReason = "Critical Care / ICU Standby Available";
      } else {
        isStabilizationOnly = true;
        if (hasEquippedFacilityNearby) {
          capabilityMatch = 10;
          matchReason = "Bypassed: Zero ICU Beds Available (Equipped Center Nearby)";
        } else {
          capabilityMatch = 25;
          matchReason = "Primary Stabilization Center (Oxygen & Vitals Monitoring)";
        }
      }
    }
  } else {
    // Non-critical / minor (Dog bite, minor laceration, fever, etc.)
    capabilityMatch = 45;
    matchReason = reqCaps.includes("RABIES_VACCINE")
      ? "Outpatient Wound Care & Anti-Rabies Vaccine Ready"
      : "Standard Emergency Outpatient & Minor Care";
  }

  score += Math.min(50, capabilityMatch);

  // 2. Bed Availability (0 to 30 pts)
  const availBeds = hosp.availableBeds ?? 14;
  if (availBeds > 10) score += 30;
  else if (availBeds > 3) score += 20;
  else if (availBeds > 0) score += 10;

  // 3. Proximity / Shortest ETA (0 to 20 pts)
  const proximityPts = Math.max(0, Math.round(20 - distanceKm * 2));
  score += Math.min(20, proximityPts);

  return { score, matchReason, isStabilizationOnly };
}

function getFirestore() {
  if (!firestore) {
    throw new AppError(
      500,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase Admin is not configured on this server.",
    );
  }

  return firestore;
}

function validateLocation(location: unknown): location is EmergencyLocation {
  if (!location || typeof location !== "object") {
    return false;
  }

  const value = location as Record<string, unknown>;

  return (
    typeof value.latitude === "number" &&
    typeof value.longitude === "number" &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    value.longitude >= -180 &&
    value.longitude <= 180
  );
}

export async function createEmergency(
  reporterId: string,
  input: CreateEmergencyInput,
): Promise<Emergency> {
  const db = getFirestore();

  if (!input.incidentType?.trim()) {
    throw new AppError(
      400,
      "INVALID_INCIDENT_TYPE",
      "Incident type is required.",
    );
  }

  if (!validateLocation(input.location)) {
    throw new AppError(
      400,
      "INVALID_LOCATION",
      "A valid latitude and longitude are required.",
    );
  }

  const userRef = db.collection(USERS_COLLECTION).doc(reporterId);
  const userSnapshot = await userRef.get();

  if (!userSnapshot.exists) {
    throw new AppError(
      404,
      "USER_NOT_FOUND",
      "Reporter user profile was not found.",
    );
  }

  const user = userSnapshot.data() as {
    crisisId?: string;
    name?: string;
    patientName?: string;
    phone?: string;
  };

  if (!user.crisisId) {
    throw new AppError(
      400,
      "CRISIS_ID_NOT_FOUND",
      "Reporter does not have a Crisis ID.",
    );
  }

  const emergencyRef = db
    .collection(EMERGENCIES_COLLECTION)
    .doc();

  const now = new Date().toISOString();

  let triageResult = input.aiResult as any;
  if (!triageResult) {
    try {
      const rawText = input.description || input.voiceTranscript || "";
      const symptomsList = rawText.trim() ? [rawText.trim()] : [];
      triageResult = await analyzeEmergency({
        incidentType: input.incidentType,
        symptoms: symptomsList,
        description: input.description || "",
      });
    } catch (e) {
      console.warn("[createEmergency] analyzeEmergency fallback:", e);
    }
  }

  const determinedSeverity = (input.severity ? input.severity.trim().toUpperCase() : triageResult?.severity) || "CRITICAL";

  const emergency: Emergency = {
    id: emergencyRef.id,
    reporterId,
    crisisId: user.crisisId,
    incidentType: input.incidentType.trim(),
    description: input.description?.trim() || null,
    voiceTranscript: input.voiceTranscript?.trim() || null,
    imageUrl: input.imageUrl?.trim() || null,
    location: input.location,
    locationAddress: input.locationAddress?.trim() || null,
    status: "REPORTED",
    severity: determinedSeverity,
    aiResult: triageResult || null,
    confirmationCount: 0,
    patientName: user.name || user.patientName || "Emergency Patient",
    patientPhone: user.phone || null,
    createdAt: now,
    updatedAt: now,
  };

  await emergencyRef.set(emergency);

  // Auto-bridge emergency using Smart Multi-Factor Hospital Capability Ranking
  if (process.env.NODE_ENV !== "test") {
    try {
      const reqCaps = ((emergency.aiResult as any)?.requiredCapabilities as string[]) || ["EMERGENCY_ROOM", "TRAUMA_BAY"];
      const specialtyNeeded = ((emergency.aiResult as any)?.specialtyNeeded as string) || "GENERAL";

      const candidateList: any[] = [];
      const allHospitalsSnap = await db.collection("hospitals").get();

      // Pre-check if any equipped hospital is within Golden Hour corridor (< 25km)
      let hasEquippedFacilityNearby = false;
      if (allHospitalsSnap && !allHospitalsSnap.empty) {
        for (const hDoc of allHospitalsSnap.docs) {
          if (hDoc.id.startsWith("test-")) continue;
          const hData = hDoc.data();
          const hLoc = hData.location || { latitude: hData.latitude || 25.4538, longitude: hData.longitude || 81.854 };
          const dist = calculateHaversineKm(emergency.location.latitude, emergency.location.longitude, hLoc.latitude, hLoc.longitude);
          const facilities = (hData.facilities || []).map((f: any) => String(f).toLowerCase());
          const hospName = String(hData.name || "").toLowerCase();
          const isEquipped = (hData.availableIcuBeds ?? 0) > 0 || facilities.some((f: string) => f.includes("icu") || f.includes("cath") || f.includes("trauma")) || hospName.includes("medanta") || hospName.includes("srn");
          if (dist <= 25 && isEquipped) {
            hasEquippedFacilityNearby = true;
            break;
          }
        }
      }

      if (allHospitalsSnap && !allHospitalsSnap.empty) {
        for (const hDoc of allHospitalsSnap.docs) {
          if (hDoc.id.startsWith("test-")) continue;
          const hData = hDoc.data();
          const vStatus = String(hData.verificationStatus || "").toUpperCase();
          if (vStatus === "REJECTED") continue;

          const hLoc = hData.location || {
            latitude: hData.latitude || 25.4538,
            longitude: hData.longitude || 81.854,
          };
          const dist = calculateHaversineKm(
            emergency.location.latitude,
            emergency.location.longitude,
            hLoc.latitude,
            hLoc.longitude,
          );
          const eta = Math.max(4, Math.round(dist * 2.5));

          const match = computeHospitalMatchScore(
            hData,
            dist,
            reqCaps,
            specialtyNeeded,
            emergency.severity || "MEDIUM",
            hasEquippedFacilityNearby,
          );

          candidateList.push({
            hospitalId: hDoc.id,
            name: hData.name || "Hospital Emergency Wing",
            phone: hData.phone || hData.emergencyContact || "+91-532-2460108",
            location: hLoc,
            distanceKm: Number(dist.toFixed(1)),
            etaMinutes: eta,
            score: match.score,
            matchReason: match.matchReason,
            isStabilizationOnly: match.isStabilizationOnly,
            availableBeds: Number(hData.availableBeds ?? 14),
            availableIcuBeds: Number(hData.availableIcuBeds ?? 5),
          });
        }
      }

      // If Prayagraj hospitals not yet initialized in Firestore, guarantee high-priority emergency ER candidates
      if (candidateList.length === 0) {
        candidateList.push(
          {
            hospitalId: "hosp-medanta-prayagraj",
            name: "Medanta Hospital Prayagraj",
            phone: "+91-532-2460108",
            location: { latitude: 25.4538, longitude: 81.854 },
            distanceKm: 2.2,
            etaMinutes: 6,
            score: 95,
            availableBeds: 18,
            availableIcuBeds: 5,
          },
          {
            hospitalId: "hosp-srn-prayagraj",
            name: "Swaroop Rani Nehru (SRN) Hospital Prayagraj",
            phone: "+91-532-2256050",
            location: { latitude: 25.4484, longitude: 81.846 },
            distanceKm: 3.1,
            etaMinutes: 8,
            score: 88,
            availableBeds: 35,
            availableIcuBeds: 8,
          },
        );
      }

      // Sort candidate hospitals by score descending
      candidateList.sort((a, b) => b.score - a.score);

      // Rank candidate hospitals
      const rankedCandidates = candidateList.map((c, idx) => ({
        ...c,
        rank: idx + 1,
        status: idx === 0 ? ("ALERTED" as const) : ("QUEUED_STANDBY" as const),
        alertedAt: idx === 0 ? now : null,
      }));

      const topRank = rankedCandidates[0];
      const isRuralStabilization = topRank.isStabilizationOnly && !hasEquippedFacilityNearby;
      const tertiaryBackup = rankedCandidates.find((c) => !c.isStabilizationOnly && c.hospitalId !== topRank.hospitalId);

      const ruralEscalationNotice = isRuralStabilization && tertiaryBackup
        ? `Life-Support Bridge Active: En route to nearest local emergency facility for initial stabilization (${topRank.name}), with standby ICU reservation at ${tertiaryBackup.name}.`
        : null;

      // Update emergency record with ranked hospital candidates
      const emergencyUpdates = {
        hospitalCandidates: rankedCandidates,
        alertedCandidateIndex: 0,
        alertedHospitalId: topRank.hospitalId,
        alertedHospitalName: topRank.name,
        assignedHospitalName: null,
        assignedHospitalLocation: null,
        assignedHospitalPhone: null,
        alertedAt: now,
        status: "HOSPITAL_SEARCH" as EmergencyStatus,
        matchScore: topRank.score,
        severity: emergency.severity || triageResult?.severity || "CRITICAL",
        triageSummary: (emergency.aiResult as any)?.emergencyType || (emergency.aiResult as any)?.summary || "Emergency Triage Evaluated",
        escalationMessage: ruralEscalationNotice || emergency.escalationMessage || null,
        updatedAt: now,
      };

      await emergencyRef.set(emergencyUpdates, { merge: true });
      Object.assign(emergency, emergencyUpdates);

      // Write requests to hospitalEmergencyRequests:
      // Rank 1 gets "NEW" (Immediate ER alert banner/sound).
      // Remaining backup candidates get "QUEUED_STANDBY" ready for 45s escalation.
      for (const targetHospital of rankedCandidates) {
        const reqDocId = `${emergency.id}_${targetHospital.hospitalId}`;
        await db.collection(HOSPITAL_REQUESTS_COLLECTION).doc(reqDocId).set(
          {
            id: reqDocId,
            requestId: reqDocId,
            emergencyId: emergency.id,
            hospitalId: targetHospital.hospitalId,
            hospitalName: targetHospital.name,
            rank: targetHospital.rank,
            matchScore: targetHospital.score,
            patientName: (user as any).name || (user as any).patientName || "Emergency Patient",
            patientPhone: (user as any).phone || null,
            goldenHourId: user.crisisId,
            crisisId: user.crisisId,
            severity: emergency.severity || "HIGH",
            incidentType: emergency.incidentType,
            description: emergency.description || null,
            voiceTranscript: emergency.voiceTranscript || null,
            imageUrl: emergency.imageUrl || null,
            aiResult: emergency.aiResult || null,
            location: emergency.location,
            locationAddress: emergency.locationAddress || null,
            status: targetHospital.rank === 1 ? "NEW" : "QUEUED_STANDBY",
            eta: `${targetHospital.etaMinutes} min`,
            distanceKm: targetHospital.distanceKm,
            trustScore: (user as any).trustScore ?? 100,
            confirmationCount: emergency.confirmationCount || 0,
            createdAt: now,
            updatedAt: now,
          },
          { merge: true },
        );
      }
    } catch (bridgeErr) {
      console.warn("[createEmergency] Smart hospital ranking error:", bridgeErr);
    }
  }

  // Trigger real FCM alerts asynchronously (Emergency Contact Alert + Nearby Emergency Alert)
  void emergencyAlertService
    .dispatchEmergencyAlerts(
      emergency.id,
      reporterId,
      emergency.incidentType,
      emergency.location,
    )
    .catch((err) => {
      console.warn("[createEmergency] Alert dispatch error:", err);
    });

  return emergency;
}

export async function getEmergencyById(
  emergencyId: string,
  requesterId: string,
  requesterRole?: string,
): Promise<Emergency> {
  const db = getFirestore();

  const emergencyRef = db
    .collection(EMERGENCIES_COLLECTION)
    .doc(emergencyId);

  const snapshot = await emergencyRef.get();

  if (!snapshot.exists) {
    throw new AppError(
      404,
      "EMERGENCY_NOT_FOUND",
      "Emergency was not found.",
    );
  }

  const emergency = {
    id: snapshot.id,
    ...(snapshot.data() as Omit<Emergency, "id">),
  };

  const isReporter = emergency.reporterId === requesterId;
  const isAssigned =
    emergency.assignedDriverId === requesterId ||
    emergency.assignedAmbulanceId === requesterId ||
    emergency.assignedHospitalId === requesterId ||
    (Array.isArray(emergency.assignedStaffIds) &&
      emergency.assignedStaffIds.includes(requesterId));
  const normRole = (requesterRole || "").toLowerCase();
  const isAuthorizedRole =
    normRole.includes("admin") ||
    normRole.includes("hospital") ||
    normRole.includes("ambulance") ||
    normRole.includes("doctor") ||
    normRole.includes("driver");

  let isAuthorized = isReporter || isAssigned || isAuthorizedRole;

  // 1. Allow registered emergency contacts of the reporter
  if (!isAuthorized) {
    try {
      const contactSnap = await db
        .collection("emergencyContacts")
        .where("ownerUid", "==", emergency.reporterId)
        .where("contactUid", "==", requesterId)
        .limit(1)
        .get();

      if (!contactSnap.empty) {
        isAuthorized = true;
      }
    } catch (_err) {
      // ignore
    }
  }

  // 2. Allow notified responders (received notification for this emergency)
  if (!isAuthorized) {
    try {
      const notifSnap = await db
        .collection("notifications")
        .where("userId", "==", requesterId)
        .where("data.emergencyId", "==", emergencyId)
        .limit(1)
        .get();

      if (!notifSnap.empty) {
        isAuthorized = true;
      }
    } catch (_err) {
      // ignore
    }
  }

  // 3. Allow responders who confirmed the incident
  if (!isAuthorized) {
    try {
      const confirmSnap = await db
        .collection("incidentConfirmations")
        .where("incidentId", "==", emergencyId)
        .where("userId", "==", requesterId)
        .limit(1)
        .get();

      if (!confirmSnap.empty) {
        isAuthorized = true;
      }
    } catch (_err) {
      // ignore
    }
  }

  if (!isAuthorized) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "You are not allowed to access this emergency.",
    );
  }

  // 1. Ensure assignedHospitalLocation is always present and valid if hospital is assigned
  if (
    (emergency.assignedHospitalId || emergency.assignedHospitalName) &&
    (!emergency.assignedHospitalLocation || !emergency.assignedHospitalLocation.latitude)
  ) {
    if (emergency.assignedHospitalId) {
      try {
        const hospDoc = await db.collection("hospitals").doc(emergency.assignedHospitalId).get();
        if (hospDoc.exists) {
          const hData = hospDoc.data();
          if (hData?.location?.latitude && hData?.location?.longitude) {
            emergency.assignedHospitalLocation = {
              latitude: hData.location.latitude,
              longitude: hData.location.longitude,
            };
          }
        }
      } catch {}
    }
    if (!emergency.assignedHospitalLocation || !emergency.assignedHospitalLocation.latitude) {
      emergency.assignedHospitalLocation = { latitude: 25.4538, longitude: 81.8540 };
    }
  }

  // 2. In HOSPITAL_ACCEPTED stage prior to ambulance assignment, ensure ambulanceLocation is clear
  // so the mobile APK automatically falls back to assignedHospitalLocation (showing hospital markup)
  if (
    emergency.status === "HOSPITAL_ACCEPTED" &&
    !emergency.assignedDriverId &&
    (!emergency.assignedAmbulanceId || emergency.assignedAmbulanceId === "Unit Dispatching")
  ) {
    delete (emergency as any).ambulanceLocation;
  }

  // 3. Dynamic phase routing for patient view during hospital transit phase:
  // When ambulance has picked up patient and is heading to hospital (PATIENT_ONBOARD / EN_ROUTE_TO_HOSPITAL / AT_HOSPITAL),
  // the patient's destination on Google Maps is the Assigned Hospital, and the origin is the ambulance's live GPS location.
  const isTransitToHospital =
    emergency.status === "PATIENT_ONBOARD" ||
    emergency.status === "EN_ROUTE_TO_HOSPITAL" ||
    emergency.status === "AT_HOSPITAL" ||
    (emergency as any).tripStatus === "PATIENT_ONBOARD" ||
    (emergency as any).tripStatus === "EN_ROUTE_TO_HOSPITAL";

  if (isTransitToHospital && (isReporter || (!normRole.includes("driver") && !normRole.includes("ambulance")))) {
    const liveAmbulancePos = emergency.ambulanceLocation || emergency.location;
    if (emergency.assignedHospitalLocation?.latitude && emergency.assignedHospitalLocation?.longitude) {
      (emergency as any).realAmbulanceLocation = liveAmbulancePos;
      (emergency as any).patientPickupLocation = emergency.location;
      // In installed mobile APK, ambLat/ambLng is read from ambulanceLocation and used as DESTINATION.
      // emergency.location is used as ORIGIN.
      emergency.location = liveAmbulancePos;
      emergency.ambulanceLocation = emergency.assignedHospitalLocation;
    }
  }

  // 4. Smart Auto-Escalation Check:
  // If emergency is still waiting for hospital acceptance (REPORTED / HOSPITAL_SEARCH),
  // and alertedAt was more than 45 seconds ago, auto-escalate to next hospital candidate!
  if (
    (emergency.status === "REPORTED" || emergency.status === "HOSPITAL_SEARCH") &&
    !emergency.assignedHospitalId &&
    (emergency as any).alertedAt
  ) {
    const alertedTime = new Date((emergency as any).alertedAt).getTime();
    const elapsedMs = Date.now() - alertedTime;
    if (elapsedMs > 45000) {
      try {
        const escalated = await escalateEmergencyToNextHospital(
          emergency.id,
          "Hospital response timeout (45s) without acceptance",
        );
        if (escalated) {
          Object.assign(emergency, escalated);
        }
      } catch (_escErr) {
        // Non-blocking
      }
    }
  }

  return emergency;
}

export async function escalateEmergencyToNextHospital(
  emergencyId: string,
  reason: string = "Hospital request timeout (45s) without response",
) {
  const db = getFirestore();
  const emergencyRef = db.collection(EMERGENCIES_COLLECTION).doc(emergencyId);
  const snap = await emergencyRef.get();
  if (!snap.exists) return null;
  const em = snap.data() as any;

  // Don't escalate if already accepted or in transit
  if (
    em.status === "HOSPITAL_ACCEPTED" ||
    em.status === "AMBULANCE_ASSIGNED" ||
    em.status === "EN_ROUTE" ||
    em.status === "PATIENT_ONBOARD" ||
    em.assignedHospitalId
  ) {
    return em;
  }

  const candidates: Array<any> = Array.isArray(em.hospitalCandidates) ? em.hospitalCandidates : [];
  const currentIdx = typeof em.alertedCandidateIndex === "number" ? em.alertedCandidateIndex : 0;
  const nextIdx = currentIdx + 1;

  const now = new Date().toISOString();

  if (nextIdx < candidates.length) {
    const nextHospital = candidates[nextIdx];
    candidates[currentIdx].status = "TIMEOUT";
    candidates[nextIdx].status = "ALERTED";
    candidates[nextIdx].alertedAt = now;

    // Activate next hospital's request doc in hospitalEmergencyRequests
    const reqDocId = `${emergencyId}_${nextHospital.hospitalId}`;
    try {
      await db.collection(HOSPITAL_REQUESTS_COLLECTION).doc(reqDocId).set(
        {
          status: "NEW",
          escalated: true,
          escalatedFrom: candidates[currentIdx]?.name || "Previous ER",
          escalationReason: reason,
          updatedAt: now,
        },
        { merge: true },
      );
    } catch (_e) {}

    const updates = {
      hospitalCandidates: candidates,
      alertedCandidateIndex: nextIdx,
      alertedHospitalId: nextHospital.hospitalId,
      alertedHospitalName: nextHospital.name,
      assignedHospitalName: null,
      assignedHospitalLocation: null,
      assignedHospitalPhone: null,
      status: "HOSPITAL_SEARCH",
      escalationMessage: `ER desk ${candidates[currentIdx]?.name || "initial hospital"} busy. Automatically escalating alert to ${nextHospital.name}...`,
      alertedAt: now,
      updatedAt: now,
    };

    await emergencyRef.set(updates, { merge: true });
    console.log(`[Auto-Escalation] Emergency ${emergencyId} successfully escalated to ${nextHospital.name}`);
    return { ...em, ...updates };
  } else {
    // All local candidates exhausted -> Fallback to Central 108 Dispatch
    const updates = {
      fallbackMode: "CENTRAL_108_DISPATCH",
      assignedHospitalName: "Prayagraj 108 Emergency Control Center",
      assignedHospitalPhone: "108",
      escalationMessage: "All local trauma ERs at peak capacity. Linked to Prayagraj Central 108 Emergency Dispatch.",
      updatedAt: now,
    };
    await emergencyRef.set(updates, { merge: true });
    return { ...em, ...updates };
  }
}

export async function updateEmergency(
  emergencyId: string,
  requesterId: string,
  updates: Partial<
    Pick<
      Emergency,
      | "description"
      | "voiceTranscript"
      | "imageUrl"
      | "location"
      | "severity"
      | "aiResult"
      | "status"
      | "assignedDriverId"
      | "assignedAmbulanceId"
      | "assignedHospitalId"
      | "ambulanceLocation"
      | "assignedHospitalLocation"
      | "assignedHospitalName"
      | "assignedHospitalPhone"
      | "assignedDriverName"
      | "assignedDriverPhone"
      | "patientName"
      | "patientPhone"
      | "dismissedBy"
    >
  >,
  requesterRole?: string,
): Promise<Emergency> {
  const db = getFirestore();

  const emergencyRef = db
    .collection(EMERGENCIES_COLLECTION)
    .doc(emergencyId);

  const snapshot = await emergencyRef.get();

  if (!snapshot.exists) {
    throw new AppError(
      404,
      "EMERGENCY_NOT_FOUND",
      "Emergency was not found.",
    );
  }

  const existing = snapshot.data() as Emergency;

  const isReporter = existing.reporterId === requesterId;
  const isAssigned =
    existing.assignedDriverId === requesterId ||
    existing.assignedAmbulanceId === requesterId ||
    existing.assignedHospitalId === requesterId ||
    (Array.isArray(existing.assignedStaffIds) &&
      existing.assignedStaffIds.includes(requesterId));
  const isAuthorizedRole =
    !!requesterRole &&
    ["admin", "hospital", "ambulance", "doctor", "ambulance_driver"].includes(requesterRole.toLowerCase());

  if (!isReporter && !isAssigned && !isAuthorizedRole) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "You are not allowed to update this emergency.",
    );
  }

  if (updates.location !== undefined && !validateLocation(updates.location)) {
    throw new AppError(
      400,
      "INVALID_LOCATION",
      "A valid latitude and longitude are required.",
    );
  }

  const allowedUpdates = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await emergencyRef.set(allowedUpdates, { merge: true });

  if (updates.location) {
    try {
      await db.collection("locations").doc(requesterId).set(
        {
          userId: requesterId,
          lat: updates.location.latitude,
          lng: updates.location.longitude,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    } catch (_err) {
      // ignore
    }
  }

  // Sync severity, aiResult, description, ambulanceLocation to hospitalEmergencyRequests
  if (process.env.NODE_ENV !== "test") {
    try {
      const bridgeUpdates: Record<string, any> = { updatedAt: new Date().toISOString() };
      if (updates.severity) bridgeUpdates.severity = updates.severity;
      if (updates.aiResult) bridgeUpdates.aiResult = updates.aiResult;
      if (updates.description) bridgeUpdates.description = updates.description;
      if (updates.voiceTranscript) bridgeUpdates.voiceTranscript = updates.voiceTranscript;
      if (updates.imageUrl) bridgeUpdates.imageUrl = updates.imageUrl;
      if (updates.ambulanceLocation) bridgeUpdates.ambulanceLocation = updates.ambulanceLocation;
      if (updates.patientName) bridgeUpdates.patientName = updates.patientName;
      if (updates.patientPhone) bridgeUpdates.patientPhone = updates.patientPhone;

      const bridgeSnap = await db
        .collection(HOSPITAL_REQUESTS_COLLECTION)
        .where("emergencyId", "==", emergencyId)
        .get();
      
      for (const bDoc of bridgeSnap.docs) {
        await bDoc.ref.set(bridgeUpdates, { merge: true });
      }

      const directRef = db.collection(HOSPITAL_REQUESTS_COLLECTION).doc(emergencyId);
      const directSnap = await directRef.get();
      if (directSnap.exists) {
        await directRef.set(bridgeUpdates, { merge: true });
      }
    } catch (_err) {
      // Non-fatal
    }
  }

  return {
    ...existing,
    ...allowedUpdates,
  };
}