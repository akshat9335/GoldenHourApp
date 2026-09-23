import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ConsultationRoom } from '@/components/teleconsultation/ConsultationRoom';

/**
 * Patient-facing consultation room route.
 * In production, selfId/selfRole come from the auth store.
 */
export default function PatientConsultationScreen() {
  const { consultationId } = useLocalSearchParams<{ consultationId: string }>();
  return (
    <ConsultationRoom
      consultationId={consultationId}
      selfId="patient-self"
      selfRole="patient"
    />
  );
}
