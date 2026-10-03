import { HealthRecord, PrescribedMedicine } from "../../types/healthRecord";
import { DoctorReferral } from "../../types/referral";

export interface FHIRResource {
  resourceType: string;
  id: string;
  [key: string]: any;
}

export interface FHIRBundle {
  resourceType: "Bundle";
  id: string;
  type: "collection";
  timestamp: string;
  entry: Array<{
    fullUrl: string;
    resource: FHIRResource;
  }>;
}

export class FHIRConverter {
  /**
   * Converts a Golden Hour Patient profile to a standard FHIR R4 Patient resource.
   */
  public toFHIRPatient(patient: {
    id: string;
    name?: string;
    phone?: string;
    gender?: string;
    birthDate?: string;
  }): FHIRResource {
    return {
      resourceType: "Patient",
      id: patient.id,
      identifier: [
        {
          system: "https://goldenhour.in/patients",
          value: patient.id,
        },
      ],
      name: [
        {
          use: "official",
          text: patient.name || "Patient",
        },
      ],
      telecom: patient.phone
        ? [
            {
              system: "phone",
              value: patient.phone,
              use: "mobile",
            },
          ]
        : [],
      gender: (patient.gender || "unknown").toLowerCase(),
      birthDate: patient.birthDate || undefined,
    };
  }

  /**
   * Converts a Consultation/Encounter to FHIR R4 Encounter resource.
   */
  public toFHIREncounter(record: HealthRecord): FHIRResource {
    return {
      resourceType: "Encounter",
      id: `enc-${record.id}`,
      status: "finished",
      class: {
        system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
        code: "AMB",
        display: "ambulatory",
      },
      subject: {
        reference: `Patient/${record.patientId}`,
        display: record.patientName,
      },
      participant: [
        {
          individual: {
            reference: `Practitioner/${record.doctorId}`,
            display: record.doctorName,
          },
        },
      ],
      period: {
        start: record.createdAt,
        end: record.updatedAt || record.createdAt,
      },
      reasonCode: [
        {
          text: record.diagnosis,
        },
      ],
      serviceProvider: {
        display: record.clinicName || "Golden Hour Medical Center",
      },
    };
  }

