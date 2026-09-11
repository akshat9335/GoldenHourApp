# Golden Hour — Mobile Modules (Anant's Scope)

This directory contains the production-ready React Native / Expo components and services implemented for **Anant's Mobile Modules**:

## 1. Feature 20: Nearby User FCM Alerts
- `features/nearby-alerts/services/nearbyAlert.service.ts`: Handles background FCM payloads (`EMERGENCY_NEARBY`), extracts distance, coordinates, and severity.
- `features/nearby-alerts/components/NearbyAlertCard.tsx`: Visual alert card alerting bystanders with distance, ETA, and one-tap assistance response.

## 2. Feature 22: Low-Connectivity Support
- `features/low-connectivity/services/offlineQueue.service.ts`: Robust in-memory & persistent offline queue that holds emergency triggers and referrals when connectivity drops.
- `features/low-connectivity/hooks/useNetworkSync.ts`: Hook providing live sync status (`SYNCED`, `WAITING_FOR_CONNECTION`, `SYNCING`, `FAILED`).
- `features/low-connectivity/components/SyncStatusBadge.tsx`: Visual status chip showing sync state with tap-to-retry capability.

## 3. Feature 23: Frontline Health Worker + Multilingual + Diagnostics
- `features/health-worker/screens/FrontlineHealthWorkerScreen.tsx`: Complete lightweight UI for ASHA / ANM workers with patient triage, on-spot vitals, and emergency referral creation.
- `features/health-worker/constants/translations.ts`: Full English and Hindi dictionary.
- `features/health-worker/components/DiagnosticTags.tsx`: Verified hospital diagnostic chips (CT 128 Slice, MRI 3T, Digital X-Ray, Blood Bank, ICU Ventilator).
