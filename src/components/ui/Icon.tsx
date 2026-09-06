import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '@/constants/theme';

export type IconName =
  | 'chevL' | 'chevR' | 'home' | 'ai' | 'map' | 'history' | 'profile' | 'bell'
  | 'pin' | 'phone' | 'check' | 'bed' | 'wifiOff' | 'ambulance' | 'hospital' | 'gps' | 'close'
  | 'doctor' | 'search' | 'calendar' | 'clock' | 'camera' | 'mic' | 'users' | 'idCard';

export function Icon({ name, size = 19, color = colors.ink }: { name: IconName; size?: number; color?: string }) {
  const sw = 1.8;
  switch (name) {
    case 'chevL':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M15 6l-6 6 6 6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
    case 'chevR':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
    case 'home':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M4 11l8-7 8 7v8a2 2 0 01-2 2h-3v-6H9v6H6a2 2 0 01-2-2v-8z" stroke={color} strokeWidth={sw} strokeLinejoin="round" /></Svg>;
    case 'ai':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" stroke={color} strokeWidth={sw} strokeLinecap="round" /><Circle cx={12} cy={12} r={3.5} stroke={color} strokeWidth={sw} /></Svg>;
    case 'map':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M9 20l-6-2V4l6 2 6-2 6 2v14l-6-2-6 2z" stroke={color} strokeWidth={sw} strokeLinejoin="round" /><Path d="M9 6v14M15 4v14" stroke={color} strokeWidth={sw} /></Svg>;
    case 'history':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={sw} /><Path d="M12 7v5l3.5 2" stroke={color} strokeWidth={sw} strokeLinecap="round" /></Svg>;
    case 'profile':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={8.5} r={3.5} stroke={color} strokeWidth={sw} /><Path d="M4.5 20a7.5 7.5 0 0115 0" stroke={color} strokeWidth={sw} strokeLinecap="round" /></Svg>;
    case 'bell':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M18 16v-5a6 6 0 10-12 0v5l-2 3h16l-2-3z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" /><Path d="M9.5 21a2.5 2.5 0 005 0" stroke={color} strokeWidth={1.7} /></Svg>;
    case 'pin':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M12 21s7-7.4 7-12.5A7 7 0 005 8.5C5 13.6 12 21 12 21z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" /><Circle cx={12} cy={8.5} r={2.5} stroke={color} strokeWidth={1.7} /></Svg>;
    case 'phone':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M17 20a2 2 0 002-2v-2.6a1 1 0 00-.4-.8l-2.3-1.7a1 1 0 00-1.1-.1l-1.6.9a10 10 0 01-4.5-4.5l.9-1.6a1 1 0 00-.1-1.1L8.4 4.4a1 1 0 00-.8-.4H5a2 2 0 00-2 2c0 8.3 6.7 15 15 15z" stroke={color} strokeWidth={1.5} /></Svg>;
    case 'check':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M5 13l4 4L19 7" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
    case 'bed':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M3 19v-9M3 14h18M21 19v-3a2 2 0 00-2-2H8" stroke={color} strokeWidth={1.6} strokeLinecap="round" /><Circle cx={7} cy={9} r={2} stroke={color} strokeWidth={1.6} /></Svg>;
    case 'wifiOff':
      return <Svg width={size} height={size * 0.73} viewBox="0 0 20 14" fill="none"><Path d="M1 5a13 13 0 0118 0M4.5 8.5a8 8 0 0111 0M8 12a3 3 0 014 0" stroke={color} strokeWidth={1.6} strokeLinecap="round" /><Path d="M1 1l18 12" stroke={color} strokeWidth={1.6} /></Svg>;
    case 'ambulance':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M3 17V8a1 1 0 011-1h9v10M3 17h1M13 17h6M21 17v-4l-3-4h-4v8" stroke={color} strokeWidth={1.6} strokeLinejoin="round" /><Circle cx={7} cy={18.5} r={1.6} stroke={color} strokeWidth={1.5} /><Circle cx={17} cy={18.5} r={1.6} stroke={color} strokeWidth={1.5} /><Path d="M8 10.5h3M9.5 9v3" stroke={color} strokeWidth={1.4} strokeLinecap="round" /></Svg>;
    case 'hospital':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M4 4h16v17H4z" stroke={color} strokeWidth={1.6} /><Path d="M12 8v6M9 11h6" stroke={color} strokeWidth={1.6} strokeLinecap="round" /></Svg>;
    case 'gps':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.6} /><Path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke={color} strokeWidth={1.6} strokeLinecap="round" /></Svg>;
    case 'close':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} /><Path d="M8 8l8 8M16 8l-8 8" stroke={color} strokeWidth={1.8} strokeLinecap="round" /></Svg>;
    case 'doctor':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M9 3v3a3 3 0 006 0V3" stroke={color} strokeWidth={sw} strokeLinecap="round" /><Path d="M7 4v4a5 5 0 0010 0V4" stroke={color} strokeWidth={sw} strokeLinecap="round" /><Circle cx={18} cy={15} r={2.6} stroke={color} strokeWidth={sw} /><Path d="M4 21c0-3.3 2.8-6 6.5-6h1a6 6 0 015.6 3.8" stroke={color} strokeWidth={sw} strokeLinecap="round" /></Svg>;
    case 'search':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={sw} /><Path d="M20 20l-4-4" stroke={color} strokeWidth={sw} strokeLinecap="round" /></Svg>;
    case 'calendar':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M4 8h16M6 4v3M18 4v3" stroke={color} strokeWidth={sw} strokeLinecap="round" /><Path d="M5 6h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1z" stroke={color} strokeWidth={sw} strokeLinejoin="round" /></Svg>;
    case 'clock':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={sw} /><Path d="M12 7v5l4 2" stroke={color} strokeWidth={sw} strokeLinecap="round" /></Svg>;
    case 'camera':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" stroke={color} strokeWidth={sw} strokeLinejoin="round" /><Circle cx={12} cy={14} r={3.4} stroke={color} strokeWidth={sw} /></Svg>;
    case 'mic':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M12 15a3 3 0 003-3V6a3 3 0 00-6 0v6a3 3 0 003 3z" stroke={color} strokeWidth={sw} strokeLinejoin="round" /><Path d="M5 11a7 7 0 0014 0M12 18v3" stroke={color} strokeWidth={sw} strokeLinecap="round" /></Svg>;
    case 'users':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx={9} cy={8} r={3} stroke={color} strokeWidth={sw} /><Path d="M2.5 20a6.5 6.5 0 0113 0" stroke={color} strokeWidth={sw} strokeLinecap="round" /><Path d="M15.5 5.5a3 3 0 010 5.8M18 20a6 6 0 00-3.8-5.6" stroke={color} strokeWidth={sw} strokeLinecap="round" /></Svg>;
    case 'idCard':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M3 6h18v12H3z" stroke={color} strokeWidth={sw} strokeLinejoin="round" /><Circle cx={8} cy={12} r={2} stroke={color} strokeWidth={sw} /><Path d="M13 10h6M13 14h4" stroke={color} strokeWidth={sw} strokeLinecap="round" /></Svg>;
    default:
      return null;
  }
}
