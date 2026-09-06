import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Icon } from '@/components/ui';
import { EMERGENCY_TYPES } from '@/constants/data';
import { useAppStore } from '@/store/useAppStore';

export default function SelectType() {
  const setSelectedType = useAppStore((s) => s.setSelectedType);
  return (
    <Screen>
      <TopBar title="What kind of emergency?" />
      <View style={styles.grid}>
        {EMERGENCY_TYPES.map((t) => (
          <Pressable
            key={t.label}
            style={styles.cell}
            onPress={() => {
              setSelectedType(t.label);
              router.push('/(patient)/emergency/patient-info');
            }}
          >
            <Card style={styles.card}>
              <Icon name={t.icon as any} color={t.color} size={22} />
              <Text style={styles.label}>{t.label}</Text>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: '47%' },
  card: { padding: 16, paddingVertical: 18, alignItems: 'center', gap: 10 },
  label: { fontSize: 12, fontWeight: '700', textAlign: 'center', color: colors.ink },
});
