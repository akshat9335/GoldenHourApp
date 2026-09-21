import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Alert,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { colors, radii, shadow } from '@/constants/theme';
import {
  Screen,
  Card,
  Pill,
  Icon,
  TopBar,
  PatientNav,
  HTitle,
  LabelEyebrow,
  Button,
} from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';

interface CatalogItem {
  id: string;
  name: string;
  category: 'CARDIOLOGY' | 'RADIOLOGY' | 'PATHOLOGY';
  description: string;
  turnaroundTime: string;
  price: number;
  isEmergency: boolean;
  fastingRequired?: boolean;
}

interface FacilityOption {
  id: string;
  name: string;
  distance: string;
}

const FACILITIES: FacilityOption[] = [
  { id: 'hosp-martha-blr', name: "St. Martha's Hospital Lab & Trauma Desk", distance: '2.4 km' },
  { id: 'hosp-fortis-blr', name: 'Fortis Emergency Diagnostics & Imaging', distance: '4.1 km' },
  { id: 'hosp-apollo-blr', name: 'Apollo Speciality 24/7 Diagnostics', distance: '5.8 km' },
];

const TIME_SLOTS = [
  '09:00 AM',
  '10:30 AM',
  '12:00 PM',
  '02:30 PM',
  '04:00 PM',
  '06:30 PM (Stat/ER)',
];

