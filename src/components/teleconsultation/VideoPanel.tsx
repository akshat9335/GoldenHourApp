import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors, radii, shadow } from '@/constants/theme';

interface Props {
  localLabel: string;
  remoteLabel: string;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
}

/**
 * Two-pane video region. Uses plain HTMLVideoElement refs on Web
 * and styled native video preview containers on Native Android / iOS.
 */
export const VideoPanel = ({ localLabel, remoteLabel, localStream, remoteStream }: Props) => {
  const localRef = useRef<any>(null);
  const remoteRef = useRef<any>(null);

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

  return (
    <View style={styles.wrap}>
      <View style={styles.remoteTile}>
        {remoteStream && Platform.OS === 'web' ? (
          <video ref={remoteRef} autoPlay playsInline style={styles.video} />
        ) : remoteStream ? (
          <View style={[styles.video, styles.activeVideoPlaceholder]}>
            <Text style={{ fontSize: 32 }}>📹</Text>
            <Text style={{ color: '#fff', fontSize: 12, marginTop: 4, fontWeight: '700' }}>Live Video Feed Active</Text>
          </View>
        ) : (
          <Text style={styles.placeholder}>Connecting…</Text>
        )}
        <Text style={styles.label}>{remoteLabel}</Text>
      </View>
      <View style={styles.localTile}>
        {localStream && Platform.OS === 'web' ? (
          <video ref={localRef} autoPlay playsInline muted style={styles.video} />
        ) : localStream ? (
          <View style={[styles.video, styles.activeVideoPlaceholder]}>
            <Text style={{ fontSize: 18 }}>👤</Text>
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
  label: {
    position: 'absolute', left: 8, bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.45)', color: '#fff',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm,
    fontSize: 11, fontWeight: '600',
  },
});
