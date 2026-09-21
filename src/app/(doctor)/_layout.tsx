import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';

export default function DoctorLayout() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const role = useAppStore((s) => s.role);
  const roles = useAppStore((s) => s.roles);
  const userProfile = useAppStore((s) => s.userProfile);
  const verificationStatus = useAppStore((s) => s.verificationStatus);

  const activeRoles = (roles || (userProfile?.roles ? userProfile.roles : [role])).map((r) =>
    r.toUpperCase()
  );
  const isDoctor = activeRoles.includes('DOCTOR');
  const doctorStatus = userProfile?.roleVerificationStatus?.DOCTOR || verificationStatus;
  const isAuthorizedDoctor = isAuthenticated && isDoctor && doctorStatus === 'APPROVED';

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/');
    } else if (!isDoctor) {
      router.replace('/(patient)/home');
    } else if (doctorStatus !== 'APPROVED') {
      router.replace('/doctor-login');
    } else if (role !== 'DOCTOR') {
      useAppStore.getState().setRole('DOCTOR');
    }
  }, [isAuthenticated, isDoctor, doctorStatus, role]);

  if (!isAuthorizedDoctor) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
