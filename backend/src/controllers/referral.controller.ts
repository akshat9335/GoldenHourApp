import { Request, Response, NextFunction } from 'express';
import { referralService } from '../services/referral/referral.service';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/AppError';
import { getUserProfile } from '../services/users/user.service';

export class ReferralController {
  /**
   * Doctor creates a new patient referral to a hospital.
   */
  public async createReferral(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctorId = req.user?.uid || req.body.referringDoctorId;
      if (!doctorId) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required to create a referral.');
      }

      let doctorName = req.body.referringDoctorName;
      let facilityName = req.body.referringFacilityName;

      if (!doctorName && req.user?.uid) {
        try {
          const profile = await getUserProfile(req.user.uid);
          if (profile) {
            doctorName = profile.name || doctorName;
            facilityName = profile.clinicName || profile.hospitalName || facilityName;
          }
        } catch {
          // ignore
        }
      }

      const referral = await referralService.createReferral({
        ...req.body,
        referringDoctorId: doctorId,
        referringDoctorName: doctorName || 'Dr. ' + doctorId.slice(0, 6),
        referringFacilityName: facilityName || 'Clinic Network',
      });

      sendSuccess(res, referral, 'Referral created and sent to hospital successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Doctor gets all outgoing referrals sent by them.
   */
  public async getDoctorOutgoing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctorId = req.user?.uid || (req.query.doctorId as string);
      if (!doctorId) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
      }

      const list = await referralService.getDoctorOutgoingReferrals(doctorId);
      sendSuccess(res, list, 'Doctor outgoing referrals retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Hospital staff retrieves incoming referrals queue.
   */
  public async getHospitalIncoming(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = (req.query.hospitalId as string) || req.user?.uid;
      const list = await referralService.getHospitalIncomingReferrals(hospitalId);
      sendSuccess(res, list, 'Hospital incoming referrals retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * Hospital updates referral status (HOSPITAL_ACCEPTED, REJECTED, PATIENT_ARRIVED, etc.).
   */
  public async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status, notes, rejectionReason } = req.body;

      if (!status) {
        throw new AppError(400, 'MISSING_STATUS', 'Referral status is required.');
      }

      const updated = await referralService.updateReferralStatus(id, status, {
        notes,
        rejectionReason,
      });

      sendSuccess(res, updated, `Referral status updated to ${status}`);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Logged-in patient tracks all referrals referring them.
   */
  public async getMyReferrals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patientUid = req.user?.uid || (req.query.patientUid as string);
      if (!patientUid) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required to view patient referrals.');
      }

      const list = await referralService.getPatientReferrals(patientUid);
      sendSuccess(res, list, 'Patient referrals retrieved');
    } catch (err) {
      next(err);
    }
  }
}

export const referralController = new ReferralController();
