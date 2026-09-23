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
  public users: Map<string, any> = new Map();

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

    // Seed Prayagraj Regional Clinics
    const clinicMedanta: ClinicDetails = {
      clinicId: "clinic-medanta-prayagraj",
      clinicName: "Medanta OPD & Diagnostic Center",
      address: "Civil Lines, Prayagraj",
      lat: 25.4538,
      lng: 81.8540,
      phone: "+91-532-2407777",
      workingHours: "09:00 - 20:00",
      facilities: ["Cardiology OPD", "2D Echo", "ECG", "Pathology Lab", "Triage Room"],
    };

    const clinicSRN: ClinicDetails = {
      clinicId: "clinic-srn-prayagraj",
      clinicName: "SRN Medical Campus OPD",
      address: "MG Marg, Prayagraj",
      lat: 25.4484,
      lng: 81.8460,
      phone: "+91-532-2500011",
      workingHours: "08:30 - 18:30",
      facilities: ["General OPD", "Internal Medicine", "Digital X-Ray", "Vaccination"],
    };

    const clinicLifeline: ClinicDetails = {
      clinicId: "clinic-lifeline-katra",
      clinicName: "LifeLine Multispecialty Clinic",
      address: "University Road, Katra, Prayagraj",
      lat: 25.4610,
      lng: 81.8570,
      phone: "+91-532-2601234",
      workingHours: "10:00 - 21:00",
      facilities: ["Emergency Triage", "Minor OT", "Trauma Dressing", "Pharmacy"],
    };

    const clinicCityCare: ClinicDetails = {
      clinicId: "clinic-city-georgetown",
      clinicName: "City Heart & Orthopedic Care",
      address: "George Town, Prayagraj",
      lat: 25.4420,
      lng: 81.8620,
      phone: "+91-532-2708899",
      workingHours: "09:30 - 19:30",
      facilities: ["Orthopedic OPD", "Plaster Room", "Physiotherapy", "Digital X-Ray"],
    };

    this.clinics.set(clinicMedanta.clinicId, clinicMedanta);
    this.clinics.set(clinicSRN.clinicId, clinicSRN);
    this.clinics.set(clinicLifeline.clinicId, clinicLifeline);
    this.clinics.set(clinicCityCare.clinicId, clinicCityCare);

    // Legacy clinic aliases for backward compatibility
    this.clinics.set("clinic-sharma-blr", clinicMedanta);
    this.clinics.set("clinic-verma-blr", clinicSRN);

    // Seed Doctors
    const doc1: DoctorProfile = {
      doctorId: "doc-1",
      userId: "user-dr-alok",
      name: "Dr. Alok Tripathi",
      specialty: "Cardiologist",
      qualification: "MBBS, MD, DM (Cardiology)",
      experienceYears: 14,
      licenseNumber: "UPMC-2010-45812",
      verificationStatus: "VERIFIED",
      clinicId: clinicMedanta.clinicId,
      consultationFee: 600,
      availability: "AVAILABLE",
      rating: 4.9,
      servingToken: 3,
      queueLength: 6,
      estimatedWaitMinutes: 25,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const doc2: DoctorProfile = {
      doctorId: "doc-2",
      userId: "user-dr-anita",
      name: "Dr. Anita Verma",
      specialty: "General Physician",
      qualification: "MBBS, MD (General Medicine)",
      experienceYears: 10,
      licenseNumber: "UPMC-2014-99214",
      verificationStatus: "VERIFIED",
      clinicId: clinicSRN.clinicId,
      consultationFee: 350,
      availability: "AVAILABLE",
      rating: 4.8,
      servingToken: 5,
      queueLength: 8,
      estimatedWaitMinutes: 20,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const doc3: DoctorProfile = {
      doctorId: "doc-3",
      userId: "user-dr-rajesh",
      name: "Dr. Rajesh Sharma",
      specialty: "Emergency Medicine",
      qualification: "MBBS, MS (General Surgery), Fellowship in Trauma",
      experienceYears: 12,
      licenseNumber: "UPMC-2012-77412",
      verificationStatus: "VERIFIED",
      clinicId: clinicLifeline.clinicId,
      consultationFee: 500,
      availability: "AVAILABLE",
      rating: 4.9,
      servingToken: 2,
      queueLength: 5,
      estimatedWaitMinutes: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const doc4: DoctorProfile = {
      doctorId: "doc-4",
      userId: "user-dr-anjali",
      name: "Dr. Anjali Verma",
      specialty: "Orthopedic",
      qualification: "MBBS, MS (Orthopedics), DNB",
      experienceYears: 11,
      licenseNumber: "UPMC-2013-33901",
      verificationStatus: "VERIFIED",
      clinicId: clinicCityCare.clinicId,
      consultationFee: 500,
      availability: "AVAILABLE",
      rating: 4.8,
      servingToken: 4,
      queueLength: 7,
      estimatedWaitMinutes: 25,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.doctors.set(doc1.doctorId, doc1);
    this.doctors.set(doc2.doctorId, doc2);
    this.doctors.set(doc3.doctorId, doc3);
    this.doctors.set(doc4.doctorId, doc4);

    // Aliases for any legacy test suites
    this.doctors.set("doc-sharma-trauma", { ...doc3, doctorId: "doc-sharma-trauma" });
    this.doctors.set("doc-verma-ortho", { ...doc4, doctorId: "doc-verma-ortho" });

    // Seed Queues
    const today = new Date().toISOString().split("T")[0];
    this.queues.set(`${doc1.doctorId}_${today}`, {
      doctorId: doc1.doctorId,
      date: today,
      servingToken: 3,
      totalTokensIssued: 9,
      avgConsultationMinutes: 10,
      waitingCount: 6,
    });

    this.queues.set(`${doc2.doctorId}_${today}`, {
      doctorId: doc2.doctorId,
      date: today,
      servingToken: 5,
      totalTokensIssued: 13,
      avgConsultationMinutes: 8,
      waitingCount: 8,
    });

    this.queues.set(`${doc3.doctorId}_${today}`, {
      doctorId: doc3.doctorId,
      date: today,
      servingToken: 2,
      totalTokensIssued: 7,
      avgConsultationMinutes: 10,
      waitingCount: 5,
    });

    this.queues.set(`${doc4.doctorId}_${today}`, {
      doctorId: doc4.doctorId,
      date: today,
      servingToken: 4,
      totalTokensIssued: 11,
      avgConsultationMinutes: 10,
      waitingCount: 7,
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

    const hospBlr1: HospitalFacility = {
      hospitalId: "hosp-martha-blr",
      name: "St. Martha's Hospital",
      address: "Nrupathunga Road, Bengaluru",
      lat: 12.9716,
      lng: 77.5946,
      distanceKm: 0,
      etaMinutes: 0,
      emergencyCapability: ["Level 1 Trauma", "Cardiology", "Emergency OT", "Burns Unit"],
      availableCapacity: 14,
      traumaLevel: 1,
      icuAvailable: true,
      specialistsAvailable: ["Trauma Surgeon", "Cardiologist", "Critical Care Specialist"],
      diagnosticAvailability: ["CT 128 Slice", "MRI 3T", "Digital X-Ray", "Blood Bank"],
      verified: true,
    };

    const hospBlr2: HospitalFacility = {
      hospitalId: "hosp-fortis-blr",
      name: "Fortis Emergency Care",
      address: "Bannerghatta Road, Bengaluru",
      lat: 12.9352,
      lng: 77.6146,
      distanceKm: 0,
      etaMinutes: 0,
      emergencyCapability: ["Emergency Care", "Cardiology", "Neurology"],
      availableCapacity: 8,
      traumaLevel: 1,
      icuAvailable: true,
      specialistsAvailable: ["Emergency Physician", "Neurosurgeon"],
      diagnosticAvailability: ["CT Scan", "Digital X-Ray", "Blood Bank"],
      verified: true,
    };

    const hospBlr3: HospitalFacility = {
      hospitalId: "hosp-apollo-blr",
      name: "Apollo Speciality",
      address: "Jayanagar, Bengaluru",
      lat: 12.9116,
      lng: 77.6389,
      distanceKm: 0,
      etaMinutes: 0,
      emergencyCapability: ["Level 2 Trauma", "Cardiac Care", "Pediatric ICU"],
      availableCapacity: 9,
      traumaLevel: 2,
      icuAvailable: true,
      specialistsAvailable: ["Emergency Physician", "Pediatrician"],
      diagnosticAvailability: ["CT Scan", "Ultrasound", "Pathology Lab"],
      verified: true,
    };

    this.hospitals.set(hosp1.hospitalId, hosp1);
    this.hospitals.set(hosp2.hospitalId, hosp2);
    this.hospitals.set(hosp3.hospitalId, hosp3);
    this.hospitals.set(hospBlr1.hospitalId, hospBlr1);
    this.hospitals.set(hospBlr2.hospitalId, hospBlr2);
    this.hospitals.set(hospBlr3.hospitalId, hospBlr3);

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
