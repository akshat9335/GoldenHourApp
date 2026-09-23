import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';

export default function PatientLayout() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
