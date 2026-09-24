import {
  AI_DISCLAIMER,
  EmergencyInput,
  TriageResult,
  VoiceTriageInput,
  VoiceTriageResult,
  Severity,
} from "../../types/ai";
import { buildTriagePrompt } from "./aiPrompt";
import { getAiConfig } from "./aiConfig";
import { parseTriageResponse } from "./aiParser";
import { requestGemini } from "./geminiProvider";
import {
  applySafetyRules,
  evaluateSafetyRules,
  maxSeverity,
} from "./emergencyRules";
import { validateEmergencyInput } from "./aiValidator";

function heuristicResult(input: EmergencyInput, source: "mock" | "fallback"): TriageResult {
  const text = [
    ...input.symptoms,
    input.injury?.type,
    input.injury?.description,
    input.breathing,
    input.consciousness,
    input.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let severity: TriageResult["severity"] = "MEDIUM";
  let emergencyType = "Unspecified medical concern";
  let requiredCapabilities: string[] = ["EMERGENCY_ROOM", "TRAUMA_BAY"];
  let specialtyNeeded = "GENERAL";
  let recommendedHospitalType = "Emergency Care Facility";

  let immediateActions: string[] = [
    "Keep the patient comfortable, calm, and monitor vitals closely.",
    "Stand by for incoming ambulance paramedic assessment.",
  ];
  let avoidActions: string[] = [
    "Do not give food, water, or oral medication unless directed by emergency physicians.",
    "Do not move the patient unnecessarily if spinal or head injury is suspected.",
  ];

  if (!text.trim() || text.length < 3) {
    // Fail-safe golden rule: Blank SOS or panic tap must default to CRITICAL resuscitation capability
    severity = "CRITICAL";
    emergencyType = "Emergency Rapid SOS (Unspecified Trauma/Medical)";
    requiredCapabilities = ["EMERGENCY_ROOM", "TRAUMA_BAY", "ICU_STANDBY"];
    specialtyNeeded = "GENERAL";
    recommendedHospitalType = "Level-1 Multi-Specialty ER Trauma Center";
    immediateActions = [
      "Ensure patient is in a safe location away from oncoming traffic or hazards.",
      "Check responsiveness and breathing; keep airways open.",
      "Stand by as priority emergency dispatch and hospital alert are activated.",
    ];
  } else if (/\b(minor|small|superficial|scratch|bruise|chhoti chot)\b/.test(text)) {
    severity = "LOW";
    emergencyType = "Minor injury or symptoms";
    requiredCapabilities = ["OUTPATIENT_CLINIC", "FIRST_AID"];
    specialtyNeeded = "GENERAL";
    recommendedHospitalType = "Primary Healthcare Center / Outpatient Clinic";
    immediateActions = [
      "Cleanse area gently with mild soap and clean drinking water.",
      "Apply clean sterile adhesive dressing to prevent bacterial contamination.",
      "Rest and elevate the injured area if mild swelling is present.",
    ];
    avoidActions = [
      "Do not scratch, rub, or pick at injured skin.",
      "Do not apply unverified home concoctions, toothpaste, or unsterile powders.",
    ];
  } else if (/\b(dog bite|animal bite|kutta|kutte|snake bite|saanp|cat bite|rabies|bite)\b/.test(text)) {
    severity = "MEDIUM";
    emergencyType = "Animal Bite / Potential Rabies Exposure";
    requiredCapabilities = ["EMERGENCY_ROOM", "WOUND_CARE", "RABIES_VACCINE"];
    specialtyNeeded = "GENERAL";
    recommendedHospitalType = "Emergency Care Center / Anti-Rabies Clinic";
    immediateActions = [
      "Wash the bite wound vigorously under running water with soap for at least 15 minutes immediately.",
      "Apply antiseptic solution (Povidone-iodine / Betadine) and leave wound loosely covered with clean cloth.",
      "Proceed immediately to nearest ER for Rabies Post-Exposure Prophylaxis (PEP) vaccine and Immunoglobulin (RIG).",
    ];
    avoidActions = [
      "Do NOT apply chili powder, lime, plant juices, ash, or turmeric to the animal bite wound.",
      "Do NOT cauterize, cut, suck, or tightly suture the bite wound.",
      "Do NOT delay or skip the anti-rabies vaccination schedule.",
    ];
  } else if (
    /\b(chest pain|difficulty breathing|shortness of breath|seene me dard|chhaati me dard|heart|saans|cardiac)\b/.test(text)
  ) {
    severity = "CRITICAL";
    emergencyType = "Acute Cardiac / Respiratory Distress";
    requiredCapabilities = ["ICU", "CATH_LAB", "CARDIAC_TEAM"];
    specialtyNeeded = "CARDIOLOGY";
    recommendedHospitalType = "Tertiary Cardiac & Emergency Hospital";
    immediateActions = [
      "Seat patient upright in a comfortable position (W-position) to reduce cardiac workload and ease breathing.",
      "Loosen tight clothing around neck, chest, and waist.",
      "If prescribed and conscious, chew 300mg Aspirin or take Sorbitrate under tongue as advised by doctor.",
      "Keep patient calm, resting, and completely still while cardiac ambulance is en route.",
    ];
    avoidActions = [
      "Do NOT allow patient to walk, climb stairs, or exert themselves physically.",
      "Do NOT offer food, heavy water, or hot stimulants.",
      "Do NOT leave patient alone or unmonitored.",
    ];
  } else if (
    /\b(fracture|head injury|burn|accident|khoon|bleeding|haddi|behoshi|unconscious|paralysis|stroke)\b/.test(text)
  ) {
    severity = "HIGH";
    emergencyType = "Acute Physical Trauma / Neurological Incident";
    requiredCapabilities = ["TRAUMA_BAY", "ORTHOPEDIC", "BLOOD_BANK", "ICU"];
    specialtyNeeded = "TRAUMA_ORTHO";
    recommendedHospitalType = "Level-1 Multi-Specialty Trauma Center";
    immediateActions = [
      "Apply direct, continuous pressure to bleeding wounds using clean cloth or sterile gauze.",
      "Support and immobilize injured limbs in position found—do NOT attempt realignment.",
      "Keep patient warm with a jacket or blanket to prevent traumatic shock.",
      "Ensure clear airway; if vomiting, gently roll patient as a unit into recovery position.",
    ];
    avoidActions = [
      "Do NOT move patient's neck, head, or spine unless in immediate fire or structural danger.",
      "Do NOT remove deeply impaled or embedded objects from puncture wounds.",
      "Do NOT offer fluids or food (may complicate emergency surgery).",
    ];
  }

  const rule = evaluateSafetyRules(input);
  if (rule) {
    severity = maxSeverity(severity, rule.severity);
    emergencyType = rule.emergencyType;
  }

  return {
    severity,
    emergencyType,
    confidence: source === "mock" ? 0.72 : 0.35,
    requiredCapabilities,
    specialtyNeeded,
    recommendedHospitalType,
    immediateActions: rule?.immediateActions || immediateActions,
    avoidActions: rule?.avoidActions || avoidActions,
    hospitalRequired: severity !== "LOW",
    ambulanceRecommended: severity === "CRITICAL" || severity === "HIGH",
    explanation:
      source === "mock"
        ? "Deterministic clinical protocol applied based on emergency criteria."
        : "Conservative clinical safety protocol applied while live telemetry was streaming.",
    disclaimer: AI_DISCLAIMER,
    source,
  };
}

export async function analyzeEmergency(input: unknown): Promise<TriageResult> {
  const validated = validateEmergencyInput(input);
  const config = getAiConfig();
  let result: TriageResult;

  if (config.mode === "mock") {
    result = heuristicResult(validated, "mock");
  } else {
    try {
      const imagePart = validated.imageBase64
        ? {
            mimeType: validated.imageMimeType || "image/jpeg",
            data: validated.imageBase64.replace(/^data:[^;]+;base64,/, ""),
          }
        : undefined;

      result = parseTriageResponse(
        await requestGemini(buildTriagePrompt(validated), imagePart),
      );
    } catch (err: any) {
      console.error("[analyzeEmergency] Gemini call failed:", err?.message || err);
      result = heuristicResult(validated, "fallback");
    }
  }
  return applySafetyRules(result, validated);
}

/**
 * Analyzes spoken voice input across English, Hindi, and Marathi.
 * Extracts chief complaints, calculates clinical severity, recommends ALS/BLS,
 * and provides localized immediate first-aid instructions.
 */
export async function analyzeVoiceEmergency(rawInput: unknown): Promise<VoiceTriageResult> {
  const body = (rawInput && typeof rawInput === "object" ? rawInput : {}) as Partial<VoiceTriageInput>;
  const rawTranscript = typeof body.transcript === "string" ? body.transcript.trim() : "";
  const lang = (body.language || "en").toLowerCase();

  const lower = rawTranscript.toLowerCase();
  const detectedSymptoms: string[] = [];

  let severity: Severity = "HIGH";
  let emergencyType = "Emergency Incident Reported via Voice";
  let recommendedAmbulance: "ALS" | "BLS" = "BLS";
  let firstAidSteps: string[] = [];
  let avoidActions: string[] = [];
  let summary = "";

  // 1. Critical Cardiac / Respiratory Pattern
  const isCardiacOrResp =
    /(chest pain|heart attack|difficulty breathing|shortness of breath|cardiac|chhaati|seene me dard|saans|सीने में दर्द|दिल का दौरा|सांस लेने में|छातीत दुखणे|छातीत कळ|हृदयविकार|श्वास)/i.test(
      lower
    );

  // 2. Severe Trauma / Fracture / Bleeding / Neurological Pattern
  const isTraumaOrNeuro =
    /(accident|fracture|head injury|bleeding|blood loss|unconscious|fainted|paralysis|stroke|khoon|haddi|behoshi|chot|चोट|खून|एक्सीडेंट|हड्डी|बेहोश|अपघात|रक्त|हाड मोडले|बेशुद्ध)/i.test(
      lower
    );

  // 3. Animal / Snake Bite Pattern
  const isAnimalBite =
    /(dog bite|snake bite|animal bite|rabies|kutta|saanp|काटा|सांप|कुत्ता|चावला|साप)/i.test(lower);

  // 4. Minor Injury Pattern
  const isMinor =
    /(minor|small cut|scratch|chhoti chot|mamooli|मामूली|हल्की चोट|किरकोळ)/i.test(lower);

  if (!rawTranscript || rawTranscript.length < 3) {
    // Fail-safe default
    severity = "CRITICAL";
    emergencyType = "Rapid SOS Alert (Voice Initiated)";
    recommendedAmbulance = "ALS";
    detectedSymptoms.push("Emergency Voice SOS Triggered");
    firstAidSteps = [
      "Stay calm and keep the phone near you.",
      "Emergency ambulance dispatch has been prioritized.",
      "Do not exert yourself; sit in a safe position.",
    ];
    avoidActions = ["Do not hang up or leave the incident area."];
    summary = "High-priority emergency call received. Paramedic dispatch initiated.";
  } else if (isCardiacOrResp) {
    severity = "CRITICAL";
    emergencyType = "Suspected Acute Cardiac / Respiratory Crisis";
    recommendedAmbulance = "ALS";
    detectedSymptoms.push("Chest pain / Respiratory distress");

    if (lang === "mr") {
      firstAidSteps = [
        "रुग्णाला तात्काळ विश्रांतीच्या स्थितीत (बसून किंवा झुकून) ठेवा.",
        "घट्ट कपडे सैल करा आणि मोकळी हवा मिळू द्या.",
        "अ‍ॅम्ब्युलन्स येईपर्यंत रुग्णाला चालवू किंवा हलवू नका.",
      ];
      avoidActions = ["पाणी किंवा कोणतेही अन्न देऊ नका.", "रुग्णाला एकटे सोडू नका."];
      summary = "तातडीची वैद्यकीय मदत आवश्यक: संभाव्य हृदय किंवा श्वास विकार. ALS अ‍ॅम्ब्युलन्स शिफारस.";
    } else if (lang === "hi") {
      firstAidSteps = [
        "रोगी को तुरंत आराम से बैठाएं या आधा लेटाएं।",
        "तंग कपड़े ढीले करें और ताज़ी हवा आने दें।",
        "एम्बुलेंस आने तक मरीज़ को चलने न दें।",
      ];
      avoidActions = ["मरीज़ को पानी या खाना न दें।", "अकेला न छोड़ें।"];
      summary = "अति-गंभीर स्थिति: छाती में दर्द / सांस की तकलीफ। ALS एम्बुलेंस अनुशंसित।";
    } else {
      firstAidSteps = [
        "Keep patient comfortably seated or semi-reclined.",
        "Loosen tight clothing and ensure open airflow.",
        "Chew 300mg Aspirin if advised by doctor and not allergic.",
      ];
      avoidActions = ["Do not give food or liquids.", "Do not allow patient to walk or exert."];
      summary = "Critical condition: Acute cardiac or respiratory distress. ALS ambulance recommended.";
    }
  } else if (isTraumaOrNeuro) {
    severity = "HIGH";
    emergencyType = "Acute Physical Trauma / Neurological Emergency";
    recommendedAmbulance = "ALS";
    detectedSymptoms.push("Physical trauma / Bleeding / Consciousness impairment");

    if (lang === "mr") {
      firstAidSteps = [
        "रक्तस्त्राव होत असल्यास स्वच्छ कापडाने थेट दाब द्या.",
        "मानेला किंवा पाठीला दुखापत असल्यास रुग्णाला हलवू नका.",
        "रुग्ण बेशुद्ध असल्यास त्याला एका कुशीवर (रिकव्हरी पोझिशन) ठेवा.",
      ];
      avoidActions = ["जखम धुण्याचा प्रयत्न करू नका जर रक्त जास्त येत असेल.", "हाड सरकवण्याचा प्रयत्न करू नका."];
      summary = "गंभीर दुखापत / रक्तस्त्राव नोंदवला गेला. तातडीची अ‍ॅम्ब्युलन्स मदत पाठवत आहोत.";
    } else if (lang === "hi") {
      firstAidSteps = [
        "खून बह रहा हो तो साफ कपड़े से घाव पर सीधा दबाव बनाएं।",
        "सिर या गर्दन की चोट होने पर मरीज़ को बिल्कुल न हिलाएं।",
        "यदि मरीज़ बेहोश है, तो उसे करवट से (रिकवरी पोज़िशन) में रखें।",
      ];
      avoidActions = ["घाव से कोई फंसी हुई चीज़ खुद न निकालें।", "मरीज़ को उठने के लिए मजबूर न करें।"];
      summary = "गंभीर शारीरिक चोट या रक्तस्राव। तत्काल आपातकालीन दल डिस्पैच किया जा रहा है।";
    } else {
      firstAidSteps = [
        "Apply direct firm pressure on bleeding wounds using a clean cloth.",
        "Do not move the neck or spine if spinal trauma is suspected.",
        "Place an unconscious breathing patient in the recovery position (on their side).",
      ];
      avoidActions = ["Do not remove embedded objects from deep wounds.", "Do not bend or force fractured limbs."];
      summary = "High severity: Physical trauma or bleeding. Urgent dispatch recommended.";
    }
  } else if (isAnimalBite) {
    severity = "MEDIUM";
    emergencyType = "Animal Bite / Potential Rabies Exposure";
    recommendedAmbulance = "BLS";
    detectedSymptoms.push("Animal / Snake bite puncture");

    if (lang === "mr") {
      firstAidSteps = [
        "जखम ताबडतोब वाहत्या पाण्याखाली साबणाने १०-१५ मिनिटे स्वच्छ धुवा.",
        "स्वच्छ पट्टी बांधा आणि तात्काळ अँटी-रेबीज इंजेक्शनसाठी रुग्णालयात जा.",
      ];
      avoidActions = ["साप चावला असल्यास जखमेवर चीर मारू नका किंवा तोंड लावून विष चोखू नका."];
      summary = "प्राणी चावल्याची घटना. प्राथमिक स्वच्छता करून तात्काळ रुग्णालयात संपर्क करा.";
    } else if (lang === "hi") {
      firstAidSteps = [
        "घाव को बहते पानी और साबुन से 10-15 मिनट तक अच्छी तरह धोएं।",
        "घाव पर साफ पट्टी लगाएं और तुरंत एंटी-रेबीज टीके के लिए अस्पताल जाएं।",
      ];
      avoidActions = ["सांप काटने पर चीरा न लगाएं और जहर चूसने की कोशिश न करें।"];
      summary = "जानवर या कीड़े के काटने का मामला। प्राथमिक उपचार के बाद तुरंत डॉक्टर से मिलें।";
    } else {
      firstAidSteps = [
        "Wash the wound thoroughly with soap and running water for 10-15 minutes.",
        "Cover with a sterile dressing and seek immediate anti-rabies vaccination.",
      ];
      avoidActions = ["Never apply a tight tourniquet or cut into a snake bite wound."];
      summary = "Moderate severity: Animal or snake bite. Prompt clinical care required.";
    }
  } else if (isMinor) {
    severity = "LOW";
    emergencyType = "Minor Injury or Discomfort";
    recommendedAmbulance = "BLS";
    detectedSymptoms.push("Minor cut or superficial discomfort");

    if (lang === "mr") {
      firstAidSteps = [
        "जखम स्वच्छ पाण्याने धुवा आणि जंतुनाशक मलम लावा.",
        "स्वच्छ बँडेज बांधा. आवश्यकता वाटल्यास जवळच्या क्लिनिकला भेट द्या.",
      ];
      avoidActions = ["अस्वच्छ हातांनी जखमेला स्पर्श करू नका."];
      summary = "किरकोळ दुखापत. प्राथमिक उपचार पुरेसे आहेत.";
    } else if (lang === "hi") {
      firstAidSteps = [
        "घाव को साफ पानी से धोएं और एंटीसेप्टिक क्रीम लगाएं।",
        "साफ पट्टी लगाएं। जरूरत महसूस होने पर नज़दीकी क्लिनिक जाएं।",
      ];
      avoidActions = ["गंदे हाथों से घाव को न छुएं।"];
      summary = "सामान्य चोट। प्राथमिक उपचार के बाद निगरानी रखें।";
    } else {
      firstAidSteps = [
        "Clean wound with clean water and apply an antiseptic ointment.",
        "Cover with a clean adhesive bandage and observe for signs of infection.",
      ];
      avoidActions = ["Do not touch the wound with unwashed hands."];
      summary = "Low severity: Minor injury suitable for outpatient or self-care.";
    }
  }

  // Attempt Gemini enhancement if available
  const config = getAiConfig();
  let source: "mock" | "gemini" | "fallback" = config.mode === "mock" ? "mock" : "fallback";

  if (config.mode !== "mock" && rawTranscript.length > 5) {
    try {
      const prompt = `You are an emergency voice triage AI for Golden Hour.
User spoke in ${lang}: "${rawTranscript}".
Respond with JSON only:
{
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "emergencyType": string,
  "confidence": number between 0 and 1,
  "detectedSymptoms": string[],
  "recommendedAmbulance": "ALS" | "BLS",
  "firstAidSteps": string[],
  "avoidActions": string[],
  "summary": string
}`;
      const geminiRes = await requestGemini(prompt);
      const cleaned = geminiRes.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.severity && parsed.firstAidSteps) {
        severity = parsed.severity;
        emergencyType = parsed.emergencyType || emergencyType;
        recommendedAmbulance = parsed.recommendedAmbulance || recommendedAmbulance;
        firstAidSteps = Array.isArray(parsed.firstAidSteps) ? parsed.firstAidSteps : firstAidSteps;
        avoidActions = Array.isArray(parsed.avoidActions) ? parsed.avoidActions : avoidActions;
        summary = parsed.summary || summary;
        source = "gemini";
      }
    } catch (_err) {
      // Fallback cleanly
      source = "fallback";
    }
  }

  return {
    severity,
    emergencyType,
    confidence: source === "gemini" ? 0.92 : 0.82,
    detectedSymptoms: detectedSymptoms.length > 0 ? detectedSymptoms : [rawTranscript.slice(0, 40)],
    recommendedAmbulance,
    firstAidSteps,
    avoidActions,
    transcriptProcessed: rawTranscript,
    language: lang,
    summary,
    disclaimer: AI_DISCLAIMER,
    source,
  };
}
