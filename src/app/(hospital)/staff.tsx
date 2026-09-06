import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, Card, Divider, Icon, HospitalNav, HTitle } from '@/components/ui';

export default function Staff() {
  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={styles.header}>
          <View style={styles.avatar}><Text style={styles.avatarText}>ER</Text></View>
          <View>
            <HTitle size={16}>ER Staff — 014</HTitle>
            <Text style={styles.sub}>St. Martha's Hospital · Emergency Desk</Text>
          </View>
        </View>
        <Card style={{ padding: 4 }}>
          <Pressable style={styles.row} onPress={() => router.push('/(hospital)/capacity')}>
            <Icon name="bed" color={colors.ink} />
            <Text style={styles.rowLabel}>Bed & Capacity</Text>
            <Icon name="chevR" color={colors.inkFaint} />
          </Pressable>
          <Divider />
          <Pressable style={styles.row} onPress={() => router.push('/notifications')}>
            <Icon name="bell" color={colors.ink} />
            <Text style={styles.rowLabel}>Notifications</Text>
            <Icon name="chevR" color={colors.inkFaint} />
          </Pressable>
          <Divider />
          <Pressable style={styles.row} onPress={() => router.replace('/hospital-login')}>
            <Text style={[styles.rowLabel, { color: colors.red }]}>Log Out</Text>
          </Pressable>
        </Card>
      </Screen>
      <HospitalNav active="/(hospital)/staff" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.blueBg, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.blue, fontWeight: '800', fontSize: 16 },
  sub: { fontSize: 11, color: colors.inkFaint },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink },
});
