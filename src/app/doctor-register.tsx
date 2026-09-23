import React, { useState } from 'react';
import { View, Text, Alert, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Input, InputGroup, Banner, Icon, Card } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { authService } from '@/services/auth';

export default function DoctorRegister() {
  const userProfile = useAppStore((s) => s.userProfile);
  const authToken = useAppStore((s) => s.authToken);

  // Dedicated Google Account state so user can choose/switch accounts at will
  const [googleAccount, setGoogleAccount] = useState<{ email: string; name?: string } | null>(
    authToken && userProfile?.email ? { email: userProfile.email, name: userProfile.name } : null
  );

  const [name, setName] = useState(userProfile?.name || '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [specialization, setSpecialization] = useState('Cardiologist');
  const [qualification, setQualification] = useState('MBBS, MD');
  const [medicalRegNo, setMedicalRegNo] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [fee, setFee] = useState('500');
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
    const coords = useAppStore.getState().lastKnownLocation;
    await authService.register({
      role: 'DOCTOR',
      name: name.trim(),
      email: targetEmail,
      phone: phone.trim() || undefined,
      specialty: specialization.trim(),
      specialization: specialization.trim(),
      qualification: qualification.trim(),
      licenseNumber: medicalRegNo.trim(),
      medicalRegistrationNumber: medicalRegNo.trim(),
      clinicName: clinicName.trim() || undefined,
      clinicAddress: clinicAddress.trim() || undefined,
      consultationFee: parseInt(fee, 10) || 500,
      latitude: coords?.latitude || 25.4538,
      longitude: coords?.longitude || 81.8540,
    });

    Alert.alert(
      'Application Submitted',
      'Your doctor profile has been submitted and is currently PENDING administrative review. You will receive access upon verification.',
      [{ text: 'OK', onPress: () => router.replace('/doctor-login') }]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() || !medicalRegNo.trim()) {
      Alert.alert('Required Information', 'Please provide your Full Name and Medical Registration Number.');
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
          'Please choose the Google account to securely bind your verified doctor profile.'
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
          `You entered contact email: ${email.trim()}\nGoogle account: ${activeGoogleEmail}\n\nWould you like to switch to ${email.trim()}'s Google account, or continue with ${activeGoogleEmail} as the doctor owner?`,
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
      console.warn('[DoctorRegister] Failed to submit:', err);
      Alert.alert('Registration Error', err?.message || 'Could not submit doctor registration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <TopBar title="Doctor Registration" onPressBack={() => router.replace('/doctor-login')} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Banner color="amber" icon={<Icon name="bell" size={14} color={colors.amber} />}>
          Verification required. Your Medical Registration Number will be checked before your profile goes live to patients.
        </Banner>
        <View style={{ height: 16 }} />

        {/* Google Administrator Identity Card */}
        <Card style={styles.googleAccountCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.googleAccountLabel}>DOCTOR GOOGLE ACCOUNT</Text>
              <Text style={styles.googleAccountEmail} numberOfLines={1}>
                {googleAccount ? googleAccount.email : 'No Google account selected'}
              </Text>
              <Text style={styles.googleAccountSub}>
                {googleAccount
                  ? 'This account will own and manage this doctor consultation console.'
                  : 'Tap to connect the Google account for your doctor profile.'}
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
      <InputGroup label="Full Name">
        <Input placeholder="Dr. Full Name" value={name} onChangeText={setName} />
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
      <InputGroup label="Specialization">
        <Input
          placeholder="e.g. Cardiologist"
          value={specialization}
          onChangeText={setSpecialization}
        />
      </InputGroup>
      <InputGroup label="Qualification">
        <Input
          placeholder="e.g. MBBS, MD"
          value={qualification}
          onChangeText={setQualification}
        />
      </InputGroup>
      <InputGroup label="Medical Registration Number">
        <Input
          placeholder="State Medical Council Reg. No."
          value={medicalRegNo}
          onChangeText={setMedicalRegNo}
        />
      </InputGroup>
      <InputGroup label="Clinic Name">
        <Input
          placeholder="e.g. Sharma Heart Clinic"
          value={clinicName}
          onChangeText={setClinicName}
        />
      </InputGroup>
      <InputGroup label="Clinic Address">
        <Input
          placeholder="Full clinic address"
          value={clinicAddress}
          onChangeText={setClinicAddress}
          multiline
        />
      </InputGroup>
      <InputGroup label="Consultation Fee (₹)">
        <Input
          placeholder="e.g. 500"
          keyboardType="number-pad"
          value={fee}
          onChangeText={setFee}
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

