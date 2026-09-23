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
    currentToken: 9,
    servingToken: 3,
    queueLength: 6,
    estimatedWaitMin: 25,
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
    currentToken: 13,
    servingToken: 5,
    queueLength: 8,
    estimatedWaitMin: 20,
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
    status: 'busy',
    currentToken: 7,
    servingToken: 2,
    queueLength: 5,
    estimatedWaitMin: 30,
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
    currentToken: 11,
    servingToken: 4,
    queueLength: 7,
    estimatedWaitMin: 25,
  },
  {
    id: 'doc-5',
    name: 'Dr. Kabir Malhotra',
    specialization: 'Dermatologist',
    qualification: 'MBBS, MD (Dermatology)',
    experience: '7 years experience',
    verified: true,
    clinic: 'Skin & Glow Clinic',
    address: 'BTM Layout 2nd Stage, Bengaluru',
    latitude: 12.9165,
    longitude: 77.6101,
    distanceKm: 3.2,
    etaMin: 11,
    fee: 450,
    workingHours: '12:00 PM – 8:00 PM',
    availableToday: true,
    status: 'open',
    currentToken: 12,
    servingToken: 10,
    queueLength: 12,
    estimatedWaitMin: 20,
  },
  {
    id: 'doc-6',
    name: 'Dr. Priya Deshmukh',
    specialization: 'Pediatrician',
    qualification: 'MBBS, MD (Pediatrics)',
    experience: '10 years experience',
    verified: true,
    clinic: 'Little Steps Children Clinic',
    address: 'Marathahalli, Bengaluru',
    latitude: 12.9569,
    longitude: 77.7011,
    distanceKm: 6.5,
    etaMin: 20,
    fee: 400,
    workingHours: '9:00 AM – 2:00 PM',
    availableToday: true,
    status: 'open',
    currentToken: 27,
    servingToken: 24,
    queueLength: 27,
    estimatedWaitMin: 22,
  },
  {
    id: 'doc-7',
    name: 'Dr. Farhan Sheikh',
    specialization: 'ENT',
    qualification: 'MBBS, MS (ENT)',
    experience: '8 years experience',
    verified: true,
    clinic: 'Sheikh ENT & Hearing Clinic',
    address: 'Whitefield Main Road, Bengaluru',
    latitude: 12.9698,
    longitude: 77.7499,
    distanceKm: 8.9,
    etaMin: 26,
    fee: 400,
    workingHours: '11:00 AM – 6:00 PM',
    availableToday: true,
    status: 'open',
    currentToken: 6,
    servingToken: 4,
    queueLength: 6,
    estimatedWaitMin: 18,
  },
  {
    id: 'doc-8',
    name: 'Dr. Ritu Kapoor',
    specialization: 'Emergency Medicine',
    qualification: 'MBBS, MD (Emergency Medicine)',
    experience: '13 years experience',
    verified: true,
    clinic: 'Kapoor Urgent Care',
    address: 'Domlur, Bengaluru',
    latitude: 12.9611,
    longitude: 77.6387,
    distanceKm: 3.9,
    etaMin: 13,
    fee: 550,
    workingHours: '24 Hours',
    availableToday: true,
    status: 'open',
    currentToken: 41,
    servingToken: 38,
    queueLength: 41,
    estimatedWaitMin: 12,
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

export const APPOINTMENTS: Appointment[] = [
  { id: 'apt-1', doctorId: 'doc-1', patientName: 'Akshat Srivastava', date: 'Today', time: '4:30 PM', token: 18, status: 'upcoming' },
  { id: 'apt-2', doctorId: 'doc-2', patientName: 'Priya Menon', date: 'Today', time: '5:00 PM', token: 33, status: 'upcoming' },
  { id: 'apt-3', doctorId: 'doc-1', patientName: 'Rohan Gupta', date: 'Yesterday', time: '3:15 PM', token: 9, status: 'completed' },
  { id: 'apt-4', doctorId: 'doc-1', patientName: 'Sana Khan', date: 'Yesterday', time: '2:00 PM', token: 6, status: 'cancelled' },
];

export type DoctorNotification = { title: string; desc: string; time: string };

export const DOCTOR_NOTIFICATIONS: DoctorNotification[] = [
  { title: 'New appointment booked', desc: 'Akshat Srivastava booked Token #18 for today.', time: '3 min ago' },
  { title: 'Patient took Token #18', desc: 'Walk-in patient joined the live queue.', time: '10 min ago' },
  { title: 'Patient cancelled appointment', desc: 'Sana Khan cancelled Token #6.', time: '1 hr ago' },
  { title: 'Queue is almost full', desc: 'Only 4 slots left for today at Sharma Heart Clinic.', time: '2 hr ago' },
  { title: 'Your clinic queue has started', desc: 'Token counter reset for today.', time: '6 hr ago' },
];

export function getDoctorById(id: string): Doctor {
  return DOCTORS.find((d) => d.id === id) ?? DOCTORS[0];
}
