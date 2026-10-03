export type Doctor = {
  id: string;
  name: string;
  specialization: string;
  qualification: string;
  experience: string;
  verified: boolean;
  clinic: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  etaMin: number;
  fee: number;
  workingHours: string;
  availableToday: boolean;
  status: 'open' | 'busy' | 'closed';
  currentToken: number;
  servingToken: number;
  queueLength: number;
  estimatedWaitMin: number;
};

export const SPECIALTIES = [
  'All',
  'General Physician',
  'Cardiologist',
  'Orthopedic',
  'Neurologist',
  'Dermatologist',
  'Pediatrician',
  'ENT',
  'Emergency Medicine',
];

export const DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Alok Tripathi',
    specialization: 'Cardiologist',
    qualification: 'MBBS, MD, DM (Cardiology)',
    experience: '14 years experience',
    verified: true,
    clinic: 'Medanta OPD & Diagnostic Center',
    address: 'Civil Lines, Prayagraj',
    latitude: 25.4538,
    longitude: 81.8540,
    distanceKm: 1.8,
    etaMin: 6,
    fee: 600,
    workingHours: '09:00 AM – 8:00 PM',
    availableToday: true,
    status: 'open',
    currentToken: 0,
    servingToken: 0,
    queueLength: 0,
    estimatedWaitMin: 0,
  },
  {
    id: 'doc-2',
    name: 'Dr. Anita Verma',
    specialization: 'General Physician',
    qualification: 'MBBS, MD (General Medicine)',
    experience: '10 years experience',
    verified: true,
    clinic: 'SRN Medical Campus OPD',
    address: 'MG Marg, Prayagraj',
    latitude: 25.4484,
    longitude: 81.8460,
    distanceKm: 1.2,
    etaMin: 5,
    fee: 350,
    workingHours: '08:30 AM – 6:30 PM',
    availableToday: true,
    status: 'open',
    currentToken: 0,
    servingToken: 0,
    queueLength: 0,
    estimatedWaitMin: 0,
  },
  {
    id: 'doc-3',
    name: 'Dr. Rajesh Sharma',
    specialization: 'Emergency Medicine',
    qualification: 'MBBS, MS (General Surgery), Fellowship in Trauma',
    experience: '12 years experience',
    verified: true,
    clinic: 'LifeLine Multispecialty Clinic',
    address: 'University Road, Katra, Prayagraj',
    latitude: 25.4610,
    longitude: 81.8570,
    distanceKm: 2.3,
    etaMin: 8,
    fee: 500,
    workingHours: '10:00 AM – 9:00 PM',
    availableToday: true,
    status: 'open',
    currentToken: 0,
    servingToken: 0,
    queueLength: 0,
    estimatedWaitMin: 0,
  },
  {
    id: 'doc-4',
    name: 'Dr. Anjali Verma',
    specialization: 'Orthopedic',
    qualification: 'MBBS, MS (Orthopedics), DNB',
    experience: '11 years experience',
    verified: true,
    clinic: 'City Heart & Orthopedic Care',
    address: 'George Town, Prayagraj',
    latitude: 25.4420,
    longitude: 81.8620,
    distanceKm: 2.7,
    etaMin: 9,
    fee: 500,
    workingHours: '09:30 AM – 7:30 PM',
    availableToday: true,
    status: 'open',
    currentToken: 0,
    servingToken: 0,
    queueLength: 0,
    estimatedWaitMin: 0,
  },
];

export type Appointment = {
  id: string;
  doctorId: string;
  patientName: string;
  date: string;
  time: string;
  token: number;
  status: 'upcoming' | 'completed' | 'cancelled';
};

export const APPOINTMENTS: Appointment[] = [];

export type DoctorNotification = { title: string; desc: string; time: string };

export const DOCTOR_NOTIFICATIONS: DoctorNotification[] = [];

export function getDoctorById(id: string): Doctor {
  return DOCTORS.find((d) => d.id === id) ?? DOCTORS[0];
}
