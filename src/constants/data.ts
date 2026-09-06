export const AMB_STEPS = [
  'Ambulance Assigned',
  'En Route to You',
  'Arriving Now',
  'Patient Picked Up',
  'En Route to Hospital',
  'Arrived at Hospital',
  'Emergency Completed',
];

export const EMERGENCY_TYPES: Array<{ label: string; icon: string; color: string }> = [
  { label: 'Accident', icon: 'ambulance', color: '#D32F2F' },
  { label: 'Injury', icon: 'pin', color: '#D32F2F' },
  { label: 'Chest Pain', icon: 'ai', color: '#C2610C' },
  { label: 'Breathing Difficulty', icon: 'gps', color: '#1565C0' },
  { label: 'Unconscious Patient', icon: 'history', color: '#B71C1C' },
  { label: 'Severe Bleeding', icon: 'bell', color: '#D32F2F' },
  { label: 'Burns', icon: 'ai', color: '#B8860B' },
  { label: 'Other Emergency', icon: 'profile', color: '#5B6472' },
];
