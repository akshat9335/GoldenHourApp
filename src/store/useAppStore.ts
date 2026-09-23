import { create } from 'zustand';
import type { Severity } from '@/constants/theme';

export type CanonicalRole =
  | 'PATIENT'
  | 'DOCTOR'
  | 'HOSPITAL'
  | 'AMBULANCE_DRIVER'
  | 'FRONTLINE_WORKER'
  | 'ADMIN';

export type Role =
  | CanonicalRole
  | 'user'
  | 'hospital'
  | 'ambulance'
  | 'doctor';

export type VerificationStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

interface AppState {
  role: Role;
  setRole: (r: Role) => void;
  roles: Role[];
  setRoles: (roles: Role[]) => void;
  verificationStatus: VerificationStatus | null;
  setVerificationStatus: (status: VerificationStatus | null) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  authLoading: boolean;
  setAuthLoading: (val: boolean) => void;
  profileExists: boolean;
  setProfileExists: (val: boolean) => void;

  selectedType: string;
  setSelectedType: (t: string) => void;

  description: string;
  setDescription: (d: string) => void;

  aiSeverity: Severity;
  setAiSeverity: (s: Severity) => void;
  userEstimatedSeverity: string;
  setUserEstimatedSeverity: (s: string) => void;
  aiAssessedSeverity: string | null;
  setAiAssessedSeverity: (s: string | null) => void;

  ambStatus: number; // index into AMB_STEPS
  setAmbStatus: (n: number | ((prev: number) => number)) => void;

  selectedHospital: string;
  setSelectedHospital: (h: string) => void;
  candidateHospitals: any[];
  setCandidateHospitals: (h: any[]) => void;

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

  // --- Identity & Trust ---
  goldenHourId: string | null;
  setGoldenHourId: (id: string | null) => void;
  trustScore: number | null;
  setTrustScore: (score: number | null) => void;

  // --- Emergency Report Extras ---
  accidentPhotoUri: string | null;
  setAccidentPhotoUri: (uri: string | null) => void;
  accidentPhotoBase64: string | null;
  setAccidentPhotoBase64: (base64: string | null) => void;
  voiceTranscript: string | null;
  setVoiceTranscript: (transcript: string | null) => void;

  // --- Incident Confirmations ---
  confirmationCount: number;
  setConfirmationCount: (count: number | ((prev: number) => number)) => void;
  hasConfirmedIncident: boolean;
  setHasConfirmedIncident: (confirmed: boolean) => void;
  confirmIncident: () => void;

  // --- Active Emergency Record ---
  emergencyId: string | null;
  setEmergencyId: (id: string | null) => void;

  // --- Auth & Session ---
  authToken: string | null;
  setAuthToken: (token: string | null) => void;
  userProfile: any | null;
  setUserProfile: (profile: any | null) => void;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;

  // --- Active Role Entities ---
  activeTripId: string | null;
  setActiveTripId: (id: string | null) => void;
  activeHospitalRequestId: string | null;
  setActiveHospitalRequestId: (id: string | null) => void;

  // --- AI Triage State ---
  aiTriageResult: any | null;
  setAiTriageResult: (res: any | null) => void;
  aiImageResult: any | null;
  setAiImageResult: (res: any | null) => void;

  // --- Voice SOS State ---
  voiceSosEnabled: boolean;
  setVoiceSosEnabled: (enabled: boolean) => void;
  voiceSosPhrase: string;
  setVoiceSosPhrase: (phrase: string) => void;
  voiceSosCountdown: number | null;
  setVoiceSosCountdown: (sec: number | null | ((prev: number | null) => number | null)) => void;
  isVoiceListening: boolean;
  setIsVoiceListening: (listening: boolean) => void;
  // --- Registration Draft ---
  registrationDraft: Record<string, any>;
  setRegistrationDraft: (data: Partial<Record<string, any>>) => void;
  clearRegistrationDraft: () => void;

  // --- Device GPS Cache ---
  lastKnownLocation: { latitude: number; longitude: number } | null;
  setLastKnownLocation: (loc: { latitude: number; longitude: number } | null) => void;
  locationAddress: string | null;
  setLocationAddress: (addr: string | null) => void;
  resetEmergencySession: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  role: 'PATIENT',
  setRole: (r) => set({ role: r }),
  roles: ['PATIENT'],
  setRoles: (roles) => set({ roles }),
  verificationStatus: null,
  setVerificationStatus: (status) => set({ verificationStatus: status }),
  isAuthenticated: false,
  setIsAuthenticated: (val) => set({ isAuthenticated: val }),
  authLoading: true,
  setAuthLoading: (val) => set({ authLoading: val }),
  profileExists: false,
  setProfileExists: (val) => set({ profileExists: val }),

