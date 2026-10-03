/**
 * InteractiveMap — Works 100% in Expo Go (zero native modules required)
 * Uses real OpenStreetMap + ESRI tile images via React Native Image component.
 * Drag to pan, pinch to zoom — exactly like Ola/Uber map.
 */
import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Linking,
  Animated,
  PanResponder,
  Image,
  Dimensions,
  Easing,
} from 'react-native';
import Svg, { Polyline as SvgPolyline, Circle as SvgCircle } from 'react-native-svg';
import { colors } from '@/constants/theme';
import { Icon } from './Icon';
import { useAppStore } from '@/store/useAppStore';

const { width: SW, height: SH } = Dimensions.get('window');
const TILE_SIZE = 256;
const DEFAULT_ZOOM = 15;
// 7×7 grid so user can pan freely without hitting edge
const GRID_R = 3;

/* ─── Types ─────────────────────────────────────────────── */
export interface MapCoordinate { latitude: number; longitude: number; }
export interface InteractiveMapProps {
  userLat?: number; userLng?: number; userTitle?: string;
  destLat?: number; destLng?: number; destTitle?: string;
  ambulanceLat?: number; ambulanceLng?: number; ambulanceTitle?: string;
  routeCoords?: MapCoordinate[];
  distanceKm?: number; etaMin?: number;
  style?: any;
  showRoute?: boolean; showNavButton?: boolean; showTopHud?: boolean;
  onNavPress?: () => void;
}

export function isValidCoord(lat?: number, lng?: number): boolean {
  return typeof lat === 'number' && typeof lng === 'number'
    && !isNaN(lat) && !isNaN(lng)
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    && (lat !== 0 || lng !== 0);
}

/**
 * Opens Google Maps in Map / Directions Preview mode (NO auto-speaking voice driving navigation).
 * Shows the pin or route preview cleanly on the map.
 */
export function openExternalMapPreview({
  lat,
  lng,
  title,
  originLat,
  originLng,
}: {
  lat: number;
  lng: number;
  title?: string;
  originLat?: number;
  originLng?: number;
}) {
  const hasOrigin = isValidCoord(originLat, originLng);
  const destStr = `${lat},${lng}`;
  const label = encodeURIComponent(title || 'Location');

  const androidUrl = hasOrigin
    ? `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destStr}&travelmode=driving`
    : `geo:${destStr}?q=${destStr}(${label})`;

  const iosUrl = hasOrigin
    ? `https://maps.apple.com/?saddr=${originLat},${originLng}&daddr=${destStr}`
    : `https://maps.apple.com/?q=${label}&ll=${destStr}`;

  const webUrl = hasOrigin
    ? `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destStr}`
    : `https://www.google.com/maps/search/?api=1&query=${destStr}`;

  const primary = Platform.select({ android: androidUrl, ios: iosUrl, default: webUrl });
  Linking.canOpenURL(primary)
    .then((ok) => (ok ? Linking.openURL(primary) : Linking.openURL(webUrl)))
    .catch(() => Linking.openURL(webUrl));
}

/**
 * Specifically launches Turn-by-Turn GPS Voice Driving Navigation (Google Maps / Apple Maps).
 * Meant for driver's optional use when driving.
 */
