import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Icon, DoctorNav } from '@/components/ui';
import { DOCTOR_NOTIFICATIONS } from '@/constants/doctorData';

export default function DoctorNotifications() {
  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <TopBar title="Notifications" back={false} />
        {DOCTOR_NOTIFICATIONS.map((n) => (
          <Card key={n.title} style={styles.card}>
            <View style={styles.iconWrap}>
              <Icon name="bell" color={colors.red} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{n.title}</Text>
              <Text style={styles.desc}>{n.desc}</Text>
              <Text style={styles.time}>{n.time}</Text>
            </View>
          </Card>
        ))}
      </Screen>
      <DoctorNav active="/(doctor)/notifications" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, flexDirection: 'row', gap: 12, marginBottom: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.redGlow, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700', fontSize: 12.5, color: colors.ink },
  desc: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
  time: { fontSize: 10, color: colors.inkFaint, marginTop: 4 },
});
