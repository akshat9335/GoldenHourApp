import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Image,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas
from PIL import Image as PILImage

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages):
        self.saveState()
        # Top Header line
        if self._pageNumber > 1:
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.75)
            self.line(36, 806, 559, 806)

            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#E11D48"))
            self.drawString(36, 812, "GOLDEN HOUR (PROJECT 911)")

            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawRightString(559, 812, "Official Comprehensive User Manual")

        # Bottom Footer line
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.75)
        self.line(36, 38, 559, 38)

        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(36, 26, "Confidential — Live App Evaluation & Operations Manual")
        page_text = f"Page {self._pageNumber} of {total_pages}"
        self.drawRightString(559, 26, page_text)
        self.restoreState()


def get_fitted_image(img_path, target_width_inch=2.35, max_height_inch=4.7):
    """Safely return a scaled reportlab Image that preserves aspect ratio."""
    if not os.path.exists(img_path):
        return None
    try:
        im = PILImage.open(img_path)
        w, h = im.size
        aspect = h / float(w)
        target_w = target_width_inch * inch
        target_h = target_w * aspect
        if target_h > max_height_inch * inch:
            target_h = max_height_inch * inch
            target_w = target_h / aspect
        return Image(img_path, width=target_w, height=target_h)
    except Exception as e:
        print(f"Error loading image {img_path}: {e}")
        return None


