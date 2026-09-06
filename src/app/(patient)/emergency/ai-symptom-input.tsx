import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, TopBar, Button, Input, InputGroup, Chip, LabelEyebrow } from '@/components/ui';

const TAGS = ['Conscious', 'Breathing', 'Pain 8/10', 'No known allergies'];

export default function AiSymptomInput() {
  const [selected, setSelected] = useState<Set<string>>(new Set(['Conscious', 'Breathing']));
  const toggle = (t: string) => {
    const next = new Set(selected);
    next.has(t) ? next.delete(t) : next.add(t);
    setSelected(next);
  };
  return (
    <Screen>
      <TopBar title="Describe the symptoms" />
      <InputGroup>
        <Input
          multiline
          numberOfLines={4}
          defaultValue="Sudden chest pain radiating to left arm, shortness of breath, sweating, started 10 minutes ago."
          placeholder="What is happening right now?"
        />
      </InputGroup>
      <LabelEyebrow>QUICK TAGS</LabelEyebrow>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        {TAGS.map((t) => (
          <Chip key={t} label={t} selected={selected.has(t)} onPress={() => toggle(t)} />
        ))}
      </View>
      <Button title="Continue" onPress={() => router.push('/(patient)/emergency/ai-asking')} />
    </Screen>
  );
}
