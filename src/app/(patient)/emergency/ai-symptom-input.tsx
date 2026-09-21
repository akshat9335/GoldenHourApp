import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, TopBar, Button, Input, InputGroup, Chip, LabelEyebrow } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

const TAGS = ['Conscious', 'Breathing', 'Pain 8/10', 'No known allergies'];

export default function AiSymptomInput() {
  const description = useAppStore((s) => s.description);
  const setDescription = useAppStore((s) => s.setDescription);
  const [selected, setSelected] = useState<Set<string>>(new Set(['Conscious', 'Breathing']));

  const toggle = (t: string) => {
    const next = new Set(selected);
    if (next.has(t)) {
      next.delete(t);
    } else {
      next.add(t);
      if (!description.includes(t)) {
        setDescription(description ? `${description}, ${t}` : t);
      }
    }
    setSelected(next);
  };

  return (
    <Screen>
      <TopBar title="Describe the symptoms" />
      <InputGroup>
        <Input
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
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
