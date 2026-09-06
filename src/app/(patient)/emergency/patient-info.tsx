import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, Input, InputGroup, Chip, Card, Icon, Pill, PhotoInput, VoiceInput, LabelEyebrow } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

export default function PatientInfo() {
  const selectedType = useAppStore((s) => s.selectedType);
  const description = useAppStore((s) => s.description);
  const setDescription = useAppStore((s) => s.setDescription);
  const accidentPhotoUri = useAppStore((s) => s.accidentPhotoUri);
  const setAccidentPhotoUri = useAppStore((s) => s.setAccidentPhotoUri);
  const voiceTranscript = useAppStore((s) => s.voiceTranscript);
  const setVoiceTranscript = useAppStore((s) => s.setVoiceTranscript);
  const [who, setWho] = useState('Myself');
  const [severity, setSeverity] = useState('Moderate');

  return (
    <Screen>
      <TopBar title={selectedType} />
      <InputGroup label="Who is this for?">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="Myself" selected={who === 'Myself'} onPress={() => setWho('Myself')} />
          <Chip label="Someone else" selected={who === 'Someone else'} onPress={() => setWho('Someone else')} />
        </View>
      </InputGroup>
      <InputGroup label="Add Accident Photo (Optional)">
        <PhotoInput uri={accidentPhotoUri} onChange={setAccidentPhotoUri} />
      </InputGroup>
      <InputGroup label="Describe what happened (Optional)">
        <Input multiline numberOfLines={3} value={description} onChangeText={setDescription} placeholder="Tell us briefly what happened..." />
      </InputGroup>
      <InputGroup label="Voice Description (Optional)">
        <VoiceInput transcript={voiceTranscript} onChangeTranscript={setVoiceTranscript} />
      </InputGroup>
      <LabelEyebrow>You can submit with location only — photo, text and voice are all optional.</LabelEyebrow>
      <InputGroup label="Estimated severity (your view)">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {['Mild', 'Moderate', 'Severe'].map((s) => (
            <Chip key={s} label={s} selected={severity === s} onPress={() => setSeverity(s)} />
          ))}
        </View>
      </InputGroup>
      <Card style={styles.locCard}>
        <Icon name="pin" />
        <View style={{ flex: 1 }}>
          <Text style={styles.locTitle}>Current Location</Text>
          <Text style={styles.locSub}>5th Block, Koramangala, Bengaluru</Text>
        </View>
        <Pill color="success">GPS LOCKED</Pill>
      </Card>
      <Button title="Continue to AI Assessment" onPress={() => router.push('/(patient)/emergency/summary')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  locCard: { padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 18 },
  locTitle: { fontSize: 12.5, fontWeight: '700', color: colors.ink },
  locSub: { fontSize: 10.5, color: colors.inkFaint },
});
