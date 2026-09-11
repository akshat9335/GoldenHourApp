# Golden Hour — Anant Architecture, API & Features Guide
**Owner:** Anant  
**Assigned Features:** 
- Mobile: Feature 20 (Nearby User FCM Alerts), Feature 22 (Low-Connectivity Support), Feature 23 (Frontline Health Worker + Multilingual + Diagnostics)
- Backend: Location, GPS, Google Maps, Doctor Network, Appointment Booking, and Live Queue Management

---

## 1. Backend REST Endpoints Specification

### A. Location & Navigation (`/api/location`)
| Method | Endpoint | Description | Sample Query / Body |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/location/update` | Updates user live coordinates with validity checks | `{"userId": "usr-1", "lat": 28.6139, "lng": 77.2090, "accuracy": 10}` |
| `GET` | `/api/location/nearby-hospitals` | Discovers registered hospitals within radius sorted by distance with capability | `?lat=28.567&lng=77.210&radius=15` |
| `GET` | `/api/location/nearby-incidents` | Returns privacy-safe approximate incident locations and severity | `?lat=28.567&lng=77.210&radius=15` |
| `GET` | `/api/location/route` | Server-side Google Maps Directions API wrapper with Haversine fallback | `?originLat=28.61&originLng=77.20&destLat=28.56&destLng=77.21` |

### B. Doctor & Clinic Management (`/api/doctors`)
| Method | Endpoint | Description | Sample Query / Body |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/doctors/register` | Registers doctor with `PENDING` verification status | `{"userId": "usr-d1", "name": "Dr. Sen", "specialty": "Trauma", "licenseNumber": "MCI-123", "clinicId": "clinic-1"}` |
| `GET` | `/api/doctors` | Searches verified doctors by specialty, distance & availability | `?specialty=Trauma&userLat=28.63&userLng=77.21` |
| `GET` | `/api/doctors/:id` | Returns complete doctor profile with clinic and live queue info | URL Param `:id` |
| `PATCH` | `/api/doctors/:id/verify` | Updates verification status (`VERIFIED`, `REJECTED`) | `{"status": "VERIFIED"}` |
| `GET` | `/api/doctors/:id/clinic` | Returns clinic operating hours, facilities and address | URL Param `:id` |
| `GET` | `/api/doctors/:id/route` | Calculates navigation route and travel duration to clinic | `?userLat=28.61&userLng=77.20` |

### C. Appointment Booking & State Lifecycle (`/api/appointments`)
| Method | Endpoint | Description | State Transition / Body |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/appointments` | Books slot and issues atomic sequential token number | `{"doctorId": "doc-1", "patientId": "p-1", "patientName": "Rahul", "date": "2026-09-08", "timeSlot": "18:00"}` |
| `GET` | `/api/appointments/my` | Retrieves appointments for logged-in patient | — |
| `POST` | `/api/appointments/:id/start` | Starts consultation | `CONFIRMED` / `WAITING` $\rightarrow$ `IN_PROGRESS` |
| `POST` | `/api/appointments/:id/complete` | Completes consultation | `IN_PROGRESS` $\rightarrow$ `COMPLETED` |
| `POST` | `/api/appointments/:id/skip` | Marks patient as no-show | `WAITING` $\rightarrow$ `NO_SHOW` |
| `POST` | `/api/appointments/:id/cancel` | Cancels appointment | `BOOKED` / `CONFIRMED` $\rightarrow$ `CANCELLED` |
| `GET` | `/api/appointments/:id/leave-time` | Computes synchronized recommended departure time | `?userLat=28.61&userLng=77.20&bufferMin=10` |

### D. Live Queue Management (`/api/queues`)
| Method | Endpoint | Description | Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/queues/:doctorId` | Fetches live queue, serving token, queue ahead, and estimated wait | `{"servingToken": 3, "yourToken": 5, "queueAhead": 1, "estimatedWaitMinutes": 10}` |
| `POST` | `/api/queues/:doctorId/next` | Doctor calls next patient, advances serving token | `{"servingToken": 4, "waitingCount": 2}` |

---

## 2. Mobile Modules Architecture

### Feature 20 — Nearby User FCM Alerts
- Location coordinates and device FCM tokens are registered to identify nearby responders within a 5 km radius.
- When an emergency occurs, bystanders within the radius receive instant notifications displaying the distance and route, enabling CPR and first aid in minutes 1–5 before the ambulance arrives.

### Feature 22 — Low-Connectivity Support
- Operates an offline queue backed by local storage.
- Emergency reports, vital signs, and referrals are held safely when internet connectivity drops to 2G or offline.
- When network connection is detected, the queue auto-syncs with the backend.
- UI displays clear status badges: `Synced with Cloud` (Green), `Waiting for Connection` (Amber), `Syncing` (Blue), and `Failed` (Red).

### Feature 23 — Frontline Health Worker Mode + Multilingual + Diagnostics
- Tailored interface for ASHA and ANM workers in rural sub-centers.
- Fast vital signs recording (Pulse, SpO2, Blood Pressure, AVPU Consciousness).
- Rule-based AI emergency triage recommendation (`CRITICAL`, `HIGH`, `MODERATE`).
- Real-time display of verified hospital diagnostic availability (Digital X-Ray, CT 128 Slice, MRI 3T, Blood Bank, ICU Ventilator).
- Full English & Hindi multilingual dictionary.