def create_user_manual_pdf(filename="Golden_Hour_Complete_User_Manual.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=46,
        bottomMargin=46,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "CoverTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=23,
        leading=27,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=4,
    )

    subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11.5,
        leading=15,
        textColor=colors.HexColor("#E11D48"),
        spaceAfter=8,
    )

    h1_style = ParagraphStyle(
        "H1",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        "H2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#0284C7"),
        spaceBefore=6,
        spaceAfter=3,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1E293B"),
        spaceAfter=5,
    )

    bullet_style = ParagraphStyle(
        "Bullet",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.8,
        leading=12.5,
        textColor=colors.HexColor("#334155"),
        leftIndent=10,
        spaceAfter=3.5,
    )

    table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#1E293B"),
    )

    table_header = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.white,
    )

    story = []

    # ==================== PAGE 1: TITLE & INSTALLATION ====================
    badge_html = "<font color='#E11D48'><b>EMERGENCY MEDICAL RESPONSE PLATFORM</b></font> | VERSION 1.0 (PRODUCTION APK BUILD)"
    story.append(Paragraph(badge_html, ParagraphStyle("Badge", fontName="Helvetica-Bold", fontSize=8.5, textColor=colors.HexColor("#E11D48"))))
    story.append(Spacer(1, 3))
    story.append(Paragraph("🚑 Golden Hour (Project 911)", title_style))
    story.append(Paragraph("Official Comprehensive User Manual & Operations Guide", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#E11D48"), spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "<b>Golden Hour</b> is a mission-critical Emergency Medical Response & Interoperability platform "
        "engineered around the vital first 60 minutes after trauma or acute onset. It synchronizes Citizens, "
        "Ambulance Pilots, Hospital Emergency Rooms, OPD Clinics, and Rural ASHA Sanginis in real time.",
        body_style
    ))
    story.append(Spacer(1, 4))

    story.append(Paragraph("1. Direct APK Download & Installation", h1_style))
    story.append(Paragraph(
        "The application is distributed as a standalone <b>Android APK (.apk)</b>. "
        "No development environment or command-line setup is required for evaluation.",
        body_style
    ))
    story.append(Paragraph("• <b>Step 1 — Download:</b> Tap the provided APK download link or scan the distribution QR code.", bullet_style))
    story.append(Paragraph("• <b>Step 2 — Install:</b> Open the downloaded APK on your Android device. If prompted, allow <i>'Install unknown apps'</i> in Android Settings.", bullet_style))
    story.append(Paragraph("• <b>Step 3 — Permissions:</b> On first launch, grant <i>'Precise Location (While using the app)'</i> to enable emergency proximity matching and live ambulance routing.", bullet_style))
    story.append(Spacer(1, 6))

    story.append(Paragraph("2. Quick Demo Credentials & Global Navigation", h1_style))
    story.append(Paragraph(
        "For seamless evaluator testing without entering passwords or OTPs, "
        "each login screen features an instant <b>1-Tap Quick Demo Button</b>:",
        body_style
    ))

    demo_data = [
        [Paragraph("Role", table_header), Paragraph("Route", table_header), Paragraph("1-Tap Demo Button", table_header), Paragraph("Pre-configured Identity", table_header)],
        [Paragraph("<b>Citizen / Patient</b>", table_cell), Paragraph("/login", table_cell), Paragraph("Explore as Demo Patient", table_cell), Paragraph("<b>Rahul Patel</b> (+91 98765 43210, O+)", table_cell)],
        [Paragraph("<b>Ambulance Pilot</b>", table_cell), Paragraph("/driver-login", table_cell), Paragraph("Quick Demo Pilot", table_cell), Paragraph("<b>Pilot Ramesh Kumar</b> (UP-70-AMB-108)", table_cell)],
        [Paragraph("<b>Hospital ER Desk</b>", table_cell), Paragraph("/hospital-login", table_cell), Paragraph("Quick Demo Hospital", table_cell), Paragraph("<b>Apollo Multi-Specialty</b> / SRN Trauma", table_cell)],
        [Paragraph("<b>OPD Doctor</b>", table_cell), Paragraph("/doctor-login", table_cell), Paragraph("Quick Demo Doctor", table_cell), Paragraph("<b>Dr. Ananya Sharma</b> (OPD Clinic)", table_cell)],
        [Paragraph("<b>ASHA Worker</b>", table_cell), Paragraph("/asha-login", table_cell), Paragraph("Quick Demo ASHA", table_cell), Paragraph("<b>Sunita Verma</b> (ASHA Sangini Rural)", table_cell)],
    ]
    t_demo = Table(demo_data, colWidths=[105, 75, 145, 198])
    t_demo.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F172A")),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor("#F8FAFC"), colors.white]),
    ]))
    story.append(t_demo)
    story.append(Spacer(1, 6))

    # Show Role Selection screenshot and Language Selector
    img_role = get_fitted_image("screenshots/Screenshot_20261002-134149.png", target_width_inch=2.3, max_height_inch=3.7)
    img_lang = get_fitted_image("screenshots/Screenshot_20261002-134202.png", target_width_inch=2.3, max_height_inch=3.7)

    if img_role and img_lang:
        t_dual = Table([[
            img_role,
            [
                Paragraph("<b>Role Selection & Navigation:</b>", h2_style),
                Paragraph("• <b>Entry Portal:</b> Choose between Patient, Hospital Staff, Ambulance Crew, Doctor, ASHA Worker, or Admin.", bullet_style),
                Paragraph("• <b>Trilingual Selector:</b> Tap Globe icon (top-right) to toggle between <b>English</b>, <b>हिंदी (Hindi)</b>, and <b>मराठी (Marathi)</b> in real time.", bullet_style),
                Paragraph("• <b>1-Tap Role Switch:</b> Tap <i>‹ Back / Switch Role</i> on the top-left of any dashboard to instantly change user roles during live evaluation.", bullet_style),
                Spacer(1, 8),
                img_lang
            ]
        ]], colWidths=[2.5*inch, 4.7*inch])
        t_dual.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(t_dual)

    # ==================== PAGE 2: PATIENT ROLE & SOS ====================
    story.append(PageBreak())
    story.append(Paragraph("3. Role 1: Citizen / Patient Emergency Console", h1_style))
    story.append(Paragraph(
        "Designed for rapid distress reporting with One-Tap SOS, Multimodal Gemini AI Triage, and live tracking.",
        body_style
    ))

    img_pat_home = get_fitted_image("screenshots/Screenshot_20261002-134210.png", target_width_inch=2.35, max_height_inch=4.8)
    pat_desc = [
        Paragraph("<b>Core Features & Operational Flow:</b>", h2_style),
        Paragraph("<b>1. One-Tap SOS:</b> Prominent red button triggers automated dispatch. A 3-second safety window prevents accidental dispatches.", bullet_style),
        Paragraph("<b>2. Voice AI SOS:</b> Tap the microphone to dictate emergency symptoms (e.g., <i>'Severe crushing chest pain radiating to left arm'</i>). A clinical validation layer distinguishes casual inquiries from acute trauma, ensuring only genuine crises dispatch ambulances.", bullet_style),
        Paragraph("<b>3. False Alarm Cancellation:</b> Tap <i>'Cancel Emergency'</i> to safely recall dispatched units with zero penalty if triggered by accident.", bullet_style),
        Paragraph("<b>4. Live Telemetry & GPS Tracking:</b> Real-time ambulance movement on Google Maps, pilot phone, vehicle number, and dynamic ETA.", bullet_style),
        Paragraph("<b>5. Past Appointments Accordion:</b> Prior doctor consultations and electronic prescriptions are organized in an accordion to keep the dashboard uncluttered.", bullet_style),
        Paragraph("<b>6. Medical Profile & ICE Contacts:</b> Pre-configured Blood Group, allergies, and chronic illnesses transmit automatically with the distress signal.", bullet_style),
    ]

    t_p1 = Table([[img_pat_home, pat_desc]], colWidths=[2.5*inch, 4.7*inch])
    t_p1.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    story.append(t_p1)
    story.append(Spacer(1, 10))

    # Multimodal AI Triage & Hospital Ranking
    story.append(Paragraph("Multimodal Gemini Clinical AI Triage & ER Proximity Matching:", h2_style))
    img_ai1 = get_fitted_image("screenshots/Screenshot_20261002-134648.png", target_width_inch=2.3, max_height_inch=3.6)
    img_ai2 = get_fitted_image("screenshots/Screenshot_20261002-134700.png", target_width_inch=2.3, max_height_inch=3.6)

    if img_ai1 and img_ai2:
        t_ai = Table([[
            img_ai1,
            [
                Paragraph("<b>Multimodal AI Clinical Analysis:</b>", ParagraphStyle("SubH", fontName="Helvetica-Bold", fontSize=9.5, textColor=colors.HexColor("#0284C7"))),
                Paragraph("• <b>Visual Scene Verification:</b> Evaluates captured trauma photos (wound depth, active bleeding).", bullet_style),
                Paragraph("• <b>Immediate First-Aid:</b> Generates step-by-step emergency stabilization instructions.", bullet_style),
                Paragraph("• <b>Live ER Matching:</b> Ranks top 3 nearby trauma centers (e.g., <i>Jeevan Hospital</i>, <i>Medanta</i>) by general beds, ICU beds, and traffic ETA.", bullet_style),
                Spacer(1, 6),
                img_ai2
            ]
        ]], colWidths=[2.5*inch, 4.7*inch])
        t_ai.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
        story.append(t_ai)

    # ==================== PAGE 3: AMBULANCE DRIVER ====================
    story.append(PageBreak())
    story.append(Paragraph("4. Role 2: Ambulance Pilot / Driver Console", h1_style))
    story.append(Paragraph(
        "Empowers paramedics with audio dispatch alerts, on-scene arrival verification, and false-alarm protection.",
        body_style
    ))

    img_drv = get_fitted_image("screenshots/Screenshot_20261002-135118.png", target_width_inch=2.35, max_height_inch=4.8)
    drv_desc = [
        Paragraph("<b>Paramedic Mission Lifecycle:</b>", h2_style),
        Paragraph("<b>1. Duty State:</b> Toggle between <b>ON DUTY</b> and <b>OFF DUTY</b>. The green badge confirms discoverability by the dispatch engine.", bullet_style),
        Paragraph("<b>2. Emergency Acceptance:</b> High-priority dispatch cards present patient severity, distance, and ETA. Tap <b>'Accept Emergency'</b>.", bullet_style),
        Paragraph("<b>3. Arrival at Patient Location:</b> Upon pulling up to the scene, tap <b>'Marked at Patient Location'</b>. This notifies both patient and ER desk that first responders are on site.", bullet_style),
        Paragraph("<b>4. False Request Protection ('Patient Not Found'):</b> If the patient is absent or the call was fake, tap <i>'Patient Not Found / False Request'</i>. The mission closes safely with status <code>FALSE_ALARM</code> without penalizing the driver.", bullet_style),
        Paragraph("<b>5. Patient Onboard & Hospital Transfer:</b> Once stabilized inside the ambulance, tap <i>'Patient Onboard ➔ En Route to Hospital'</i>.", bullet_style),
        Paragraph("<b>6. Trauma Bay Handover:</b> At the ER entrance, tap <i>'Complete Handover & Trip'</i> to transition clinical custody.", bullet_style),
    ]

    t_d1 = Table([[img_drv, drv_desc]], colWidths=[2.5*inch, 4.7*inch])
    t_d1.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    story.append(t_d1)
    story.append(Spacer(1, 10))

    # GPS Navigation Screenshot
    img_nav = get_fitted_image("screenshots/Screenshot_20261002-142348.png", target_width_inch=2.3, max_height_inch=3.6)
    if img_nav:
        t_nav = Table([[
            img_nav,
            [
                Paragraph("<b>Emergency GPS Navigation & Hospital Coordination:</b>", h2_style),
                Paragraph("• Calibrates dynamic driving route to the nearest verified emergency hospital (e.g., <i>Apollo Hospital ER</i>).", bullet_style),
                Paragraph("• Displays live hospital metrics en route: <b>18 free beds, 4 ICU beds</b>.", bullet_style),
                Paragraph("• 1-Tap buttons to launch native <b>Google Maps Turn-by-Turn Voice Navigation</b> or <b>Direct Call to Emergency Desk</b>.", bullet_style),
            ]
        ]], colWidths=[2.5*inch, 4.7*inch])
        t_nav.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
        story.append(t_nav)

    # ==================== PAGE 4: HOSPITAL ER COMMAND CENTER ====================
    story.append(PageBreak())
    story.append(Paragraph("5. Role 3: Hospital ER Command Center & Capacity Desk", h1_style))
    story.append(Paragraph(
        "Provides trauma triage, dynamic bed/ICU capacity management, and doctor/ASHA referral processing.",
        body_style
    ))

    img_hosp = get_fitted_image("screenshots/Screenshot_20261002-135133.png", target_width_inch=2.35, max_height_inch=4.8)
    hosp_desc = [
        Paragraph("<b>Emergency Room Operations:</b>", h2_style),
        Paragraph("<b>1. Live ER Dashboard:</b> Apollo Multi-Specialty Hospital ER console tracking critical cases, free general beds, and free ICU beds.", bullet_style),
        Paragraph("<b>2. Trauma Bay Readiness:</b> Monitors active trauma bays and on-call trauma surgeons in real time.", bullet_style),
        Paragraph("<b>3. Linked Fleet & Drivers:</b> Tracks inbound affiliated ambulances transporting acute patients.", bullet_style),
        Paragraph("<b>4. Inbound Ambulance Bed Reservation:</b> Pre-arrival vitals streaming enables staff to tap <b>'Reserve Bed'</b>, guaranteeing ready trauma bays upon vehicle arrival.", bullet_style),
        Paragraph("<b>5. Doctor & Community Referrals Hub:</b> Separate tab for incoming doctor clinic and rural ASHA referrals.", bullet_style),
        Paragraph("<b>6. Unread Notification Bell:</b> Header bell displays a red <b>'1'</b> badge on incoming referrals. Tapping it opens the referral queue and resets the badge to 0.", bullet_style),
    ]

    t_h1 = Table([[img_hosp, hosp_desc]], colWidths=[2.5*inch, 4.7*inch])
    t_h1.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    story.append(t_h1)
    story.append(Spacer(1, 10))

    # Live Bed Capacity & Drug Inventory
    img_cap = get_fitted_image("screenshots/Screenshot_20261002-135142.png", target_width_inch=2.3, max_height_inch=3.6)
    img_med = get_fitted_image("screenshots/Screenshot_20261002-135147.png", target_width_inch=2.3, max_height_inch=3.6)

    if img_cap and img_med:
        t_h2 = Table([[
            img_cap,
            [
                Paragraph("<b>Live Bed Ledger & Emergency Drug Stock:</b>", h2_style),
                Paragraph("• <b>Ward Beds (22/30):</b> 1-Tap <code>-1 Bed (Admit)</code> and <code>+1 Bed (Discharge)</code> buttons.", bullet_style),
                Paragraph("• <b>ICU Units (4/6):</b> 1-Tap <code>-1 ICU (Occupy)</code> and <code>+1 ICU (Free)</code> buttons.", bullet_style),
                Paragraph("• <b>Emergency Drug Stock:</b> Live inventory tracking for life-saving drugs (Adrenaline, Aspirin, Atropine, Insulin, Normal Saline).", bullet_style),
                Spacer(1, 6),
                img_med
            ]
        ]], colWidths=[2.5*inch, 4.7*inch])
        t_h2.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
        story.append(t_h2)

    # ==================== PAGE 5: DOCTOR OPD & TELECONSULTATION ====================
    story.append(PageBreak())
    story.append(Paragraph("6. Role 4: Doctor OPD Clinic & Teleconsultation", h1_style))
    story.append(Paragraph(
        "Streamlines outpatient queue management, electronic prescriptions, and emergency hospital referrals.",
        body_style
    ))

    img_doc_dash = get_fitted_image("screenshots/Screenshot_20261002-135030.png", target_width_inch=2.35, max_height_inch=4.8)
    doc_desc = [
        Paragraph("<b>OPD Queue & Consultation Workflow:</b>", h2_style),
        Paragraph("<b>1. Live Queue Management:</b> Displays today's patient queue, active tokens, and waiting room count. Tap <b>'Call Next Patient'</b> to advance.", bullet_style),
        Paragraph("<b>2. Clinical Consultation Modal:</b> Select standard primary diagnosis (e.g., <i>Acute Angina</i>, <i>Hypertension</i>) and record vitals (BP, Heart Rate).", bullet_style),
        Paragraph("<b>3. Digital Prescription (Rx):</b> Add standard medications with dosage, frequency (<code>1-0-1</code>), and duration.", bullet_style),
        Paragraph("<b>4. Hospital Referral Toggle:</b> If the patient requires emergency admission, switch <b>'Refer Patient to Hospital'</b> to ON. Choose destination hospital, priority (<b>HIGH / NORMAL</b>), and clinical reason.", bullet_style),
        Paragraph("<b>5. Instant Transmission:</b> Tapping <i>'Save Record, Prescribe & Call Next'</i> transmits the referral directly to the hospital ER console.", bullet_style),
    ]

    t_doc1 = Table([[img_doc_dash, doc_desc]], colWidths=[2.5*inch, 4.7*inch])
    t_doc1.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    story.append(t_doc1)
    story.append(Spacer(1, 10))

    # Consultation Modal & Patient Live Queue
    img_modal = get_fitted_image("screenshots/Screenshot_20261002-135043.png", target_width_inch=2.3, max_height_inch=3.6)
    img_q = get_fitted_image("screenshots/Screenshot_20261002-134929.png", target_width_inch=2.3, max_height_inch=3.6)

    if img_modal and img_q:
        t_doc2 = Table([[
            img_modal,
            [
                Paragraph("<b>Consultation Screen & Teleconsultation Room:</b>", h2_style),
                Paragraph("• <b>Prescription Modal:</b> Quick suggestions for Paracetamol 650mg, Pantoprazole 40mg, Amoxicillin 500mg.", bullet_style),
                Paragraph("• <b>Patient-Facing Queue:</b> Patients track their live token number (e.g., <i>Token #1 — Your Turn</i>) from home.", bullet_style),
                Paragraph("• <b>Teleconsultation:</b> Tap <b>'Join Teleconsultation Room'</b> for HD audio/video clinical calls.", bullet_style),
                Spacer(1, 6),
                img_q
            ]
        ]], colWidths=[2.5*inch, 4.7*inch])
        t_doc2.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
        story.append(t_doc2)

    # ==================== PAGE 6: ASHA RURAL HEALTHCARE ====================
    story.append(PageBreak())
    story.append(Paragraph("7. Role 5: ASHA Sangini / Rural Frontline Worker", h1_style))
    story.append(Paragraph(
        "Brings tertiary emergency healthcare to remote villages with point-of-care screening, AI triage, and offline sync.",
        body_style
    ))

    img_asha = get_fitted_image("screenshots/Screenshot_20261002-135210.png", target_width_inch=2.35, max_height_inch=4.8)
    asha_desc = [
        Paragraph("<b>Grassroots Community Healthcare:</b>", h2_style),
        Paragraph("<b>1. Village Directory:</b> Manages 13+ rural patients (high-risk pregnant mothers, hypertensive elderly, infants).", bullet_style),
        Paragraph("<b>2. Home Visit Logging:</b> Screen vitals at the patient's doorstep: Blood Pressure, Pulse, SpO2, and Blood Sugar.", bullet_style),
        Paragraph("<b>3. Dual-Language AI Guidance:</b> Immediate clinical triage advice in simple <b>Hindi & English</b> (e.g., <i>'उच्च जोखिम (HIGH): मरीज को तुरंत नजदीकी प्राथमिक स्वास्थ्य केंद्र या जिला अस्पताल भेजें।'</i>).", bullet_style),
        Paragraph("<b>4. Digital Frontline Referral:</b> Transmit referrals to Swaroop Rani Nehru Hospital or Naini PHC with a unique code (e.g., <code>REF-ASHA-XXXX</code>).", bullet_style),
        Paragraph("<b>5. 100% Offline Resilience:</b> Operates without cellular coverage. Submissions queue locally and auto-synchronize to Firestore once reconnected.", bullet_style),
    ]

    t_a1 = Table([[img_asha, asha_desc]], colWidths=[2.5*inch, 4.7*inch])
    t_a1.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    story.append(t_a1)
    story.append(Spacer(1, 10))

    # ASHA Patient Profile & Digital Referral Screen
    img_pat_prof = get_fitted_image("screenshots/Screenshot_20261002-135219.png", target_width_inch=2.3, max_height_inch=3.6)
    img_ref = get_fitted_image("screenshots/Screenshot_20261002-135225.png", target_width_inch=2.3, max_height_inch=3.6)

    if img_pat_prof and img_ref:
        t_a2 = Table([[
            img_pat_prof,
            [
                Paragraph("<b>Patient Profile & Digital Referral Selection:</b>", h2_style),
                Paragraph("• <b>High Risk Profile:</b> Radhika Devi (24y, O+, High Risk Pregnancy, EDD: 20/12/2026).", bullet_style),
                Paragraph("• <b>Emergency Ambulance SOS:</b> 1-Tap emergency button dispatches 108 ambulance to rural village.", bullet_style),
                Paragraph("• <b>Facility Selection:</b> Choose between Swaroop Rani Nehru Hospital, Naini PHC, Shankargarh CHC, or Kamla Nehru Hospital.", bullet_style),
                Spacer(1, 6),
                img_ref
            ]
        ]], colWidths=[2.5*inch, 4.7*inch])
        t_a2.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
        story.append(t_a2)

    # ==================== PAGE 7: ADMIN CONSOLE & CITYWIDE STOCK & TROUBLESHOOTING ====================
    story.append(PageBreak())
    story.append(Paragraph("8. Role 6: Medical Administrator & Citywide Network", h1_style))
    story.append(Paragraph(
        "Provides centralized credential verification, facility licensing audits, and citywide pharmacy availability.",
        body_style
    ))

    img_adm = get_fitted_image("screenshots/Screenshot_20261002-140509.png", target_width_inch=2.3, max_height_inch=3.6)
    img_stock = get_fitted_image("screenshots/Screenshot_20261002-142252.png", target_width_inch=2.3, max_height_inch=3.6)

    if img_adm and img_stock:
        t_adm = Table([[
            img_adm,
            [
                Paragraph("<b>Administrative Verification Desk:</b>", h2_style),
                Paragraph("• <b>Credential Auditing:</b> CMO verification desk for onboarding doctors, hospitals, and ambulance units.", bullet_style),
                Paragraph("• <b>Approve / Reject:</b> Verify medical licenses, facility addresses, and ICU capabilities before approving consoles.", bullet_style),
                Paragraph("• <b>Citywide Pharmacy Stock:</b> Live multi-hospital stock availability for critical medicines (Aspirin, Insulin, Antibiotics) across SRN, Medanta, and MLN hospitals.", bullet_style),
                Spacer(1, 6),
                img_stock
            ]
        ]], colWidths=[2.5*inch, 4.7*inch])
        t_adm.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
        story.append(t_adm)
    story.append(Spacer(1, 10))

    # Troubleshooting Table
    story.append(Paragraph("9. Evaluator Troubleshooting & Test Matrix", h1_style))
    tb_data = [
        [Paragraph("Scenario / Issue", table_header), Paragraph("Root Cause", table_header), Paragraph("Recommended Action", table_header)],
        [
            Paragraph("<b>Referral not visible on hospital desk</b>", table_cell),
            Paragraph("Viewing wrong tab or cached state", table_cell),
            Paragraph("Switch to the <b>'Doctor / Community Referrals'</b> tab and pull down from top to refresh the list.", table_cell),
        ],
        [
            Paragraph("<b>Bell icon badge stuck at 1</b>", table_cell),
            Paragraph("Referrals list not opened yet", table_cell),
            Paragraph("Tap directly on the <b>Bell Icon</b> in the header. It opens the referrals screen and resets the badge to 0.", table_cell),
        ],
        [
            Paragraph("<b>Location permission alert appears</b>", table_cell),
            Paragraph("Device GPS was disabled", table_cell),
            Paragraph("Grant <i>'Precise Location While In Use'</i> in device settings to enable real-time routing.", table_cell),
        ],
        [
            Paragraph("<b>Testing without internet</b>", table_cell),
            Paragraph("Simulating remote rural village", table_cell),
            Paragraph("Use ASHA or Driver mode freely; all records save locally and automatically sync when Wi-Fi/data returns.", table_cell),
        ],
        [
            Paragraph("<b>Switching between roles rapidly</b>", table_cell),
            Paragraph("Testing all roles on single device", table_cell),
            Paragraph("Tap <b>‹ Back / Switch Role</b> at the top-left of any dashboard to instantly change roles without logging in again.", table_cell),
        ],
    ]
    t_trouble = Table(tb_data, colWidths=[150, 150, 223])
    t_trouble.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F172A")),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor("#F8FAFC"), colors.white]),
    ]))
    story.append(t_trouble)
    story.append(Spacer(1, 10))

    signoff_p = (
        "<b>Golden Hour (Project 911)</b> bridges the critical divide between distress calls and hospital doors. "
        "Through coordinated AI triage, live hospital bed synchronization, driver false-alarm protection, and rural "
        "ASHA connectivity, the platform ensures that no life is lost due to delays during the golden hour."
    )
    story.append(Paragraph(signoff_p, ParagraphStyle("Signoff", fontName="Helvetica", fontSize=8.8, leading=12.5, textColor=colors.HexColor("#475569"))))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated: {filename}")


if __name__ == "__main__":
    create_user_manual_pdf()
