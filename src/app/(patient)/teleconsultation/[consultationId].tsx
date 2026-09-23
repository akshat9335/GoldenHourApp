import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ConsultationRoom } from '@/components/teleconsultation/ConsultationRoom';
import { useAppStore } from '@/store/useAppStore';

/**
 * Patient-facing consultation room route.
 */
export default function PatientConsultationScreen() {
  const { consultationId } = useLocalSearchParams<{ consultationId: string }>();
  const userProfile = useAppStore((s) => s.userProfile);
  const selfId = userProfile?.uid || 'patient-self';

  return (
    <ConsultationRoom
      consultationId={consultationId}
      selfId={selfId}
      selfRole="patient"
    />
  );
}
