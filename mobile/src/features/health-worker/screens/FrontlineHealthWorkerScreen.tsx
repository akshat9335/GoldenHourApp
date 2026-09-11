import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { Language, ConsciousnessLevel, FrontlineVitals } from "../types/healthWorker.types";
import { getTranslation } from "../constants/translations";
import { healthWorkerReferralService } from "../services/healthWorkerReferral.service";
import { useNetworkSync } from "../../low-connectivity/hooks/useNetworkSync";
import { SyncStatusBadge } from "../../low-connectivity/components/SyncStatusBadge";
import { DiagnosticTags } from "../components/DiagnosticTags";

export const FrontlineHealthWorkerScreen: React.FC = () => {
  const [lang, setLang] = useState<Language>("hi");
  const t = getTranslation(lang);
  const { syncStatus, pendingCount, triggerSync } = useNetworkSync();

  // Form State
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [village, setVillage] = useState("");
  const [incidentCondition, setIncidentCondition] = useState("");

  // Vitals State
  const [pulse, setPulse] = useState("78");
  const [spo2, setSpo2] = useState("96");
  const [bp, setBp] = useState("120/80");
  const [consciousness, setConsciousness] = useState<ConsciousnessLevel>("ALERT");
  const [bleedingActive, setBleedingActive] = useState(false);
  const [fractureSuspected, setFractureSuspected] = useState(false);

  // Computed Vitals
  const currentVitals: FrontlineVitals = {
    pulseRateBpm: pulse ? parseInt(pulse, 10) : undefined,
    oxygenSpo2: spo2 ? parseInt(spo2, 10) : undefined,
    consciousness,
    bleedingActive,
    fractureSuspected,
  };

  const currentPriority = healthWorkerReferralService.evaluateTriagePriority(currentVitals);

  const handleSendReferral = async () => {
    if (!patientName.trim()) {
      Alert.alert("Required", lang === "hi" ? "कृपया रोगी का नाम दर्ज करें।" : "Please enter patient name.");
      return;
    }

    await healthWorkerReferralService.dispatchReferral({
      workerId: "asha-worker-delhi-04",
      patientName,
      patientAge: parseInt(patientAge || "30", 10),
      gender,
      villageOrLocality: village || "Rural Sector",
      incidentType: incidentCondition || "Emergency Triage",
      vitals: currentVitals,
    });

    Alert.alert(
      lang === "hi" ? "सफल" : "Referral Sent",
      lang === "hi"
        ? "रेफरल सफलतापूर्वक कतार में जोड़ दिया गया है।"
        : "Digital referral has been queued and transmitted."
    );

    // Reset Form
    setPatientName("");
    setPatientAge("");
    setIncidentCondition("");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header & Language Toggle */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{t.appTitle}</Text>
          <Text style={styles.subtitle}>{t.workerMode}</Text>
        </View>

        <View style={styles.langToggle}>
          <TouchableOpacity
            style={[styles.langBtn, lang === "en" && styles.langBtnActive]}
            onPress={() => setLang("en")}
          >
            <Text style={[styles.langText, lang === "en" && styles.langTextActive]}>EN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, lang === "hi" && styles.langBtnActive]}
            onPress={() => setLang("hi")}
          >
            <Text style={[styles.langText, lang === "hi" && styles.langTextActive]}>हिंदी</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sync Status Badge */}
      <SyncStatusBadge status={syncStatus} pendingCount={pendingCount} onRetry={() => triggerSync()} />

      {/* Patient Information */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>{t.quickPatientRegistration}</Text>

        <Text style={styles.inputLabel}>{t.patientName}</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Ramesh Kumar"
          value={patientName}
          onChangeText={setPatientName}
        />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.inputLabel}>{t.patientAge}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 42"
              keyboardType="numeric"
              value={patientAge}
              onChangeText={setPatientAge}
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.inputLabel}>{t.village}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rampur Sub-Center"
              value={village}
              onChangeText={setVillage}
            />
          </View>
        </View>

        <Text style={styles.inputLabel}>{t.incidentCondition}</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Road Accident / Severe Chest Pain"
          value={incidentCondition}
          onChangeText={setIncidentCondition}
        />
      </View>

      {/* On-Spot Vitals */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>{t.vitalsTitle}</Text>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.inputLabel}>{t.pulseRate}</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={pulse} onChangeText={setPulse} />
          </View>
          <View style={styles.half}>
            <Text style={styles.inputLabel}>{t.oxygenSpo2}</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={spo2} onChangeText={setSpo2} />
          </View>
        </View>

        <Text style={styles.inputLabel}>{t.consciousness}</Text>
        <View style={styles.consciousnessRow}>
          {(["ALERT", "VOICE_RESPONSIVE", "PAIN_RESPONSIVE", "UNRESPONSIVE"] as ConsciousnessLevel[]).map(
            (c) => (
              <TouchableOpacity
                key={c}
                style={[styles.consciousnessBtn, consciousness === c && styles.consciousnessBtnActive]}
                onPress={() => setConsciousness(c)}
              >
                <Text
                  style={[
                    styles.consciousnessText,
                    consciousness === c && styles.consciousnessTextActive,
                  ]}
                >
                  {c === "ALERT" ? t.alert : c === "VOICE_RESPONSIVE" ? t.voice : c === "PAIN_RESPONSIVE" ? t.pain : t.unresponsive}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Toggles */}
        <TouchableOpacity
          style={[styles.checkboxRow, bleedingActive && styles.checkboxRowActive]}
          onPress={() => setBleedingActive(!bleedingActive)}
        >
          <Text style={styles.checkboxIcon}>{bleedingActive ? "☑" : "☐"}</Text>
          <Text style={styles.checkboxLabel}>{t.activeBleeding}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.checkboxRow, fractureSuspected && styles.checkboxRowActive]}
          onPress={() => setFractureSuspected(!fractureSuspected)}
        >
          <Text style={styles.checkboxIcon}>{fractureSuspected ? "☑" : "☐"}</Text>
          <Text style={styles.checkboxLabel}>{t.suspectedFracture}</Text>
        </TouchableOpacity>
      </View>

      {/* AI Triage Recommendation Preview */}
      <View style={[styles.card, styles.triageCard]}>
        <Text style={styles.cardHeader}>{t.triageAssessment}</Text>
        <View
          style={[
            styles.priorityBadge,
            {
              backgroundColor:
                currentPriority === "CRITICAL"
                  ? "#DC2626"
                  : currentPriority === "HIGH"
                  ? "#EA580C"
                  : "#CA8A04",
            },
          ]}
        >
          <Text style={styles.priorityBadgeText}>
            {currentPriority === "CRITICAL"
              ? t.criticalPriority
              : currentPriority === "HIGH"
              ? t.highPriority
              : t.moderatePriority}
          </Text>
        </View>

        <Text style={styles.diagTitle}>{t.diagnosticAvailability}:</Text>
        <DiagnosticTags diagnostics={["CT 128 Slice", "Digital X-Ray", "Blood Bank", "ICU Ventilator"]} />
      </View>

      {/* Referral Button */}
      <TouchableOpacity style={styles.referralBtn} onPress={handleSendReferral}>
        <Text style={styles.referralBtnText}>{t.sendReferral}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  langToggle: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 8,
    padding: 2,
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  langBtnActive: {
    backgroundColor: "#DC2626",
  },
  langText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  langTextActive: {
    color: "#FFFFFF",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#0F172A",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  half: {
    flex: 1,
  },
  consciousnessRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  consciousnessBtn: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  consciousnessBtnActive: {
    backgroundColor: "#0284C7",
    borderColor: "#0284C7",
  },
  consciousnessText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  consciousnessTextActive: {
    color: "#FFFFFF",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  checkboxRowActive: {
    opacity: 1,
  },
  checkboxIcon: {
    fontSize: 16,
    marginRight: 8,
    color: "#DC2626",
  },
  checkboxLabel: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
  },
  triageCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  priorityBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  priorityBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  diagTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginTop: 4,
  },
  referralBtn: {
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
    elevation: 3,
  },
  referralBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
