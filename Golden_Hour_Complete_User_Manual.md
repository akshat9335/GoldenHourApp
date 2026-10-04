# 🚑 Golden Hour (Project 911) — Complete User Manual

> **Golden Hour** is an AI-powered, mission-critical Emergency Medical Response & Healthcare Interoperability platform. Designed around the crucial first 60 minutes after trauma or acute onset ("The Golden Hour"), it connects Citizens/Patients, Ambulance Pilots, Hospital Emergency Rooms, OPD Doctors, and Rural ASHA Sanginis in real time.

---

## 📑 Table of Contents
1. [Installation & APK Download](#1-installation--apk-download)
2. [Quick Demo Credentials & Role Switching](#2-quick-demo-credentials--role-switching)
3. [Language Selector & Global Navigation](#3-language-selector--global-navigation)
4. [Role 1: Citizen / Patient Emergency Portal](#4-role-1-citizen--patient-emergency-portal)
   - 4.1 [One-Tap SOS & 3-Second Safety Countdown](#41-one-tap-sos--3-second-safety-countdown)
   - 4.2 [Voice AI SOS with Clinical Validation](#42-voice-ai-sos-with-clinical-validation)
   - 4.3 [False Alarm Cancellation Flow](#43-false-alarm-cancellation-flow)
   - 4.4 [Live Ambulance Telemetry & Route Map](#44-live-ambulance-telemetry--route-map)
   - 4.5 [Doctor Appointment History Dropdown](#45-doctor-appointment-history-dropdown)
   - 4.6 [Medical Profile & ICE Emergency Contacts](#46-medical-profile--ice-emergency-contacts)
5. [Role 2: Ambulance Pilot / Driver Console](#5-role-2-ambulance-pilot--driver-console)
   - 5.1 [Duty State Management (On-Duty / Off-Duty)](#51-duty-state-management-on-duty--off-duty)
   - 5.2 [Incoming Emergency Dispatch Acceptance](#52-incoming-emergency-dispatch-acceptance)
   - 5.3 [On-Site Arrival: "Marked at Patient Location"](#53-on-site-arrival-marked-at-patient-location)
   - 5.4 [False Request / "Patient Not Found" Handling](#54-false-request--patient-not-found-handling)
   - 5.5 [Patient Onboard, Live Vitals & ER Handover](#55-patient-onboard-live-vitals--er-handover)
6. [Role 3: Hospital ER Command Center](#6-role-3-hospital-er-command-center)
   - 6.1 [ER Command Center & Live Capacity Monitoring](#61-er-command-center--live-capacity-monitoring)
   - 6.2 [Live Bed, ICU & Oxygen Capacity Controls](#62-live-bed-icu--oxygen-capacity-controls)
   - 6.3 [Incoming Ambulance Triage & Bed Reservation](#63-incoming-ambulance-triage--bed-reservation)
   - 6.4 [Doctor & ASHA Referrals Hub (with Unread Bell Badge)](#64-doctor--asha-referrals-hub-with-unread-bell-badge)
   - 6.5 [Referral Admission & Bed Freeing on Discharge](#65-referral-admission--bed-freeing-on-discharge)
7. [Role 4: Doctor OPD Clinic & Teleconsultation](#7-role-4-doctor-opd-clinic--teleconsultation)
   - 7.1 [Digital OPD Queue & Token Calling](#71-digital-opd-queue--token-calling)
   - 7.2 [Clinical Consultation, Vitals & Prescriptions](#72-clinical-consultation-vitals--prescriptions)
   - 7.3 [Hospital Referral with Priority & Hospital Selection](#73-hospital-referral-with-priority--hospital-selection)
   - 7.4 [Live Video / Audio Teleconsultation](#74-live-video--audio-teleconsultation)
8. [Role 5: ASHA Sangini / Rural Frontline Health Worker](#8-role-5-asha-sangini--rural-frontline-health-worker)
   - 8.1 [Rural Community Patient Directory & Search](#81-rural-community-patient-directory--search)
   - 8.2 [Home Visit Logging & Point-of-Care Vitals](#82-home-visit-logging--point-of-care-vitals)
   - 8.3 [Dual-Language AI Guidance (Hindi & English)](#83-dual-language-ai-guidance-hindi--english)
   - 8.4 [Digital Referral to PHC / District Hospital](#84-digital-referral-to-phc--district-hospital)
   - 8.5 [Offline-First Sync Engine](#85-offline-first-sync-engine)
9. [Role 6: Medical Administrator & Authority Dashboard](#9-role-6-medical-administrator--authority-dashboard)
10. [Troubleshooting & Verification Guide](#10-troubleshooting--verification-guide)

---

## 1. Installation & APK Download

### 📲 Standalone Android Application
1. Download the pre-built Golden Hour APK package using your provided APK download link or QR code.
2. Tap on the downloaded `.apk` file on your Android device.
3. If prompted, allow **"Install unknown apps"** in Android Settings.
4. Launch the **Golden Hour** app from your home screen or app drawer.
5. On the first launch, allow **Location Permissions ("While using the app")** to enable live emergency matching and ambulance telemetry.

---

## 2. Quick Demo Credentials & Role Switching

For testing, presentations, and jury review, each role includes a **1-Tap Quick Demo Button** on its login screen (no passwords, OTPs, or setup needed):

| Role | Screen Route | Demo Button | Pre-loaded Profile Details |
| :--- | :--- | :--- | :--- |
| **Citizen / Patient** | `/login` | `Explore as Demo Patient` | **Rahul Sharma** (`+91 98765 43210`, Blood Group: O+) |
| **Ambulance Pilot** | `/driver-login` | `Quick Demo Pilot` | **Rajesh Kumar** (Ambulance `UP-70-EMG-108`) |
| **Hospital ER Desk** | `/hospital-login` | `Quick Demo Hospital` | **Apollo Multi-Specialty** / **SRN Trauma Center** |
| **OPD Doctor** | `/doctor-login` | `Quick Demo Doctor` | **Dr. Priya Sharma, MD** (Civil Lines OPD Clinic) |
| **ASHA Worker** | `/asha-login` | `Quick Demo ASHA` | **Sunita Verma** (ASHA Sangini, Prayagraj Rural) |
| **Medical Admin** | `/admin-dashboard` | Role Select screen | **Chief Medical Officer (CMO Console)** |

---

## 3. Language Selector & Global Navigation

- **Trilingual Localization:** Tap the **Globe icon** at the top-right corner of any screen to toggle between **English**, **हिंदी (Hindi)**, and **मराठी (Marathi)**. All clinical instructions, badges, and interface copy translate instantly.
- **One-Tap Role Switching:** Tap the **‹ Back / Switch Role** button at the top-left of any dashboard to log out or jump immediately to another role.

---

## 4. Role 1: Citizen / Patient Emergency Portal

![Patient Emergency Portal](patient_voice_sos_1790928620228.jpg)

### 4.1 One-Tap SOS & 3-Second Safety Countdown
- Tap the pulsating red **"SOS EMERGENCY"** button on the home screen.
- A 3-second safety countdown initiates with an audible vibration.
- When the countdown finishes, GPS coordinates, medical history, blood group, and emergency contacts are immediately transmitted to the closest active ambulance and trauma hospital.

### 4.2 Voice AI SOS with Clinical Validation
- Tap the **Voice SOS Microphone** or enter symptoms via speech-to-text (e.g., *"Severe crushing chest pain radiating to left arm"*).
- **Smart Clinical Validation:** Non-emergency queries (e.g., *"What is paracetamol?"*) are handled conversationally without triggering emergency alarms. Genuine medical crises (accidents, heart attacks, stroke) trigger automated emergency dispatch.

### 4.3 False Alarm Cancellation Flow
- If triggered accidentally, tap **"Cancel Emergency (False Alarm)"**.
- Select the cancellation reason (*Accidental Press*, *Resolved Independently*, *Testing*).
- Dispatched units are notified immediately, preventing wasted emergency runs.

### 4.4 Live Ambulance Telemetry & Route Map
- Once an ambulance accepts:
  - **Live GPS Map:** Real-time movement of the ambulance approaching your location.
  - **Dynamic ETA:** Recalculates dynamically with traffic conditions.
  - **Pilot Identity:** Displays pilot name, mobile number, and vehicle registration.

### 4.5 Doctor Appointment History Dropdown
- Upcoming appointments are shown with token queue numbers.
- **Past Clinical Encounters:** Collapsed in a clean **Dropdown/Accordion** to prevent clutter. Tapping expands past consultations, diagnoses, and digital prescriptions.

### 4.6 Medical Profile & ICE Emergency Contacts
- **Medical Setup (`/medical-setup`):** Stores Blood Group, Chronic Conditions, Allergies, and Current Medications.
- **ICE Contacts (`/contacts-setup`):** Stores primary family contacts who receive automatic SOS SMS alerts with live GPS tracking links.

---

## 5. Role 2: Ambulance Pilot / Driver Console

![Ambulance Pilot Console](ambulance_pilot_telemetry_1790928727636.jpg)

### 5.1 Duty State Management (On-Duty / Off-Duty)
1. Open **Driver Login** ➔ Tap **"Quick Demo Pilot"**.
2. Toggle the switch at the top to **"ON DUTY"** to receive proximity dispatches.

### 5.2 Incoming Emergency Dispatch Acceptance
- When an emergency occurs nearby:
  - An audible alert sounds with an Emergency Dispatch Card.
  - Card displays: Patient Name, Incident Nature (Cardiac, Trauma, Burn), Distance, and ETA.
  - Tap **"Accept Emergency"**.

### 5.3 On-Site Arrival: "Marked at Patient Location"
- Follow GPS turn-by-turn routing.
- When reaching the patient's coordinates, tap **"Marked at Patient Location"**.
- This updates both the patient and the hospital ER desk that paramedics are on-scene.

### 5.4 False Request / "Patient Not Found" Handling
- If the patient is missing or the call was fraudulent:
  1. Tap **"Patient Not Found / False Request"**.
  2. Select the reason.
  3. The trip terminates with status `FALSE_ALARM` without penalizing the driver, returning the ambulance to active standby.

### 5.5 Patient Onboard, Live Vitals & ER Handover
1. Once stabilized inside the ambulance, tap **"Patient Onboard ➔ En Route to Hospital"**.
2. Stream vitals (BP, SpO2, Pulse) directly to the receiving trauma center.
3. At the ER bay, tap **"Complete Handover & Trip"** to hand over clinical custody.

---

## 6. Role 3: Hospital ER Command Center

![Hospital ER Command Center](hospital_er_dashboard_1790928700037.jpg)

### 6.1 ER Command Center & Live Capacity Monitoring
- Real-time command dashboard displays:
  - **Active Emergency Arrivals**
  - **Total Beds & Available General Beds**
  - **ICU & Ventilator Availability**
  - **In-Transit Ambulance Telemetry**

### 6.2 Live Bed, ICU & Oxygen Capacity Controls
- Navigate to the **Capacity** tab.
- Increment or decrement available beds with a single tap:
  - `Total Beds` (e.g., 50)
  - `Available General Beds` (e.g., 18)
  - `ICU Beds` (e.g., 12 total, 4 available)
- Updates synchronize across the network so doctors and pilots refer patients only to facilities with open beds.

### 6.3 Incoming Ambulance Triage & Bed Reservation
- When an inbound ambulance selects this facility:
  - The ER console chimes with incoming patient vitals.
  - Tap **"Reserve Bed"** to guarantee bed availability before the patient arrives.

### 6.4 Doctor & ASHA Referrals Hub (with Unread Bell Badge)
- Top Navigation: **[Emergencies]** vs **[Doctor / Community Referrals]**.
- **Unread Notification Bell:**
  - When a Doctor or rural ASHA worker sends a referral, the header bell icon displays a red **"1"** badge.
  - Tapping the bell opens the referrals tab and clears the badge to 0.
- **Referral Cards:**
  - Displays Patient Name, Referring Provider (*"Dr. Priya Sharma"* or *"Sunita Verma (ASHA Sangini)"*), Priority Badge (*CRITICAL / HIGH / NORMAL*), Patient Vitals snapshot, and clinical notes.
  - Deduplication cleanly keeps Doctor and ASHA referrals separated so neither overwrites the other.

### 6.5 Referral Admission & Bed Freeing on Discharge
1. **Accept:** Tap **"Accept & Reserve Bed"** ➔ 1 hospital bed is reserved.
2. **Admit:** When the patient arrives, tap **"Patient Arrived / Admit"** ➔ Status moves to `COMPLETED / ADMITTED`.
3. **Discharge:** When treatment concludes, tap **"Discharge & Free Bed"**.
   - Confirmation prompt verifies release.
   - The reserved bed is released back into the hospital's live bed inventory.

---

## 7. Role 4: Doctor OPD Clinic & Teleconsultation

![Doctor OPD & Teleconsultation](teleconsultation_console_1790928673883.jpg)

### 7.1 Digital OPD Queue & Token Calling
1. Open **Doctor Login** ➔ Tap **"Quick Demo Doctor"**.
2. Go to **Queue (`/queue`)**:
   - Lists today's queued patients by token (Token #1, #2, #3...).
   - Tap **"Call Next Patient"** to advance the queue and start consultation.

### 7.2 Clinical Consultation, Vitals & Prescriptions
- The consultation modal enables rapid clinical documentation:
  - **Diagnosis:** Select from standard conditions (e.g., *Acute Angina*, *Typhoid*, *Fracture*) or type custom.
  - **Vitals:** Blood Pressure, Pulse, SpO2, Temperature.
  - **Rx Medications:** Pick from pre-indexed medicines with dosage, frequency (`1-0-1`), and duration.

### 7.3 Hospital Referral with Priority & Hospital Selection
- If the patient requires emergency hospitalization or tertiary care:
  1. Toggle **"Refer Patient to Hospital"** to ON.
  2. Select the destination facility (e.g., *Swaroop Rani Nehru Hospital* or *Apollo Multi-Specialty*).
  3. Select Priority: **HIGH** (Immediate) or **NORMAL** (Scheduled).
  4. Enter Reason (e.g., *"Urgent ICU bed & emergency cardiac catheterization required"*).
  5. Tap **"Complete Consultation"**.
  - The digital referral transmits instantly to the receiving hospital ER console.

### 7.4 Live Video / Audio Teleconsultation
- Access remote appointments with rural or home-quarantined patients through HD audio/video consultation with integrated in-call chat.

---

## 8. Role 5: ASHA Sangini / Rural Frontline Health Worker

![ASHA Rural Worker Console](asha_rural_console_1790928646305.jpg)

### 8.1 Rural Community Patient Directory & Search
- Open **ASHA Login** ➔ Tap **"Quick Demo ASHA"**.
- Access high-risk rural profiles: pregnant women, elderly patients with hypertension, and infants.
- Search instantly by name or patient ID.

### 8.2 Home Visit Logging & Point-of-Care Vitals
- Tap **"Log Home Visit"**.
- Record point-of-care diagnostics:
  - Blood Pressure (e.g., `150/100 mmHg`)
  - Pulse (`92 bpm`)
  - Oxygen SpO2 (`95%`)
  - Random Blood Sugar (`180 mg/dL`)
  - Symptoms Description (e.g., *"Severe headache, chest heaviness"*).

### 8.3 Dual-Language AI Guidance (Hindi & English)
- The system automatically evaluates vitals and provides clear, actionable clinical advice in **Hindi**:
  - *Risk Level: उच्च जोखिम (HIGH)*
  - *Clinical Guidance: मरीज को तुरंत नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) या जिला अस्पताल रेफर करें। पर्याप्त आराम दें और पानी पिलाएं।*

### 8.4 Digital Referral to PHC / District Hospital
1. Tap **"Create Referral"** (`/referral`).
2. Select Patient and destination facility (e.g., *Swaroop Rani Nehru Hospital (District Trauma)*).
3. Select Priority: **CRITICAL / HIGH / NORMAL**.
4. Enter referral reason.
5. Tap **"Submit Digital Referral"**.
   - A unique code (e.g., `REF-ASHA-ABC123`) is generated.
   - The referral immediately appears in the hospital console's referral queue.

### 8.5 Offline-First Sync Engine
- Works in rural areas with zero internet connectivity.
- Referrals and visits are persisted in encrypted local storage.
- An automatic background synchronization worker triggers the moment mobile data or Wi-Fi reconnects.

---

## 9. Role 6: Medical Administrator & Authority Dashboard

- Access route: `/admin-dashboard`.
- **Core Governance Tools:**
  - **Provider Verification:** Review and approve/reject newly submitted hospital licenses, doctor registrations, and ambulance permits.
  - **Citywide Telemetry:** Real-time heatmaps of emergency hotspots and average response times across Prayagraj.
  - **Audit Logs:** Immutable timestamped trail of dispatches, hospital admissions, and bed reservations.

---

## 10. Troubleshooting & Verification Guide

| Scenario | Root Cause | Solution |
| :--- | :--- | :--- |
| **Referral not visible on hospital desk** | Viewing wrong tab or stale cache | Ensure you are on the **"Doctor / Community Referrals"** tab. Pull down from top to refresh the list. |
| **Unread Bell Badge stays at 1** | Referrals screen not opened yet | Tap directly on the Bell Icon in the header; it immediately opens the referrals queue and clears the badge to 0. |
| **Location permission prompt appears** | GPS disabled on test device | Allow "Precise Location While In Use" in device settings to enable live ambulance routing. |
| **Quick evaluation across multiple roles** | Switching roles without logging out | Tap the **‹ Back / Switch Role** button at the top-left of any dashboard to instantly select another role. |
| **Testing with no active internet** | Simulating remote village | Use ASHA or Driver mode freely; all operations queue in offline storage and sync automatically when internet returns. |
