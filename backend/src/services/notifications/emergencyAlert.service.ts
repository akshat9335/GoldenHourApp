import { firestore } from "../../config/firebase";
import { fcmService } from "./fcm.service";
import { distanceService } from "../location/distance.service";
import { dataStore } from "../../models/dataStore";

const USERS_COLLECTION = "users";
const CONTACTS_COLLECTION = "emergencyContacts";
const NOTIFICATIONS_COLLECTION = "notifications";
const LOCATIONS_COLLECTION = "locations";

export interface AlertDispatchResult {
  contactTokensFound: number;
  contactAlertsSent: number;
  nearbyTokensFound: number;
  nearbyAlertsSent: number;
  totalUniqueNotified: number;
}

export class EmergencyAlertService {
  /**
   * Dispatches dual real FCM alerts when an emergency is created:
   * 1. Emergency Contact Alert (to personal emergency contacts registered in Golden Hour)
   * 2. Nearby Emergency Alert (to nearby Golden Hour users within radius, default 2km)
   * Deduplication ensures a recipient eligible for both receives only the direct contact alert.
   */
  public async dispatchEmergencyAlerts(
    emergencyId: string,
    reporterId: string,
    incidentType: string,
    location: { latitude: number; longitude: number },
    radiusKm = 2.0,
  ): Promise<AlertDispatchResult> {
    if (!firestore) {
      console.warn("[emergency-alert] Firestore not configured. Skipping alert dispatch.");
      return {
        contactTokensFound: 0,
        contactAlertsSent: 0,
        nearbyTokensFound: 0,
        nearbyAlertsSent: 0,
        totalUniqueNotified: 0,
      };
    }

    const notifiedUserIds = new Set<string>();

    // 1. Resolve Reporter Name
    let reporterName = "A Golden Hour user";
    try {
      const reporterDoc = await firestore.collection(USERS_COLLECTION).doc(reporterId).get();
      if (reporterDoc.exists) {
        const data = reporterDoc.data();
        reporterName = data?.name || data?.displayName || reporterName;
      }
    } catch (_err) {
      // Safe fallback to generic name
    }

    // ==========================================
    // STEP A: EMERGENCY CONTACTS ALERT
    // ==========================================
    const contactTokens: string[] = [];
    try {
      const contactsSnap = await firestore
        .collection(CONTACTS_COLLECTION)
        .where("ownerUid", "==", reporterId)
        .get();

      for (const doc of contactsSnap.docs) {
        const contact = doc.data() as { contactUid?: string };
        const contactUid = contact.contactUid;

        if (!contactUid || contactUid === reporterId || notifiedUserIds.has(contactUid)) {
          continue;
        }

        notifiedUserIds.add(contactUid);

        // Fetch contact user doc to get fcmToken
        const contactUserDoc = await firestore.collection(USERS_COLLECTION).doc(contactUid).get();
        if (contactUserDoc.exists) {
          const contactUser = contactUserDoc.data();
          if (contactUser?.fcmToken && typeof contactUser.fcmToken === "string") {
            contactTokens.push(contactUser.fcmToken);
          }

          // Create in-app notification for the contact
          await firestore.collection(NOTIFICATIONS_COLLECTION).add({
            userId: contactUid,
            title: "🚨 Golden Hour Emergency Alert",
            body: `${reporterName} has triggered an emergency (${incidentType}). Tap to view live tracking.`,
            type: "EMERGENCY_LIVE_TRACKING",
            data: {
              emergencyId,
              reporterId,
              incidentType,
              destination: `/(patient)/live-map?emergencyId=${emergencyId}`,
            },
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    } catch (err: any) {
      console.warn("[emergency-alert] Failed to resolve emergency contacts:", err.message);
    }

    let contactSent = 0;
    if (contactTokens.length > 0) {
      const fcmRes = await fcmService.sendMulticast(contactTokens, {
        title: "🚨 Golden Hour Emergency",
        body: `${reporterName} has triggered an emergency. Tap to view live location.`,
        data: {
          type: "EMERGENCY_LIVE_TRACKING",
          emergencyId,
          reporterId,
          incidentType,
          destination: `/(patient)/live-map?emergencyId=${emergencyId}`,
        },
        channelId: "emergency_alerts",
      });
      contactSent = fcmRes.successCount;
    }

    // ==========================================
    // STEP B: NEARBY GOLDEN HOUR USERS ALERT
    // ==========================================
    const nearbyTokens: string[] = [];
    try {
      // Gather active locations from both Firestore and dataStore cache
      const candidateLocations = new Map<string, { lat: number; lng: number }>();

      // Read from Firestore locations collection
      const locationsSnap = await firestore.collection(LOCATIONS_COLLECTION).get();
      locationsSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.userId && typeof data.lat === "number" && typeof data.lng === "number") {
          candidateLocations.set(data.userId, { lat: data.lat, lng: data.lng });
        }
      });

      // Add any in-memory locations not yet synchronized
      for (const [uid, loc] of dataStore.locations.entries()) {
        if (!candidateLocations.has(uid)) {
          candidateLocations.set(uid, { lat: loc.lat, lng: loc.lng });
        }
      }

      for (const [userId, coords] of candidateLocations.entries()) {
        // Exclude reporter and users already alerted as contacts (deduplication)
        if (userId === reporterId || notifiedUserIds.has(userId)) {
          continue;
        }

        const distanceKm = distanceService.calculateDistance(
          location.latitude,
          location.longitude,
          coords.lat,
          coords.lng,
        );

        if (distanceKm <= radiusKm) {
          notifiedUserIds.add(userId);

          const userDoc = await firestore.collection(USERS_COLLECTION).doc(userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData?.fcmToken && typeof userData.fcmToken === "string") {
              nearbyTokens.push(userData.fcmToken);
            }

            // Create in-app notification for nearby responder
            await firestore.collection(NOTIFICATIONS_COLLECTION).add({
              userId,
              title: "🚨 Nearby Emergency Alert",
              body: `Emergency reported ${distanceKm.toFixed(1)} km away (${incidentType}). Tap to assist.`,
              type: "NEARBY_EMERGENCY",
              data: {
                emergencyId,
                distanceKm: distanceKm.toFixed(1),
                destination: `/nearby-incident?emergencyId=${emergencyId}`,
              },
              read: false,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    } catch (err: any) {
      console.warn("[emergency-alert] Failed to resolve nearby users:", err.message);
    }

    let nearbySent = 0;
    if (nearbyTokens.length > 0) {
      const fcmRes = await fcmService.sendMulticast(nearbyTokens, {
        title: "🚨 Nearby Emergency Alert",
        body: `Emergency reported nearby (${incidentType}). Tap to assist.`,
        data: {
          type: "NEARBY_EMERGENCY",
          emergencyId,
          destination: `/nearby-incident?emergencyId=${emergencyId}`,
        },
        channelId: "emergency_alerts",
      });
      nearbySent = fcmRes.successCount;
    }

    return {
      contactTokensFound: contactTokens.length,
      contactAlertsSent: contactSent,
      nearbyTokensFound: nearbyTokens.length,
      nearbyAlertsSent: nearbySent,
      totalUniqueNotified: notifiedUserIds.size,
    };
  }
}

export const emergencyAlertService = new EmergencyAlertService();
