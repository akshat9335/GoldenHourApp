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
    name: 'Dr. Rahul Sharma',
    specialization: 'Cardiologist',
    qualification: 'MBBS, MD (Cardiology)',
    experience: '12 years experience',
    verified: true,
    clinic: 'Sharma Heart Clinic',
    address: '4th Cross, Koramangala, Bengaluru',
    latitude: 12.9352,
    longitude: 77.6146,
    distanceKm: 2.4,
    etaMin: 8,
    fee: 500,
    workingHours: '10:00 AM – 6:00 PM',
    availableToday: true,
    status: 'open',
    currentToken: 18,
    servingToken: 14,
    queueLength: 18,
    estimatedWaitMin: 25,
  },
  {
    id: 'doc-2',
    name: 'Dr. Anita Verma',
    specialization: 'General Physician',
    qualification: 'MBBS, MD (General Medicine)',
    experience: '9 years experience',
    verified: true,
    clinic: 'Verma Family Clinic',
    address: '80 Feet Road, Indiranagar, Bengaluru',
    latitude: 12.9719,
    longitude: 77.6412,
    distanceKm: 1.6,
    etaMin: 6,
    fee: 300,
    workingHours: '9:00 AM – 1:00 PM, 5:00 PM – 9:00 PM',
    availableToday: true,
    status: 'open',
    currentToken: 32,
    servingToken: 29,
    queueLength: 32,
    estimatedWaitMin: 15,
  },
  {
    id: 'doc-3',
    name: 'Dr. Suresh Iyer',
    specialization: 'Orthopedic',
    qualification: 'MBBS, MS (Ortho)',
    experience: '15 years experience',
    verified: true,
    clinic: 'Iyer Bone & Joint Care',
    address: 'HSR Layout Sector 2, Bengaluru',
    latitude: 12.9116,
    longitude: 77.6389,
    distanceKm: 4.1,
    etaMin: 14,
    fee: 600,
    workingHours: '11:00 AM – 7:00 PM',
    availableToday: true,
    status: 'busy',
    currentToken: 9,
    servingToken: 7,
    queueLength: 9,
    estimatedWaitMin: 35,
  },
  {
    id: 'doc-4',
    name: 'Dr. Meera Nair',
    specialization: 'Neurologist',
    qualification: 'MBBS, DM (Neurology)',
    experience: '11 years experience',
    verified: true,
    clinic: 'Nair Neuro Centre',
    address: 'Jayanagar 4th Block, Bengaluru',
    latitude: 12.9254,
    longitude: 77.5931,
    distanceKm: 5.8,
    etaMin: 18,
    fee: 700,
    workingHours: '10:00 AM – 4:00 PM',
    availableToday: false,
    status: 'closed',
    currentToken: 22,
    servingToken: 22,
    queueLength: 0,
    estimatedWaitMin: 0,
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
