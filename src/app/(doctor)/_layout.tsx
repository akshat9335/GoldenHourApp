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
  const doctorStatus = (
    userProfile?.roleVerificationStatus?.DOCTOR ||
    verificationStatus ||
    'PENDING'
  ).toUpperCase();
  const isAuthorizedDoctor = isAuthenticated && isDoctor && (doctorStatus === 'APPROVED' || doctorStatus === 'VERIFIED');

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/');
    } else if (!isDoctor) {
      router.replace('/(patient)/home');
    } else if (doctorStatus !== 'APPROVED' && doctorStatus !== 'VERIFIED') {
      router.replace('/doctor-login');
    }
  }, [isAuthenticated, isDoctor, doctorStatus]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
