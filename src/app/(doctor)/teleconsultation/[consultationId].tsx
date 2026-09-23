import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ConsultationRoom } from '@/components/teleconsultation/ConsultationRoom';

/**
 * Doctor-facing consultation room route — doctor sees Notes + Prescription
 * panels; both sides see Chat + Video.
 */
export default function DoctorConsultationScreen() {
  const { consultationId } = useLocalSearchParams<{ consultationId: string }>();
  return (
    <ConsultationRoom
      consultationId={consultationId}
      selfId="doctor-self"
      selfRole="doctor"
    />
  );
}
