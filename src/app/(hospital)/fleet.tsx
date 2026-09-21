import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, Button, Icon, LabelEyebrow, HospitalNav } from '@/components/ui';
import { api } from '@/services/api';

export default function HospitalFleet() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Tab mode: 'id' (search by Golden Hour ID / Phone) or 'manual'
  const [addMode, setAddMode] = useState<'id' | 'manual'>('id');

  // Search by Golden Hour ID state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [linking, setLinking] = useState(false);

  // Manual entry state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehiclePlateNumber, setVehiclePlateNumber] = useState('');
  const [ambulanceType, setAmbulanceType] = useState('Advanced Life Support (ALS) / ICU');
  const [submittingManual, setSubmittingManual] = useState(false);

  const fetchDrivers = useCallback(async () => {
    try {
      const res: any = await api.hospitals.getDrivers();
      const list = Array.isArray(res) ? res : (res?.data || []);
      setDrivers(list);
    } catch (_err) {
      setDrivers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDrivers();
  };

  const handleSearchDriver = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Search Required', 'Please enter a Golden Hour ID (e.g. AS-1442) or registered phone number.');
      return;
    }

    setSearching(true);
    setSearchResult(null);
    try {
      const res: any = await api.hospitals.searchDriver(searchQuery.trim());
      const data = res?.data || res;
      setSearchResult(data);
    } catch (err: any) {
      Alert.alert('Not Found', err?.message || `No driver found matching "${searchQuery}". Check ID or phone.`);
    } finally {
      setSearching(false);
    }
  };

  const handleLinkSearchedDriver = async () => {
    if (!searchResult) return;

    setLinking(true);
    try {
      await api.hospitals.addDriver({
        driverUid: searchResult.uid,
        goldenHourId: searchResult.crisisId || searchResult.goldenHourId,
      });

      Alert.alert(
        'Driver Linked Successfully',
        `${searchResult.name} (Unit ${searchResult.vehiclePlateNumber}) is now linked to your hospital fleet!`
      );
      setModalVisible(false);
      setSearchResult(null);
      setSearchQuery('');
      fetchDrivers();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to link driver to hospital fleet.');
    } finally {
      setLinking(false);
    }
  };

  const handleAddManualDriver = async () => {
    if (!name.trim() || !phone.trim() || !vehiclePlateNumber.trim()) {
      Alert.alert('Incomplete Form', 'Please enter driver name, phone number, and vehicle plate number.');
      return;
    }

    setSubmittingManual(true);
    try {
      await api.hospitals.addDriver({
        name: name.trim(),
        phone: phone.trim(),
        licenseNumber: licenseNumber.trim() || 'LIC-' + Math.floor(100000 + Math.random() * 900000),
        vehiclePlateNumber: vehiclePlateNumber.trim().toUpperCase(),
        ambulanceType,
        availability: 'AVAILABLE',
      });

      Alert.alert('Driver Registered', `${name} and vehicle ${vehiclePlateNumber.toUpperCase()} added to hospital fleet.`);
      setModalVisible(false);
      setName('');
      setPhone('');
      setLicenseNumber('');
      setVehiclePlateNumber('');
      fetchDrivers();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to add driver to hospital fleet.');
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleUnlinkDriver = (drv: any) => {
    const driverId = drv.uid || drv.id;
    if (!driverId) return;

    Alert.alert(
      'Unlink Driver?',
      `Are you sure you want to unlink ${drv.name || 'this driver'} (Unit ${drv.vehiclePlateNumber || drv.ambulanceId || 'N/A'}) from your hospital fleet?\n\nThe driver will revert to Independent Fleet status and will receive alerts as a community responder.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink Driver',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.hospitals.unlinkDriver(driverId);
              Alert.alert('Driver Unlinked', `${drv.name || 'Driver'} is now independent.`);
              fetchDrivers();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to unlink driver.');
            }
          },
        },
      ]
    );
  };

  const availableCount = drivers.filter((d) => d.availability === 'AVAILABLE').length;
  const busyCount = drivers.filter((d) => d.availability === 'BUSY').length;
  const offlineCount = drivers.filter((d) => d.availability === 'OFFLINE').length;

  return (
    <View style={{ flex: 1 }}>
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
        <TopBar
          title="Hospital Fleet"
          back={true}
          onPressBack={() => router.replace('/(hospital)/dashboard')}
        />

        {/* Fleet Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.summaryTitle}>Linked Ambulance Fleet</Text>
              <Text style={styles.summarySub}>Dedicated emergency response pilots</Text>
            </View>
            <Pressable
              style={styles.addBtn}
              onPress={() => {
                setSearchResult(null);
                setSearchQuery('');
                setModalVisible(true);
              }}
              hitSlop={8}
            >
              <Text style={styles.addBtnText}>+ Add / Link Driver</Text>
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: colors.success }]}>{availableCount}</Text>
              <Text style={styles.statLbl}>AVAILABLE</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: colors.amber }]}>{busyCount}</Text>
              <Text style={styles.statLbl}>BUSY</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: colors.inkFaint }]}>{offlineCount}</Text>
              <Text style={styles.statLbl}>OFFLINE</Text>
            </View>
          </View>
        </Card>

        <LabelEyebrow>FLEET DRIVERS ({drivers.length})</LabelEyebrow>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="small" color={colors.red} />
            <Text style={styles.loadingText}>Loading hospital fleet...</Text>
          </View>
        ) : drivers.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Icon name="ambulance" size={28} color={colors.inkFaint} />
            <Text style={styles.emptyTitle}>No Drivers Linked Yet</Text>
            <Text style={styles.emptySub}>
              Link your drivers using their Golden Hour ID (e.g. AS-1442) or phone number to dispatch emergencies to them.
            </Text>
            <Button
              title="Link First Driver"
              variant="secondary"
              onPress={() => setModalVisible(true)}
              style={{ marginTop: 12 }}
            />
          </Card>
        ) : (
          drivers.map((drv, idx) => {
            const avail = (drv.availability || 'AVAILABLE').toUpperCase();
            const pillColor =
              avail === 'AVAILABLE' ? 'success' : avail === 'BUSY' ? 'amber' : 'grey';

            return (
              <Card key={drv.id || drv.uid || idx} style={styles.driverCard}>
                <View style={styles.driverHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.driverName}>{drv.name}</Text>
                    <Text style={styles.plateNumber}>Unit: {drv.vehiclePlateNumber || drv.ambulanceId || 'N/A'}</Text>
                    <Text style={styles.ambType}>{drv.ambulanceType || 'Basic Life Support (BLS)'}</Text>
                  </View>
                  <Pill color={pillColor}>{avail}</Pill>
                </View>

                <View style={styles.contactRow}>
                  <Text style={styles.contactText}>📞 {drv.phone || 'Phone not set'}</Text>
                  <Text style={styles.licenseText}>License: {drv.licenseNumber || 'Verified'}</Text>
                </View>

                <View style={styles.cardActionRow}>
                  {drv.phone ? (
                    <TouchableOpacity
                      style={styles.callBtn}
                      onPress={() => Linking.openURL(`tel:${drv.phone}`)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.callBtnText}>📞 Call Pilot</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={styles.unlinkBtn}
                    onPress={() => handleUnlinkDriver(drv)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.unlinkBtnText}>✕ Unlink</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}

        <View style={{ height: 90 }} />
      </Screen>

      <HospitalNav active="/(hospital)/staff" />

      {/* Add / Link Driver Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Driver to Fleet</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={10}>
                <Text style={styles.closeBtn}>✕</Text>
              </Pressable>
            </View>

            {/* Mode Switcher Tabs */}
            <View style={styles.tabSwitcher}>
              <TouchableOpacity
                style={[styles.tabBtn, addMode === 'id' && styles.tabBtnActive]}
                onPress={() => setAddMode('id')}
              >
                <Text style={[styles.tabBtnText, addMode === 'id' && styles.tabBtnTextActive]}>
                  🆔 By Golden Hour ID
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, addMode === 'manual' && styles.tabBtnActive]}
                onPress={() => setAddMode('manual')}
              >
                <Text style={[styles.tabBtnText, addMode === 'manual' && styles.tabBtnTextActive]}>
                  📝 Manual Form
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {addMode === 'id' ? (
                /* Tab 1: Search & Link via Golden Hour ID */
                <View>
                  <Text style={styles.inputLabel}>Driver's Golden Hour ID or Phone *</Text>
                  <View style={styles.searchRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="e.g. AS-1442 or 96479..."
                      placeholderTextColor={colors.inkFaint}
                      autoCapitalize="characters"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    <TouchableOpacity
                      style={styles.searchBtn}
                      onPress={handleSearchDriver}
                      disabled={searching}
                    >
                      {searching ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.searchBtnText}>Search</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.hintText}>
                    Tip: Ask your ambulance driver for the 🆔 Golden Hour ID shown on their ambulance console.
                  </Text>

                  {/* Search Result Preview Card */}
                  {searchResult && (
                    <Card style={styles.resultCard}>
                      <View style={styles.resultTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.resultName}>{searchResult.name}</Text>
                          <View style={styles.ghBadge}>
                            <Text style={styles.ghBadgeText}>Golden Hour ID: {searchResult.crisisId}</Text>
                          </View>
                        </View>
                        <Pill color="success">VERIFIED</Pill>
                      </View>

                      <View style={{ marginTop: 10, gap: 4 }}>
                        <Text style={styles.resultDetail}>
                          🚑 Vehicle: <Text style={{ fontWeight: '700', color: colors.ink }}>{searchResult.vehiclePlateNumber}</Text> ({searchResult.ambulanceType})
                        </Text>
                        <Text style={styles.resultDetail}>
                          📞 Phone: <Text style={{ fontWeight: '600' }}>{searchResult.phone}</Text>
                        </Text>
                        <Text style={styles.resultDetail}>
                          🏢 Current Fleet: <Text style={{ fontStyle: 'italic' }}>{searchResult.currentHospital}</Text>
                        </Text>
                      </View>

                      <View style={{ marginTop: 16 }}>
                        {searchResult.isAlreadyLinked ? (
                          <View style={{ gap: 8 }}>
                            <Pill color="success">✓ Already Linked to Your Hospital Fleet</Pill>
                            <Button
                              title="Unlink from Hospital Fleet"
                              variant="secondary"
                              onPress={() => {
                                setModalVisible(false);
                                handleUnlinkDriver(searchResult);
                              }}
                            />
                          </View>
                        ) : (
                          <Button
                            title={linking ? 'Linking...' : 'Confirm & Link to Hospital Fleet'}
                            disabled={linking}
                            loading={linking}
                            onPress={handleLinkSearchedDriver}
                          />
                        )}
                      </View>
                    </Card>
                  )}
                </View>
              ) : (
                /* Tab 2: Manual Entry */
                <View>
                  <Text style={styles.inputLabel}>Pilot / Driver Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Ramesh Kumar"
                    placeholderTextColor={colors.inkFaint}
                    value={name}
                    onChangeText={setName}
                  />

                  <Text style={styles.inputLabel}>Phone Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 9876543210"
                    placeholderTextColor={colors.inkFaint}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />

                  <Text style={styles.inputLabel}>Ambulance Vehicle Plate *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. KA-01-EA-1234"
                    placeholderTextColor={colors.inkFaint}
                    autoCapitalize="characters"
                    value={vehiclePlateNumber}
                    onChangeText={setVehiclePlateNumber}
                  />

                  <Text style={styles.inputLabel}>Driving License Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. DL-1420110012345"
                    placeholderTextColor={colors.inkFaint}
                    value={licenseNumber}
                    onChangeText={setLicenseNumber}
                  />

                  <Text style={styles.inputLabel}>Ambulance Type</Text>
                  <View style={styles.typeSelector}>
                    {['Basic Life Support (BLS)', 'Advanced Life Support (ALS) / ICU'].map((t) => (
                      <Pressable
                        key={t}
                        style={[styles.typeOption, ambulanceType === t && styles.typeOptionActive]}
                        onPress={() => setAmbulanceType(t)}
                      >
                        <Text style={[styles.typeText, ambulanceType === t && styles.typeTextActive]}>
                          {t}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={{ marginTop: 24, gap: 10 }}>
                    <Button
                      title={submittingManual ? 'Registering...' : 'Add to Hospital Fleet'}
                      disabled={submittingManual}
                      loading={submittingManual}
                      onPress={handleAddManualDriver}
                    />
                  </View>
                </View>
              )}

              <View style={{ marginTop: 12 }}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setModalVisible(false)}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: { padding: 16, marginBottom: 14 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  summarySub: { fontSize: 11.5, color: colors.inkFaint, marginTop: 2 },
  addBtn: {
    backgroundColor: colors.red,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLbl: { fontSize: 9, fontWeight: '700', color: colors.inkFaint, marginTop: 2 },
  centerLoading: { paddingVertical: 40, alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 12, color: colors.inkSoft },
  emptyCard: { padding: 24, alignItems: 'center', marginVertical: 10, backgroundColor: '#F8FAFC' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginTop: 10 },
  emptySub: { fontSize: 12, color: colors.inkFaint, textAlign: 'center', marginTop: 4, lineHeight: 16 },
  driverCard: { padding: 14, marginBottom: 10 },
  driverHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  driverName: { fontSize: 15, fontWeight: '700', color: colors.ink },
  plateNumber: { fontSize: 12, fontWeight: '700', color: colors.red, marginTop: 2 },
  ambType: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  contactText: { fontSize: 11.5, color: colors.inkSoft, fontWeight: '600' },
  licenseText: { fontSize: 11, color: colors.inkFaint },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '88%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  closeBtn: { fontSize: 20, color: colors.inkFaint, fontWeight: '700' },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  tabBtnTextActive: {
    color: colors.red,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchBtn: {
    backgroundColor: colors.red,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  hintText: {
    fontSize: 11,
    color: colors.inkFaint,
    marginTop: 6,
    lineHeight: 15,
  },
  resultCard: {
    padding: 14,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: colors.success,
    backgroundColor: '#F0FDF4',
  },
  resultTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  resultName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  ghBadge: {
    backgroundColor: '#DCFCE7',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  ghBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  resultDetail: {
    fontSize: 12.5,
    color: colors.inkSoft,
  },
  inputLabel: { fontSize: 12, fontWeight: '700', color: colors.inkSoft, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
  },
  typeSelector: { gap: 8, marginTop: 4 },
  typeOption: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#F8FAFC',
  },
  typeOptionActive: {
    borderColor: colors.red,
    backgroundColor: '#FEF2F2',
  },
  typeText: { fontSize: 12, color: colors.inkSoft, fontWeight: '600' },
  typeTextActive: { color: colors.red, fontWeight: '700' },
  cardActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  callBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.blue,
  },
  unlinkBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlinkBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.red,
  },
});
