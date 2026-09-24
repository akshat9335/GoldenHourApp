import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Button, IconPrompt, Icon } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

export default function Completed() {
  const emergencyId = useAppStore((s) => s.emergencyId);
  const resetEmergencySession = useAppStore((s) => s.resetEmergencySession);
  const [hospitalName, setHospitalName] = useState<string>('Emergency Trauma Hospital');

  useEffect(() => {
    if (emergencyId) {
      api.emergencies.getById(emergencyId).then((data) => {
        if (data?.assignedHospitalName) {
          setHospitalName(data.assignedHospitalName);
        }
      }).catch(() => {});
    }
    // Wipe active SOS session immediately so ETA, distance, and active banners disappear
    resetEmergencySession();

    // Re-fetch profile to load newly awarded +10 trust points into the store
    api.users.getProfile().then((profile: any) => {
      if (profile?.trustScore !== undefined) {
        useAppStore.getState().setTrustScore(profile.trustScore);
      }
    }).catch(() => {});
  }, []);

  const handleBackHome = () => {
    resetEmergencySession();
    router.replace('/(patient)/home');
  };

  return (
    <Screen center style={{ alignItems: 'center' }}>
      <IconPrompt
        icon={<Icon name="check" size={38} color={colors.success} />}
        bg={colors.successBg}
        size={88}
        title="Emergency Resolved"
        desc={`Patient safely arrived at ${hospitalName} · Emergency handoff completed.`}
      />
      <View style={styles.trustAwardBadge}>
        <Text style={styles.trustAwardText}>⭐ +10 Trust Score Earned · Genuine Emergency Verified</Text>
      </View>
      <Button title="Back to Dashboard" onPress={handleBackHome} style={{ marginTop: 24, width: '100%' }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  trustAwardBadge: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustAwardText: {
    color: '#1D4ED8',
    fontWeight: '800',
    fontSize: 12.5,
    textAlign: 'center',
  },
});
