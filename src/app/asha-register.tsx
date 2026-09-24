import React, { useState } from 'react';
import { View, Text, Alert, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Input, InputGroup, Banner, Icon, Card } from '@/components/ui';
import LanguageSelector from '@/components/LanguageSelector';
import { useAppStore } from '@/store/useAppStore';
import { authService } from '@/services/auth';

const PHCS = [
  'Karchhana PHC',
  'Soraon PHC',
  'Chaka Sub-Centre',
  'Phulpur PHC',
  'Mau Aima PHC',
  'Jasra PHC',
];

export default function AshaRegister() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const userProfile = useAppStore((s) => s.userProfile);
  const authToken = useAppStore((s) => s.authToken);


  const [googleAccount, setGoogleAccount] = useState<{ email: string; name?: string } | null>(
    authToken && userProfile?.email ? { email: userProfile.email, name: userProfile.name } : null
  );

  const [name, setName] = useState(userProfile?.name || '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [workerType, setWorkerType] = useState<'ASHA' | 'ANM'>('ASHA');
  const [assignedPhc, setAssignedPhc] = useState(PHCS[0]);
  const [village, setVillage] = useState('Karchhana Rural');
  const [regNumber, setRegNumber] = useState('');
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
        Alert.alert('Google Sign In', err?.message || 'Could not select Google account.');
      }
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !regNumber.trim()) {
      Alert.alert('Required Information', 'Please provide Worker Name, Contact Phone, and Government Registration Number.');
      return;
    }

    try {
      setSubmitting(true);

      let currentToken = useAppStore.getState().authToken;
      let activeGoogleEmail = googleAccount?.email;

      if (!currentToken || !activeGoogleEmail) {
        Alert.alert(
          'Google Account Required',
          'Please choose the Google account to securely bind your frontline worker credentials.'
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

      await authService.register({
        role: 'FRONTLINE_WORKER',
        name: name.trim(),
        email: targetEmail,
        phone: phone.trim(),
        workerType,
        assignedPhc,
        village: village.trim(),
        regNumber: regNumber.trim(),
        licenseNumber: regNumber.trim(),
        verificationStatus: 'PENDING',
      });

      Alert.alert(
        'Application Submitted',
        'Your ASHA / ANM registration has been submitted and is currently PENDING administrative review. You will receive access upon approval by the Chief Medical Officer / Admin.',
        [{ text: 'OK', onPress: () => router.replace('/asha-login' as any) }]
      );
    } catch (err: any) {
      Alert.alert('Registration Failed', err?.message || 'Could not register frontline worker.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <TopBar
        title={lang === 'mr' ? 'आशा / एएनएम नोंदणी' : lang === 'hi' ? 'आशा / एएनएम पंजीकरण' : 'ASHA / ANM Registration'}
        back
        onPressBack={() => router.replace('/asha-login' as any)}
        right={<LanguageSelector />}
      />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Banner color="blue" icon={<Icon name="idCard" size={14} color={colors.blue} />}>
          {lang === 'mr'
            ? 'आरोग्य सेविका प्रमाणपत्र नोंदणी — राष्ट्रीय ग्रामीण आरोग्य अभियान (NHM)'
            : lang === 'hi'
            ? 'स्वास्थ्य कार्यकर्ता क्रेडेंशियल पंजीकरण — राष्ट्रीय ग्रामीण स्वास्थ्य मिशन (NHM)'
            : 'Frontline Worker Credential Registration — National Rural Health Mission (NHM)'}
        </Banner>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>
            {lang === 'mr' ? 'गुगल खाते जोडणे' : lang === 'hi' ? 'गूगल खाता लिंक' : 'GOOGLE ACCOUNT BINDING'}
          </Text>
          <Text style={styles.fieldSub}>
            {lang === 'mr'
              ? 'आपली प्रमाणपत्रे या गुगल ओळखीशी जोडली जातील.'
              : lang === 'hi'
              ? 'आपकी साख इस गूगल पहचान से प्रमाणित और सुरक्षित होगी।'
              : 'Your credentials will be authenticated and locked to this Google identity.'}
          </Text>

          {googleAccount ? (
            <View style={styles.accountBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.accountEmail}>{googleAccount.email}</Text>
                {googleAccount.name && <Text style={styles.accountName}>{googleAccount.name}</Text>}
              </View>
              <TouchableOpacity onPress={handlePickGoogleAccount} style={styles.changeBtn}>
                <Text style={styles.changeBtnText}>{lang === 'mr' ? 'बदला' : lang === 'hi' ? 'बदलें' : 'Switch'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Button
              title={lang === 'mr' ? 'गुगल खाते जोडा' : lang === 'hi' ? 'गूगल खाता कनेक्ट करें' : 'Connect Google Account'}
              variant="secondary"
              onPress={handlePickGoogleAccount}
              style={{ marginTop: 8 }}
            />
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>
            {lang === 'mr' ? 'सेविकेचे तपशील' : lang === 'hi' ? 'कार्यकर्ता विवरण' : 'WORKER DETAILS'}
          </Text>

          <Text style={styles.fieldLabel}>
            {lang === 'mr' ? 'भूमिका प्रकार' : lang === 'hi' ? 'कार्यकर्ता प्रकार' : 'WORKER ROLE TYPE'}
          </Text>
          <View style={styles.chipsRow}>
            {(['ASHA', 'ANM'] as const).map((wt) => (
              <TouchableOpacity
                key={wt}
                style={[styles.roleChip, workerType === wt && styles.roleChipActive]}
                onPress={() => setWorkerType(wt)}
              >
                <Text style={[styles.roleChipText, workerType === wt && styles.roleChipTextActive]}>
                  {wt === 'ASHA'
                    ? (lang === 'mr' ? '🌾 आशा सेविका' : lang === 'hi' ? '🌾 आशा कार्यकर्ता' : '🌾 ASHA Worker')
                    : (lang === 'mr' ? '💉 एएनएम सेविका' : lang === 'hi' ? '💉 एएनएम कार्यकर्ता' : '💉 ANM Nurse')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <InputGroup label={lang === 'mr' ? 'पूर्ण नाव *' : lang === 'hi' ? 'पूरा नाम *' : 'Full Name *'}>
            <Input value={name} onChangeText={setName} placeholder={lang === 'mr' ? 'उदा. सुनिता देवी' : 'e.g. Sunita Devi'} />
          </InputGroup>
          <InputGroup label={lang === 'mr' ? 'संपर्क फोन नंबर *' : lang === 'hi' ? 'संपर्क फोन *' : 'Contact Phone *'}>
            <Input
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
            />
          </InputGroup>
          <InputGroup label={lang === 'mr' ? 'अधिकृत नोंदणी क्रमांक *' : lang === 'hi' ? 'पंजीकरण संख्या / ID *' : 'Official Worker ID / Reg No. *'}>
            <Input
              value={regNumber}
              onChangeText={setRegNumber}
              placeholder="e.g. UP-ASHA-2024-8842"
              autoCapitalize="characters"
            />
          </InputGroup>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>
            {lang === 'mr' ? 'नेमणूक आणि क्षेत्र' : lang === 'hi' ? 'कार्यक्षेत्र एवं तैनाती' : 'POSTING & JURISDICTION'}
          </Text>

          <Text style={styles.fieldLabel}>ASSIGNED PHC / SUB-CENTRE</Text>
          <View style={styles.chipsRow}>
            {PHCS.map((phc) => (
              <TouchableOpacity
                key={phc}
                style={[styles.phcChip, assignedPhc === phc && styles.phcChipActive]}
                onPress={() => setAssignedPhc(phc)}
              >
                <Text style={[styles.phcChipText, assignedPhc === phc && styles.phcChipTextActive]}>
                  {phc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <InputGroup label="Assigned Village / Ward *">
            <Input
              value={village}
              onChangeText={setVillage}
              placeholder="e.g. Karchhana Rural, Ward 3"
            />
          </InputGroup>
        </Card>

        <Button
          title={submitting ? 'Submitting Application...' : 'Submit Application for Review'}
          onPress={handleSubmit}
          disabled={submitting}
          style={{ marginTop: 8, backgroundColor: '#15803D' }}
        />

        <Text style={styles.footerNote}>
          Applications are verified by the District Health Authority / CMO before granting operational access.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { padding: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: colors.inkFaint, letterSpacing: 0.8, marginBottom: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.inkSoft, marginTop: 10, marginBottom: 6 },
  fieldSub: { fontSize: 12, color: colors.inkSoft, marginBottom: 10, lineHeight: 16 },
  accountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  accountEmail: { fontSize: 13, fontWeight: '700', color: colors.ink },
  accountName: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  changeBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.bg, borderRadius: 6 },
  changeBtnText: { fontSize: 12, color: colors.blue, fontWeight: '600' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  roleChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#fff',
  },
  roleChipActive: {
    borderColor: '#15803D',
    backgroundColor: '#F0FDF4',
  },
  roleChipText: { fontSize: 12.5, fontWeight: '600', color: colors.inkSoft },
  roleChipTextActive: { color: '#15803D', fontWeight: '800' },
  phcChip: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#fff',
  },
  phcChipActive: {
    borderColor: '#15803D',
    backgroundColor: '#F0FDF4',
  },
  phcChipText: { fontSize: 11.5, color: colors.inkSoft },
  phcChipTextActive: { color: '#15803D', fontWeight: '700' },
  footerNote: { fontSize: 11, color: colors.inkFaint, textAlign: 'center', marginTop: 12, lineHeight: 16 },
});
