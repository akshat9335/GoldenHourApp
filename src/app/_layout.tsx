import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { notificationService } from '@/services/notifications';
import { voiceSosService } from '@/services/voiceSos.service';
import VoiceSosCountdownOverlay from '@/components/VoiceSosCountdownOverlay';

export default function RootLayout() {
  useEffect(() => {
    // Initialize notification response handling (deep links)
    const cleanup = notificationService.setupNotificationListeners();
    // Proactively register push token if permissions allow
    notificationService.registerForPushNotificationsAsync().catch(() => {});

    // Hook up Voice SOS trigger callback to navigate to activated screen
    voiceSosService.registerTriggerCallback((_emergencyId) => {
      router.replace('/(patient)/emergency/activated');
    });

    // Proactively initialize and watch real device GPS
    const { initDeviceLocation } = require('@/services/deviceLocation');
    initDeviceLocation().then((loc: any) => {
      if (loc) {
        const { api } = require('@/services/api');
        api.location.updateLocation({
          lat: loc.latitude,
          lng: loc.longitude,
        }).catch(() => {});
      }
    }).catch(() => {});

    return () => {
      if (cleanup) cleanup();
      voiceSosService.registerTriggerCallback(null);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
      <VoiceSosCountdownOverlay />
    </SafeAreaProvider>
  );
}
