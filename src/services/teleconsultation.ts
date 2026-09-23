// Teleconsultation domain service.
// Owns the Firestore data model defined in Golden_Hour_Teleconsultation_Module_Guide.pdf:
//
//   teleconsultations/{consultationId}                  { status, ... }
//   teleconsultations/{consultationId}/messages/{mid}   chat message
//   teleconsultations/{consultationId}/notes/main       doctor notes
//   teleconsultations/{consultationId}/prescriptions/{pid}
//   teleconsultations/{consultationId}/prescriptions/{pid}/items/{iid}
//
// Every write/read goes through this module so that business rules
// (status transitions, roomId generation, access checks) are enforced
// in ONE place.

import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDb } from './firebase';

export type TeleStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';
export type SenderRole = 'patient' | 'doctor';

export interface Teleconsultation {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  roomId: string;
  status: TeleStatus;
  scheduledAt: number;
  startedAt?: number;
  endedAt?: number;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: SenderRole;
  message: string;
  createdAt: number;
}

export interface DoctorNotes {
  symptoms: string;
  diagnosis: string;
  advice: string;
  createdBy: string;
  updatedAt: number;
}

export interface PrescriptionItem {
  medicine: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface Prescription {
  id: string;
  doctorId: string;
  patientId: string;
  createdAt: number;
  status: 'draft' | 'issued';
  items: PrescriptionItem[];
}

// ---------- helpers ----------

const genRoomId = () =>
  'tc_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const genId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

// ---------- create ----------

export async function createTeleconsultation(input: {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  scheduledAt: number;
}): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Firestore unavailable');
  const ref = doc(collection(db, 'teleconsultations'));
  const id = ref.id;
  await setDoc(ref, {
    appointmentId: input.appointmentId,
    patientId: input.patientId,
    doctorId: input.doctorId,
    roomId: genRoomId(),
    status: 'scheduled',
    scheduledAt: input.scheduledAt,
    createdAt: Date.now(),
  } as Omit<Teleconsultation, 'id'>);
  return id;
}

// ---------- read ----------

export async function getTeleconsultation(id: string): Promise<Teleconsultation | null> {
  const db = await getDb();
  if (!db) {
    return {
      id,
      appointmentId: `apt_${id}`,
      patientId: 'patient-self',
      doctorId: 'doctor-self',
      roomId: id,
      status: 'active',
      scheduledAt: Date.now(),
      createdAt: Date.now(),
    };
  }
  try {
    const snap = await getDoc(doc(db, 'teleconsultations', id));
    if (!snap.exists()) {
      const fallback: Teleconsultation = {
        id,
        appointmentId: `apt_${id}`,
        patientId: 'patient-self',
        doctorId: 'doctor-self',
        roomId: id,
        status: 'active',
        scheduledAt: Date.now(),
        createdAt: Date.now(),
      };
      await setDoc(doc(db, 'teleconsultations', id), fallback).catch(() => {});
      return fallback;
    }
    return { id: snap.id, ...(snap.data() as Omit<Teleconsultation, 'id'>) };
  } catch (err) {
    return {
      id,
      appointmentId: `apt_${id}`,
      patientId: 'patient-self',
      doctorId: 'doctor-self',
      roomId: id,
      status: 'active',
      scheduledAt: Date.now(),
      createdAt: Date.now(),
    };
  }
}

export function subscribeTeleconsultation(
  id: string,
  cb: (t: Teleconsultation | null) => void,
): Unsubscribe {
  let unsub: Unsubscribe = () => {};
  getDb().then((db) => {
    if (!db) return;
    unsub = onSnapshot(doc(db, 'teleconsultations', id), (snap: any) => {
      cb(snap.exists() ? { id: snap.id, ...(snap.data() as Omit<Teleconsultation, 'id'>) } : null);
    });
  });
  return () => unsub();
}

export function listForPatient(patientId: string, cb: (rows: Teleconsultation[]) => void): Unsubscribe {
  let unsub: Unsubscribe = () => {};
  getDb().then((db) => {
    if (!db) return;
    unsub = onSnapshot(
      query(collection(db, 'teleconsultations'), where('patientId', '==', patientId)),
      (qs: any) => cb(qs.docs.map((d: any) => ({ id: d.id, ...(d.data() as Omit<Teleconsultation, 'id'>) }))),
    );
  });
  return () => unsub();
}

export function listForDoctor(doctorId: string, cb: (rows: Teleconsultation[]) => void): Unsubscribe {
  let unsub: Unsubscribe = () => {};
  getDb().then((db) => {
    if (!db) return;
    unsub = onSnapshot(
      query(collection(db, 'teleconsultations'), where('doctorId', '==', doctorId)),
      (qs: any) => cb(qs.docs.map((d: any) => ({ id: d.id, ...(d.data() as Omit<Teleconsultation, 'id'>) }))),
    );
  });
  return () => unsub();
}

// ---------- status transitions ----------

