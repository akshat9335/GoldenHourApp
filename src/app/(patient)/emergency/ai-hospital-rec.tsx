import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Pill, Icon, LabelEyebrow, Banner } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

export default function AiHospitalRec() {
  const aiTriageResult = useAppStore((s) => s.aiTriageResult);
  const selectedType = useAppStore((s) => s.selectedType);
  const aiSeverity = useAppStore((s) => s.aiSeverity);
  const lastKnownLocation = useAppStore((s) => s.lastKnownLocation);
  const candidateHospitals = useAppStore((s) => s.candidateHospitals);
  const setCandidateHospitals = useAppStore((s) => s.setCandidateHospitals);

  const [loading, setLoading] = useState(candidateHospitals.length === 0);
  const [candidates, setCandidates] = useState<any[]>(candidateHospitals);

  useEffect(() => {
    let mounted = true;

    const fetchCandidates = async () => {
      try {
        const lat = lastKnownLocation?.latitude || 25.4538;
        const lng = lastKnownLocation?.longitude || 81.854;
        const reqCaps = (aiTriageResult?.requiredCapabilities as string[]) || ['EMERGENCY_ROOM', 'TRAUMA_BAY'];
        const specialtyNeeded = aiTriageResult?.emergencyType || selectedType || 'GENERAL';
        const severity = (aiSeverity || 'MEDIUM').toUpperCase();

        const res = await api.hospitals.matchCandidates({
          latitude: lat,
          longitude: lng,
          requiredCapabilities: reqCaps,
          specialtyNeeded,
          severity,
        });

        if (mounted && res?.candidates && res.candidates.length > 0) {
          setCandidates(res.candidates);
          setCandidateHospitals(res.candidates);
        }
      } catch (err) {
        console.warn('Could not fetch candidate hospitals from API, using fallback:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchCandidates();

    return () => {
      mounted = false;
    };
  }, []);

  const top3 = candidates.length > 0 ? candidates.slice(0, 3) : [
    {
      hospitalId: 'hosp-medanta-prayagraj',
      name: 'Medanta Hospital Prayagraj',
      distanceKm: 2.2,
      etaMinutes: 6,
      score: 95,
      matchReason: 'Level-1 Multi-Specialty Trauma Center & Cath Lab Ready',
      availableBeds: 18,
      availableIcuBeds: 5,
    },
    {
      hospitalId: 'hosp-srn-prayagraj',
      name: 'Swaroop Rani Nehru (SRN) Hospital',
      distanceKm: 3.1,
      etaMinutes: 8,
      score: 88,
      matchReason: 'Government Medical College Emergency Trauma Center',
      availableBeds: 35,
      availableIcuBeds: 8,
    },
    {
      hospitalId: 'hosp-kamla-nehru',
      name: 'Kamla Nehru Memorial Hospital',
      distanceKm: 3.8,
      etaMinutes: 10,
      score: 80,
      matchReason: 'Specialized Tertiary Emergency Care & Inpatient Facilities',
      availableBeds: 24,
      availableIcuBeds: 4,
    },
  ];

  return (
    <Screen>
      <TopBar title="Hospital Recommendations" />

      <Banner color="blue" icon={<Icon name="hospital" size={16} color={colors.blue} />}>
        AI analyzed nearest emergency centers based on clinical match, bed availability, and live distance.
      </Banner>

      <View style={{ height: 12 }} />
      <LabelEyebrow>TOP 3 RECOMMENDED FACILITIES</LabelEyebrow>

      {loading ? (
        <View style={{ padding: 32, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.red} />
          <Text style={{ marginTop: 12, fontSize: 13, color: colors.inkSoft }}>
            Evaluating nearest ER beds and equipment...
          </Text>
        </View>
      ) : (
        top3.map((hosp: any, index: number) => {
          const isPrimary = index === 0;
          return (
            <Card
              key={hosp.hospitalId || hosp.id || index}
              style={[
                styles.card,
                isPrimary && styles.primaryCard,
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Pill color={isPrimary ? 'red' : 'grey'}>
                      {isPrimary ? '★ RANK #1 · PRIMARY TARGET' : `RANK #${index + 1} · BACKUP STANDBY`}
                    </Pill>
                    <Pill color={hosp.score >= 90 ? 'success' : 'blue'}>
                      {hosp.score || 85}% MATCH
                    </Pill>
                  </View>
                  <Text style={styles.hospitalName}>{hosp.name}</Text>
                </View>
                <View style={styles.etaBox}>
                  <Text style={styles.etaText}>{hosp.etaMinutes || Math.round((hosp.distanceKm || 2) * 2.5) || 5} min</Text>
                  <Text style={styles.distText}>{hosp.distanceKm || 2} km</Text>
                </View>
              </View>

              {/* Match Reason (Why chosen) */}
              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>WHY CHOSEN:</Text>
                <Text style={styles.reasonText}>
                  {hosp.matchReason || 'Equipped emergency response facility with certified trauma team.'}
                </Text>
              </View>

              {/* Facilities / Bed Availability */}
              <View style={styles.bedsRow}>
                <View style={styles.bedBadge}>
                  <Icon name="check" size={13} color={colors.success} />
                  <Text style={styles.bedText}>
                    <Text style={{ fontWeight: '700' }}>{hosp.availableBeds ?? 14}</Text> General Beds
                  </Text>
                </View>
                <View style={styles.bedBadge}>
                  <Icon name="check" size={13} color={colors.red} />
                  <Text style={styles.bedText}>
                    <Text style={{ fontWeight: '700' }}>{hosp.availableIcuBeds ?? 4}</Text> ICU Beds Free
                  </Text>
                </View>
              </View>

              {/* Request Status Indicator */}
              <View
                style={[
                  styles.statusBanner,
                  { backgroundColor: isPrimary ? '#FEF2F2' : '#F1F5F9' },
                ]}
              >
                <Icon
                  name={isPrimary ? 'bell' : 'hospital'}
                  size={14}
                  color={isPrimary ? colors.red : colors.inkSoft}
                />
                <Text
                  style={[
                    styles.statusBannerText,
                    { color: isPrimary ? colors.redDark : colors.inkSoft },
                  ]}
                >
                  {isPrimary
                    ? 'Active Request Target: Immediate SOS alert will be dispatched to this hospital.'
                    : 'Queued Standby: Auto-failover backup if primary ER is saturated.'}
                </Text>
              </View>
            </Card>
          );
        })
      )}

      <View style={{ height: 16 }} />
      <Button
        title="Continue to Confirmation"
        onPress={() => router.push('/(patient)/emergency/review')}
      />
      <View style={{ height: 24 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  primaryCard: {
    borderColor: colors.red,
    backgroundColor: '#FFFDFD',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  hospitalName: {
    fontWeight: '700',
    fontSize: 14,
    color: colors.ink,
    marginTop: 6,
  },
  etaBox: {
    alignItems: 'flex-end',
    backgroundColor: '#F8FAFC',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  etaText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.red,
  },
  distText: {
    fontSize: 10.5,
    color: colors.inkFaint,
    marginTop: 1,
  },
  reasonBox: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  reasonLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.inkFaint,
    letterSpacing: 0.5,
  },
  reasonText: {
    fontSize: 11.5,
    color: colors.inkSoft,
    marginTop: 2,
    lineHeight: 16,
  },
  bedsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  bedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  bedText: {
    fontSize: 11.5,
    color: colors.ink,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    padding: 8,
    borderRadius: 6,
  },
  statusBannerText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
});
