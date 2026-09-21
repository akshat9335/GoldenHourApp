import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  RefreshControl,
  Modal,
  Alert,
  ScrollView,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { colors, radii, shadow } from '@/constants/theme';
import {
  Screen,
  Card,
  Pill,
  Icon,
  TopBar,
  HospitalNav,
  HTitle,
  LabelEyebrow,
  Button,
} from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

interface DiagnosticBooking {
  id: string;
  patientUid: string;
  patientName: string;
  patientPhone: string;
  crisisId: string;
  facilityId: string;
  facilityName: string;
  testName: string;
  category: 'PATHOLOGY' | 'RADIOLOGY' | 'CARDIOLOGY';
  prescribedByDoctorId?: string;
  prescribedByDoctorName?: string;
  scheduledDate: string;
  slotTime: string;
  status: 'REQUESTED' | 'CONFIRMED' | 'SAMPLE_COLLECTED' | 'REPORT_READY' | 'CANCELLED';
  reportUrl?: string | null;
  reportSummary?: string | null;
  price: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_FILTERS = ['ALL', 'REQUESTED', 'SAMPLE_COLLECTED', 'REPORT_READY'] as const;

export default function HospitalDiagnosticLabDeskScreen() {
  const userProfile = useAppStore((s) => s.userProfile);
  const facilityId = userProfile?.hospitalId || userProfile?.uid || 'hosp-martha-blr';

  const [bookings, setBookings] = useState<DiagnosticBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');

  // Report Upload / Enter Result Modal State
  const [selectedBooking, setSelectedBooking] = useState<DiagnosticBooking | null>(null);
  const [reportSummary, setReportSummary] = useState('');
  const [reportUrl, setReportUrl] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await api.diagnostics.getFacilityBookings(facilityId);
      const list = Array.isArray(res) ? res : res?.data || [];
      setBookings(list);
    } catch (_err) {
      // handled
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [facilityId]);

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 6000);
    return () => clearInterval(interval);
  }, [fetchBookings]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const openReportModal = (booking: DiagnosticBooking) => {
    setSelectedBooking(booking);
    setReportSummary(booking.reportSummary || '');
    setReportUrl(
      booking.reportUrl ||
        `https://goldenhour-reports.health/${booking.category.toLowerCase()}-${booking.id.slice(-5)}.pdf`
    );
  };

  const handleSaveReport = async () => {
    if (!selectedBooking) return;
    if (!reportSummary.trim()) {
      Alert.alert('Required', 'Please enter laboratory test findings/summary.');
      return;
    }

    setSubmittingReport(true);
    try {
      await api.diagnostics.uploadReport(selectedBooking.id, {
        reportSummary: reportSummary.trim(),
        reportUrl: reportUrl.trim() || undefined,
        status: 'REPORT_READY',
      });

      // Local optimistic update
      setBookings((prev) =>
        prev.map((b) =>
          b.id === selectedBooking.id
            ? {
                ...b,
                status: 'REPORT_READY',
                reportSummary: reportSummary.trim(),
                reportUrl: reportUrl.trim(),
              }
            : b
        )
      );

      setSelectedBooking(null);
      Alert.alert('Report Published', 'Diagnostic report marked as READY and shared with patient.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleCollectSample = async (booking: DiagnosticBooking) => {
    try {
      await api.diagnostics.uploadReport(booking.id, {
        reportSummary: 'Sample collected at diagnostic lab station.',
        status: 'SAMPLE_COLLECTED',
      });
      fetchBookings();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update status.');
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (selectedFilter === 'ALL') return true;
    return b.status === selectedFilter;
  });

  const counts = {
    all: bookings.length,
    requested: bookings.filter((b) => b.status === 'REQUESTED').length,
    sampleCollected: bookings.filter((b) => b.status === 'SAMPLE_COLLECTED').length,
    ready: bookings.filter((b) => b.status === 'REPORT_READY').length,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.red]}
            tintColor={colors.red}
          />
        }
      >
        <TopBar title="Diagnostic Lab Desk" back />

        {/* Top Summary KPI Cards */}
        <View style={styles.kpiRow}>
          <Card style={[styles.kpiCard, { borderColor: '#FECACA' }]}>
            <Text style={[styles.kpiNum, { color: colors.red }]}>{counts.requested}</Text>
            <Text style={styles.kpiLabel}>PENDING SAMPLES</Text>
          </Card>
          <Card style={[styles.kpiCard, { borderColor: '#FDE68A' }]}>
            <Text style={[styles.kpiNum, { color: colors.amber }]}>{counts.sampleCollected}</Text>
            <Text style={styles.kpiLabel}>IN PROCESSING</Text>
          </Card>
          <Card style={[styles.kpiCard, { borderColor: '#BBF7D0' }]}>
            <Text style={[styles.kpiNum, { color: colors.success }]}>{counts.ready}</Text>
            <Text style={styles.kpiLabel}>REPORTS READY</Text>
          </Card>
        </View>

        {/* Status Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {STATUS_FILTERS.map((f) => {
            const isSel = selectedFilter === f;
            const label =
              f === 'ALL'
                ? `All (${counts.all})`
                : f === 'REQUESTED'
                ? `Pending (${counts.requested})`
                : f === 'SAMPLE_COLLECTED'
                ? `Testing (${counts.sampleCollected})`
                : `Ready (${counts.ready})`;
            return (
              <Pressable
                key={f}
                onPress={() => setSelectedFilter(f)}
                style={[styles.filterChip, isSel && styles.filterChipSelected]}
              >
                <Text style={[styles.filterChipText, isSel && styles.filterChipTextSelected]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <LabelEyebrow>
          LABORATORY TEST QUEUE ({filteredBookings.length})
        </LabelEyebrow>

        {filteredBookings.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No test requests in this queue</Text>
            <Text style={styles.emptySub}>All diagnostic test requests are currently processed.</Text>
          </Card>
        ) : (
          filteredBookings.map((b) => {
            let pillColor: 'red' | 'amber' | 'success' | 'grey' = 'amber';
            let pillLabel = b.status.replace('_', ' ');

            if (b.status === 'REQUESTED') {
              pillColor = 'red';
              pillLabel = 'SAMPLE NEEDED';
            } else if (b.status === 'SAMPLE_COLLECTED') {
              pillColor = 'amber';
              pillLabel = 'IN LAB TESTING';
            } else if (b.status === 'REPORT_READY') {
              pillColor = 'success';
              pillLabel = 'REPORT READY';
            }

            return (
              <Card key={b.id} style={styles.bookingCard}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.testName}>{b.testName}</Text>
                    <Text style={styles.metaSub}>
                      {b.category} · Scheduled: {b.scheduledDate} ({b.slotTime})
                    </Text>
                  </View>
                  <Pill color={pillColor}>{pillLabel}</Pill>
                </View>

                {/* Patient Information Box */}
                <View style={styles.patientInfoBox}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientName}>{b.patientName}</Text>
                    <Text style={styles.patientCrisis}>
                      Ref: {b.crisisId} {b.prescribedByDoctorName ? `· Dr. ${b.prescribedByDoctorName}` : ''}
                    </Text>
                  </View>
                  {b.patientPhone ? (
                    <TouchableOpacity
                      style={styles.callSmallBtn}
                      onPress={() => Linking.openURL(`tel:${b.patientPhone}`)}
                      activeOpacity={0.8}
                    >
                      <Icon name="phone" size={12} color={colors.success} />
                      <Text style={styles.callSmallBtnText}>Call</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Existing Report Preview if available */}
                {b.reportSummary && (
                  <View style={styles.reportPreviewBox}>
                    <Text style={styles.reportPreviewLabel}>Latest Findings:</Text>
                    <Text style={styles.reportPreviewText}>{b.reportSummary}</Text>
                  </View>
                )}

                {/* Action Row */}
                <View style={styles.actionRow}>
                  {b.status === 'REQUESTED' && (
                    <TouchableOpacity
                      style={styles.sampleCollectedBtn}
                      onPress={() => handleCollectSample(b)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.sampleCollectedText}>🧪 Mark Sample Collected</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.uploadBtn}
                    onPress={() => openReportModal(b)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.uploadBtnText}>
                      {b.status === 'REPORT_READY' ? '📝 Edit Lab Findings' : '📋 Upload / Enter Report'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}
      </Screen>

      {/* Upload Report Modal */}
      <Modal visible={!!selectedBooking} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <HTitle size={17}>Enter Test Report</HTitle>
                <Text style={{ fontSize: 12, color: colors.inkSoft, marginTop: 2 }}>
                  {selectedBooking?.patientName} · {selectedBooking?.testName}
                </Text>
              </View>
              <Pressable onPress={() => setSelectedBooking(null)} hitSlop={8}>
                <Icon name="close" size={20} color={colors.ink} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Diagnostic Findings & Summary *</Text>
              <TextInput
                style={[styles.modalInput, { height: 90, textAlignVertical: 'top' }]}
                placeholder="e.g. Troponin-I within normal limits (<0.04 ng/mL). No acute ischemia detected."
                placeholderTextColor={colors.inkFaint}
                multiline
                value={reportSummary}
                onChangeText={setReportSummary}
              />

              <Text style={styles.inputLabel}>Report Document / PDF URL</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="https://hospital-lab.org/reports/test-102.pdf"
                placeholderTextColor={colors.inkFaint}
                value={reportUrl}
                onChangeText={setReportUrl}
              />

              <View style={{ marginTop: 16, marginBottom: 10 }}>
                <Button
                  title={submittingReport ? 'Publishing Report...' : 'Publish & Complete Report'}
                  onPress={handleSaveReport}
                  loading={submittingReport}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <HospitalNav active="/(hospital)/diagnostics" />
    </View>
  );
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  kpiCard: { flex: 1, padding: 12, alignItems: 'center', borderWidth: 1.5 },
  kpiNum: { fontSize: 20, fontWeight: '800' },
  kpiLabel: { fontSize: 9.5, fontWeight: '700', color: colors.inkFaint, marginTop: 2 },
  filterScroll: { flexDirection: 'row', gap: 8, paddingBottom: 12 },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  filterChipSelected: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  filterChipText: { fontSize: 12, fontWeight: '700', color: colors.ink },
  filterChipTextSelected: { color: '#fff' },
  emptyCard: { padding: 24, alignItems: 'center', marginVertical: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  emptySub: { fontSize: 12, color: colors.inkFaint, marginTop: 4, textAlign: 'center' },
  bookingCard: { padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.line },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  testName: { fontSize: 14, fontWeight: '700', color: colors.ink },
  metaSub: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
  patientInfoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
    padding: 10,
    marginTop: 10,
  },
  patientName: { fontSize: 13, fontWeight: '700', color: colors.ink },
  patientCrisis: { fontSize: 11, color: colors.inkFaint, marginTop: 1 },
  callSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  callSmallBtnText: { fontSize: 11, fontWeight: '700', color: colors.success },
  reportPreviewBox: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  reportPreviewLabel: { fontSize: 10.5, fontWeight: '700', color: colors.success },
  reportPreviewText: { fontSize: 11.5, color: colors.ink, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  sampleCollectedBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: radii.md,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleCollectedText: { fontSize: 12, fontWeight: '700', color: colors.blue },
  uploadBtn: {
    flex: 1,
    backgroundColor: colors.red,
    borderRadius: radii.md,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputLabel: { fontSize: 11.5, fontWeight: '700', color: colors.inkSoft, marginBottom: 6, textTransform: 'uppercase' },
  modalInput: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: colors.ink,
    marginBottom: 14,
  },
});