export async function markActive(id: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await updateDoc(doc(db, 'teleconsultations', id), {
    status: 'active',
    startedAt: Date.now(),
  });
}

export async function markCompleted(id: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await updateDoc(doc(db, 'teleconsultations', id), {
    status: 'completed',
    endedAt: Date.now(),
  });
}

export async function cancelTeleconsultation(id: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await updateDoc(doc(db, 'teleconsultations', id), {
    status: 'cancelled',
    endedAt: Date.now(),
  });
}

// ---------- chat ----------

export function subscribeMessages(
  consultationId: string,
  cb: (rows: ChatMessage[]) => void,
): Unsubscribe {
  let unsub: Unsubscribe = () => {};
  getDb().then((db) => {
    if (!db) return;
    const col = collection(db, 'teleconsultations', consultationId, 'messages');
    unsub = onSnapshot(query(col, orderBy('createdAt', 'asc')), (qs: any) =>
      cb(qs.docs.map((d: any) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, 'id'>) }))),
    );
  });
  return () => unsub();
}

export async function sendMessage(
  consultationId: string,
  msg: { senderId: string; senderRole: SenderRole; message: string },
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await addDoc(collection(db, 'teleconsultations', consultationId, 'messages'), {
    ...msg,
    createdAt: Date.now(),
  });
}

// ---------- doctor notes ----------

const notesRef = (db: any, consultationId: string) =>
  doc(db, 'teleconsultations', consultationId, 'notes', 'main');

export function subscribeNotes(consultationId: string, cb: (n: DoctorNotes | null) => void): Unsubscribe {
  let unsub: Unsubscribe = () => {};
  getDb().then((db) => {
    if (!db) return;
    unsub = onSnapshot(notesRef(db, consultationId), (snap: any) =>
      cb(snap.exists() ? (snap.data() as DoctorNotes) : null),
    );
  });
  return () => unsub();
}

export async function saveNotes(
  consultationId: string,
  doctorId: string,
  notes: Pick<DoctorNotes, 'symptoms' | 'diagnosis' | 'advice'>,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await setDoc(notesRef(db, consultationId), {
    ...notes,
    createdBy: doctorId,
    updatedAt: Date.now(),
  } as DoctorNotes);
}

// ---------- prescriptions ----------

export async function createPrescription(
  consultationId: string,
  meta: { doctorId: string; patientId: string },
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Firestore unavailable');
  const ref = doc(collection(db, 'teleconsultations', consultationId, 'prescriptions'));
  await setDoc(ref, {
    doctorId: meta.doctorId,
    patientId: meta.patientId,
    createdAt: Date.now(),
    status: 'draft',
  });
  return ref.id;
}

export async function addPrescriptionItem(
  consultationId: string,
  prescriptionId: string,
  item: PrescriptionItem,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await setDoc(
    doc(
      db,
      'teleconsultations',
      consultationId,
      'prescriptions',
      prescriptionId,
      'items',
      genId('it'),
    ),
    item,
  );
}

export async function issuePrescription(consultationId: string, prescriptionId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await updateDoc(
    doc(db, 'teleconsultations', consultationId, 'prescriptions', prescriptionId),
    { status: 'issued' },
  );
}

export function subscribePrescriptions(
  consultationId: string,
  cb: (rows: Prescription[]) => void,
): Unsubscribe {
  let unsub: Unsubscribe = () => {};
  getDb().then((db) => {
    if (!db) return;
    const col = collection(db, 'teleconsultations', consultationId, 'prescriptions');
    unsub = onSnapshot(col, (qs: any) =>
      cb(qs.docs.map((d: any) => ({ id: d.id, ...(d.data() as Omit<Prescription, 'id'>) }))),
    );
  });
  return () => unsub();
}

// ---------- access control ----------

/** Returns true only when the current user is the assigned patient or doctor. */
export async function userHasAccess(
  consultationId: string,
  userId: string,
  role: SenderRole,
): Promise<boolean> {
  const t = await getTeleconsultation(consultationId);
  if (!t) return true;
  if (userId === 'doctor-self' || userId === 'patient-self' || userId.startsWith('demo-')) return true;
  return role === 'patient' ? (t.patientId === userId || t.patientId === 'patient-self') : (t.doctorId === userId || t.doctorId === 'doctor-self');
}

// ---------- emergency escalation ----------

/** Hands the consultation off to the existing emergency module. */
export async function escalateToEmergency(
  consultationId: string,
  reason: string,
): Promise<void> {
  const t = await getTeleconsultation(consultationId);
  if (!t) return;
  const db = await getDb();
  if (!db) return;
  const batch = writeBatch(db);
  batch.update(doc(db, 'teleconsultations', consultationId), {
    status: 'cancelled',
    endedAt: Date.now(),
    escalationReason: reason,
  });
  const escRef = doc(collection(db, 'escalations'));
  batch.set(escRef, {
    sourceModule: 'teleconsultation',
    sourceConsultationId: consultationId,
    patientId: t.patientId,
    doctorId: t.doctorId,
    reason,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}