  /**
   * Converts a Diagnosis to FHIR R4 Condition resource.
   */
  public toFHIRCondition(record: HealthRecord): FHIRResource {
    return {
      resourceType: "Condition",
      id: `cond-${record.id}`,
      clinicalStatus: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
            code: "active",
            display: "Active",
          },
        ],
      },
      verificationStatus: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
            code: "confirmed",
            display: "Confirmed",
          },
        ],
      },
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/condition-category",
              code: "encounter-diagnosis",
              display: "Encounter Diagnosis",
            },
          ],
        },
      ],
      code: {
        text: record.diagnosis,
      },
      subject: {
        reference: `Patient/${record.patientId}`,
        display: record.patientName,
      },
      encounter: {
        reference: `Encounter/enc-${record.id}`,
      },
      recordedDate: record.createdAt,
    };
  }

  /**
   * Converts vitals to FHIR R4 Observation resources.
   */
  public toFHIRObservations(record: HealthRecord): FHIRResource[] {
    const observations: FHIRResource[] = [];
    const vitals = record.vitals;
    if (!vitals) return observations;

    if (vitals.bloodPressure) {
      observations.push({
        resourceType: "Observation",
        id: `obs-bp-${record.id}`,
        status: "final",
        category: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/observation-category",
                code: "vital-signs",
                display: "Vital Signs",
              },
            ],
          },
        ],
        code: {
          text: "Blood Pressure",
        },
        subject: {
          reference: `Patient/${record.patientId}`,
        },
        valueString: vitals.bloodPressure,
        effectiveDateTime: record.createdAt,
      });
    }

    if (vitals.heartRate) {
      observations.push({
        resourceType: "Observation",
        id: `obs-hr-${record.id}`,
        status: "final",
        category: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/observation-category",
                code: "vital-signs",
                display: "Vital Signs",
              },
            ],
          },
        ],
        code: {
          text: "Heart Rate",
        },
        subject: {
          reference: `Patient/${record.patientId}`,
        },
        valueQuantity: {
          value: vitals.heartRate,
          unit: "beats/minute",
        },
        effectiveDateTime: record.createdAt,
      });
    }

    if (vitals.spO2) {
      observations.push({
        resourceType: "Observation",
        id: `obs-spo2-${record.id}`,
        status: "final",
        category: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/observation-category",
                code: "vital-signs",
                display: "Vital Signs",
              },
            ],
          },
        ],
        code: {
          text: "Oxygen Saturation (SpO2)",
        },
        subject: {
          reference: `Patient/${record.patientId}`,
        },
        valueQuantity: {
          value: vitals.spO2,
          unit: "%",
        },
        effectiveDateTime: record.createdAt,
      });
    }

    return observations;
  }

  /**
   * Converts prescribed medicines to FHIR R4 MedicationRequest resources.
   */
  public toFHIRMedicationRequests(record: HealthRecord): FHIRResource[] {
    return (record.prescriptions || []).map((med: PrescribedMedicine, idx: number) => ({
      resourceType: "MedicationRequest",
      id: `medrx-${record.id}-${idx}`,
      status: "active",
      intent: "order",
      medicationCodeableConcept: {
        text: med.name,
      },
      subject: {
        reference: `Patient/${record.patientId}`,
        display: record.patientName,
      },
      encounter: {
        reference: `Encounter/enc-${record.id}`,
      },
      authoredOn: record.createdAt,
      requester: {
        reference: `Practitioner/${record.doctorId}`,
        display: record.doctorName,
      },
      dosageInstruction: [
        {
          text: `${med.dosage} | ${med.frequency} for ${med.duration}`,
          additionalInstruction: med.instructions ? [{ text: med.instructions }] : [],
        },
      ],
    }));
  }

  /**
   * Converts a referral to FHIR R4 ServiceRequest resource.
   */
  public toFHIRServiceRequest(referral: DoctorReferral): FHIRResource {
    return {
      resourceType: "ServiceRequest",
      id: `req-${referral.id}`,
      status: referral.status === "COMPLETED" ? "completed" : referral.status === "REJECTED" ? "revoked" : "active",
      intent: "order",
      priority: referral.priority.toLowerCase() === "high" ? "urgent" : "routine",
      subject: {
        reference: `Patient/${referral.patientId}`,
        display: referral.patientName,
      },
      requester: {
        reference: `Practitioner/${referral.doctorId}`,
        display: referral.doctorName,
      },
      performer: [
        {
          reference: `Organization/${referral.hospitalId}`,
          display: referral.hospitalName,
        },
      ],
      reasonCode: [
        {
          text: referral.reason,
        },
      ],
      authoredOn: referral.createdAt,
    };
  }

  /**
   * Creates a complete FHIR R4 Bundle from all health records & referrals of a patient.
   */
  public createPatientFHIRBundle(
    patient: { id: string; name?: string; phone?: string; gender?: string },
    records: HealthRecord[],
    referrals: DoctorReferral[] = []
  ): FHIRBundle {
    const entries: Array<{ fullUrl: string; resource: FHIRResource }> = [];

    // Add Patient resource
    const patientResource = this.toFHIRPatient(patient);
    entries.push({
      fullUrl: `urn:uuid:${patientResource.id}`,
      resource: patientResource,
    });

    // Add Encounters, Conditions, Observations, and MedicationRequests
    for (const record of records) {
      const enc = this.toFHIREncounter(record);
      entries.push({ fullUrl: `urn:uuid:${enc.id}`, resource: enc });

      const cond = this.toFHIRCondition(record);
      entries.push({ fullUrl: `urn:uuid:${cond.id}`, resource: cond });

      const obsList = this.toFHIRObservations(record);
      for (const obs of obsList) {
        entries.push({ fullUrl: `urn:uuid:${obs.id}`, resource: obs });
      }

      const medList = this.toFHIRMedicationRequests(record);
      for (const med of medList) {
        entries.push({ fullUrl: `urn:uuid:${med.id}`, resource: med });
      }
    }

    // Add ServiceRequests (Referrals)
    for (const referral of referrals) {
      const srv = this.toFHIRServiceRequest(referral);
      entries.push({ fullUrl: `urn:uuid:${srv.id}`, resource: srv });
    }

    return {
      resourceType: "Bundle",
      id: `bundle-patient-${patient.id}`,
      type: "collection",
      timestamp: new Date().toISOString(),
      entry: entries,
    };
  }
}

export const fhirConverter = new FHIRConverter();