  selectedType: 'Accident',
  setSelectedType: (t) => set({ selectedType: t }),

  description: '',
  setDescription: (d) => set({ description: d }),

  aiSeverity: 'medium',
  setAiSeverity: (s) => set({ aiSeverity: s }),
  userEstimatedSeverity: 'Moderate',
  setUserEstimatedSeverity: (s) => set({ userEstimatedSeverity: s }),
  aiAssessedSeverity: null,
  setAiAssessedSeverity: (s) => set({ aiAssessedSeverity: s }),

  ambStatus: 0,
  setAmbStatus: (n) =>
    set((state) => ({ ambStatus: typeof n === 'function' ? n(state.ambStatus) : n })),

  selectedHospital: '',
  setSelectedHospital: (h) => set({ selectedHospital: h }),
  candidateHospitals: [],
  setCandidateHospitals: (h) => set({ candidateHospitals: h }),

  resetEmergencySession: () =>
    set({
      emergencyId: null,
      selectedType: 'Accident',
      description: '',
      accidentPhotoUri: null,
      accidentPhotoBase64: null,
      voiceTranscript: null,
      aiTriageResult: null,
      aiImageResult: null,
      aiSeverity: 'medium',
      userEstimatedSeverity: 'Moderate',
      aiAssessedSeverity: null,
      ambStatus: 0,
      activeTripId: null,
      activeHospitalRequestId: null,
      candidateHospitals: [],
    }),

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

  // --- Identity & Trust ---
  goldenHourId: null,
  setGoldenHourId: (id) => set({ goldenHourId: id }),
  trustScore: null,
  setTrustScore: (score) => set({ trustScore: score }),

  // --- Emergency Report Extras ---
  accidentPhotoUri: null,
  setAccidentPhotoUri: (uri) => set({ accidentPhotoUri: uri }),
  accidentPhotoBase64: null,
  setAccidentPhotoBase64: (base64) => set({ accidentPhotoBase64: base64 }),
  voiceTranscript: null,
  setVoiceTranscript: (transcript) => set({ voiceTranscript: transcript }),

  // --- Incident Confirmations ---
  confirmationCount: 4,
  setConfirmationCount: (n) =>
    set((state) => ({
      confirmationCount: typeof n === 'function' ? n(state.confirmationCount) : n,
    })),
  hasConfirmedIncident: false,
  setHasConfirmedIncident: (confirmed) => set({ hasConfirmedIncident: confirmed }),
  confirmIncident: () =>
    set((state) => ({
      confirmationCount: state.confirmationCount + 1,
      hasConfirmedIncident: true,
    })),

  // --- Active Emergency Record ---
  emergencyId: null,
  setEmergencyId: (id) => set({ emergencyId: id }),

  // --- Auth & Session ---
  authToken: null,
  setAuthToken: (token) => set({ authToken: token }),
  userProfile: null,
  setUserProfile: (profile) => set({ userProfile: profile }),
  isDemoMode: false,
  setIsDemoMode: (val) => set({ isDemoMode: val }),

  // --- Active Role Entities ---
  activeTripId: null,
  setActiveTripId: (id) => set({ activeTripId: id }),
  activeHospitalRequestId: null,
  setActiveHospitalRequestId: (id) => set({ activeHospitalRequestId: id }),

  // --- AI Triage State ---
  aiTriageResult: null,
  setAiTriageResult: (res) => set({ aiTriageResult: res }),
  aiImageResult: null,
  setAiImageResult: (res) => set({ aiImageResult: res }),

  // --- Voice SOS State ---
  voiceSosEnabled: false,
  setVoiceSosEnabled: (enabled) => set({ voiceSosEnabled: enabled }),
  voiceSosPhrase: 'Blue Star',
  setVoiceSosPhrase: (phrase) => set({ voiceSosPhrase: phrase }),
  voiceSosCountdown: null,
  setVoiceSosCountdown: (sec) =>
    set((state) => ({
      voiceSosCountdown: typeof sec === 'function' ? sec(state.voiceSosCountdown) : sec,
    })),
  isVoiceListening: false,
  setIsVoiceListening: (listening: boolean) => set({ isVoiceListening: listening }),

  // --- Registration Draft ---
  registrationDraft: {},
  setRegistrationDraft: (data) =>
    set((state) => ({ registrationDraft: { ...state.registrationDraft, ...data } })),
  clearRegistrationDraft: () => set({ registrationDraft: {} }),

  // --- Device GPS Cache ---
  lastKnownLocation: null,
  setLastKnownLocation: (loc) => set({ lastKnownLocation: loc }),
  locationAddress: null,
  setLocationAddress: (addr) => set({ locationAddress: addr }),
}));