export function openExternalVoiceNavigation({
  destLat,
  destLng,
  destTitle,
}: {
  destLat: number;
  destLng: number;
  destTitle?: string;
}) {
  const dq = `${destLat},${destLng}`;
  const androidUrl = `google.navigation:q=${dq}&mode=d`;
  const iosUrl = `maps://app?daddr=${dq}`;
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${dq}&travelmode=driving`;

  const primary = Platform.select({ android: androidUrl, ios: iosUrl, default: webUrl });
  Linking.canOpenURL(primary)
    .then((ok) => (ok ? Linking.openURL(primary) : Linking.openURL(webUrl)))
    .catch(() => Linking.openURL(webUrl));
}

/**
 * Unified external navigation helper. Defaults to Map Preview (no voice assistant).
 * Set voiceGuidance: true only if voice turn-by-turn driving guidance is explicitly wanted.
 */
export function openExternalNavigation(opts: {
  destLat: number;
  destLng: number;
  destTitle?: string;
  userLat?: number;
  userLng?: number;
  voiceGuidance?: boolean;
}) {
  if (opts.voiceGuidance) {
    openExternalVoiceNavigation({
      destLat: opts.destLat,
      destLng: opts.destLng,
      destTitle: opts.destTitle,
    });
  } else {
    openExternalMapPreview({
      lat: opts.destLat,
      lng: opts.destLng,
      title: opts.destTitle,
      originLat: opts.userLat,
      originLng: opts.userLng,
    });
  }
}

/** Convert lat/lng to fractional tile coords at zoom level */
function latLngToTile(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * n;
  const rad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
  return { x, y };
}

/* ─── Single Tile Component ──────────────────────────────── */
function Tile({ tx, ty, zoom, left, top }: { tx: number; ty: number; zoom: number; left: number; top: number; }) {
  const [idx, setIdx] = useState(0);
  const tileKey = `${zoom}/${tx}/${ty}`;
  const sub = ['a', 'b', 'c'][Math.abs(tx + ty) % 3];

  // Multiple fallback tile sources — all free, no API key
  const urls = useMemo(() => [
    // 1. OpenStreetMap standard (most reliable)
    `https://${sub}.tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`,
    // 2. ESRI World Street Map (Y/X order!)
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${ty}/${tx}`,
    // 3. OSM HOT style
    `https://a.tile.openstreetmap.fr/hot/${zoom}/${tx}/${ty}.png`,
  ], [tileKey]);

  return (
    <Image
      key={urls[idx]}
      source={{ uri: urls[idx], headers: { 'User-Agent': 'GoldenHourApp/1.0' } }}
      style={{ position: 'absolute', left, top, width: TILE_SIZE, height: TILE_SIZE }}
      onError={() => { if (idx < urls.length - 1) setIdx(i => i + 1); }}
      resizeMode="cover"
      fadeDuration={0}
    />
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export function InteractiveMap({
  userLat, userLng, userTitle = 'Patient',
  destLat, destLng, destTitle = 'Hospital',
  ambulanceLat, ambulanceLng, ambulanceTitle = 'Ambulance',
  routeCoords, distanceKm = 1.4, etaMin = 4,
  style, showRoute = true, showNavButton = false, showTopHud = false, onNavPress,
}: InteractiveMapProps) {
  const hasUser = isValidCoord(userLat, userLng);
  const hasDest = isValidCoord(destLat, destLng);
  const hasAmb  = isValidCoord(ambulanceLat, ambulanceLng);

  const lastKnown = useAppStore((s) => s.lastKnownLocation);

  const centerLat = useMemo(() => {
    if (hasAmb && hasUser) return (ambulanceLat! + userLat!) / 2;
    if (hasAmb && hasDest) return (ambulanceLat! + destLat!) / 2;
    if (hasUser) return userLat!;
    if (hasAmb) return ambulanceLat!;
    if (hasDest) return destLat!;
    return lastKnown?.latitude ?? 25.4358;
  }, [hasAmb, hasUser, hasDest, ambulanceLat, userLat, destLat, lastKnown?.latitude]);

  const centerLng = useMemo(() => {
    if (hasAmb && hasUser) return (ambulanceLng! + userLng!) / 2;
    if (hasAmb && hasDest) return (ambulanceLng! + destLng!) / 2;
    if (hasUser) return userLng!;
    if (hasAmb) return ambulanceLng!;
    if (hasDest) return destLng!;
    return lastKnown?.longitude ?? 81.8463;
  }, [hasAmb, hasUser, hasDest, ambulanceLng, userLng, destLng, lastKnown?.longitude]);

  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  // ── Animations ─────────────────────────────────────────
  const sirenAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const siren = Animated.loop(Animated.sequence([
      Animated.timing(sirenAnim, { toValue: 1, duration: 380, useNativeDriver: false }),
      Animated.timing(sirenAnim, { toValue: 0, duration: 380, useNativeDriver: false }),
    ]));
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.45, duration: 950, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 950, useNativeDriver: true }),
    ]));
    siren.start(); pulse.start();
    return () => { siren.stop(); pulse.stop(); };
  }, []);

  // ── Pan responder ───────────────────────────────────────
  const panOffset = useRef({ x: 0, y: 0 });
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;
  const scaleVal = useRef(1);
  const pinchStart = useRef<number | null>(null);
  const pinchStartScale = useRef(1);

  useEffect(() => {
    const ids = [
      pan.addListener(v => { panOffset.current = v; }),
      scale.addListener(v => { scaleVal.current = v.value; }),
    ];
    return () => { pan.removeListener(ids[0]); scale.removeListener(ids[1]); };
  }, []);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderGrant: () => {
      pan.setOffset({ x: panOffset.current.x, y: panOffset.current.y });
      pan.setValue({ x: 0, y: 0 });
      pinchStart.current = null;
    },
    onPanResponderMove: (evt, gs) => {
      const touches = evt.nativeEvent.touches;
      if (touches.length === 1) {
        pan.setValue({ x: gs.dx, y: gs.dy });
      } else if (touches.length >= 2) {
        const t0 = touches[0], t1 = touches[1];
        const dist = Math.hypot(t0.pageX - t1.pageX, t0.pageY - t1.pageY);
        if (pinchStart.current === null) {
          pinchStart.current = dist;
          pinchStartScale.current = scaleVal.current;
        } else {
          const next = Math.min(Math.max(pinchStartScale.current * (dist / pinchStart.current), 0.6), 2.5);
          scale.setValue(next);
        }
      }
    },
    onPanResponderRelease: () => { pan.flattenOffset(); pinchStart.current = null; },
  }), []);

  // ── Tile grid calculation ───────────────────────────────
  const centerTileFrac = useMemo(() => latLngToTile(centerLat, centerLng, zoom), [centerLat, centerLng, zoom]);
  const ctxi = Math.floor(centerTileFrac.x);
  const ctyi = Math.floor(centerTileFrac.y);
  const fracOffX = (centerTileFrac.x - ctxi) * TILE_SIZE;
  const fracOffY = (centerTileFrac.y - ctyi) * TILE_SIZE;
  const vpCX = SW / 2;
  const vpCY = SH / 2;

  const tiles = useMemo(() => {
    const list: { key: string; tx: number; ty: number; left: number; top: number }[] = [];
    for (let dr = -GRID_R; dr <= GRID_R; dr++) {
      for (let dc = -GRID_R; dc <= GRID_R; dc++) {
        const tx = ctxi + dc;
        const ty = ctyi + dr;
        // Skip invalid tiles
        const maxTile = Math.pow(2, zoom);
        if (tx < 0 || ty < 0 || tx >= maxTile || ty >= maxTile) continue;
        list.push({
          key: `${zoom}_${tx}_${ty}`,
          tx, ty,
          left: vpCX + dc * TILE_SIZE - fracOffX,
          top:  vpCY + dr * TILE_SIZE - fracOffY,
        });
      }
    }
    return list;
  }, [ctxi, ctyi, fracOffX, fracOffY, zoom]);

  // ── Marker pixel positions (purely coordinate-driven, no fake offsets) ──
  const tileToPixel = useCallback((lat?: number, lng?: number) => {
    if (!isValidCoord(lat, lng)) return null;
    const t = latLngToTile(lat!, lng!, zoom);
    return {
      x: vpCX + (t.x - centerTileFrac.x) * TILE_SIZE,
      y: vpCY + (t.y - centerTileFrac.y) * TILE_SIZE,
    };
  }, [centerTileFrac, zoom]);

  const destPx = hasDest ? tileToPixel(destLat, destLng) : null;
  const userPx = hasUser ? tileToPixel(userLat, userLng) : null;
  const ambPx  = hasAmb  ? tileToPixel(ambulanceLat, ambulanceLng) : null;

  // Route polyline points string for SVG
  const routeSvgPoints = useMemo(() => {
    if (!showRoute) return '';
    const pts: { x: number; y: number }[] = [];
    if (hasAmb && ambPx) pts.push(ambPx);
    if (hasUser && userPx) pts.push(userPx);
    if (hasDest && destPx) pts.push(destPx);
    if (pts.length < 2) return '';
    return pts.map(p => `${p.x},${p.y}`).join(' ');
  }, [ambPx, userPx, destPx, showRoute, hasAmb, hasUser, hasDest]);

  const sirenColor = sirenAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(239,68,68,0.55)', 'rgba(37,99,235,0.55)'],
  });

  const zoomIn  = () => { if (zoom < 18) { setZoom(z => z + 1); pan.setValue({ x: 0, y: 0 }); pan.setOffset({ x: 0, y: 0 }); scale.setValue(1); } };
  const zoomOut = () => { if (zoom > 12) { setZoom(z => z - 1); pan.setValue({ x: 0, y: 0 }); pan.setOffset({ x: 0, y: 0 }); scale.setValue(1); } };
  const recenter = () => {
    Animated.parallel([
      Animated.spring(pan,   { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  const handleNav = () => {
    if (onNavPress) { onNavPress(); return; }
    openExternalNavigation({ destLat: hasDest ? destLat! : centerLat, destLng: hasDest ? destLng! : centerLng, destTitle, userLat: hasUser ? userLat : undefined, userLng: hasUser ? userLng : undefined });
  };

  return (
    <View style={[styles.container, style]}>
      {/* ── MAP CANVAS ── */}
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
        <Animated.View style={[StyleSheet.absoluteFill, {
          transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }],
        }]}>
          {/* Grey base so there's never a black void */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#E8EDF2' }]} />

          {/* REAL STREET TILES */}
          {tiles.map(t => (
            <Tile key={t.key} tx={t.tx} ty={t.ty} zoom={zoom} left={t.left} top={t.top} />
          ))}

          {/* SVG ROUTE POLYLINE */}
          {showRoute && routeSvgPoints.length > 0 && (
            <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
              <SvgPolyline
                points={routeSvgPoints}
                stroke="#2563EB"
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={0.85}
              />
            </Svg>
          )}

          {/* ── DESTINATION MARKER ── */}
          {hasDest && destPx && (
            <View style={[styles.markerRoot, { left: destPx.x - 22, top: destPx.y - 48 }]} pointerEvents="none">
              <View style={styles.destPin}>
                <Text style={styles.pinEmoji}>🏥</Text>
              </View>
              <View style={styles.pinStem} />
              <View style={styles.destBadge}>
                <Text style={styles.destBadgeText} numberOfLines={1}>{destTitle}</Text>
              </View>
            </View>
          )}

          {/* ── PATIENT MARKER ── */}
          {hasUser && userPx && (
            <View style={[styles.markerRoot, { left: userPx.x - 22, top: userPx.y - 48 }]} pointerEvents="none">
              <Animated.View style={[styles.pulseRing, {
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({ inputRange: [1, 1.45], outputRange: [0.6, 0.0] }),
              }]} />
              <View style={styles.patientPin}>
                <Text style={styles.pinEmoji}>📍</Text>
              </View>
              <View style={styles.pinStem} />
              <View style={styles.patientBadge}>
                <Text style={styles.patientBadgeText} numberOfLines={1}>{userTitle}</Text>
              </View>
            </View>
          )}

          {/* ── AMBULANCE (REAL COORDINATES) ── */}
          {hasAmb && ambPx && (
            <View style={[styles.ambRoot, { left: ambPx.x, top: ambPx.y }]} pointerEvents="none">
              <Animated.View style={[styles.sirenRing, { backgroundColor: sirenColor }]} />
              <View style={styles.ambPin}>
                <Text style={{ fontSize: 18 }}>🚑</Text>
              </View>
              <View style={styles.etaBadge}>
                <View style={styles.greenDot} />
                <Text style={styles.etaText}>
                  {ambulanceTitle || 'Rescue Unit'}
                  {distanceKm && etaMin ? ` · ${distanceKm}km` : ''}
                </Text>
              </View>
            </View>
          )}
        </Animated.View>
      </View>

      {/* ── TOP HUD (Optional) ── */}
      {showTopHud && (
        <View style={styles.hud}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.liveDot} />
            <Text style={styles.hudLive}>LIVE GPS</Text>
          </View>
          <Text style={styles.hudMeta}>{distanceKm} km · {etaMin} min ETA</Text>
        </View>
      )}

      {/* ── ZOOM CONTROLS ── */}
      <View style={styles.zoomCol}>
        {[{label: '+', fn: zoomIn}, {label: '−', fn: zoomOut}, {label: '🎯', fn: recenter}].map(b => (
          <TouchableOpacity key={b.label} style={styles.zBtn} onPress={b.fn} activeOpacity={0.75}>
            <Text style={styles.zBtnTxt}>{b.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── NAV BUTTON ── */}
      {showNavButton && (
        <View style={styles.navWrap}>
          <TouchableOpacity style={styles.navBtn} onPress={handleNav} activeOpacity={0.88}>
            <View style={styles.navIcon}><Icon name="gps" color="#fff" size={17} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navTitle}>View in Google Maps</Text>
              <Text style={styles.navSub}>Open Route Preview</Text>
            </View>
            <Text style={styles.navArrow}>➔</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFill, overflow: 'hidden', backgroundColor: '#E8EDF2' },

  /* Markers */
  markerRoot: { position: 'absolute', alignItems: 'center', zIndex: 20 },
  destPin: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#0D9488',
    borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 5,
  },
  patientPin: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#DC2626',
    borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowColor: '#DC2626', shadowOpacity: 0.45, shadowRadius: 5,
  },
  pinEmoji: { fontSize: 20 },
  pinStem: { width: 3, height: 8, backgroundColor: '#fff', opacity: 0.7 },
  destBadge: {
    backgroundColor: '#0D9488', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, maxWidth: 170, marginTop: 2,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3,
  },
  destBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  patientBadge: {
    backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, maxWidth: 150, marginTop: 2,
    borderWidth: 1.5, borderColor: '#FECACA',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3,
  },
  patientBadgeText: { fontSize: 10, fontWeight: '800', color: '#DC2626' },
  pulseRing: {
    position: 'absolute', width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(220,38,38,0.3)', top: -13, left: -13,
  },

  /* Ambulance */
  ambRoot: { position: 'absolute', alignItems: 'center', zIndex: 30, marginLeft: -22, marginTop: -22 },
  sirenRing: { position: 'absolute', width: 56, height: 56, borderRadius: 28, top: -6, left: -6 },
  ambPin: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
    borderWidth: 2.5, borderColor: '#2563EB', alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 5,
  },
  etaBadge: {
    backgroundColor: '#1E293B', paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 5, flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, elevation: 4,
  },
  greenDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#22C55E' },
  etaText: { fontSize: 9.5, fontWeight: '800', color: '#fff' },

  /* Header */
  headerWrap: { position: 'absolute', top: 16, left: 16, right: 16, alignItems: 'center', zIndex: 40 },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.96)', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6,
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 5,
    borderWidth: 1, borderColor: '#E2E8F0', maxWidth: '90%',
  },
  headerText: { fontSize: 11.5, fontWeight: '800', color: '#1E293B', flexShrink: 1 },
  headerHint: { fontSize: 10, color: '#64748B', fontWeight: '600' },

  /* HUD */
  hud: {
    position: 'absolute', top: 60, left: 16, right: 16, zIndex: 40,
    backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#16A34A' },
  hudLive: { fontSize: 10.5, fontWeight: '800', color: '#16A34A', letterSpacing: 0.5 },
  hudMeta: { fontSize: 11, fontWeight: '800', color: '#1E293B' },

  /* Zoom */
  zoomCol: { position: 'absolute', right: 14, top: 120, gap: 8, zIndex: 40 },
  zBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 4,
    borderWidth: 1, borderColor: '#CBD5E1',
  },
  zBtnTxt: { fontSize: 20, fontWeight: '700', color: '#1E293B', lineHeight: 22 },
  zoomPill: {
    position: 'absolute', right: 14, bottom: 90, zIndex: 40,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  zoomPillTxt: { fontSize: 10, color: '#fff', fontWeight: '700' },

  /* Nav button */
  navWrap: { position: 'absolute', left: 16, right: 16, bottom: 20, zIndex: 45 },
  navBtn: {
    backgroundColor: '#15803D', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5,
    borderWidth: 1, borderColor: '#22C55E',
  },
  navIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  navTitle: { fontSize: 13.5, fontWeight: '800', color: '#fff' },
  navSub: { fontSize: 10.5, color: '#DCFCE7', marginTop: 1 },
  navArrow: { fontSize: 15, color: '#fff', fontWeight: '900' },
});
