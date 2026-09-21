import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, BackHandler } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Icon } from '@/components/ui';
import { authService } from '@/services/auth';

export default function Splash() {
  const [checking, setChecking] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        BackHandler.exitApp();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        await authService.restoreSession();
      } catch (err) {
        console.warn('[Splash] Error restoring session:', err);
      } finally {
        if (isMounted) {
          setChecking(false);
          router.replace('/role-selection');
        }
      }
    }

    // Give a short splash display before auto-transitioning
    const timer = setTimeout(() => {
      checkSession();
    }, 1000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  return (
    <LinearGradient colors={['#D32F2F', '#B71C1C']} style={styles.container}>
      <View style={styles.logoWrap}>
        <Icon name="ambulance" size={40} color="#fff" />
      </View>
      <Text style={styles.title}>Golden Hour</Text>
      <Text style={styles.tag}>EVERY SECOND COUNTS</Text>

      {checking ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
      ) : (
        <Pressable style={styles.cta} onPress={() => router.replace('/role-selection')}>
          <Text style={styles.ctaText}>Get Started →</Text>
        </Pressable>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoWrap: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: { color: '#fff', fontWeight: '800', fontSize: 24 },
  tag: { color: '#fff', opacity: 0.85, fontSize: 12, marginTop: 6, letterSpacing: 0.5 },
  cta: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

