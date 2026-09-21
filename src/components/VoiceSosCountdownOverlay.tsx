import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { colors, radii } from '@/constants/theme';
import { Button } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { voiceSosService } from '@/services/voiceSos.service';

export default function VoiceSosCountdownOverlay() {
  const countdown = useAppStore((s) => s.voiceSosCountdown);
  const phrase = useAppStore((s) => s.voiceSosPhrase);

  if (countdown === null) {
    return null;
  }

  const handleCancel = () => {
    voiceSosService.cancelCountdown();
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={countdown !== null}
      onRequestClose={handleCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🚨 VOICE SOS DETECTED</Text>
          </View>

          <Text style={styles.title}>Dispatching Emergency Alert</Text>
          <Text style={styles.phraseSub}>Detected code phrase: "{phrase}"</Text>

          <View style={styles.timerCircle}>
            <Text style={styles.timerNumber}>{countdown}</Text>
            <Text style={styles.timerUnit}>seconds</Text>
          </View>

          <Text style={styles.infoText}>
            Alert will be sent automatically to emergency contacts, nearby responders, and emergency services.
          </Text>

          <View style={styles.buttonContainer}>
            <Button
              title="Cancel (False Trigger)"
              variant="secondary"
              onPress={handleCancel}
              style={styles.cancelButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  badge: {
    backgroundColor: colors.bannerRedBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    marginBottom: 14,
  },
  badgeText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 4,
  },
  phraseSub: {
    fontSize: 12.5,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  timerCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.bannerRedBg,
    borderWidth: 3,
    borderColor: colors.red,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  timerNumber: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.red,
    lineHeight: 38,
  },
  timerUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.red,
    textTransform: 'uppercase',
  },
  infoText: {
    fontSize: 11.5,
    color: colors.inkSoft,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
  },
  cancelButton: {
    width: '100%',
    backgroundColor: colors.grey,
  },
});
