import { HealthRecord } from '../models/healthRecord.model';

export interface FhirBundleEntry {
  fullUrl: string;
  resource: Record<string, any>;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  id: string;
  meta: {
    lastUpdated: string;
    profile?: string[];
  };
  identifier: {
    system: string;
    value: string;
  };
  type: 'document';
  timestamp: string;
  entry: FhirBundleEntry[];
}

/**
 * Builds an ABDM-compliant HL7 FHIR Release 4 (R4) Document Bundle
 * from a Golden Hour HealthRecord.
 */
export function buildFhirR4Bundle(record: HealthRecord): FhirBundle {
  const bundleId = `bundle-${record.id}`;
  const now = new Date().toISOString();

  const patientFullUrl = `urn:uuid:patient-${record.patientUid}`;
  const practitionerFullUrl = record.doctorName ? `urn:uuid:doctor-${record.id}` : undefined;
  const orgFullUrl = `urn:uuid:org-${record.id}`;

  const entries: FhirBundleEntry[] = [];

  // 1. Patient Resource
  const patientResource = {
    resourceType: 'Patient',
    id: record.patientUid,
    identifier: [
      {
        system: 'https://healthid.ndhm.gov.in',
        value: record.crisisId || record.patientUid,
      },
    ],
    meta: {
      profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient'],
    },
  };

  // 2. Organization Resource (Facility)
  const organizationResource = {
    resourceType: 'Organization',
    id: `org-${record.id}`,
    name: record.facilityName || 'Emergency Medical Facility',
    meta: {
      profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/Organization'],
    },
  };

  // 3. Practitioner Resource (Doctor, if provided)
  const practitionerResource = record.doctorName
    ? {
        resourceType: 'Practitioner',
        id: `doctor-${record.id}`,
        name: [
          {
            text: record.doctorName,
          },
        ],
        qualification: record.doctorSpecialty
          ? [
              {
                code: {
                  text: record.doctorSpecialty,
                },
              },
            ]
          : undefined,
        meta: {
          profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/Practitioner'],
        },
      }
    : null;

  // 4. Clinical Resources (Conditions, Allergies, Medications, Observations)
  const sectionEntries: Array<{ reference: string }> = [];

  // Diagnosis / Condition
  if (record.diagnosis) {
    const conditionId = `condition-${record.id}`;
    const conditionUrl = `urn:uuid:${conditionId}`;
    entries.push({
      fullUrl: conditionUrl,
      resource: {
        resourceType: 'Condition',
        id: conditionId,
        clinicalStatus: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
              code: 'active',
              display: 'Active',
            },
          ],
        },
        code: {
          text: record.diagnosis,
        },
        subject: {
          reference: patientFullUrl,
        },
        recordedDate: record.date || now,
        meta: {
          profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/Condition'],
        },
      },
    });
    sectionEntries.push({ reference: conditionUrl });
  }

  // Allergies
  if (record.allergies && record.allergies.length > 0) {
    record.allergies.forEach((allergy, index) => {
      const allergyId = `allergy-${record.id}-${index}`;
      const allergyUrl = `urn:uuid:${allergyId}`;
      entries.push({
        fullUrl: allergyUrl,
        resource: {
          resourceType: 'AllergyIntolerance',
          id: allergyId,
          clinicalStatus: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
                code: 'active',
                display: 'Active',
              },
            ],
          },
          code: {
            text: allergy,
          },
          patient: {
            reference: patientFullUrl,
          },
          recordedDate: record.date || now,
          meta: {
            profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/AllergyIntolerance'],
          },
        },
      });
      sectionEntries.push({ reference: allergyUrl });
    });
  }

  // Medications / Prescriptions
  if (record.medications && record.medications.length > 0) {
    record.medications.forEach((med, index) => {
      const medId = `medication-${record.id}-${index}`;
      const medUrl = `urn:uuid:${medId}`;
      entries.push({
        fullUrl: medUrl,
        resource: {
          resourceType: 'MedicationRequest',
          id: medId,
          status: 'active',
          intent: 'order',
          medicationCodeableConcept: {
            text: med.name,
          },
          dosageInstruction: [
            {
              text: `${med.dosage} ${med.frequency} for ${med.duration}`.trim(),
            },
          ],
          subject: {
            reference: patientFullUrl,
          },
          authoredOn: record.date || now,
          requester: practitionerFullUrl ? { reference: practitionerFullUrl } : undefined,
          meta: {
            profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/MedicationRequest'],
          },
        },
      });
      sectionEntries.push({ reference: medUrl });
    });
  }

  // Lab Results / Observations
  if (record.labResults && record.labResults.length > 0) {
    record.labResults.forEach((lab, index) => {
      const obsId = `observation-${record.id}-${index}`;
      const obsUrl = `urn:uuid:${obsId}`;
      entries.push({
        fullUrl: obsUrl,
        resource: {
          resourceType: 'Observation',
          id: obsId,
          status: 'final',
          code: {
            text: lab.testName,
          },
          valueString: `${lab.value} ${lab.unit}`.trim(),
          referenceRange: lab.normalRange
            ? [
                {
                  text: lab.normalRange,
                },
              ]
            : undefined,
          subject: {
            reference: patientFullUrl,
          },
          effectiveDateTime: record.date || now,
          meta: {
            profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/Observation'],
          },
        },
      });
      sectionEntries.push({ reference: obsUrl });
    });
  }

  // Determine ABDM Document Type LOINC code
  let typeCode = '11488-4'; // Consultation note default
  let typeDisplay = 'Consultation Note';

  if (record.recordType === 'PRESCRIPTION') {
    typeCode = '440545006';
    typeDisplay = 'Prescription record';
  } else if (record.recordType === 'LAB_REPORT') {
    typeCode = '11502-2';
    typeDisplay = 'Laboratory report';
  } else if (record.recordType === 'EMERGENCY_SUMMARY') {
    typeCode = '83870-6';
    typeDisplay = 'Emergency summary note';
  }

  // 5. Composition Resource (MUST be the first entry in a FHIR Document Bundle)
  const compositionResource = {
    resourceType: 'Composition',
    id: `comp-${record.id}`,
    status: 'final',
    type: {
      coding: [
        {
          system: 'http://snomed.info/sct',
          code: typeCode,
          display: typeDisplay,
        },
      ],
      text: record.title || typeDisplay,
    },
    subject: {
      reference: patientFullUrl,
      display: `Patient ${record.crisisId}`,
    },
    date: record.date || now,
    author: practitionerFullUrl
      ? [
          {
            reference: practitionerFullUrl,
            display: record.doctorName,
          },
        ]
      : [
          {
            reference: orgFullUrl,
            display: record.facilityName,
          },
        ],
    title: record.title || 'Health Record',
    custodian: {
      reference: orgFullUrl,
      display: record.facilityName,
    },
    section: [
      {
        title: record.title || 'Clinical Summary',
        code: {
          text: record.recordType,
        },
        entry: sectionEntries,
      },
    ],
    meta: {
      profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentReference'],
    },
  };

  // Build the complete bundle with Composition FIRST
  const allEntries: FhirBundleEntry[] = [
    {
      fullUrl: `urn:uuid:comp-${record.id}`,
      resource: compositionResource,
    },
    {
      fullUrl: patientFullUrl,
      resource: patientResource,
    },
    {
      fullUrl: orgFullUrl,
      resource: organizationResource,
    },
  ];

  if (practitionerResource && practitionerFullUrl) {
    allEntries.push({
      fullUrl: practitionerFullUrl,
      resource: practitionerResource,
    });
  }

  allEntries.push(...entries);

  return {
    resourceType: 'Bundle',
    id: bundleId,
    meta: {
      lastUpdated: now,
      profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle'],
    },
    identifier: {
      system: 'https://healthid.ndhm.gov.in',
      value: bundleId,
    },
    type: 'document',
    timestamp: now,
    entry: allEntries,
  };
}
