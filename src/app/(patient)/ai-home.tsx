import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, Icon, Banner, PatientNav } from '@/components/ui';

export default function AiHome() {
  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <TopBar title="AI Emergency Assistant" back={false} />
        <Banner color="blue" icon={<Icon name="ai" size={15} color={colors.blue} />}>
          Decision-support for emergencies — not a chatbot. Describe symptoms and get an immediate severity assessment.
        </Banner>
        <View style={{ height: 14 }} />
        <Pressable onPress={() => router.push('/(patient)/emergency/ai-symptom-input')}>
          <Card style={styles.startCard}>
            <View style={styles.iconWrap}><Icon name="ai" color={colors.blue} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>New Symptom Assessment</Text>
              <Text style={styles.sub}>Get an instant severity read</Text>
            </View>
            <Icon name="chevR" color={colors.inkFaint} />
          </Card>
        </Pressable>
        <Text style={styles.eyebrow}>RECENT</Text>
        <Card style={{ padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Pill color="orange">HIGH</Pill>
          <View style={{ flex: 1 }}>
            <Text style={styles.recentText}>Chest tightness, shortness of breath</Text>
            <Text style={styles.recentSub}>2 days ago</Text>
          </View>
        </Card>
      </Screen>
      <PatientNav active="/(patient)/ai-home" />
    </View>
  );
}

const styles = StyleSheet.create({
  startCard: { padding: 16, flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 14 },
  iconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.blueBg, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700', fontSize: 13.5, color: colors.ink },
  sub: { fontSize: 11, color: colors.inkFaint },
  eyebrow: { fontSize: 10.5, fontWeight: '700', color: colors.inkFaint, letterSpacing: 1, marginBottom: 8 },
  recentText: { fontSize: 12.5, fontWeight: '600', color: colors.ink },
  recentSub: { fontSize: 10.5, color: colors.inkFaint },
});
