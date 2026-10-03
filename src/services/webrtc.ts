// Minimal WebRTC peer-connection helper for teleconsultation.
// Doctors are typically the offerer; patients are the answerer.
// Signaling payloads are exchanged through Firestore rooms/{roomId}.

import { collection, doc, onSnapshot, setDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { getDb } from './firebase';

export type SignalKind = 'offer' | 'answer' | 'ice';

export interface SignalPayload {
  kind: SignalKind;
  from: 'doctor' | 'patient';
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
  createdAt: number;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
];

export class WebRTCPeer {
  private pc: any = null;
  private localStream: any = null;
  private roomId: string;
  private selfRole: 'doctor' | 'patient';

  constructor(roomId: string, selfRole: 'doctor' | 'patient') {
    this.roomId = roomId;
    this.selfRole = selfRole;
    if (typeof RTCPeerConnection !== 'undefined') {
      this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    } else if (typeof (globalThis as any).RTCPeerConnection !== 'undefined') {
      this.pc = new (globalThis as any).RTCPeerConnection({ iceServers: ICE_SERVERS });
    }
  }

  async getLocalStream(): Promise<any> {
    if (this.localStream) return this.localStream;
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { width: 640, height: 480 },
        });
        if (this.pc && this.localStream.getTracks) {
          this.localStream.getTracks().forEach((t: any) => this.pc.addTrack(t, this.localStream!));
        }
        return this.localStream;
      }
    } catch (e) {
      console.warn('[WebRTCPeer] getUserMedia not supported in this runtime:', e);
    }
    return null;
  }

  /** Toggle microphone on/off; returns the new enabled state. */
  toggleMic(): boolean {
    const track = this.localStream?.getAudioTracks?.()?.[0];
    if (!track) return true;
    track.enabled = !track.enabled;
    return track.enabled;
  }

  /** Toggle camera on/off; returns the new enabled state. */
  toggleCam(): boolean {
    const track = this.localStream?.getVideoTracks?.()?.[0];
    if (!track) return true;
    track.enabled = !track.enabled;
    return track.enabled;
  }

  onRemoteStream(cb: (stream: any) => void) {
    if (this.pc) {
      this.pc.ontrack = (e: any) => {
        if (e.streams?.[0]) cb(e.streams[0]);
      };
    }
  }

  onIce(cb: (c: any) => void) {
    if (this.pc) {
      this.pc.onicecandidate = (e: any) => {
        if (e.candidate) cb(e.candidate);
      };
    }
  }

  async createOffer(): Promise<any> {
    if (!this.pc) return { type: 'offer', sdp: 'mock-sdp-expo-go' };
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async acceptAnswer(answer: any) {
    if (!this.pc) return;
    await this.pc.setRemoteDescription(answer);
  }

  async addIce(candidate: any) {
    if (!this.pc) return;
    try {
      await this.pc.addIceCandidate(candidate);
    } catch {
      /* harmless when candidates arrive after teardown */
    }
  }

  close() {
    this.localStream?.getTracks?.()?.forEach((t: any) => t.stop());
    this.pc?.close?.();
  }
}

// ---------- Firestore signaling ----------

async function clearSignals(roomId: string) {
  const db = await getDb();
  if (!db) return;
  const snap = await new Promise<unknown[]>((resolve) => {
    const unsub = onSnapshot(collection(db, 'rooms', roomId, 'signals'), (qs: any) => {
      resolve(qs.docs);
      unsub();
    });
  });
  for (const d of snap as { ref: { id: string } }[]) {
    await deleteDoc(doc(db, 'rooms', roomId, 'signals', d.ref.id));
  }
}

export async function publishSignal(roomId: string, payload: SignalPayload): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await addDoc(collection(db, 'rooms', roomId, 'signals'), {
    ...payload,
    createdAt: serverTimestamp(),
  });
}

export function subscribeSignals(roomId: string, cb: (sigs: SignalPayload[]) => void) {
  const dbPromise = getDb();
  let unsub = () => {};
  dbPromise.then((db) => {
    if (!db) return;
    unsub = onSnapshot(collection(db, 'rooms', roomId, 'signals'), (qs: any) =>
      cb(qs.docs.map((d: any) => d.data() as SignalPayload)),
    );
  });
  return () => unsub();
}

export async function ensureRoomDoc(roomId: string) {
  const db = await getDb();
  if (!db) return;
  await clearSignals(roomId).catch(() => {});
  await setDoc(doc(db, 'rooms', roomId), { createdAt: serverTimestamp() }, { merge: true });
}
