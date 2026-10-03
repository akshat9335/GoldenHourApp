import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ConsultationRoom } from '@/components/teleconsultation/ConsultationRoom';
import { useAppStore } from '@/store/useAppStore';

/**
 * Doctor-facing consultation room route — doctor sees Notes + Prescription
 * panels; both sides see Chat + Video.
 */
export default function DoctorConsultationScreen() {
  const { consultationId } = useLocalSearchParams<{ consultationId: string }>();
  const userProfile = useAppStore((s) => s.userProfile);
  const selfId = userProfile?.uid ? `doc-${userProfile.uid}` : 'doctor-self';

  return (
    <ConsultationRoom
      consultationId={consultationId}
      selfId={selfId}
      selfRole="doctor"
    />
  );
}
