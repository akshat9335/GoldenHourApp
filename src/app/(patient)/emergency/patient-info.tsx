import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, TextInput, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Input, InputGroup, Chip, Card, Icon, Pill, PhotoInput, VoiceInput, LabelEyebrow } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import {
  refreshDeviceLocation,
  acquireFreshLocation,
  PRAYAGRAJ_HUBS,
  setManualLocation,
  searchAddressGeocode,
} from '@/services/deviceLocation';

export default function PatientInfo() {
  const selectedType = useAppStore((s) => s.selectedType);
  const description = useAppStore((s) => s.description);
  const setDescription = useAppStore((s) => s.setDescription);
  const accidentPhotoUri = useAppStore((s) => s.accidentPhotoUri);
  const setAccidentPhotoUri = useAppStore((s) => s.setAccidentPhotoUri);
  const setAccidentPhotoBase64 = useAppStore((s) => s.setAccidentPhotoBase64);
  const voiceTranscript = useAppStore((s) => s.voiceTranscript);
  const setVoiceTranscript = useAppStore((s) => s.setVoiceTranscript);
  const locationAddress = useAppStore((s) => s.locationAddress);
  const lastKnownLocation = useAppStore((s) => s.lastKnownLocation);

  const [who, setWho] = useState('Myself');
  const [severity, setSeverity] = useState('Moderate');
  const [refreshingGps, setRefreshingGps] = useState(false);

  // Area Selection Modal State
  const [pickerVisible, setPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ name: string; latitude: number; longitude: number }>>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let mounted = true;

    setRefreshingGps(true);
    acquireFreshLocation(3000)
      .catch(() => {})
      .finally(() => {
        if (mounted) setRefreshingGps(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleRefreshGps = async () => {
    setRefreshingGps(true);
    await refreshDeviceLocation();
    setRefreshingGps(false);
  };

  const handleSelectHub = (hub: { name: string; latitude: number; longitude: number }) => {
    setManualLocation({ latitude: hub.latitude, longitude: hub.longitude }, hub.name);
    setPickerVisible(false);
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.trim().length >= 2) {
      setSearching(true);
      const results = await searchAddressGeocode(text);
      setSearchResults(results);
      setSearching(false);
    } else {
      setSearchResults([]);
    }
  };

  const handleContinue = async () => {
    if (!lastKnownLocation) {
      setRefreshingGps(true);
      await acquireFreshLocation(2000);
      setRefreshingGps(false);
    }
    router.push('/(patient)/emergency/summary');
  };

  const isGpsLocked = !!lastKnownLocation;

  return (
    <Screen>
      <TopBar title={selectedType} />

      <InputGroup label="Who is this for?">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="Myself" selected={who === 'Myself'} onPress={() => setWho('Myself')} />
          <Chip label="Someone else" selected={who === 'Someone else'} onPress={() => setWho('Someone else')} />
        </View>
      </InputGroup>

      <InputGroup label="Add Accident Photo (Optional)">
        <PhotoInput
          uri={accidentPhotoUri}
          onChange={(uri, b64) => {
            setAccidentPhotoUri(uri);
            setAccidentPhotoBase64(b64 || null);
          }}
        />
      </InputGroup>

      <InputGroup label="Describe what happened (Optional)">
        <Input multiline numberOfLines={3} value={description} onChangeText={setDescription} placeholder="Tell us briefly what happened..." />
      </InputGroup>

      <InputGroup label="Voice Description (Optional)">
        <VoiceInput transcript={voiceTranscript} onChangeTranscript={setVoiceTranscript} />
      </InputGroup>

      <LabelEyebrow>You can submit with location only — photo, text and voice are all optional.</LabelEyebrow>

      <InputGroup label="Estimated severity (your view)">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {['Mild', 'Moderate', 'Severe'].map((s) => (
            <Chip key={s} label={s} selected={severity === s} onPress={() => setSeverity(s)} />
          ))}
        </View>
      </InputGroup>

      {/* Real Verified Live GPS Incident Card */}
      <Card style={styles.locCard}>
        <View style={styles.locIconWrap}>
          {refreshingGps ? (
            <ActivityIndicator size="small" color={colors.red} />
          ) : (
            <Icon name="pin" color={isGpsLocked ? colors.success : colors.amber} size={22} />
          )}
        </View>

        <View style={{ flex: 1, marginHorizontal: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.locTitle}>Incident Pickup Location</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity onPress={() => setPickerVisible(true)} activeOpacity={0.7} style={styles.editBadge}>
                <Text style={styles.editText}>✏️ Change Area</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRefreshGps} activeOpacity={0.7} style={styles.refreshBadge}>
                <Text style={styles.refreshText}>{refreshingGps ? 'Locking...' : '🔄 Calibrate'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Real Area / Locality */}
          <Text style={styles.locAddress} numberOfLines={2}>
            📍 {locationAddress || (lastKnownLocation ? `${lastKnownLocation.latitude.toFixed(4)}° N, ${lastKnownLocation.longitude.toFixed(4)}° E` : 'Locating live device GPS...')}
          </Text>

          {/* Real Exact Coordinates */}
          {lastKnownLocation ? (
            <Text style={styles.locCoords}>
              🌐 GPS: {lastKnownLocation.latitude.toFixed(4)}° N, {lastKnownLocation.longitude.toFixed(4)}° E
            </Text>
          ) : (
            <Text style={styles.locCoords}>🛰️ Connecting to GPS satellites & network telemetry...</Text>
          )}
        </View>

        <Pill color={isGpsLocked ? 'success' : 'amber'}>
          {isGpsLocked ? '📍 GPS LOCKED' : '🛰️ LOCKING'}
        </Pill>
      </Card>

      <Button
        title="Continue to AI Assessment"
        onPress={handleContinue}
      />

      {/* Area Selection / Search Modal */}
      <Modal visible={pickerVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Incident Location</Text>
                <Text style={styles.modalSub}>Choose your current area in Prayagraj or search</Text>
              </View>
              <TouchableOpacity onPress={() => setPickerVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchBox}>
              <Text style={{ fontSize: 16 }}>🔍</Text>
              <TextInput
                placeholder="Search area (e.g., Katra, Naini, Civil Lines)..."
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

            {/* Predefined Prayagraj Neighborhood Hubs */}
            <Text style={styles.sectionHeading}>POPULAR PRAYAGRAJ HUBS</Text>
            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  locCard: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  locIconWrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locAddress: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 3,
    lineHeight: 18,
  },
  locCoords: {
    fontSize: 11,
    color: colors.inkFaint,
    marginTop: 2,
    fontWeight: '500',
  },
  refreshBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  refreshText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.inkSoft,
  },
  editBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  editText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.blue,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
  },
  modalSub: {
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.inkSoft,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
    padding: 0,
  },
  sectionHeading: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  searchResultsWrap: {
    marginBottom: 14,
    maxHeight: 140,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.ink,
  },
  resultCoords: {
    fontSize: 10.5,
    color: colors.inkFaint,
    marginTop: 1,
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hubCard: {
    width: '48%',
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  hubCardSelected: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  hubName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  hubNameSelected: {
    color: '#fff',
  },
  hubCoords: {
    fontSize: 10,
    color: colors.inkFaint,
    marginTop: 4,
  },
  hubCoordsSelected: {
    color: 'rgba(255,255,255,0.85)',
  },
});
