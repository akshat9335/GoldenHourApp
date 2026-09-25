import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
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

  const [activeTab, setActiveTab] = useState<'video' | 'chat' | 'clinical'>('video');

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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.headerCard}>
          <Text style={styles.statusLine}>
            Status: <Text style={{ fontWeight: '700', color: colors.success }}>{consult.status.toUpperCase()}</Text>{' '}
            · Room: {consult.roomId}
          </Text>
          <Text style={styles.roleSub}>
            Logged in as: <Text style={{ fontWeight: '700' }}>{selfRole.toUpperCase()}</Text> ({selfId})
          </Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'video' && styles.tabBtnActive]}
            onPress={() => setActiveTab('video')}
          >
            <Text style={[styles.tabText, activeTab === 'video' && styles.tabTextActive]}>
              📹 Video Call
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'chat' && styles.tabBtnActive]}
            onPress={() => setActiveTab('chat')}
          >
            <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>
              💬 Live Chat
            </Text>
          </TouchableOpacity>

          {selfRole === 'doctor' && (
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'clinical' && styles.tabBtnActive]}
              onPress={() => setActiveTab('clinical')}
            >
              <Text style={[styles.tabText, activeTab === 'clinical' && styles.tabTextActive]}>
                📝 Rx & Notes
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab 1: Video */}
        {activeTab === 'video' && (
          <View style={styles.tabContent}>
            <View style={{ height: 320, width: '100%', marginBottom: 12 }}>
              <VideoPanel
                localLabel={`${selfRole} (you)`}
                remoteLabel={selfRole === 'doctor' ? 'Patient' : 'Doctor'}
                localStream={localStream}
                remoteStream={remoteStream}
                isConnected={consult.status === 'active' || !!consult.roomId}
              />
            </View>
            <CallControls
              micOn={micOn} camOn={camOn}
              onToggleMic={onToggleMic} onToggleCam={onToggleCam}
              onEnd={onEnd} onEscalate={onEscalate}
              isDoctor={selfRole === 'doctor'}
            />
          </View>
        )}

        {/* Tab 2: Chat */}
        {activeTab === 'chat' && (
          <View style={[styles.tabContent, { height: 460 }]}>
            <ChatPanel
              consultationId={consultationId}
              selfId={selfId}
              selfRole={selfRole}
            />
          </View>
        )}

        {/* Tab 3: Clinical (Doctor Only) */}
        {activeTab === 'clinical' && selfRole === 'doctor' && (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <DoctorNotes
                consultationId={consultationId}
                doctorId={selfId}
              />
            </View>
            <View style={styles.section}>
              <PrescriptionForm
                consultationId={consultationId}
                doctorId={selfId}
                patientId={consult.patientId}
              />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <ConsultationSummary consultationId={consultationId} />
        </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: 12, backgroundColor: colors.bg, gap: 12 },
  headerCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  statusLine: { color: colors.inkSoft, fontSize: 13 },
  roleSub: { color: colors.inkFaint, fontSize: 11, marginTop: 3 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkFaint,
  },
  tabTextActive: {
    color: colors.blue,
    fontWeight: '700',
  },
  tabContent: {
    width: '100%',
  },
  section: { marginTop: 12 },
  err: { color: colors.red, padding: 20 },
});
