import React from 'react';
import { View, StyleSheet } from 'react-native';

/** Static grid placeholder standing in for a real map SDK (Maps/Mapbox can be swapped in later). */
export function MapBg() {
  const lines = Array.from({ length: 12 });
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#EEF2F6' }]} />
      {lines.map((_, i) => (
        <View key={`h${i}`} style={{ position: 'absolute', top: i * 38, left: 0, right: 0, height: 1, backgroundColor: '#E2E8EF' }} />
      ))}
      {lines.map((_, i) => (
        <View key={`v${i}`} style={{ position: 'absolute', left: i * 38, top: 0, bottom: 0, width: 1, backgroundColor: '#E2E8EF' }} />
      ))}
    </View>
  );
}
