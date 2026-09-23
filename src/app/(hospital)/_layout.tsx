import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';

export default function HospitalLayout() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const role = useAppStore((s) => s.role);
  const roles = useAppStore((s) => s.roles);
  const userProfile = useAppStore((s) => s.userProfile);
  const verificationStatus = useAppStore((s) => s.verificationStatus);

  const activeRoles = (roles || (userProfile?.roles ? userProfile.roles : [role])).map((r) =>
    r.toUpperCase()
  );
  const isHospital = activeRoles.includes('HOSPITAL');
  const hospitalStatus = (
    userProfile?.roleVerificationStatus?.HOSPITAL ||
    userProfile?.verificationStatus ||
    verificationStatus ||
    'PENDING'
  ).toUpperCase();
  const isAuthorizedHospital = isAuthenticated && isHospital && (hospitalStatus === 'APPROVED' || hospitalStatus === 'VERIFIED');

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/hospital-login');
    } else if (!isHospital) {
      router.replace('/role-selection');
    } else if (hospitalStatus !== 'APPROVED' && hospitalStatus !== 'VERIFIED') {
      router.replace('/hospital-login');
    }
  }, [isAuthenticated, isHospital, hospitalStatus]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
