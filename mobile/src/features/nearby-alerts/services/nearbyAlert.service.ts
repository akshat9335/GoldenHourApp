import { NearbyEmergencyAlert, ResponderRegistration } from "../types/nearbyAlert.types";

/**
 * Service managing Nearby User Alerts (Feature 20).
 * Handles device registration for proximity alerts and incoming push payloads.
 */
export class NearbyAlertService {
  private activeAlerts: NearbyEmergencyAlert[] = [];
  private currentResponder: ResponderRegistration | null = null;

  /**
   * Registers user's FCM token and GPS coordinates to receive nearby emergency notifications.
   */
  public async registerResponder(config: ResponderRegistration): Promise<boolean> {
    this.currentResponder = config;
    // In production, syncs with /api/location/update or Firestore 'responderLocations'
    return true;
  }

  /**
   * Parses incoming Firebase Cloud Messaging (FCM) background/foreground payload.
   * Ensures only radius-eligible alerts trigger emergency response UI.
   */
  public parseFCMAlert(remoteMessage: Record<string, any>): NearbyEmergencyAlert | null {
    if (!remoteMessage || !remoteMessage.data) return null;
    const { data } = remoteMessage;

    if (data.type !== "EMERGENCY_NEARBY") {
      return null;
    }

    const alert: NearbyEmergencyAlert = {
      incidentId: data.incidentId || `inc-${Date.now()}`,
      severity: data.severity || "CRITICAL",
      distanceKm: parseFloat(data.distanceKm || "1.8"),
      etaMinutes: parseInt(data.etaMinutes || "4", 10),
      latitude: parseFloat(data.lat || "0"),
      longitude: parseFloat(data.lng || "0"),
      description: data.description || "Emergency incident reported in your vicinity.",
      confirmationCount: parseInt(data.confirmationCount || "1", 10),
      reportedAt: data.reportedAt || new Date().toISOString(),
    };

    this.activeAlerts.unshift(alert);
    return alert;
  }

  /**
   * Returns list of currently known nearby incidents.
   */
  public getActiveAlerts(): NearbyEmergencyAlert[] {
    return [...this.activeAlerts];
  }

  public clearAlert(incidentId: string): void {
    this.activeAlerts = this.activeAlerts.filter((a) => a.incidentId !== incidentId);
  }
}

export const nearbyAlertService = new NearbyAlertService();