export default function PatientDiagnosticsBookingScreen() {
  const userProfile = useAppStore((s) => s.userProfile);
  const emergencyId = useAppStore((s) => s.emergencyId);
  const goldenHourId = useAppStore((s) => s.goldenHourId);
  const activeCrisisId = emergencyId || goldenHourId || userProfile?.crisisId;

  const [activeTab, setActiveTab] = useState<'BOOK' | 'MY_TESTS'>('BOOK');
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Booking Form State
  const [selectedTest, setSelectedTest] = useState<CatalogItem | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<FacilityOption>(FACILITIES[0]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<string>(TIME_SLOTS[0]);
  const [patientNotes, setPatientNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [catRes, bookingsRes]: any = await Promise.all([
        api.diagnostics.getCatalog().catch(() => ({ data: [] })),
        api.diagnostics.getMyBookings(userProfile?.uid).catch(() => ({ data: [] })),
      ]);

      const catList = Array.isArray(catRes) ? catRes : catRes?.data || [];
      const bookingsList = Array.isArray(bookingsRes) ? bookingsRes : bookingsRes?.data || [];

      setCatalog(catList);
      setMyBookings(bookingsList);
      if (catList.length > 0 && !selectedTest) {
        setSelectedTest(catList[0]);
      }
    } catch (_err) {
      // handled
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userProfile?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleConfirmBooking = async () => {
    if (!selectedTest) {
      Alert.alert('Required', 'Please select a diagnostic test.');
      return;
    }

    setBookingLoading(true);
    try {
      await api.diagnostics.bookTest({
        patientUid: userProfile?.uid || 'user-patient-1',
        patientName: userProfile?.name || 'Emergency Patient',
        patientPhone: userProfile?.phone || '+91-98765-43210',
        crisisId: activeCrisisId || `CRISIS-${Math.floor(1000 + Math.random() * 9000)}`,
        facilityId: selectedFacility.id,
        facilityName: selectedFacility.name,
        testName: selectedTest.name,
        category: selectedTest.category,
        scheduledDate: selectedDate,
        slotTime: selectedSlot,
        price: selectedTest.price,
      });

      Alert.alert(
        'Booking Confirmed! 🎉',
        `Your booking for ${selectedTest.name} at ${selectedFacility.name} has been confirmed for ${selectedSlot}.`
      );

      loadData();
      setActiveTab('MY_TESTS');
    } catch (err: any) {
      Alert.alert('Booking Error', err?.message || 'Failed to submit test booking.');
    } finally {
      setBookingLoading(false);
    }
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
        <TopBar title="Diagnostic Lab & Tests" back />

        {/* Tab Switcher: Book Test vs My Bookings */}
        <View style={styles.tabBar}>
          <Pressable
            onPress={() => setActiveTab('BOOK')}
            style={[styles.tabBtn, activeTab === 'BOOK' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, activeTab === 'BOOK' && styles.tabBtnTextActive]}>
              Book New Test
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('MY_TESTS')}
            style={[styles.tabBtn, activeTab === 'MY_TESTS' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, activeTab === 'MY_TESTS' && styles.tabBtnTextActive]}>
              My Reports ({myBookings.length})
            </Text>
          </Pressable>
        </View>

        {activeTab === 'BOOK' ? (
          <View>
            {/* Step 1: Select Diagnostic Test */}
            <LabelEyebrow>1. SELECT DIAGNOSTIC TEST</LabelEyebrow>
            <View style={styles.testGrid}>
              {catalog.map((test) => {
                const isSelected = selectedTest?.id === test.id;
                return (
                  <Pressable
                    key={test.id}
                    onPress={() => setSelectedTest(test)}
                    style={[styles.testCard, isSelected && styles.testCardSelected]}
                  >
                    <View style={styles.testCardTop}>
                      <Pill color={test.isEmergency ? 'red' : 'blue'}>
                        {test.isEmergency ? '🚨 Emergency' : test.category}
                      </Pill>
                      <Text style={styles.testPrice}>₹{test.price}</Text>
                    </View>
                    <Text style={styles.testTitle}>{test.name}</Text>
                    <Text style={styles.testSub} numberOfLines={2}>
                      {test.description}
                    </Text>
                    <View style={styles.tatRow}>
                      <Icon name="clock" size={12} color={colors.inkSoft} />
                      <Text style={styles.tatText}>Result in {test.turnaroundTime}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Step 2: Select Preferred Facility */}
            <LabelEyebrow>2. SELECT HOSPITAL / LAB FACILITY</LabelEyebrow>
            {FACILITIES.map((fac) => {
              const isSel = selectedFacility.id === fac.id;
              return (
                <Pressable
                  key={fac.id}
                  onPress={() => setSelectedFacility(fac)}
                  style={[styles.facilityCard, isSel && styles.facilityCardSelected]}
                >
                  <View style={styles.radioCircle}>
                    {isSel && <View style={styles.radioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.facilityName}>{fac.name}</Text>
                    <Text style={styles.facilityDist}>📍 {fac.distance} away · 24/7 Processing</Text>
                  </View>
                </Pressable>
              );
            })}

            {/* Step 3: Select Date & Time Slot */}
            <LabelEyebrow>3. SELECT TIME SLOT</LabelEyebrow>
            <View style={styles.slotGrid}>
              {TIME_SLOTS.map((slot) => {
                const isSel = selectedSlot === slot;
                return (
                  <Pressable
                    key={slot}
                    onPress={() => setSelectedSlot(slot)}
                    style={[styles.slotChip, isSel && styles.slotChipSelected]}
                  >
                    <Text style={[styles.slotChipText, isSel && styles.slotChipTextSelected]}>
                      {slot}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Confirm Booking Action Button */}
            <View style={{ marginTop: 20, marginBottom: 24 }}>
              <Button
                title={
                  bookingLoading
                    ? 'Confirming Slot...'
                    : `Confirm Booking (₹${selectedTest?.price || 0})`
                }
                onPress={handleConfirmBooking}
                loading={bookingLoading}
              />
            </View>
          </View>
        ) : (
          /* My Reports & Bookings Tab */
          <View>
            <LabelEyebrow>YOUR BOOKED TESTS & RESULTS ({myBookings.length})</LabelEyebrow>
            {myBookings.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No test bookings yet</Text>
                <Text style={styles.emptySub}>
                  You haven't requested any diagnostic laboratory tests yet.
                </Text>
              </Card>
            ) : (
              myBookings.map((b) => {
                const isReady = b.status === 'REPORT_READY';
                return (
                  <Card key={b.id} style={styles.myBookingCard}>
                    <View style={styles.myBookingTop}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.myBookingTitle}>{b.testName}</Text>
                        <Text style={styles.myBookingFacility}>{b.facilityName}</Text>
                      </View>
                      <Pill color={isReady ? 'success' : 'amber'}>
                        {isReady ? '🟢 Report Ready' : '🟡 In Progress'}
                      </Pill>
                    </View>

                    <Text style={styles.myBookingDate}>
                      📅 Scheduled: {b.scheduledDate} at {b.slotTime}
                    </Text>

                    {b.reportSummary && (
                      <View style={styles.findingsBox}>
                        <Text style={styles.findingsTitle}>Laboratory Findings:</Text>
                        <Text style={styles.findingsText}>{b.reportSummary}</Text>
                      </View>
                    )}

                    <View style={styles.myBookingBtnRow}>
                      {isReady && b.reportUrl ? (
                        <TouchableOpacity
                          style={styles.downloadBtn}
                          onPress={() => Linking.openURL(b.reportUrl)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.downloadBtnText}>📥 Download PDF Report</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.processingBadge}>
                          <ActivityIndicator size="small" color={colors.amber} />
                          <Text style={styles.processingText}>
                            Sample is currently in analysis at laboratory
                          </Text>
                        </View>
                      )}
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        )}
      </Screen>
      <PatientNav active="" />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: radii.pill,
    padding: 4,
    borderWidth: 1.5,
    borderColor: colors.line,
    marginBottom: 16,
  },
  tabBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radii.pill },
  tabBtnActive: { backgroundColor: colors.red },
  tabBtnText: { fontSize: 12.5, fontWeight: '700', color: colors.inkSoft },
  tabBtnTextActive: { color: '#fff' },
  testGrid: { gap: 10, marginBottom: 16 },
  testCard: {
    padding: 14,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: '#fff',
  },
  testCardSelected: { borderColor: colors.red, backgroundColor: '#FEF2F2' },
  testCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  testPrice: { fontSize: 14, fontWeight: '800', color: colors.ink },
  testTitle: { fontSize: 13.5, fontWeight: '700', color: colors.ink, marginTop: 8 },
  testSub: { fontSize: 11.5, color: colors.inkSoft, marginTop: 3, lineHeight: 16 },
  tatRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  tatText: { fontSize: 11, color: colors.inkSoft, fontWeight: '600' },
  facilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  facilityCardSelected: { borderColor: colors.red, backgroundColor: '#FEF2F2' },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.red },
  facilityName: { fontSize: 13, fontWeight: '700', color: colors.ink },
  facilityDist: { fontSize: 11, color: colors.inkSoft, marginTop: 2 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  slotChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: '#fff',
  },
  slotChipSelected: { backgroundColor: colors.red, borderColor: colors.red },
  slotChipText: { fontSize: 11.5, fontWeight: '700', color: colors.ink },
  slotChipTextSelected: { color: '#fff' },
  emptyCard: { padding: 24, alignItems: 'center', marginVertical: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  emptySub: { fontSize: 12, color: colors.inkFaint, marginTop: 4, textAlign: 'center' },
  myBookingCard: { padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.line },
  myBookingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  myBookingTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  myBookingFacility: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
  myBookingDate: { fontSize: 11.5, color: colors.inkFaint, marginTop: 8 },
  findingsBox: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
  },
  findingsTitle: { fontSize: 11, fontWeight: '700', color: colors.success },
  findingsText: { fontSize: 12, color: colors.ink, marginTop: 3, lineHeight: 16 },
  myBookingBtnRow: { marginTop: 12 },
  downloadBtn: {
    backgroundColor: colors.success,
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtnText: { fontSize: 12.5, fontWeight: '700', color: '#fff' },
  processingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: radii.md,
  },
  processingText: { fontSize: 11.5, color: colors.amber, fontWeight: '600' },
});
