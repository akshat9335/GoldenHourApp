import { describe, expect, it, beforeEach } from "vitest";
import {
  registerUserProfile,
  getUserProfile,
} from "../src/services/users/user.service";
import { dataStore } from "../src/models/dataStore";
import { firestore } from "../src/config/firebase";

describe("Multi-Role Doctor Registration Architecture", () => {
  const runId = Date.now();
  const patientUid = `test-patient-doc-${runId}`;
  const doctorOnlyUid = `test-doc-only-${runId}`;

  it("1. existing Patient + Doctor registration => PATIENT preserved + DOCTOR added + PENDING", async () => {
    // Register as Patient first
    const patientProfile = await registerUserProfile(patientUid, {
      name: "Akshat Patient",
      role: "PATIENT",
      email: "akshat@test.com",
      phone: "+919876543210",
      bloodGroup: "O+",
      allergies: "Penicillin",
      medications: "Antihistamines",
      chronicConditions: "Asthma",
      homeAddress: "123 Health St, Bangalore",
    });

    expect(patientProfile.role).toBe("PATIENT");
    expect(patientProfile.roles).toContain("PATIENT");
    expect(patientProfile.verificationStatus).toBe("APPROVED");
    const initialCrisisId = patientProfile.crisisId;
    expect(initialCrisisId).toBeDefined();

    // Now register as Doctor using the same UID
    const doctorProfile = await registerUserProfile(patientUid, {
      name: "Dr. Akshat",
      role: "DOCTOR",
      specialty: "Cardiology",
      qualification: "MBBS, MD",
      licenseNumber: `KMC-${runId}`,
      clinicName: "Akshat Heart Clinic",
      clinicAddress: "456 Doctors Lane, Bangalore",
      consultationFee: 750,
    });

    // Verify both roles exist
    expect(doctorProfile.roles).toBeDefined();
    expect(doctorProfile.roles).toContain("PATIENT");
    expect(doctorProfile.roles).toContain("DOCTOR");

    // Primary role reflects recent doctor registration, status is server-authoritative PENDING
    expect(doctorProfile.role).toBe("DOCTOR");
    expect(doctorProfile.verificationStatus).toBe("PENDING");
    expect(doctorProfile.roleVerificationStatus?.DOCTOR).toBe("PENDING");
    expect(doctorProfile.roleVerificationStatus?.PATIENT).toBe("APPROVED");

    // Doctor domain record created
    const docRecord = dataStore.doctors.get(`doc-${patientUid}`);
    expect(docRecord).toBeDefined();
    expect(docRecord?.userId).toBe(patientUid);
    expect(docRecord?.verificationStatus).toBe("PENDING");
    expect(docRecord?.specialty).toBe("Cardiology");
  });

  it("2. existing Doctor + Doctor registration => safe reuse without duplication or error", async () => {
    // Initial doctor registration
    const initial = await registerUserProfile(doctorOnlyUid, {
      name: "Dr. Priya",
      role: "DOCTOR",
      specialty: "Neurology",
      licenseNumber: `KMC-DOC2-${runId}`,
    });

    expect(initial.roles).toContain("DOCTOR");
    const initialCrisisId = initial.crisisId;

    // Second registration with updated clinic info on the same account
    const second = await registerUserProfile(doctorOnlyUid, {
      name: "Dr. Priya V",
      role: "DOCTOR",
      specialty: "Neurology",
      qualification: "MBBS, DM (Neurology)",
      licenseNumber: `KMC-DOC2-${runId}`,
      clinicName: "Brain Health Center",
      consultationFee: 1200,
    });

    expect(second.uid).toBe(doctorOnlyUid);
    expect(second.crisisId).toBe(initialCrisisId); // Reused
    expect(second.qualification).toBe("MBBS, DM (Neurology)");
    expect(second.consultationFee).toBe(1200);
    expect(second.verificationStatus).toBe("PENDING");
  });

  it("3. existing Patient data remains completely unchanged during Doctor registration", async () => {
    const updated = await getUserProfile(patientUid);
    expect(updated).not.toBeNull();

    // Patient emergency/clinical data preserved exactly
    expect(updated?.bloodGroup).toBe("O+");
    expect(updated?.allergies).toBe("Penicillin");
    expect(updated?.medications).toBe("Antihistamines");
    expect(updated?.chronicConditions).toBe("Asthma");
    expect(updated?.homeAddress).toBe("123 Health St, Bangalore");
  });

  it("4. client cannot self-approve Doctor (forced to PENDING)", async () => {
    const testUid = `test-hacker-doc-${runId}`;

    // Attacker tries to pass verificationStatus: APPROVED
    const profile = await registerUserProfile(testUid, {
      name: "Dr. Rogue",
      role: "DOCTOR",
      specialty: "General Surgery",
      licenseNumber: `KMC-ROGUE-${runId}`,
      verificationStatus: "APPROVED" as any,
    } as any);

    expect(profile.verificationStatus).toBe("PENDING");
    expect(profile.roleVerificationStatus?.DOCTOR).toBe("PENDING");

    const docRecord = dataStore.doctors.get(`doc-${testUid}`);
    expect(docRecord?.verificationStatus).toBe("PENDING");
  });

  it("5. duplicate roles are not created", async () => {
    const uid = `test-no-dup-roles-${runId}`;
    await registerUserProfile(uid, { name: "Multi User", role: "PATIENT" });
    await registerUserProfile(uid, { name: "Dr. Multi", role: "DOCTOR", specialty: "ENT", licenseNumber: `LIC-MULTI-1-${runId}` });
    const finalProfile = await registerUserProfile(uid, { name: "Dr. Multi", role: "DOCTOR", specialty: "ENT", licenseNumber: `LIC-MULTI-1-${runId}` });

    expect(finalProfile.roles).toBeDefined();
    const patientCount = finalProfile.roles!.filter((r) => r === "PATIENT").length;
    const doctorCount = finalProfile.roles!.filter((r) => r === "DOCTOR").length;

    expect(patientCount).toBe(1);
    expect(doctorCount).toBe(1);
  });
});
