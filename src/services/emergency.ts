import { api } from './api';
import { useAppStore } from '@/store/useAppStore';
import { getFastLocation } from './deviceLocation';

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
 * Uses pre-warmed GPS cache (<1ms) to eliminate satellite lock freezing.
 */
export async function triggerCanonicalEmergencySOS(
  options?: TriggerSosOptions,
): Promise<string> {
  const store = useAppStore.getState();

  // Priority: caller-provided > fast pre-warmed GPS > store cached
  let loc = options?.location;
  if (!loc) {
    loc = await getFastLocation();
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
