import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ScrollView, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';
import { VideoPanel } from './VideoPanel';
import { CallControls } from './CallControls';
import { ChatPanel } from './ChatPanel';
import { DoctorNotes } from './DoctorNotes';
import { PrescriptionForm } from './PrescriptionForm';
import { ConsultationSummary } from './ConsultationSummary';
import {
  subscribeTeleconsultation, markActive, markCompleted,
  escalateToEmergency, userHasAccess, type Teleconsultation,
} from '@/services/teleconsultation';
import {
  WebRTCPeer, publishSignal, subscribeSignals, ensureRoomDoc,
  type SignalPayload,
} from '@/services/webrtc';

interface Props {
  consultationId: string;
  selfId: string;
  selfRole: 'patient' | 'doctor';
}

export const ConsultationRoom = ({ consultationId, selfId, selfRole }: Props) => {
  const [consult, setConsult] = useState<Teleconsultation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // 1. Access control: only the assigned patient/doctor may enter.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await userHasAccess(consultationId, selfId, selfRole);
      if (!ok && !cancelled) setError('You are not assigned to this consultation.');
    })();
    return () => { cancelled = true; };
  }, [consultationId, selfId, selfRole]);

  // 2. Subscribe to the consultation record; mark active on first sight.
  useEffect(() => {
    const unsub = subscribeTeleconsultation(consultationId, (t) => {
      if (t) {
        setConsult(t);
        if (t.status === 'scheduled') markActive(consultationId).catch(() => {});
      }
    });
    return unsub;
  }, [consultationId]);

  // 3. Bring up WebRTC + signaling.
  useEffect(() => {
    if (!consult || error) return;
    const peer = new WebRTCPeer(consult.roomId, selfRole);
    let cancelled = false;

    (async () => {
      await ensureRoomDoc(consult.roomId);
      if (cancelled) return;
      const stream = await peer.getLocalStream();
      if (cancelled) return;
      setLocalStream(stream);

      peer.onRemoteStream(setRemoteStream);
      peer.onIce(async (c) => {
        await publishSignal(consult.roomId, {
          kind: 'ice', from: selfRole, data: c.toJSON(), createdAt: Date.now(),
        });
      });

      const unsub = subscribeSignals(consult.roomId, async (sigs: SignalPayload[]) => {
        for (const s of sigs) {
          if (s.from === selfRole) continue;
          if (s.kind === 'offer' && selfRole === 'patient') {
            await peer.acceptAnswer(s.data as RTCSessionDescriptionInit);
          } else if (s.kind === 'answer' && selfRole === 'doctor') {
            await peer.acceptAnswer(s.data as RTCSessionDescriptionInit);
          } else if (s.kind === 'ice') {
            await peer.addIce(s.data as RTCIceCandidateInit);
          }
        }
      });

      if (selfRole === 'doctor') {
        const offer = await peer.createOffer();
        await publishSignal(consult.roomId, {
          kind: 'offer', from: 'doctor', data: offer, createdAt: Date.now(),
        });
      }

      // Stash cleanup
      (peer as unknown as { _unsubSig?: () => void })._unsubSig = unsub;
    })();

    return () => {
      cancelled = true;
      peer.close();
      (peer as unknown as { _unsubSig?: () => void })._unsubSig?.();
    };
  }, [consult, error, selfRole]);

  const onToggleMic = () => {
    // WebRTCPeer toggles its own tracks; here we mirror state for UI.
    setMicOn((v) => !v);
  };
  const onToggleCam = () => setCamOn((v) => !v);

  const onEnd = async () => {
    await markCompleted(consultationId);
    Alert.alert('Consultation ended');
  };

  const onEscalate = () => {
    Alert.prompt?.('Escalate', 'Reason for emergency escalation?', async (reason) => {
      await escalateToEmergency(consultationId, reason || 'unspecified');
    });
  };

  if (error) {
    return <Text style={styles.err}>{error}</Text>;
  }
  if (!consult) {
    return <ActivityIndicator color={colors.red} style={{ marginTop: 40 }} />;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Teleconsultation', headerShown: true }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.statusLine}>
          Status: <Text style={{ fontWeight: '700' }}>{consult.status}</Text>{' '}
          · Room: {consult.roomId}
        </Text>
        <View style={styles.mediaRow}>
          <View style={{ flex: 2, height: 320 }}>
            <VideoPanel
              localLabel={`${selfRole} (you)`}
              remoteLabel={selfRole === 'doctor' ? 'Patient' : 'Doctor'}
              localStream={localStream}
              remoteStream={remoteStream}
            />
          </View>
          <View style={{ flex: 1, height: 320, marginLeft: 10 }}>
            <ChatPanel
              consultationId={consultationId}
              selfId={selfId}
              selfRole={selfRole}
            />
          </View>
        </View>
        <CallControls
          micOn={micOn} camOn={camOn}
          onToggleMic={onToggleMic} onToggleCam={onToggleCam}
          onEnd={onEnd} onEscalate={onEscalate}
          isDoctor={selfRole === 'doctor'}
        />
        {selfRole === 'doctor' && (
          <>
            <View style={styles.section}><DoctorNotes
              consultationId={consultationId} doctorId={selfId}
            /></View>
            <View style={styles.section}><PrescriptionForm
              consultationId={consultationId} doctorId={selfId}
              patientId={consult.patientId}
            /></View>
          </>
        )}
        <View style={styles.section}><ConsultationSummary consultationId={consultationId} /></View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: 12, backgroundColor: colors.bg, gap: 12 },
  statusLine: { color: colors.inkSoft, fontSize: 12 },
  mediaRow: { flexDirection: 'row' },
  section: { marginTop: 12 },
  err: { color: colors.red, padding: 20 },
});
