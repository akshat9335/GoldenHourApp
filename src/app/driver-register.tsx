import React, { useState } from 'react';
import { View, Text, Alert, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Input, InputGroup, Banner, Icon, Card, Pill, LabelEyebrow } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { authService } from '@/services/auth';

export default function DriverRegister() {
  const userProfile = useAppStore((s) => s.userProfile);
  const authToken = useAppStore((s) => s.authToken);

  // Dedicated Google Account state so user can choose/switch accounts at will
  const [googleAccount, setGoogleAccount] = useState<{ email: string; name?: string } | null>(
    authToken && userProfile?.email ? { email: userProfile.email, name: userProfile.name } : null
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [driverId, setDriverId] = useState('');
  const [ambulanceId, setAmbulanceId] = useState('');
  const [ambulanceType, setAmbulanceType] = useState('Basic Life Support (BLS)');
  const [hospitalAffiliation, setHospitalAffiliation] = useState('Independent / Golden Hour Fleet');
  const [submitting, setSubmitting] = useState(false);

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
    await authService.register({
      role: 'AMBULANCE_DRIVER',
      name: name.trim(),
      email: targetEmail,
      phone: phone.trim() || undefined,
      licenseNumber: driverId.trim() || undefined,
      vehiclePlateNumber: ambulanceId.trim(),
      ambulanceId: ambulanceId.trim(),
      ambulanceType,
      hospitalName: hospitalAffiliation.trim() || 'Independent Fleet',
    });

    Alert.alert(
      'Application Submitted',
      'Your ambulance crew profile has been submitted and is currently PENDING administrative review. You will receive dispatch access upon verification.',
      [{ text: 'OK', onPress: () => router.replace('/driver-login') }]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() || !ambulanceId.trim()) {
      Alert.alert('Required Information', 'Please provide Driver Name and Ambulance / Vehicle Plate ID.');
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
          'Please choose the Google account to securely bind your verified driver profile.'
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

      if (activeGoogleEmail && email.trim() && activeGoogleEmail.toLowerCase() !== email.trim().toLowerCase()) {
        Alert.alert(
          'Account Confirmation',
          `You entered contact email: ${email.trim()}\nGoogle account: ${activeGoogleEmail}\n\nWould you like to switch to ${email.trim()}'s Google account, or continue with ${activeGoogleEmail} as the driver owner?`,
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
      console.warn('[DriverRegister] Failed to submit:', err);
      Alert.alert('Registration Error', err?.message || 'Could not submit driver registration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <TopBar title="Driver Registration" onPressBack={() => router.replace('/driver-login')} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Banner color="amber" icon={<Icon name="bell" size={14} color={colors.amber} />}>
          Verification required. Your driver and ambulance details will be checked before your account is activated.
        </Banner>
        <View style={{ height: 16 }} />

        {/* Google Administrator Identity Card */}
        <Card style={styles.googleAccountCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.googleAccountLabel}>DRIVER GOOGLE ACCOUNT</Text>
              <Text style={styles.googleAccountEmail} numberOfLines={1}>
                {googleAccount ? googleAccount.email : 'No Google account selected'}
              </Text>
              <Text style={styles.googleAccountSub}>
                {googleAccount
                  ? 'This account will receive dispatches and operate the ambulance console.'
                  : 'Tap to connect the Google account for your driver profile.'}
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
      <InputGroup label="Driver Name">
        <Input placeholder="Full name" value={name} onChangeText={setName} />
      </InputGroup>
      <InputGroup label="Email">
        <Input
          placeholder="you@example.com"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
      </InputGroup>
      <InputGroup label="Phone">
        <Input
          placeholder="+91 98765 43210"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
      </InputGroup>
      <InputGroup label="Driver License / Badge ID">
        <Input
          placeholder="e.g. DL-0420110023456"
          value={driverId}
          onChangeText={setDriverId}
        />
      </InputGroup>
      <InputGroup label="Ambulance Vehicle Plate Number">
        <Input
          placeholder="e.g. KA-05-AB-1234"
          value={ambulanceId}
          onChangeText={setAmbulanceId}
        />
      </InputGroup>
      <View style={{ marginBottom: 14 }}>
        <LabelEyebrow>AMBULANCE VEHICLE TYPE</LabelEyebrow>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          {['Basic Life Support (BLS)', 'Advanced Life Support (ALS) / ICU', 'Patient Transport (PTV)'].map((t) => {
            const isSel = ambulanceType === t;
            return (
              <TouchableOpacity key={t} onPress={() => setAmbulanceType(t)} activeOpacity={0.7}>
                <Pill color={isSel ? 'red' : 'grey'}>{t}</Pill>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <InputGroup label="Hospital Affiliation (or Independent Fleet)">
        <Input
          placeholder="e.g. Apollo Hospital or Independent Fleet"
          value={hospitalAffiliation}
          onChangeText={setHospitalAffiliation}
        />
      </InputGroup>
      <Button
        title={submitting ? "Submitting Application…" : "Submit for Verification"}
        onPress={handleSubmit}
        disabled={submitting}
      />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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

