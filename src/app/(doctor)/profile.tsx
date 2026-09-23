import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Card, Pill, Divider, Icon, DoctorNav, HTitle, LabelEyebrow } from '@/components/ui';
import { getDoctorById } from '@/constants/doctorData';
import { authService } from '@/services/auth';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

export default function DoctorProfile() {
  const userProfile = useAppStore((s) => s.userProfile);
  const verificationStatus = useAppStore((s) => s.verificationStatus);
  const fallback = getDoctorById('doc-1');
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    api.doctors.getMyProfile().then((res: any) => {
      const doc = (res && typeof res === 'object' && ('doctorId' in res || 'name' in res)) ? res : (res?.data || res);
      if (doc && (doc.doctorId || doc.name)) setProfile(doc);
    }).catch(() => {});
  }, []);

  const name = profile?.name || userProfile?.doctorName || userProfile?.name || fallback.name;
  const spec = profile?.specialty || (userProfile as any)?.specialization || fallback.specialization;
  const qual = profile?.qualification || userProfile?.qualification || fallback.qualification;
  const fee = profile?.consultationFee || userProfile?.consultationFee || fallback.fee;
  const clinic = profile?.clinic?.clinicName || userProfile?.clinicName || fallback.clinic;
  const address = profile?.clinic?.address || userProfile?.clinicAddress || fallback.address;
  const isVerified = verificationStatus === 'APPROVED' || profile?.verificationStatus === 'VERIFIED';

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={styles.header}>
          <View style={styles.avatar}><Icon name="doctor" size={26} color={colors.red} /></View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <HTitle size={16}>{name}</HTitle>
              {isVerified && <Pill color="success">✓ VERIFIED</Pill>}
            </View>
            <Text style={styles.spec}>{spec} · {profile?.experienceYears ? `${profile.experienceYears} yrs exp` : fallback.experience}</Text>
          </View>
        </View>

        <Card style={{ padding: 16, marginBottom: 14 }}>
          <View style={styles.grid}>
            <Stat label="QUALIFICATION" value={qual} />
            <Stat label="CONSULTATION FEE" value={`₹${fee}`} />
            <Stat label="CLINIC" value={clinic} />
            <Stat label="WORKING HOURS" value={profile?.clinic?.workingHours || fallback.workingHours} />
          </View>
          <View style={{ marginVertical: 12 }}><Divider /></View>
          <LabelEyebrow>CLINIC ADDRESS</LabelEyebrow>
          <Text style={styles.address}>{address}</Text>
        </Card>

        <Card style={{ padding: 4 }}>
          <Pressable style={styles.row} onPress={() => router.push('/(doctor)/clinic')}>
            <Icon name="hospital" color={colors.ink} />
            <Text style={styles.rowLabel}>Edit Profile</Text>
            <Icon name="chevR" color={colors.inkFaint} />
          </Pressable>
          <Divider />
          <Pressable style={styles.row} onPress={() => router.push('/(doctor)/notifications')}>
            <Icon name="bell" color={colors.ink} />
            <Text style={styles.rowLabel}>Notifications</Text>
            <Icon name="chevR" color={colors.inkFaint} />
          </Pressable>
          <Divider />
          <Pressable
            style={styles.row}
            onPress={() => {
              Alert.alert('Log Out', 'Are you sure you want to log out of Golden Hour?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Log Out',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await authService.logout();
                    } finally {
                      try {
                        if (router.canDismiss()) {
                          router.dismissAll();
                        }
                      } catch {}
                      router.replace('/');
                    }
                  },
                },
              ]);
            }}
          >
            <Icon name="close" color={colors.red} />
            <Text style={[styles.rowLabel, { color: colors.red }]}>Log Out</Text>
          </Pressable>
        </Card>
      </Screen>
      <DoctorNav active="/(doctor)/profile" />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '48%' }}>
      <LabelEyebrow>{label}</LabelEyebrow>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  avatar: { width: 58, height: 58, borderRadius: 18, backgroundColor: colors.redGlow, alignItems: 'center', justifyContent: 'center' },
  spec: { fontSize: 11.5, color: colors.inkFaint, marginTop: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statValue: { fontSize: 12.5, fontWeight: '700', color: colors.ink, marginTop: 2 },
  address: { fontSize: 12, color: colors.ink, marginTop: 4, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink },
});
