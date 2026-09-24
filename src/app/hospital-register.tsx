import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Input, InputGroup, Banner, Icon, Chip, Card } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { authService } from '@/services/auth';
import { acquireFreshLocation } from '@/services/deviceLocation';

const HOSPITAL_TYPES = [
  'Multi-Specialty Hospital',
  'Trauma & Emergency Center',
  'Cardiac Care Center',
  'General Hospital / Clinic',
];

const AVAILABLE_FACILITIES = [
  '24/7 Emergency',
  'ICU & Ventilators',
  'Trauma Bay',
  'Blood Bank',
  'CT / MRI Scan',
  'Cath Lab',
  'Burn Unit',
];

export default function HospitalRegister() {
  const userProfile = useAppStore((s) => s.userProfile);
  const authToken = useAppStore((s) => s.authToken);

  // Dedicated Google Account state so user can choose/switch accounts at will
  const [googleAccount, setGoogleAccount] = useState<{ email: string; name?: string } | null>(
    authToken && userProfile?.email ? { email: userProfile.email, name: userProfile.name } : null
  );

  // Initialize with hospital-specific fields (Clean by default - never polluted)
  const [name, setName] = useState(userProfile?.hospitalName || '');
  const [hospitalType, setHospitalType] = useState('Multi-Specialty Hospital');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [regNo, setRegNo] = useState(userProfile?.hospitalRegNumber || '');
  const [address, setAddress] = useState(userProfile?.clinicAddress || '');
  const [totalBeds, setTotalBeds] = useState('30');
  const [icuBeds, setIcuBeds] = useState('6');
  const [facilities, setFacilities] = useState<string[]>([
    '24/7 Emergency',
    'ICU & Ventilators',
    'Trauma Bay',
  ]);
  const [submitting, setSubmitting] = useState(false);

  const toggleFacility = (facility: string) => {
    if (facilities.includes(facility)) {
      setFacilities(facilities.filter((f) => f !== facility));
    } else {
      setFacilities([...facilities, facility]);
    }
  };

  const handlePickGoogleAccount = async () => {
    try {
      const session = await authService.promptGoogleSignIn();
      if (session?.email) {
        setGoogleAccount({ email: session.email, name: session.name || undefined });
        if (!email.trim()) {
          setEmail(session.email);
        }
      }
    } catch (err: any) {
      if (!err?.message?.includes('cancelled') && !err?.message?.includes('dismissed')) {
        Alert.alert('Google Sign In', err?.message || 'Could not choose Google account.');
      }
    }
  };

  const executeRegistration = async (targetEmail: string) => {
    const parsedTotalBeds = parseInt(totalBeds, 10) || 30;
    const parsedIcuBeds = parseInt(icuBeds, 10) || 6;
    const currentLoc = await acquireFreshLocation(2500);

    await authService.register({
      role: 'HOSPITAL',
      hospitalName: name.trim(),
      name: name.trim(),
      email: targetEmail,
      phone: phone.trim() || undefined,
      hospitalRegNumber: regNo.trim(),
      licenseNumber: regNo.trim(),
      address: address.trim(),
      clinicAddress: address.trim(),
      hospitalType,
      facilities,
      totalBeds: parsedTotalBeds,
      availableBeds: parsedTotalBeds,
      icuBeds: parsedIcuBeds,
      availableIcuBeds: parsedIcuBeds,
      location: currentLoc,
      latitude: currentLoc.latitude,
      longitude: currentLoc.longitude,
    });

    Alert.alert(
      'Application Submitted',
      `Your facility "${name.trim()}" has been submitted for Golden Hour administrative verification. Once verified, your emergency desk and capacity console will be activated.`,
      [{ text: 'OK', onPress: () => router.replace('/hospital-login') }]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() || !regNo.trim()) {
      Alert.alert('Required Information', 'Please provide Hospital Facility Name and Government Registration ID.');
      return;
    }

    if (!address.trim()) {
      Alert.alert('Address Required', 'Please enter the official street address of the hospital.');
      return;
    }

    try {
      setSubmitting(true);

      // Ensure active Google authentication
      let currentToken = useAppStore.getState().authToken;
      let activeGoogleEmail = googleAccount?.email;

      if (!currentToken || !activeGoogleEmail) {
        Alert.alert(
          'Google Account Required',
          'Please choose the Google account that will manage this hospital console.'
        );
        const session = await authService.promptGoogleSignIn();
        if (!session.uid || !session.email) {
          return;
        }
        setGoogleAccount({ email: session.email, name: session.name || undefined });
        activeGoogleEmail = session.email;
        if (!email.trim()) {
          setEmail(session.email);
        }
      }

      const targetEmail = email.trim() || activeGoogleEmail || '';

      // If contact email is different from signed-in Google account, confirm with user
      if (activeGoogleEmail && email.trim() && activeGoogleEmail.toLowerCase() !== email.trim().toLowerCase()) {
        Alert.alert(
          'Account Confirmation',
          `You entered contact email: ${email.trim()}\nGoogle account: ${activeGoogleEmail}\n\nWould you like to switch to ${email.trim()}'s Google account, or continue with ${activeGoogleEmail} as the hospital owner?`,
          [
            {
              text: 'Switch Google Account',
              style: 'cancel',
              onPress: () => handlePickGoogleAccount(),
            },
            {
              text: `Continue with ${activeGoogleEmail}`,
              onPress: async () => {
                try {
                  setSubmitting(true);
                  await executeRegistration(targetEmail);
                } catch (err: any) {
                  Alert.alert('Registration Error', err?.message || 'Could not submit.');
                } finally {
                  setSubmitting(false);
                }
              },
            },
          ]
        );
        return;
      }

      await executeRegistration(targetEmail);
    } catch (err: any) {
      console.warn('[HospitalRegister] Failed to submit:', err);
      Alert.alert('Registration Error', err?.message || 'Could not submit hospital registration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <TopBar title="Hospital Registration" onPressBack={() => router.replace('/hospital-login')} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Banner color="amber" icon={<Icon name="bell" size={14} color={colors.amber} />}>
          Official Verification Desk: Facility credentials and license will be verified before activation.
        </Banner>
        <View style={{ height: 16 }} />

        {/* Google Administrator Identity Card */}
        <Card style={styles.googleAccountCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.googleAccountLabel}>HOSPITAL ADMIN GOOGLE ID</Text>
              <Text style={styles.googleAccountEmail} numberOfLines={1}>
                {googleAccount ? googleAccount.email : 'No Google account selected'}
              </Text>
              <Text style={styles.googleAccountSub}>
                {googleAccount
                  ? 'This account will own and manage this emergency facility desk.'
                  : 'Tap to connect the Google account for this hospital desk.'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.googleSwitchBtn}
              onPress={handlePickGoogleAccount}
              activeOpacity={0.8}
            >
              <Text style={styles.googleSwitchBtnText}>
                {googleAccount ? 'Switch' : 'Choose'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
        <View style={{ height: 12 }} />

        {/* Facility Identity */}
        <InputGroup
          label="Hospital Facility Name"
          required
          tooltip="Official registered name of the hospital, trauma center, or medical facility."
        >
          <Input placeholder="e.g. Apollo Multi-Specialty Hospital" value={name} onChangeText={setName} />
        </InputGroup>

        {/* Hospital Type Chips */}
        <Text style={styles.sectionLabel}>Hospital Classification / Specialty</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {HOSPITAL_TYPES.map((type) => (
            <React.Fragment key={type}>
              <Chip
                label={type}
                selected={hospitalType === type}
                onPress={() => setHospitalType(type)}
              />
              <View style={{ width: 8 }} />
            </React.Fragment>
          ))}
        </ScrollView>

        {/* License & Contacts */}
        <InputGroup
          label="Government Hospital Registration / License ID"
          required
          tooltip="Official Clinical Establishments Act registration number or state Directorate of Health Services license."
        >
          <Input
            placeholder="e.g. HOSP-REG-2026-092"
            value={regNo}
            onChangeText={setRegNo}
          />
        </InputGroup>

        <InputGroup
          label="Emergency Desk Phone Number"
          required
          tooltip="Direct 24/7 telephone hotline for inbound trauma ambulance coordination."
        >
          <Input
            placeholder="e.g. +91 11 2345 6789"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </InputGroup>

        <InputGroup
          label="Hospital Administrator Email"
          required
          tooltip="Official administrative email for credential validation and emergency alert summaries."
        >
          <Input
            placeholder="emergency@hospital.com"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
        </InputGroup>

        <InputGroup
          label="Full Hospital Facility Address"
          required
          tooltip="Exact physical address and landmark where responding ambulances navigate for triage handover."
        >
          <Input
            placeholder="Complete street address, sector/area, city, pin code"
            value={address}
            onChangeText={setAddress}
            multiline
          />
        </InputGroup>

        {/* Initial Capacity Setup */}
        <Text style={styles.sectionLabel}>Emergency Bed Capacity Setup</Text>
        <View style={styles.bedRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <InputGroup
              label="Total General Beds"
              required
              tooltip="Total available general emergency in-patient beds at this facility."
            >
              <Input
                placeholder="30"
                keyboardType="numeric"
                value={totalBeds}
                onChangeText={setTotalBeds}
              />
            </InputGroup>
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <InputGroup
              label="Total ICU Beds"
              required
              tooltip="Total available Intensive Care Unit (ICU) beds equipped with ventilators."
            >
              <Input
                placeholder="6"
                keyboardType="numeric"
                value={icuBeds}
                onChangeText={setIcuBeds}
              />
            </InputGroup>
          </View>
        </View>

        {/* Special Emergency Facilities */}
        <Text style={styles.sectionLabel}>Emergency Facilities & Capabilities</Text>
        <View style={styles.facilityWrap}>
          {AVAILABLE_FACILITIES.map((f) => {
            const isSelected = facilities.includes(f);
            return (
              <TouchableOpacity
                key={f}
                style={[styles.facilityChip, isSelected && styles.facilityChipSelected]}
                onPress={() => toggleFacility(f)}
                activeOpacity={0.7}
              >
                <Text style={[styles.facilityText, isSelected && styles.facilityTextSelected]}>
                  {isSelected ? `✓ ${f}` : `+ ${f}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 16 }} />
        <Button
          title={submitting ? "Submitting Registration…" : "Submit Hospital for Verification"}
          onPress={handleSubmit}
          disabled={submitting}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkSoft,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 6,
  },
  bedRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  facilityWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  facilityChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  facilityChipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  facilityText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  facilityTextSelected: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  googleAccountCard: {
    padding: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
  },
  googleAccountLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.5,
  },
  googleAccountEmail: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 2,
  },
  googleAccountSub: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
    lineHeight: 15,
  },
  googleSwitchBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  googleSwitchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
});

