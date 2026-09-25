import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors, radii, shadow } from '@/constants/theme';

interface Props {
  localLabel: string;
  remoteLabel: string;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  isConnected?: boolean;
}

/**
 * Two-pane video region. Uses plain HTMLVideoElement refs on Web
 * and styled native video preview containers on Native Android / iOS.
 */
export const VideoPanel = ({ localLabel, remoteLabel, localStream, remoteStream, isConnected = false }: Props) => {
  const localRef = useRef<any>(null);
  const remoteRef = useRef<any>(null);
  const [callDuration, setCallDuration] = React.useState(0);

  useEffect(() => {
    if (!isConnected) return;
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isConnected]);

  useEffect(() => {
    if (Platform.OS === 'web' && localRef.current && localStream) {
      localRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (Platform.OS === 'web' && remoteRef.current && remoteStream) {
      remoteRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const isCallActive = isConnected || !!remoteStream;

  return (
    <View style={styles.wrap}>
      <View style={styles.remoteTile}>
        {remoteStream && Platform.OS === 'web' ? (
          <video ref={remoteRef} autoPlay playsInline style={styles.video} />
        ) : isCallActive ? (
          <View style={[styles.video, styles.activeVideoPlaceholder]}>
            <View style={{ alignItems: 'center' }}>
              <View style={styles.avatarCircle}>
                <Text style={{ fontSize: 36 }}>👨‍⚕️</Text>
              </View>
              <Text style={{ color: '#fff', fontSize: 15, marginTop: 8, fontWeight: '800' }}>
                {remoteLabel}
              </Text>
              <View style={styles.statusPillLive}>
                <View style={styles.greenPulse} />
                <Text style={{ color: '#86EFAC', fontSize: 11, fontWeight: '700' }}>
                  Live Consultation · {formatTime(callDuration)}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 24, marginBottom: 8 }}>📡</Text>
            <Text style={styles.placeholder}>Connecting secure consultation stream…</Text>
          </View>
        )}
        <Text style={styles.label}>{remoteLabel}</Text>
      </View>
      <View style={styles.localTile}>
        {localStream && Platform.OS === 'web' ? (
          <video ref={localRef} autoPlay playsInline muted style={styles.video} />
        ) : isCallActive ? (
          <View style={[styles.video, styles.activeVideoPlaceholder, { backgroundColor: '#334155' }]}>
            <Text style={{ fontSize: 22 }}>👤</Text>
            <Text style={{ color: '#CBD5E1', fontSize: 9, fontWeight: '700', marginTop: 2 }}>You</Text>
          </View>
        ) : (
          <Text style={styles.placeholder}>Camera off</Text>
        )}
        <Text style={styles.label}>{localLabel}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.ink, borderRadius: radii.lg, overflow: 'hidden', ...shadow.card },
  remoteTile: { flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  localTile: {
    position: 'absolute', right: 12, bottom: 12, width: 110, height: 80,
    backgroundColor: '#000', borderRadius: radii.md, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
  },
  video: { width: '100%', height: '100%', objectFit: 'cover' as const },
  activeVideoPlaceholder: {
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: { color: '#fff', fontSize: 13 },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  greenPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  label: {
    position: 'absolute', left: 8, bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.45)', color: '#fff',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm,
    fontSize: 11, fontWeight: '600',
  },
});
