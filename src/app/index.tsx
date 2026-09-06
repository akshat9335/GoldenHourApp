import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Icon } from '@/components/ui';

export default function Splash() {
  return (
    <LinearGradient colors={['#D32F2F', '#B71C1C']} style={styles.container}>
      <View style={styles.logoWrap}>
        <Icon name="ambulance" size={40} color="#fff" />
      </View>
      <Text style={styles.title}>Golden Hour</Text>
      <Text style={styles.tag}>EVERY SECOND COUNTS</Text>
      <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />

      <Pressable style={styles.cta} onPress={() => router.replace('/onboarding')}>
        <Text style={styles.ctaText}>Continue →</Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoWrap: { width: 84, height: 84, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { color: '#fff', fontWeight: '800', fontSize: 24 },
  tag: { color: '#fff', opacity: 0.85, fontSize: 12, marginTop: 6, letterSpacing: 0.5 },
  cta: { position: 'absolute', bottom: 40, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 100 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
