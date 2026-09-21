import { firestore } from '../../config/firebase';
import { dataStore } from '../../models/dataStore';
import { Referral, ReferralStatus, ReferralPriority } from '../../models/referral.model';
import { AppError } from '../../utils/AppError';

export class ReferralService {
  /**
   * Create a new referral (Doctor -> Hospital).
   */
  public async createReferral(
    input: Omit<Referral, 'id' | 'status' | 'createdAt' | 'updatedAt'> & {
      id?: string;
      status?: ReferralStatus;
    }
  ): Promise<Referral> {
    if (!input.patientUid && !input.crisisId) {
      throw new AppError(400, 'MISSING_PATIENT_INFO', 'Patient UID or Crisis ID is required.');
    }
    if (!input.targetHospitalId) {
      throw new AppError(400, 'MISSING_TARGET_HOSPITAL', 'Target hospital ID is required.');
    }
    if (!input.targetDepartment) {
      throw new AppError(400, 'MISSING_TARGET_DEPARTMENT', 'Target clinical department is required.');
    }
    if (!input.reasonForReferral) {
      throw new AppError(400, 'MISSING_REASON', 'Reason for referral is required.');
    }

    const now = new Date().toISOString();
    const referralId = input.id || `ref-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const referral: Referral = {
      id: referralId,
      patientUid: input.patientUid || `uid-${input.crisisId}`,
      patientName: input.patientName || 'Patient',
      patientPhone: input.patientPhone || '',
      crisisId: input.crisisId || 'GH-0000',
      referringDoctorId: input.referringDoctorId,
      referringDoctorName: input.referringDoctorName || 'Referring Doctor',
      referringFacilityName: input.referringFacilityName || 'General Emergency Care',
      targetHospitalId: input.targetHospitalId,
      targetHospitalName: input.targetHospitalName || 'Target Hospital',
      targetDepartment: input.targetDepartment,
      priority: input.priority || 'ROUTINE',
      reasonForReferral: input.reasonForReferral,
      clinicalNotes: input.clinicalNotes || '',
      attachedRecordIds: input.attachedRecordIds || [],
      status: input.status || 'CREATED',
      rejectionReason: input.rejectionReason,
      createdAt: now,
      updatedAt: now,
    };

    // Store in-memory fallback
    dataStore.referrals.set(referral.id, referral);

    // Store in Firestore: referrals/{referralId}
    if (firestore) {
      try {
        await firestore.collection('referrals').doc(referral.id).set(referral);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[ReferralService] Firestore create failed:', err);
      }
    }

    return referral;
  }

  /**
   * Get all outgoing referrals created by a doctor.
   */
  public async getDoctorOutgoingReferrals(doctorId: string): Promise<Referral[]> {
    const list: Referral[] = [];

    if (firestore) {
      try {
        const snap = await firestore
          .collection('referrals')
          .where('referringDoctorId', '==', doctorId)
          .orderBy('createdAt', 'desc')
          .get();

        snap.docs.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as Omit<Referral, 'id'>) });
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[ReferralService] Firestore doctor query error:', err);
      }
    }

    if (list.length === 0) {
      for (const ref of dataStore.referrals.values()) {
        if (ref.referringDoctorId === doctorId) {
          list.push(ref);
        }
      }
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get incoming referrals for a hospital, sorted by priority (EMERGENCY > URGENT > ROUTINE).
   */
  public async getHospitalIncomingReferrals(hospitalId?: string): Promise<Referral[]> {
    const list: Referral[] = [];

    if (firestore) {
      try {
        let query: FirebaseFirestore.Query = firestore.collection('referrals');
        if (hospitalId) {
          query = query.where('targetHospitalId', '==', hospitalId);
        }

        const snap = await query.get();
        snap.docs.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as Omit<Referral, 'id'>) });
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[ReferralService] Firestore hospital query error:', err);
      }
    }

    if (list.length === 0) {
      for (const ref of dataStore.referrals.values()) {
        if (!hospitalId || ref.targetHospitalId === hospitalId) {
          list.push(ref);
        }
      }
    }

    const priorityWeight: Record<ReferralPriority, number> = {
      EMERGENCY: 3,
      URGENT: 2,
      ROUTINE: 1,
    };

    return list.sort((a, b) => {
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  /**
   * Update the status of a referral (HOSPITAL_ACCEPTED, REJECTED, PATIENT_ARRIVED, etc.).
   */
  public async updateReferralStatus(
    referralId: string,
    status: ReferralStatus,
    options?: { rejectionReason?: string; notes?: string }
  ): Promise<Referral> {
    const referral = await this.getReferralById(referralId);
    const now = new Date().toISOString();

    referral.status = status;
    referral.updatedAt = now;
    if (options?.rejectionReason) {
      referral.rejectionReason = options.rejectionReason;
    }
    if (options?.notes) {
      referral.hospitalNotes = options.notes;
    }

    dataStore.referrals.set(referral.id, referral);

    if (firestore) {
      try {
        await firestore.collection('referrals').doc(referral.id).update({
          status: referral.status,
          updatedAt: referral.updatedAt,
          rejectionReason: referral.rejectionReason ?? null,
          hospitalNotes: referral.hospitalNotes ?? null,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[ReferralService] Firestore status update failed:', err);
      }
    }

    return referral;
  }

  /**
   * Get all referrals for a given patient.
   */
  public async getPatientReferrals(patientUid: string): Promise<Referral[]> {
    const list: Referral[] = [];

    if (firestore) {
      try {
        const snap = await firestore
          .collection('referrals')
          .where('patientUid', '==', patientUid)
          .get();

        snap.docs.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as Omit<Referral, 'id'>) });
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[ReferralService] Firestore patient referrals error:', err);
      }
    }

    if (list.length === 0) {
      for (const ref of dataStore.referrals.values()) {
        if (ref.patientUid === patientUid) {
          list.push(ref);
        }
      }
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Retrieve a referral by ID.
   */
  public async getReferralById(referralId: string): Promise<Referral> {
    if (dataStore.referrals.has(referralId)) {
      return dataStore.referrals.get(referralId)!;
    }

    if (firestore) {
      try {
        const doc = await firestore.collection('referrals').doc(referralId).get();
        if (doc.exists) {
          const data = { id: doc.id, ...(doc.data() as Omit<Referral, 'id'>) };
          dataStore.referrals.set(data.id, data);
          return data;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[ReferralService] Error fetching referral:', err);
      }
    }

    throw new AppError(404, 'REFERRAL_NOT_FOUND', `Referral ${referralId} does not exist.`);
  }
}

export const referralService = new ReferralService();
