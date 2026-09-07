import { EmergencyInput } from "../../types/ai";

export interface MockEmergencyCase {
  id: string;
  name: string;
  input: EmergencyInput;
  expectedSeverity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export const mockCases: MockEmergencyCase[] = [
  {
    id: "CASE001",
    name: "Severe bleeding",
    input: { symptoms: ["heavy bleeding"], bleeding: { present: true, severity: "severe" }, consciousness: "conscious" },
    expectedSeverity: "CRITICAL",
  },
  {
    id: "CASE002",
    name: "Breathing difficulty",
    input: { symptoms: ["difficulty breathing", "chest discomfort"], consciousness: "conscious" },
    expectedSeverity: "HIGH",
  },
  {
    id: "CASE003",
    name: "Unconscious patient",
    input: { symptoms: [], consciousness: "unconscious" },
    expectedSeverity: "CRITICAL",
  },
  {
    id: "CASE004",
    name: "Chest pain",
    input: { symptoms: ["chest pain"], consciousness: "conscious" },
    expectedSeverity: "HIGH",
  },
  {
    id: "CASE005",
    name: "Stroke-like symptoms",
    input: { symptoms: ["face droop", "slurred speech"], consciousness: "conscious" },
    expectedSeverity: "CRITICAL",
  },
  {
    id: "CASE006",
    name: "Severe burn",
    input: { symptoms: ["severe burn"], injury: { present: true, type: "burn" } },
    expectedSeverity: "HIGH",
  },
  {
    id: "CASE007",
    name: "Possible fracture",
    input: { symptoms: ["leg pain"], injury: { present: true, type: "fracture" } },
    expectedSeverity: "HIGH",
  },
  {
    id: "CASE008",
    name: "Head injury",
    input: { symptoms: ["head injury", "vomiting"], injury: { present: true, type: "head injury" } },
    expectedSeverity: "HIGH",
  },
  {
    id: "CASE009",
    name: "Severe allergic reaction",
    input: { symptoms: ["throat swelling", "severe allergic reaction"] },
    expectedSeverity: "CRITICAL",
  },
  {
    id: "CASE010",
    name: "Seizure",
    input: { symptoms: ["seizure"], consciousness: "confused" },
    expectedSeverity: "HIGH",
  },
  {
    id: "CASE011",
    name: "Possible poisoning",
    input: { symptoms: ["possible poisoning", "nausea"] },
    expectedSeverity: "MEDIUM",
  },
  {
    id: "CASE012",
    name: "Minor injury",
    input: { symptoms: ["minor scratch"], consciousness: "conscious" },
    expectedSeverity: "LOW",
  },
  {
    id: "CASE013",
    name: "Stable patient",
    input: { symptoms: ["mild headache"], consciousness: "conscious" },
    expectedSeverity: "MEDIUM",
  },
];
