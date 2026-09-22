import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Card, Pill, Icon, SosHold, PatientNav, Divider } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/services/api';
import {
  initDeviceLocation,
  setManualLocation,
  PRAYAGRAJ_HUBS,
  searchAddressGeocode,
  refreshDeviceLocation,
} from '@/services/deviceLocation';

export default function PatientHome() {
  const voiceSosEnabled = useAppStore((s) => s.voiceSosEnabled);
  const voiceSosPhrase = useAppStore((s) => s.voiceSosPhrase);
  const userProfile = useAppStore((s) => s.userProfile);
  const setUserProfile = useAppStore((s) => s.setUserProfile);
  const locationAddress = useAppStore((s) => s.locationAddress);
  const lastKnownLocation = useAppStore((s) => s.lastKnownLocation);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ name: string; latitude: number; longitude: number }>>([]);
  const [searching, setSearching] = useState(false);
  const [calibrating, setCalibrating] = useState(false);

  useEffect(() => {
    // Dynamically request OS location permission and acquire live satellite GPS from user's phone hardware
    initDeviceLocation();

    api.users.getProfile().then((profile) => {
      if (profile) {
        setUserProfile(profile);
      }
    }).catch(() => {});
  }, []);

  const displayName = userProfile?.name || 'Golden Hour User';
  const firstName = displayName.split(' ')[0] || 'User';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'GH';

  const resetEmergencySession = useAppStore((s) => s.resetEmergencySession);

  const startEmergency = () => {
    resetEmergencySession();
    router.push('/(patient)/emergency/select-type');
  };

  const handleSelectHub = (hub: { name: string; latitude: number; longitude: number }) => {
    setManualLocation({ latitude: hub.latitude, longitude: hub.longitude }, hub.name);
    setPickerVisible(false);
    setSearchQuery('');
    setSearchResults([]);

    const user = useAppStore.getState().userProfile;
    const role = user?.role || (user?.roles && user.roles[0]) || 'patient';
    api.location.updateLocation({ lat: hub.latitude, lng: hub.longitude, role }).catch(() => {});
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text || text.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchAddressGeocode(text);
      setSearchResults(results);
    } catch {} finally {
      setSearching(false);
    }
  };

  const handleCalibrateGps = async () => {
    setCalibrating(true);
    await refreshDeviceLocation();
    setCalibrating(false);
    setPickerVisible(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen padBottom={95}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>EMERGENCY DASHBOARD</Text>
            <Text style={styles.name}>{displayName}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              style={styles.switchRoleBtn}
              onPress={() => router.push('/role-selection')}
            >
              <Text style={styles.switchRoleText}>Role</Text>
            </Pressable>
            <Pressable
              style={styles.avatarBtn}
              onPress={() => router.push('/(patient)/profile')}
            >
              <Text style={styles.avatarText}>
                {firstName.charAt(0).toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Swiggy/Zomato style Interactive Location Bar */}
        <TouchableOpacity onPress={() => setPickerVisible(true)} activeOpacity={0.8}>
          <Card style={styles.locationCard}>
            <Icon name="gps" color={lastKnownLocation ? colors.success : colors.amber} />
            <View style={{ flex: 1, marginHorizontal: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.locTitle}>
                  {lastKnownLocation ? '📍 Current Incident Area' : '🛰️ Acquiring GPS...'}
                </Text>
                <Text style={{ fontSize: 10, color: colors.red, fontWeight: '700' }}>[Change ▾]</Text>
              </View>
              <Text style={styles.locSub} numberOfLines={2}>
                {locationAddress
                  ? `${locationAddress}${lastKnownLocation ? ` (${lastKnownLocation.latitude.toFixed(4)}°N, ${lastKnownLocation.longitude.toFixed(4)}°E)` : ''}`
                  : (lastKnownLocation
                      ? `${lastKnownLocation.latitude.toFixed(4)}°N, ${lastKnownLocation.longitude.toFixed(4)}°E`
                      : 'Tap to select or detect area...')}
              </Text>
            </View>
            <Pill color={lastKnownLocation ? 'success' : 'amber'}>
              {lastKnownLocation ? 'LOCKED' : 'DETECTING'}
            </Pill>
          </Card>
        </TouchableOpacity>

        {/* Area Selection / Search Modal (Swiggy / Zomato style) */}
        <Modal visible={pickerVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Select Incident Location</Text>
                  <Text style={styles.modalSub}>Choose your area or search any landmark</Text>
                </View>
                <TouchableOpacity onPress={() => setPickerVisible(false)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Instant GPS Detect Button */}
              <TouchableOpacity
                style={styles.gpsDetectBtn}
                onPress={handleCalibrateGps}
                disabled={calibrating}
                activeOpacity={0.8}
              >
                {calibrating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={{ fontSize: 15 }}>🛰️</Text>
                    <Text style={styles.gpsDetectText}>Detect Current Device GPS</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Search Input */}
              <View style={styles.searchBox}>
                <Text style={{ fontSize: 16 }}>🔍</Text>
                <TextInput
                  placeholder="Search area (e.g., Allahpur, Katra, Civil Lines)..."
                  value={searchQuery}
                  onChangeText={handleSearch}
                  style={styles.searchInput}
                  placeholderTextColor={colors.inkFaint}
                />
                {searching ? <ActivityIndicator size="small" color={colors.red} /> : null}
              </View>

              {/* Search Autocomplete Results */}
              {searchResults.length > 0 && (
                <View style={styles.searchResultsWrap}>
                  <Text style={styles.sectionHeading}>SEARCH RESULTS</Text>
                  {searchResults.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.resultRow}
                      onPress={() => handleSelectHub(item)}
                    >
                      <Icon name="pin" size={16} color={colors.red} />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.resultTitle}>{item.name}</Text>
                        <Text style={styles.resultCoords}>
                          {item.latitude.toFixed(4)}° N, {item.longitude.toFixed(4)}° E
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Popular Neighborhood Hubs */}
              <Text style={styles.sectionHeading}>POPULAR HUBS</Text>
              <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
                <View style={styles.hubGrid}>
                  {PRAYAGRAJ_HUBS.map((hub) => {
                    const isSelected = locationAddress === hub.name;
                    return (
                      <TouchableOpacity
                        key={hub.name}
                        style={[styles.hubCard, isSelected && styles.hubCardSelected]}
                        onPress={() => handleSelectHub(hub)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Icon name="pin" size={14} color={isSelected ? '#fff' : colors.red} />
                          <Text style={[styles.hubName, isSelected && styles.hubNameSelected]}>
                            {hub.name.replace(', Prayagraj', '')}
                          </Text>
                        </View>
                        <Text style={[styles.hubCoords, isSelected && styles.hubCoordsSelected]}>
                          {hub.latitude.toFixed(3)}°N, {hub.longitude.toFixed(3)}°E
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <View style={styles.sosZone}>
          <SosHold
            label="SOS"
            sublabel="EMERGENCY"
            onPress={startEmergency}
            onConfirm={startEmergency}
          />
          <Text style={styles.sosHint}>
            {voiceSosEnabled
              ? `Say "${voiceSosPhrase}" or press SOS to report emergency`
              : 'Press SOS to report emergency with photo, voice & AI assistance'}
          </Text>
        </View>

        <View style={styles.quickRow}>
          <QuickAction icon="ai" color={colors.blue} label="AI First Aid" onPress={() => router.push('/(patient)/ai-home')} />
          <QuickAction icon="ambulance" color={colors.red} label="Report Accident" onPress={startEmergency} />
          <QuickAction icon="hospital" color={colors.ink} label="Hospitals" onPress={() => router.push('/nearby-hospitals')} />
        </View>

        <Text style={styles.eyebrow}>QUICK ACCESS</Text>
        <Card style={{ padding: 4 }}>
          <Pressable style={styles.row} onPress={() => router.push('/(patient)/consult-doctor')}>
            <Icon name="doctor" color={colors.ink} />
            <Text style={styles.rowLabel}>Consult Doctor</Text>
            <Icon name="chevR" color={colors.inkFaint} />
          </Pressable>
          <Divider />
          <Pressable style={styles.row} onPress={() => router.push('/contacts-setup')}>
            <Icon name="phone" color={colors.ink} />
            <Text style={styles.rowLabel}>Emergency Contacts</Text>
            <Icon name="chevR" color={colors.inkFaint} />
          </Pressable>
          <Divider />
          <Pressable style={styles.row} onPress={() => router.push('/(patient)/history')}>
            <Icon name="history" color={colors.ink} />
            <Text style={styles.rowLabel}>Emergency History</Text>
            <Icon name="chevR" color={colors.inkFaint} />
          </Pressable>
        </Card>
      </Screen>
      <PatientNav active="/(patient)/home" />
    </View>
  );
}

function QuickAction({ icon, color, label, onPress }: any) {
  return (
    <Pressable style={styles.quickCard} onPress={onPress}>
      <Icon name={icon} color={color} />
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  greeting: { fontSize: 11.5, color: colors.inkFaint },
  name: { fontWeight: '700', fontSize: 18, color: colors.ink },
  switchRoleBtn: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  switchRoleText: { fontSize: 11, fontWeight: '700', color: colors.inkSoft },
  bellBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  avatarBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.redGlow, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.red, fontWeight: '800', fontSize: 12.5 },
  dot: { position: 'absolute', top: 6, right: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.red },
  locationCard: { padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 16 },
  locTitle: { fontSize: 12, fontWeight: '700', color: colors.ink },
  locSub: { fontSize: 10.5, color: colors.inkFaint },
  sosZone: { alignItems: 'center', marginVertical: 20 },
  sosHint: { fontSize: 11, color: colors.inkFaint, marginTop: 14 },
  quickRow: { flexDirection: 'row', gap: 10, marginVertical: 18 },
  quickCard: { flex: 1, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#EEF1F5', padding: 14, alignItems: 'center', gap: 8 },
  quickLabel: { fontSize: 11.5, fontWeight: '700', textAlign: 'center', color: colors.ink },
  eyebrow: { fontSize: 10.5, fontWeight: '700', color: colors.inkFaint, letterSpacing: 1, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  modalSub: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 13, fontWeight: '700', color: colors.inkSoft },
  gpsDetectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 12, marginBottom: 12 },
  gpsDetectText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 13, color: colors.ink, padding: 0 },
  sectionHeading: { fontSize: 10.5, fontWeight: '800', color: colors.inkFaint, letterSpacing: 0.8, marginBottom: 10, marginTop: 4 },
  searchResultsWrap: { marginBottom: 14 },
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  resultTitle: { fontSize: 12.5, fontWeight: '700', color: colors.ink },
  resultCoords: { fontSize: 10, color: colors.inkFaint, marginTop: 1 },
  hubGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 16 },
  hubCard: { width: '48%', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 10, gap: 4 },
  hubCardSelected: { backgroundColor: colors.red, borderColor: colors.red },
  hubName: { fontSize: 12, fontWeight: '700', color: colors.ink },
  hubNameSelected: { color: '#fff' },
  hubCoords: { fontSize: 9.5, color: colors.inkFaint },
  hubCoordsSelected: { color: 'rgba(255,255,255,0.8)' },
});
