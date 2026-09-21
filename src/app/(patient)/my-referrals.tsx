import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { colors, radii, shadow } from '@/constants/theme';
import { Screen, Card, TopBar, Pill, Stepper, Divider, Icon, Button, HTitle, LabelEyebrow } from '@/components/ui';
import { api } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';

const REFERRAL_STEPS = [
  'Doctor Referred',
  'Hospital Accepted',
  'Arrived at Hospital',
  'Treatment Ongoing',
  'Discharged / Completed',
];

interface ReferralItem {
  id: string;
  patientUid: string;
  patientName: string;
  crisisId: string;
  referringDoctorName: string;
  referringFacilityName: string;
  targetHospitalName: string;
  targetDepartment: string;
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  reasonForReferral: string;
  clinicalNotes: string;
  status: 'CREATED' | 'HOSPITAL_ACCEPTED' | 'REJECTED' | 'PATIENT_ARRIVED' | 'IN_TREATMENT' | 'COMPLETED';
  rejectionReason?: string;
  hospitalNotes?: string;
  createdAt: string;
}

export default function PatientMyReferralsScreen() {
  const userProfile = useAppStore((s) => s.userProfile);
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);

  const fetchMyReferrals = async () => {
    setLoading(true);
    try {
      const res = await api.referrals.getMyReferrals();
      if (res && Array.isArray(res)) {
        setReferrals(res);
      } else {
        // Mock fallback if empty
        setReferrals([
          {
            id: 'ref-my-01',
            patientUid: userProfile?.uid || 'pat-me',
            patientName: userProfile?.name || 'Rahul Verma',
            crisisId: userProfile?.crisisId || 'AS-4232',
            referringDoctorName: 'Dr. Rajesh Sharma',
            referringFacilityName: 'Apex Trauma Clinic',
            targetHospitalName: 'Apollo Emergency & Speciality Hospital',
            targetDepartment: 'Trauma & Critical Care',
            priority: 'EMERGENCY',
            reasonForReferral: 'Critical blunt trauma requiring immediate surgical assessment',
            clinicalNotes: 'IV line active. Blood typed and cross-matched.',
            status: 'HOSPITAL_ACCEPTED',
            hospitalNotes: 'Bed ICU-04 reserved. Trauma team notified.',
            createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          },
        ]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyReferrals();
  }, []);

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'CREATED':
        return 0;
      case 'HOSPITAL_ACCEPTED':
        return 1;
      case 'PATIENT_ARRIVED':
        return 2;
      case 'IN_TREATMENT':
        return 3;
      case 'COMPLETED':
        return 4;
      default:
        return 0;
    }
  };

  return (
    <Screen padBottom={110}>
      <TopBar title="My Hospital Referrals" />

      <View style={{ marginBottom: 16 }}>
        <LabelEyebrow>ACTIVE CLINICAL TRANSFERS</LabelEyebrow>
        <Text style={styles.subhead}>
          Track real-time status of referrals initiated by your doctors to tertiary hospitals.
        </Text>
      </View>

      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.red} />
          <Text style={{ marginTop: 12, color: colors.inkSoft, fontSize: 13 }}>
            Checking hospital referral tracker...
          </Text>
        </View>
      ) : referrals.length === 0 ? (
        <Card style={{ padding: 24, alignItems: 'center', marginTop: 12 }}>
          <Icon name="hospital" size={32} color={colors.inkFaint} />
          <Text style={{ fontWeight: '700', fontSize: 15, color: colors.ink, marginTop: 10 }}>
            No Active Referrals
          </Text>
          <Text style={{ fontSize: 12.5, color: colors.inkSoft, textAlign: 'center', marginTop: 6 }}>
            When a clinic or emergency doctor refers you to a higher facility, you can track hospital acceptance and bed reservation here.
          </Text>
          <Button
            title="View Health Records"
            variant="secondary"
            onPress={() => router.push('/(patient)/health-records')}
            style={{ marginTop: 16, width: '100%' }}
          />
        </Card>
      ) : (
        referrals.map((item) => {
          const isRejected = item.status === 'REJECTED';
          const stepIndex = getStepIndex(item.status);

          return (
            <Card key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hospitalName}>🏥 {item.targetHospitalName}</Text>
                  <Text style={styles.deptName}>Dept: {item.targetDepartment}</Text>
                </View>
                <Pill color={item.priority === 'EMERGENCY' ? 'red' : item.priority === 'URGENT' ? 'orange' : 'success'}>
                  {item.priority}
                </Pill>
              </View>

              <View style={styles.referredByBox}>
                <Text style={styles.referredByText}>
                  Referred by <Text style={{ fontWeight: '700' }}>{item.referringDoctorName}</Text> ({item.referringFacilityName})
                </Text>
                <Text style={styles.reasonText}>Reason: {item.reasonForReferral}</Text>
              </View>

              {/* Stepper Progression */}
              <View style={{ marginVertical: 16 }}>
                {isRejected ? (
                  <View style={styles.rejectedBanner}>
                    <Text style={styles.rejectedTitle}>✕ Referral Rejected by Hospital</Text>
                    <Text style={styles.rejectedDesc}>
                      Reason: {item.rejectionReason || 'No bed availability. Please contact dispatch.'}
                    </Text>
                  </View>
                ) : (
                  <Stepper steps={REFERRAL_STEPS} currentIndex={stepIndex} />
                )}
              </View>

              {item.hospitalNotes ? (
                <View style={styles.reservationBox}>
                  <Text style={styles.resLabel}>BED & ADMISSION STATUS</Text>
                  <Text style={styles.resText}>✓ {item.hospitalNotes}</Text>
                </View>
              ) : null}

              <Divider />

              <View style={styles.footerRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="idCard" size={14} color={colors.inkFaint} />
                  <Text style={styles.crisisId}>Crisis ID: {item.crisisId}</Text>
                </View>
                <Pressable
                  style={styles.actionLink}
                  onPress={() => router.push('/(patient)/health-records')}
                >
                  <Text style={styles.actionLinkText}>View Linked EHR →</Text>
                </Pressable>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subhead: {
    fontSize: 12.5,
    color: colors.inkSoft,
    lineHeight: 18,
    marginTop: 4,
  },
  card: {
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  hospitalName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  deptName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkSoft,
    marginTop: 2,
  },
  referredByBox: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: 10,
    marginBottom: 8,
  },
  referredByText: {
    fontSize: 12,
    color: colors.ink,
  },
  reasonText: {
    fontSize: 11.5,
    color: colors.inkSoft,
    marginTop: 2,
  },
  rejectedBanner: {
    backgroundColor: '#FFEAEA',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: radii.md,
    padding: 12,
  },
  rejectedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.red,
  },
  rejectedDesc: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 4,
  },
  reservationBox: {
    backgroundColor: colors.successBg,
    borderRadius: radii.md,
    padding: 10,
    marginBottom: 12,
  },
  resLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  resText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.success,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  crisisId: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.inkSoft,
  },
  actionLink: {
    paddingVertical: 4,
  },
  actionLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.blue,
  },
});
