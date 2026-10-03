import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Divider, Toggle, LabelEyebrow } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { voiceSosService } from '@/services/voiceSos.service';
import { authService } from '@/services/auth';
import LanguageSelector from '@/components/LanguageSelector';
import { useTranslation } from 'react-i18next';

export default function Settings() {
  const [autoCall, setAutoCall] = useState(true);
  const [shareLoc, setShareLoc] = useState(true);

  return (
    <Screen>
      <TopBar title="Settings" back={false} />
      <LabelEyebrow>EMERGENCY</LabelEyebrow>
      <Card style={{ padding: 4, marginBottom: 18 }}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Hold duration for SOS</Text>
          <Text style={styles.rowValue}>3 sec</Text>
        </View>
        <Divider />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Auto-call emergency contacts</Text>
          <Toggle on={autoCall} onChange={setAutoCall} />
        </View>
        <Divider />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Share location with hospitals</Text>
          <Toggle on={shareLoc} onChange={setShareLoc} />
        </View>
      </Card>

      <LabelEyebrow>VOICE SOS & CLINICAL AI</LabelEyebrow>
      <Card style={{ padding: 4, marginBottom: 18 }}>
        <View style={styles.row}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.rowLabel}>Voice Emergency SOS</Text>
            <Text style={styles.rowDesc}>Instant clinical triage via 🎙️ Voice SOS button on Home</Text>
          </View>
          <Text style={[styles.rowValue, { color: colors.success, fontWeight: '700' }]}>Active</Text>
        </View>
        <Divider />
        <View style={styles.row}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.rowLabel}>Speech-to-Text Input</Text>
            <Text style={styles.rowDesc}>Dictate emergency symptoms using Phone Keyboard Mic</Text>
          </View>
          <Text style={[styles.rowValue, { color: colors.blue, fontWeight: '700' }]}>Keyboard Mic 🎙️</Text>
        </View>
        <Divider />
        <View style={styles.row}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.rowLabel}>Multilingual Support</Text>
            <Text style={styles.rowDesc}>Supports clinical triage in English, Hindi & Marathi</Text>
          </View>
          <Text style={styles.rowValue}>EN · HI · MR</Text>
        </View>
      </Card>

      <LabelEyebrow>PREFERENCES</LabelEyebrow>
      <Card style={{ padding: 4, marginBottom: 18 }}>
        <View style={styles.row}>
          <View>
            <Text style={styles.rowLabel}>App Language / भाषा</Text>
            <Text style={styles.rowDesc}>English • हिंदी • मराठी</Text>
          </View>
          <LanguageSelector />
        </View>
        <Divider />
        <Pressable style={styles.row} onPress={() => router.push('/notifications')}>
          <Text style={styles.rowLabel}>Notifications</Text>
        </Pressable>
      </Card>
      <Card style={{ padding: 14, alignItems: 'center' }}>
        <Pressable
          onPress={() => {
            Alert.alert('Log Out', 'Are you sure you want to log out of Golden Hour?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Log Out',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await authService.logout();
                  } finally {
                    try {
                      if (router.canDismiss()) {
                        router.dismissAll();
                      }
                    } catch {}
                    router.replace('/');
                  }
                },
              },
            ]);
          }}
        >
          <Text style={styles.logout}>Log Out</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  rowLabel: { fontSize: 13, fontWeight: '600', color: colors.ink },
  rowDesc: { fontSize: 11, color: colors.inkFaint, marginTop: 2 },
  rowValue: { fontSize: 12, color: colors.inkSoft, fontWeight: '700' },
  logout: { fontSize: 13, fontWeight: '700', color: colors.red },
});
