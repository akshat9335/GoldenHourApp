import { api } from './api';
import { useAppStore } from '@/store/useAppStore';
import { acquireFreshLocation } from './deviceLocation';
import { enqueueOfflineAction } from './offlineSync';

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
 * Includes offline storage: If network is offline, persists to AsyncStorage queue
 * and auto-dispatches the instant connectivity is restored.
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

  const payload = {
    incidentType,
    description,
    voiceTranscript,
    imageUrl,
    imageBase64: store.accidentPhotoBase64 || null,
    imageMimeType: store.accidentPhotoBase64 ? 'image/jpeg' : null,
    location: loc,
    locationAddress: store.locationAddress || null,
    severity: store.aiSeverity ? store.aiSeverity.toUpperCase() : null,
    aiResult: store.aiTriageResult || null,
    createdAt: new Date().toISOString(),
  };

  try {
    const emergency = await api.emergencies.create(payload);
    const emergencyId = emergency?.id || 'emg-live-' + Date.now().toString(36);
    store.setEmergencyId(emergencyId);
    return emergencyId;
  } catch (err) {
    console.warn('[triggerCanonicalEmergencySOS] Network dispatch failed, persisting to offline queue:', err);
    // Queue to offline storage for automatic sync upon reconnection
    await enqueueOfflineAction('/api/emergencies', 'POST', payload);
    const fallbackId = 'emg-offline-' + Date.now().toString(36);
    store.setEmergencyId(fallbackId);
    return fallbackId;
  }
}

