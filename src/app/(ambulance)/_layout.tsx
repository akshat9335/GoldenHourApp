import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';

export default function AmbulanceLayout() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const role = useAppStore((s) => s.role);
  const roles = useAppStore((s) => s.roles);
  const userProfile = useAppStore((s) => s.userProfile);
  const verificationStatus = useAppStore((s) => s.verificationStatus);

  const activeRoles = (roles || (userProfile?.roles ? userProfile.roles : [role])).map((r) =>
    r.toUpperCase()
  );
  const isDriver = activeRoles.includes('AMBULANCE_DRIVER');
  const driverStatus = (
    userProfile?.roleVerificationStatus?.AMBULANCE_DRIVER ||
    (role === 'AMBULANCE_DRIVER' ? verificationStatus : null) ||
    'PENDING'
  ).toUpperCase();
  const isAuthorizedDriver = isAuthenticated && isDriver && (driverStatus === 'APPROVED' || driverStatus === 'VERIFIED');

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/');
    } else if (!isDriver) {
      router.replace('/role-selection');
    } else if (driverStatus !== 'APPROVED' && driverStatus !== 'VERIFIED') {
      router.replace('/driver-login');
    }
  }, [isAuthenticated, isDriver, driverStatus]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
