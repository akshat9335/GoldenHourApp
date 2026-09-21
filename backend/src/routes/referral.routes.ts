import { Router } from 'express';
import { referralController } from '../controllers/referral.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Doctor creates referral
router.post('/', requireAuth, requireRole('DOCTOR'), (req, res, next) =>
  referralController.createReferral(req, res, next)
);

// Doctor outgoing referrals
router.get('/doctor/outgoing', requireAuth, requireRole('DOCTOR'), (req, res, next) =>
  referralController.getDoctorOutgoing(req, res, next)
);

// Hospital incoming referrals queue
router.get('/hospital/incoming', requireAuth, requireRole('HOSPITAL'), (req, res, next) =>
  referralController.getHospitalIncoming(req, res, next)
);

// Update referral status (Accept/Reject/Patient Arrived/In Treatment/Completed)
router.patch('/:id/status', requireAuth, (req, res, next) =>
  referralController.updateStatus(req, res, next)
);

// Patient tracks their own referrals
router.get('/patient/me', requireAuth, (req, res, next) =>
  referralController.getMyReferrals(req, res, next)
);

export default router;
