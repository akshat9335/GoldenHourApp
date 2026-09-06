import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Pill, PatientNav } from '@/components/ui';

const ITEMS: Array<[string, string, string, string, any, string]> = [
  ['Accident', 'Sep 2, 2026', "St. Martha's Hospital", 'HIGH', 'orange', 'Completed'],
  ['Chest Pain Assessment', 'Aug 14, 2026', '—', 'MEDIUM', 'amber', 'Resolved via AI'],
];

export default function History() {
  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <TopBar title="Emergency History" back={false} />
        {ITEMS.map((it) => (
          <Pressable key={it[0]} onPress={() => router.push('/history-detail')}>
            <Card style={styles.card}>
              <View style={styles.rowTop}>
                <Text style={styles.title}>{it[0]}</Text>
                <Pill color={it[4]}>{it[3]}</Pill>
              </View>
              <Text style={styles.sub}>{it[1]} · {it[2]}</Text>
              <View style={{ marginTop: 8 }}><Pill color="grey">{it[5]}</Pill></View>
            </Card>
          </Pressable>
        ))}
      </Screen>
      <PatientNav active="/(patient)/history" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, marginBottom: 10 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontWeight: '700', fontSize: 13, color: colors.ink },
  sub: { fontSize: 11, color: colors.inkFaint, marginTop: 6 },
});
