import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Divider, Toggle, LabelEyebrow } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { voiceSosService } from '@/services/voiceSos.service';
import { authService } from '@/services/auth';

export default function Settings() {
  const [autoCall, setAutoCall] = useState(true);
  const [shareLoc, setShareLoc] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const voiceSosEnabled = useAppStore((s) => s.voiceSosEnabled);
  const voiceSosPhrase = useAppStore((s) => s.voiceSosPhrase);
  const [isEditingPhrase, setIsEditingPhrase] = useState(false);
  const [tempPhrase, setTempPhrase] = useState(voiceSosPhrase);
  const [micPermission, setMicPermission] = useState(voiceSosService.hasPermission());

  useEffect(() => {
    setMicPermission(voiceSosService.hasPermission());
  }, [voiceSosEnabled]);

  const handleToggleVoiceSos = async (val: boolean) => {
    const success = await voiceSosService.setEnabled(val);
    if (!success && val) {
      setMicPermission(false);
      Alert.alert(
        'Microphone Permission Required',
        'Voice SOS requires microphone permission to listen for your custom code phrase. Please grant microphone access.',
      );
    } else {
      setMicPermission(voiceSosService.hasPermission());
    }
  };

  const handleSavePhrase = () => {
    if (tempPhrase.trim()) {
      voiceSosService.setCodePhrase(tempPhrase.trim());
      setIsEditingPhrase(false);
    }
  };

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

      <LabelEyebrow>VOICE SOS</LabelEyebrow>
      <Card style={{ padding: 4, marginBottom: 18 }}>
        <View style={styles.row}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.rowLabel}>Voice SOS</Text>
            <Text style={styles.rowDesc}>Trigger emergency by speaking your custom code phrase</Text>
          </View>
          <Toggle on={voiceSosEnabled} onChange={handleToggleVoiceSos} />
        </View>

        {voiceSosEnabled && (
          <>
            <Divider />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Code Word / Phrase</Text>
                <Text style={styles.rowDesc}>Say this phrase aloud to initiate emergency dispatch</Text>
              </View>
              {isEditingPhrase ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TextInput
                    value={tempPhrase}
                    onChangeText={setTempPhrase}
                    style={styles.phraseInput}
                    placeholder="e.g. Blue Star"
                    autoFocus
                  />
                  <Pressable onPress={handleSavePhrase} style={styles.saveBtn}>
                    <Text style={styles.saveBtnText}>Save</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => {
                    setTempPhrase(voiceSosPhrase);
                    setIsEditingPhrase(true);
                  }}
                >
                  <Text style={styles.phraseValue}>"{voiceSosPhrase}" (Change)</Text>
                </Pressable>
              )}
            </View>

            <Divider />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Microphone Status</Text>
              <Text style={[styles.rowValue, { color: micPermission ? colors.success : colors.red }]}>
                {micPermission ? 'Permission Granted · Active' : 'Microphone permission required'}
              </Text>
            </View>
          </>
        )}
      </Card>
      <LabelEyebrow>PREFERENCES</LabelEyebrow>
      <Card style={{ padding: 4, marginBottom: 18 }}>
        <Pressable style={styles.row} onPress={() => router.push('/notifications')}>
          <Text style={styles.rowLabel}>Notifications</Text>
        </Pressable>
        <Divider />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Dark mode</Text>
          <Toggle on={darkMode} onChange={setDarkMode} />
        </View>
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
  phraseValue: { fontSize: 12.5, fontWeight: '700', color: colors.blue },
  phraseInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    minWidth: 110,
    color: colors.ink,
  },
  saveBtn: { backgroundColor: colors.blue, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  saveBtnText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  logout: { fontSize: 13, fontWeight: '700', color: colors.red },
});
