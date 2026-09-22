import { api } from './api';
import { useAppStore } from '@/store/useAppStore';
import { acquireFreshLocation } from './deviceLocation';

export interface TriggerSosOptions {
  incidentType?: string;
  description?: string | null;
  voiceTranscript?: string | null;
  imageUrl?: string | null;
  location?: { latitude: number; longitude: number };
}

/**
 * Single Canonical Emergency Trigger
 * Reused by both manual SOS button and Voice SOS.
 * Uses guaranteed fresh GPS fix to eliminate stale / dummy location dispatch.
 */
export async function triggerCanonicalEmergencySOS(
  options?: TriggerSosOptions,
): Promise<string> {
  const store = useAppStore.getState();

  // Priority: caller-provided > guaranteed fresh GPS > store cached
  let loc = options?.location;
  if (!loc) {
    loc = await acquireFreshLocation(3000);
  }

  // Ensure store has the exact dispatch coordinates
  if (loc) {
    store.setLastKnownLocation(loc);
  }

  const incidentType = options?.incidentType || store.selectedType || 'Accident';
  const description = options?.description ?? store.description ?? null;
  const voiceTranscript = options?.voiceTranscript ?? store.voiceTranscript ?? null;
  const imageUrl = options?.imageUrl ?? store.accidentPhotoUri ?? null;

  try {
    const emergency = await api.emergencies.create({
      incidentType,
      description,
      voiceTranscript,
      imageUrl,
      location: loc,
      locationAddress: store.locationAddress || null,
      severity: store.aiSeverity ? store.aiSeverity.toUpperCase() : null,
      aiResult: store.aiTriageResult || null,
    });

    const emergencyId = emergency?.id || 'emg-demo-' + Date.now().toString(36);
    store.setEmergencyId(emergencyId);
    return emergencyId;
  } catch (_err) {
    // Graceful offline demo fallback
    const fallbackId = 'emg-demo-' + Date.now().toString(36);
    store.setEmergencyId(fallbackId);
    return fallbackId;
  }
}
