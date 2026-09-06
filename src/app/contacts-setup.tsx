import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Card, Icon } from '@/components/ui';

const CONTACTS = [['Meera Srivastava', 'Spouse'], ['Rohan Gupta', 'Brother']];

export default function ContactsSetup() {
  return (
    <Screen>
      <TopBar title="Emergency Contacts" />
      <Text style={styles.sub}>These contacts are notified automatically when you activate SOS.</Text>
      {CONTACTS.map(([name, rel]) => (
        <Card key={name} style={styles.card}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{name[0]}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.rel}>{rel}</Text>
          </View>
          <Icon name="phone" size={15} color={colors.blue} />
        </Card>
      ))}
      <Button title="+ Add Contact" variant="secondary" style={{ marginBottom: 16 }} />
      <Button title="Continue" onPress={() => router.push('/permissions')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { color: colors.inkSoft, fontSize: 12, marginBottom: 16 },
  card: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.redGlow, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.red, fontWeight: '800' },
  name: { fontWeight: '700', fontSize: 13, color: colors.ink },
  rel: { fontSize: 11, color: colors.inkFaint },
});
