import { create } from 'zustand';
import type { Severity } from '@/constants/theme';

export type Role = 'user' | 'hospital' | 'ambulance' | 'doctor';

interface AppState {
  role: Role;
  setRole: (r: Role) => void;

  selectedType: string;
  setSelectedType: (t: string) => void;

  description: string;
  setDescription: (d: string) => void;

  aiSeverity: Severity;
  setAiSeverity: (s: Severity) => void;

  ambStatus: number; // index into AMB_STEPS
  setAmbStatus: (n: number | ((prev: number) => number)) => void;

  selectedHospital: string;
  setSelectedHospital: (h: string) => void;

  // --- Consult Doctor (patient side) ---
  selectedSpecialty: string;
  setSelectedSpecialty: (s: string) => void;

  selectedDoctorId: string;
  setSelectedDoctorId: (id: string) => void;

  userToken: number | null; // token the patient has taken, null if none
  setUserToken: (n: number | null) => void;

  // --- Doctor role (shared demo queue, mocked) ---
  servingToken: number; // token currently being served at the demo clinic
  advanceServingToken: () => void; // moves the queue forward by one (mock)

  queueStatus: 'not_started' | 'running' | 'paused' | 'closed';
  setQueueStatus: (s: 'not_started' | 'running' | 'paused' | 'closed') => void;
}

export const useAppStore = create<AppState>((set) => ({
  role: 'user',
  setRole: (r) => set({ role: r }),

  selectedType: 'Accident',
  setSelectedType: (t) => set({ selectedType: t }),

  description:
    'Motorbike collision at signal, right leg injury, conscious and responsive.',
  setDescription: (d) => set({ description: d }),

  aiSeverity: 'high',
  setAiSeverity: (s) => set({ aiSeverity: s }),

  ambStatus: 0,
  setAmbStatus: (n) =>
    set((state) => ({ ambStatus: typeof n === 'function' ? n(state.ambStatus) : n })),

  selectedHospital: "St. Martha's Hospital",
  setSelectedHospital: (h) => set({ selectedHospital: h }),

  selectedSpecialty: 'All',
  setSelectedSpecialty: (s) => set({ selectedSpecialty: s }),

  selectedDoctorId: 'doc-1',
  setSelectedDoctorId: (id) => set({ selectedDoctorId: id }),

  userToken: null,
  setUserToken: (n) => set({ userToken: n }),

  servingToken: 14,
  advanceServingToken: () => set((state) => ({ servingToken: state.servingToken + 1 })),

  queueStatus: 'running',
  setQueueStatus: (s) => set({ queueStatus: s }),
}));
