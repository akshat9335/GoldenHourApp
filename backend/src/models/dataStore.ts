import { DoctorProfile, ClinicDetails } from "../types/doctor";
import { Appointment, LiveQueueState } from "../types/appointment";
import { StoredLocation, HospitalFacility, NearbyIncidentSummary } from "../types/location";

/**
 * In-Memory persistent datastore for Anant's location, doctor, clinic, appointment, and queue services.
 * Seamlessly backs the system in local/demo/test environments, and provides seeding for realistic demonstrations.
 */
class InMemoryDataStore {
  public locations: Map<string, StoredLocation> = new Map();
  public doctors: Map<string, DoctorProfile> = new Map();
  public clinics: Map<string, ClinicDetails> = new Map();
  public appointments: Map<string, Appointment> = new Map();
  public queues: Map<string, LiveQueueState> = new Map(); // key: `${doctorId}_${date}`
  public hospitals: Map<string, HospitalFacility> = new Map();
  public incidents: Map<string, NearbyIncidentSummary> = new Map();

  constructor() {
    this.seedInitialData();
  }

  public seedInitialData(): void {
    // Seed Clinics
    const clinic1: ClinicDetails = {
      clinicId: "clinic-apollo-cr",
      clinicName: "Apollo Emergency & Trauma Care Clinic",
      address: "Plot 14, Sector 18, Connaught Place, New Delhi",
      lat: 28.6328,
      lng: 77.2197,
      phone: "+91-11-23456789",
      workingHours: "09:00 - 21:00",
      facilities: ["ECG", "X-Ray", "Emergency Dressing", "Triage Room"],
    };

    const clinic2: ClinicDetails = {
      clinicId: "clinic-max-south",
      clinicName: "Max Care Orthopedic & Trauma Center",
      address: "22 Saket Institutional Area, New Delhi",
      lat: 28.5284,
      lng: 77.2126,
      phone: "+91-11-45678901",
      workingHours: "10:00 - 20:00",
      facilities: ["Digital X-Ray", "Plaster Room", "Minor OT", "Pharmacy"],
    };

    this.clinics.set(clinic1.clinicId, clinic1);
    this.clinics.set(clinic2.clinicId, clinic2);

    // Seed Doctors
    const doc1: DoctorProfile = {
      doctorId: "doc-sharma-trauma",
      userId: "user-dr-sharma",
      name: "Dr. Rajesh Sharma",
      specialty: "Trauma & Emergency Care",
      qualification: "MBBS, MS (General Surgery), Fellowship in Trauma",
      experienceYears: 14,
      licenseNumber: "MCI-DL-2009-45812",
      verificationStatus: "VERIFIED",
      clinicId: clinic1.clinicId,
      consultationFee: 700,
      availability: "AVAILABLE",
      rating: 4.9,
      servingToken: 3,
      queueLength: 7,
      estimatedWaitMinutes: 40,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const doc2: DoctorProfile = {
      doctorId: "doc-verma-ortho",
      userId: "user-dr-verma",
      name: "Dr. Anjali Verma",
      specialty: "Orthopedic Surgery & Fractures",
      qualification: "MBBS, MS (Orthopedics), DNB",
      experienceYears: 10,
      licenseNumber: "MCI-DL-2014-99214",
      verificationStatus: "VERIFIED",
      clinicId: clinic2.clinicId,
      consultationFee: 800,
      availability: "AVAILABLE",
      rating: 4.8,
      servingToken: 1,
      queueLength: 4,
      estimatedWaitMinutes: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const doc3Pending: DoctorProfile = {
      doctorId: "doc-kumar-general",
      userId: "user-dr-kumar",
      name: "Dr. Vikram Kumar",
      specialty: "General Medicine",
      qualification: "MBBS",
      experienceYears: 3,
      licenseNumber: "MCI-DL-2021-12345",
      verificationStatus: "PENDING",
      clinicId: clinic1.clinicId,
      consultationFee: 400,
      availability: "OFFLINE",
      rating: 4.2,
      servingToken: 0,
      queueLength: 0,
      estimatedWaitMinutes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.doctors.set(doc1.doctorId, doc1);
    this.doctors.set(doc2.doctorId, doc2);
    this.doctors.set(doc3Pending.doctorId, doc3Pending);

    // Seed Queues
    const today = new Date().toISOString().split("T")[0];
    this.queues.set(`${doc1.doctorId}_${today}`, {
      doctorId: doc1.doctorId,
      date: today,
      servingToken: 3,
      totalTokensIssued: 7,
      avgConsultationMinutes: 10,
      waitingCount: 4,
    });

    this.queues.set(`${doc2.doctorId}_${today}`, {
      doctorId: doc2.doctorId,
      date: today,
      servingToken: 1,
      totalTokensIssued: 4,
      avgConsultationMinutes: 12,
      waitingCount: 3,
    });

    // Seed Hospitals (Coordinate with Aastha's hospital network)
    const hosp1: HospitalFacility = {
      hospitalId: "hosp-aiims-delhi",
      name: "AIIMS Apex Trauma Centre",
      address: "Ring Road, Safdarjung Enclave, New Delhi",
      lat: 28.5672,
      lng: 77.2100,
      distanceKm: 0,
      etaMinutes: 0,
      emergencyCapability: ["Level 1 Trauma", "Neurosurgery", "Cardiology", "Burns Unit"],
      availableCapacity: 8,
      traumaLevel: 1,
      icuAvailable: true,
      specialistsAvailable: ["Neurosurgeon", "Orthopedic Surgeon", "Anesthetist"],
      diagnosticAvailability: ["CT 128 Slice", "MRI 3T", "Digital X-Ray", "Blood Bank"],
      verified: true,
    };

    const hosp2: HospitalFacility = {
      hospitalId: "hosp-safdarjung",
      name: "Safdarjung Hospital Emergency",
      address: "Ansari Nagar West, New Delhi",
      lat: 28.5714,
      lng: 77.2081,
      distanceKm: 0,
      etaMinutes: 0,
      emergencyCapability: ["Level 1 Trauma", "General Emergency", "Pediatric ICU"],
      availableCapacity: 14,
      traumaLevel: 1,
      icuAvailable: true,
      specialistsAvailable: ["Emergency Physician", "General Surgeon"],
      diagnosticAvailability: ["CT Scan", "Digital X-Ray", "Blood Bank"],
      verified: true,
    };

    const hosp3: HospitalFacility = {
      hospitalId: "hosp-moolchand",
      name: "Moolchand Medcity Trauma",
      address: "Lajpat Nagar III, New Delhi",
      lat: 28.5658,
      lng: 77.2341,
      distanceKm: 0,
      etaMinutes: 0,
      emergencyCapability: ["Emergency", "Cardiac Care", "Orthopedics"],
      availableCapacity: 5,
      traumaLevel: 2,
      icuAvailable: false,
      specialistsAvailable: ["Cardiologist", "Critical Care Specialist"],
      diagnosticAvailability: ["CT Scan", "Ultrasound", "Pathology Lab"],
      verified: true,
    };

    this.hospitals.set(hosp1.hospitalId, hosp1);
    this.hospitals.set(hosp2.hospitalId, hosp2);
    this.hospitals.set(hosp3.hospitalId, hosp3);

    // Seed Nearby Incidents (For Nearby Alerts testing)
    const inc1: NearbyIncidentSummary = {
      incidentId: "inc-delhi-001",
      approximateLocation: { lat: 28.5680, lng: 77.2110 },
      severity: "CRITICAL",
      confirmationCount: 4,
      status: "VERIFIED",
      distanceKm: 0,
      reportedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    };

    const inc2: NearbyIncidentSummary = {
      incidentId: "inc-delhi-002",
      approximateLocation: { lat: 28.5300, lng: 77.2150 },
      severity: "HIGH",
      confirmationCount: 2,
      status: "REPORTED",
      distanceKm: 0,
      reportedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    };

    this.incidents.set(inc1.incidentId, inc1);
    this.incidents.set(inc2.incidentId, inc2);
  }

  public reset(): void {
    this.locations.clear();
    this.doctors.clear();
    this.clinics.clear();
    this.appointments.clear();
    this.queues.clear();
    this.hospitals.clear();
    this.incidents.clear();
    this.seedInitialData();
  }
}

export const dataStore = new InMemoryDataStore();
