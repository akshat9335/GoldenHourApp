import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors } from '@/constants/theme';
import { Screen, Button, Icon, HTitle, Banner } from '@/components/ui';
import LanguageSelector from '@/components/LanguageSelector';
import { authService } from '@/services/auth';
import { useAppStore } from '@/store/useAppStore';

export default function AshaLogin() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);


  const handleGoogleSignIn = async () => {
    setLoading(true);
    setPendingStatus(null);
    try {
      const session = await authService.promptGoogleSignIn();

      const userRoles = (session.profile?.roles || [session.role || 'PATIENT']).map((r: string) => r.toUpperCase());
      const isWorker = userRoles.includes('FRONTLINE_WORKER') || userRoles.includes('ASHA');

      if (!session.profileExists || !isWorker) {
        Alert.alert(
          'ASHA / ANM Registration Required',
          `No Frontline Health Worker profile is registered for ${session.email || 'this Google account'}. Please register first with your PHC and village details.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Register Now',
              onPress: () => router.push('/asha-register' as any),
            },
          ]
        );
        return;
      }

      const status =
        session.profile?.roleVerificationStatus?.FRONTLINE_WORKER ||
        session.profile?.verificationStatus ||
        'PENDING';
      const isApproved = status === 'APPROVED' || status === 'VERIFIED';

      if (!isApproved) {
        setPendingStatus(
          `Your registration as ${session.profile?.name || 'ASHA Worker'} is currently under administrative review. Please wait for approval from the Health Administrator.`
        );
        return;
      }

      useAppStore.getState().setRole('FRONTLINE_WORKER');
      useAppStore.getState().setVerificationStatus('APPROVED');
      router.replace('/(worker)/dashboard');
    } catch (err: any) {
      console.warn('[AshaLogin] Google Sign-In error:', err);
      const msg = err?.message || 'Failed to sign in. Please try again.';
      if (!msg.includes('cancelled') && !msg.includes('dismissed')) {
        Alert.alert('Sign In Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    useAppStore.getState().setRole('FRONTLINE_WORKER');
    useAppStore.getState().setVerificationStatus('APPROVED');
    useAppStore.getState().setUserProfile({
      uid: 'asha-demo-1',
      name: 'Sunita Devi (ASHA)',
      email: 'sunitadevi.asha@prayagraj.gov.in',
      phone: '+91 98765 43210',
      role: 'FRONTLINE_WORKER',
      roles: ['FRONTLINE_WORKER'],
      verificationStatus: 'APPROVED',
      isPhoneVerified: true,
      hasCompletedProfile: true,
    } as any);
    router.replace('/(worker)/dashboard');
  };

  return (
    <Screen center>
      <View style={{ position: 'absolute', top: Math.max(insets.top, 16) + 4, left: 16, right: 16, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable
          onPress={() => router.replace('/role-selection')}
          style={{ padding: 6 }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.inkSoft }}>‹ {lang === 'mr' ? 'मागे' : lang === 'hi' ? 'वापस' : 'Back'}</Text>
        </Pressable>
        <LanguageSelector />
      </View>

      <View style={{ alignItems: 'center', marginBottom: 20, marginTop: 46 }}>
        <View style={styles.iconCircle}>
          <Text style={{ fontSize: 32 }}>🌾</Text>
        </View>
        <HTitle size={20}>
          {lang === 'mr' ? 'आशा / एएनएम पोर्टल' : lang === 'hi' ? 'आशा / एएनएम पोर्टल' : 'ASHA / ANM Portal'}
        </HTitle>
        <Text style={styles.sub}>
          {lang === 'mr' ? 'आरोग्य सेविका आणि ग्रामीण आरोग्य केंद्र' : lang === 'hi' ? 'स्वास्थ्य कार्यकर्ता एवं ग्रामीण स्वास्थ्य केंद्र' : 'Frontline Worker & Rural Health Desk'}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Primary Health Centre • Prayagraj District</Text>
        </View>
      </View>

      {pendingStatus && (
        <View style={{ width: '100%', marginBottom: 16 }}>
          <Banner color="amber" icon={<Icon name="bell" size={14} color={colors.amber} />}>
            {lang === 'mr' ? 'अर्ज सबमिट केला — पडताळणी प्रलंबित' : lang === 'hi' ? 'आवेदन प्रस्तुत — सत्यापन लंबित' : 'Application Submitted — Verification Pending'}
          </Banner>
          <Text style={styles.pendingDesc}>{pendingStatus}</Text>
        </View>
      )}

      <Button
        title={
          loading
            ? (lang === 'mr' ? 'प्रमाणपत्रे तपासत आहे…' : lang === 'hi' ? 'प्रमाणपत्र जांच रहे हैं…' : 'Verifying Credentials…')
            : (lang === 'mr' ? 'गुगलने साइन इन करा' : lang === 'hi' ? 'गूगल से साइन इन करें' : 'Sign In with Google')
        }
        onPress={handleGoogleSignIn}
        disabled={loading}
        style={{ backgroundColor: '#15803D' }}
      />

      <Button
        title={lang === 'mr' ? 'नवीन आशा / एएनएम सेविका नोंदणी करा' : lang === 'hi' ? 'नई आशा / एएनएम कार्यकर्ता पंजीकरण' : 'Register New ASHA / ANM Worker'}
        variant="secondary"
        style={{ marginTop: 12 }}
        onPress={() => router.push('/asha-register' as any)}
      />

      <Button
        title={lang === 'mr' ? 'डेमो आशा खात्यासह प्रवेश करा' : lang === 'hi' ? 'त्वरित डेमो खाता प्रवेश' : 'Quick Demo Access (Auto-Approve)'}
        variant="ghost"
        style={{ marginTop: 8 }}
        onPress={handleDemoLogin}
      />

      <Text style={styles.disclaimer}>
        {lang === 'mr'
          ? 'आरोग्य सेविका ग्रामीण उपकेंद्रांमध्ये माता-बाल आरोग्य आणि आपत्कालीन रेफरल सेवा देतात.'
          : lang === 'hi'
          ? 'स्वास्थ्य कार्यकर्ता ग्रामीण उपकेंद्रों में मातृ-शिशु स्वास्थ्य और आपातकालीन रेफरल प्रदान करते हैं।'
          : 'Frontline workers provide maternal, child health and emergency referral in rural sub-centres.'}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  sub: {
    color: colors.inkSoft,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  badge: {
    marginTop: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10.5,
    color: '#15803D',
    fontWeight: '700',
  },
  pendingDesc: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 8,
    paddingHorizontal: 4,
    lineHeight: 18,
  },
  disclaimer: {
    fontSize: 11,
    color: colors.inkFaint,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 16,
    paddingHorizontal: 16,
  },
});
