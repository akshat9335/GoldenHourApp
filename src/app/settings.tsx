import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Divider, Toggle, LabelEyebrow } from '@/components/ui';

export default function Settings() {
  const [autoCall, setAutoCall] = useState(true);
  const [shareLoc, setShareLoc] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

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
        <Pressable onPress={() => router.replace('/login')}>
          <Text style={styles.logout}>Log Out</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  rowLabel: { fontSize: 13, fontWeight: '600', color: colors.ink },
  rowValue: { fontSize: 12, color: colors.inkSoft, fontWeight: '700' },
  logout: { fontSize: 13, fontWeight: '700', color: colors.red },
});
