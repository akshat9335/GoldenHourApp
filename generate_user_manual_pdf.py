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
            self.drawString(36, 812, "GOLDEN HOUR")

            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawRightString(559, 812, "Official Comprehensive User Manual & Operations Guide")

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


def get_fitted_image(img_path, target_width_inch=2.68, max_height_inch=6.0):
    """Safely return a scaled reportlab Image preserving aspect ratio."""
    if not os.path.exists(img_path):
        print(f"Warning: file not found: {img_path}")
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
        fontSize=21,
        leading=25,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=3,
    )

    subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#E11D48"),
        spaceAfter=6,
    )

    h1_style = ParagraphStyle(
        "H1",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16.5,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=3,
        spaceAfter=3,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        "H2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9.8,
        leading=13,
        textColor=colors.HexColor("#0284C7"),
        spaceBefore=3,
        spaceAfter=2,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.6,
        leading=12.2,
        textColor=colors.HexColor("#1E293B"),
        spaceAfter=3.5,
    )

    bullet_style = ParagraphStyle(
        "Bullet",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.2,
        leading=11.6,
        textColor=colors.HexColor("#334155"),
        leftIndent=6,
        spaceAfter=2.8,
    )

    table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.2,
        leading=11,
        textColor=colors.HexColor("#1E293B"),
    )

    table_header = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11.5,
        textColor=colors.white,
    )

    img_label_style = ParagraphStyle(
        "ImgLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.8,
        leading=11.8,
        textColor=colors.HexColor("#0F172A"),
        alignment=1, # Centered
        spaceAfter=3,
    )

    callout_style = ParagraphStyle(
        "CalloutText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.2,
        leading=11.5,
        textColor=colors.HexColor("#0F172A"),
    )

    story = []

    # ==================== PAGE 1: TITLE, APK DOWNLOAD & DEMO CREDENTIALS ====================
    badge_html = "<font color='#E11D48'><b>EMERGENCY MEDICAL RESPONSE PLATFORM</b></font> | VERSION 1.0 (PRODUCTION APK BUILD)"
    story.append(Paragraph(badge_html, ParagraphStyle("Badge", fontName="Helvetica-Bold", fontSize=8.5, textColor=colors.HexColor("#E11D48"))))
    story.append(Spacer(1, 3))
    story.append(Paragraph("🚑 Golden Hour", title_style))
    story.append(Paragraph("Official Comprehensive User Manual & Operations Guide", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#E11D48"), spaceBefore=2, spaceAfter=7))

    story.append(Paragraph(
        "<b>Golden Hour</b> is a mission-critical Emergency Medical Response & Interoperability platform "
        "engineered around the vital first 60 minutes after trauma or acute onset. It synchronizes Citizens, "
        "Ambulance Pilots, Hospital Emergency Rooms, OPD Clinics, and Rural ASHA Sanginis in real time.",
        body_style
    ))
    story.append(Spacer(1, 5))

    story.append(Paragraph("1. Direct Standalone APK Download & Installation", h1_style))
    story.append(Paragraph(
        "The application is compiled as an optimized, standalone <b>Android APK (.apk)</b>. "
        "No developer environment, command line, or Expo Go installation is required.",
        body_style
    ))
    story.append(Paragraph("• <b>Step 1 — Download:</b> Tap the provided direct APK download link or scan the distribution QR code.", bullet_style))
    story.append(Paragraph("• <b>Step 2 — Install:</b> Open the downloaded APK on your Android device. If prompted, toggle <i>'Allow from this source / Install unknown apps'</i> in Android Settings.", bullet_style))
    story.append(Paragraph("• <b>Step 3 — Permissions:</b> On initial launch, grant <i>'Precise Location (While using the app)'</i>. This allows the proximity matching engine to locate nearby ambulances and trauma centers with high precision.", bullet_style))
    story.append(Paragraph("• <b>Step 4 — Background Notification Support:</b> Allow notification permissions so incoming dispatch alerts and hospital bed reservations ring audibly on your device.", bullet_style))
    story.append(Spacer(1, 6))

    story.append(Paragraph("2. Instant 1-Tap Demo Credentials & Role Directory", h1_style))
    story.append(Paragraph(
        "For seamless jury and evaluator walkthroughs without typing credentials or receiving OTPs, "
        "every login screen includes an instant <b>1-Tap Quick Demo Button</b> pre-configured with active test data:",
        body_style
    ))

    demo_data = [
        [Paragraph("Role / Sector", table_header), Paragraph("Route", table_header), Paragraph("1-Tap Demo Button", table_header), Paragraph("Pre-configured Live Identity", table_header)],
        [Paragraph("<b>Citizen / Patient</b>", table_cell), Paragraph("/login", table_cell), Paragraph("Explore as Demo Patient", table_cell), Paragraph("<b>Rahul Patel</b> (+91 98765 43210, Blood: O+)", table_cell)],
        [Paragraph("<b>Ambulance Pilot</b>", table_cell), Paragraph("/driver-login", table_cell), Paragraph("Quick Demo Pilot", table_cell), Paragraph("<b>Pilot Ramesh Kumar</b> (Ambulance UP-70-AMB-108)", table_cell)],
        [Paragraph("<b>Hospital ER Desk</b>", table_cell), Paragraph("/hospital-login", table_cell), Paragraph("Quick Demo Hospital", table_cell), Paragraph("<b>Apollo Multi-Specialty</b> / SRN Trauma Center", table_cell)],
        [Paragraph("<b>OPD Doctor</b>", table_cell), Paragraph("/doctor-login", table_cell), Paragraph("Quick Demo Doctor", table_cell), Paragraph("<b>Dr. Ananya Sharma</b> (OPD Clinic, Civil Lines)", table_cell)],
        [Paragraph("<b>ASHA Worker</b>", table_cell), Paragraph("/asha-login", table_cell), Paragraph("Quick Demo ASHA", table_cell), Paragraph("<b>Sunita Verma</b> (ASHA Sangini, Prayagraj Rural)", table_cell)],
        [Paragraph("<b>Administrator</b>", table_cell), Paragraph("/admin-dashboard", table_cell), Paragraph("Role Select Screen", table_cell), Paragraph("<b>Chief Medical Officer (CMO Desk)</b>", table_cell)],
    ]
    t_demo = Table(demo_data, colWidths=[105, 80, 140, 198])
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
    story.append(Spacer(1, 8))

    story.append(Paragraph("Evaluator Navigation Controls:", h2_style))
    story.append(Paragraph("• <b>1-Tap Role Switch:</b> Tap <i>‹ Back / Switch Role</i> at the top-left of any dashboard to instantly return to the portal and test another role without re-authenticating.", bullet_style))
    story.append(Paragraph("• <b>Trilingual Localization:</b> Tap the Globe icon at the top-right to toggle dynamically between <b>English</b>, <b>हिंदी (Hindi)</b>, and <b>मराठी (Marathi)</b>.", bullet_style))

    # ==================== PAGE 2: ROLE SELECTION & TRILINGUAL ENGINE ====================
    story.append(PageBreak())
    story.append(Paragraph("2. Role Selection Portal & Trilingual Localization Engine", h1_style))
    story.append(Paragraph(
        "Golden Hour provides a unified entry gateway accommodating citizens, healthcare providers, emergency drivers, "
        "and administrative authorities. The entire interface supports real-time trilingual localization.",
        body_style
    ))
    story.append(Spacer(1, 3))

    img_role = get_fitted_image("screenshots/Screenshot_20261002-134149.png", target_width_inch=2.68, max_height_inch=5.95)
    img_lang = get_fitted_image("screenshots/Screenshot_20261002-134202.png", target_width_inch=2.68, max_height_inch=5.95)

    if img_role and img_lang:
        t_dual_p2 = Table([
            [Paragraph("<b>Screen 1: Unified Role Selection</b>", img_label_style), Paragraph("<b>Screen 2: Trilingual Language Drawer</b>", img_label_style)],
            [img_role, img_lang]
        ], colWidths=[261, 262])
        t_dual_p2.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('TOPPADDING', (0,0), (-1,-1), 2),
        ]))
        story.append(t_dual_p2)
    story.append(Spacer(1, 6))

    desc_p2 = Table([
        [
            Paragraph("<b>Role Selection Features:</b><br/>"
                      "• <b>Citizen / Patient:</b> One-tap SOS, multimodal AI triage, and live tracking.<br/>"
                      "• <b>Hospital Staff:</b> Live ER capacity, ICU ledger, and incoming referrals.<br/>"
                      "• <b>Ambulance Crew:</b> Dispatch alert listener, turn-by-turn navigation.<br/>"
                      "• <b>Doctor Clinic:</b> Digital OPD token queue and clinical prescription modal.<br/>"
                      "• <b>ASHA Worker:</b> Rural maternal profiling and offline referral sync.", bullet_style),
            Paragraph("<b>Trilingual Localization Features:</b><br/>"
                      "• <b>Real-Time Language Switcher:</b> Tap the Globe icon in the top header.<br/>"
                      "• <b>Supported Languages:</b> English, हिंदी (Hindi), and मराठी (Marathi).<br/>"
                      "• <b>Zero Reloading:</b> All button labels, emergency cards, and clinical guides switch instantly.<br/>"
                      "• <b>Culturally Adapted Terminology:</b> High-risk pregnancy and trauma terms are phrased clearly for rural community workers.", bullet_style)
        ]
    ], colWidths=[261, 262])
    desc_p2.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(desc_p2)

    # ==================== PAGE 3: PATIENT ROLE & SOS ====================
    story.append(PageBreak())
    story.append(Paragraph("3. Role 1: Citizen / Patient Emergency Console & One-Tap SOS", h1_style))
    story.append(Paragraph(
        "Engineered for high-stress emergency reporting, giving patients instant access to emergency response, "
        "clinical triage, and dynamic ambulance dispatch.",
        body_style
    ))
    story.append(Spacer(1, 3))

    img_pat_home = get_fitted_image("screenshots/Screenshot_20261002-134210.png", target_width_inch=3.05, max_height_inch=6.75)
    pat_desc = [
        Paragraph("<b>Citizen Emergency Features:</b>", h2_style),
        Paragraph("<b>1. One-Tap SOS Pulsing Button:</b> Large, high-visibility red distress button. A 3-second safety window with haptic vibration prevents accidental emergency triggers.", bullet_style),
        Paragraph("<b>2. Voice AI Emergency Dictation:</b> Tap the microphone to dictate symptoms in natural voice (e.g., <i>'Severe crushing chest pain radiating to left arm'</i>). A clinical validation layer distinguishes casual inquiries from acute trauma, ensuring only genuine crises dispatch ambulances.", bullet_style),
        Paragraph("<b>3. False Alarm Cancellation:</b> Tap <i>'Cancel Emergency'</i> to safely recall dispatched units with zero penalty if triggered by accident.", bullet_style),
        Paragraph("<b>4. Live Telemetry & GPS Tracking:</b> Real-time vehicle movement on Google Maps, pilot contact number, vehicle registration (<code>UP-70-AMB-108</code>), and dynamic live ETA.", bullet_style),
        Paragraph("<b>5. Pre-configured Medical ICE Profile:</b> Rahul Patel (+91 98765 43210, Blood: O+). Critical allergies and chronic illnesses transmit automatically with the distress ping.", bullet_style),
        Paragraph("<b>6. Past Appointments Accordion:</b> Doctor prescriptions and upcoming appointments stay neatly filed inside an accordion to keep the emergency UI clean and focused.", bullet_style),
        Paragraph("<b>7. Direct Emergency Helpline:</b> 1-Tap emergency dialer connects instantly to 108 emergency call operators as a secondary fallback.", bullet_style),
    ]

    t_p3 = Table([[img_pat_home, pat_desc]], colWidths=[3.05*inch, 4.2*inch])
    t_p3.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_p3)
    story.append(Spacer(1, 8))

    box_p3 = Table([[
        Paragraph("<b>Evaluator Verification Tip:</b> Tap the red SOS button and observe the 3-second countdown. You can tap 'Cancel' during this window to test abort safety, or let it complete to trigger automated ambulance matching and ER pre-arrival notification.", callout_style)
    ]], colWidths=[523])
    box_p3.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF2F2")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#FECACA")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(box_p3)

    # ==================== PAGE 4: MULTIMODAL AI TRIAGE & ER MATCHING ====================
    story.append(PageBreak())
    story.append(Paragraph("3.2 Multimodal Gemini Clinical AI Triage & ER Hospital Proximity", h1_style))
    story.append(Paragraph(
        "When an emergency occurs, the built-in Gemini Multimodal AI evaluates visual injury photographs, "
        "classifies severity (CRITICAL / MODERATE / MINOR), and ranks top trauma centers by live bed capacity and driving ETA.",
        body_style
    ))
    story.append(Spacer(1, 3))

    img_ai1 = get_fitted_image("screenshots/Screenshot_20261002-134648.png", target_width_inch=2.68, max_height_inch=5.95)
    img_ai2 = get_fitted_image("screenshots/Screenshot_20261002-134700.png", target_width_inch=2.68, max_height_inch=5.95)

    if img_ai1 and img_ai2:
        t_dual_p4 = Table([
            [Paragraph("<b>Screen 1: Visual Trauma Analysis & AI Triage</b>", img_label_style), Paragraph("<b>Screen 2: Live ER Ranking & Distance Match</b>", img_label_style)],
            [img_ai1, img_ai2]
        ], colWidths=[261, 262])
        t_dual_p4.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('TOPPADDING', (0,0), (-1,-1), 2),
        ]))
        story.append(t_dual_p4)
    story.append(Spacer(1, 6))

    desc_p4 = Table([
        [
            Paragraph("<b>Gemini Multimodal AI Analysis:</b><br/>"
                      "• <b>Camera / Gallery Capture:</b> Evaluates physical wounds, lacerations, or bleeding severity.<br/>"
                      "• <b>Clinical Severity Scoring:</b> Assigns emergency level (e.g., <i>Critical Trauma — Level 1</i>).<br/>"
                      "• <b>Step-by-Step First Aid:</b> Immediate stabilization protocols (apply firm pressure, keep head elevated) to prevent blood loss before responders arrive.", bullet_style),
            Paragraph("<b>Dynamic ER Facility Matching:</b><br/>"
                      "• <b>Top 3 Ranked Hospitals:</b> Evaluates Jeevan Hospital (1.2 km, 8m), Medanta (2.4 km, 12m), and City Trauma Center.<br/>"
                      "• <b>Live Bed Availability:</b> Displays open general ward beds and critical ICU beds.<br/>"
                      "• <b>1-Tap Dispatch:</b> Tap <i>'Request Ambulance to This Hospital'</i> to transmit pre-arrival trauma notifications directly to the chosen facility.", bullet_style)
        ]
    ], colWidths=[261, 262])
    desc_p4.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(desc_p4)

    # ==================== PAGE 5: DOCTOR APPOINTMENTS & VIRTUAL QUEUE ====================
    story.append(PageBreak())
    story.append(Paragraph("3.3 Citizen OPD Appointments & Live Virtual Queue", h1_style))
    story.append(Paragraph(
        "Patients can consult certified doctors, book outpatient appointments across specialties, "
        "and track their live position in the clinic waiting room without waiting physically in crowded hallways.",
        body_style
    ))
    story.append(Spacer(1, 3))

    img_doc_book = get_fitted_image("screenshots/Screenshot_20261002-134915.png", target_width_inch=2.68, max_height_inch=5.95)
    img_doc_queue = get_fitted_image("screenshots/Screenshot_20261002-134929.png", target_width_inch=2.68, max_height_inch=5.95)

    if img_doc_book and img_doc_queue:
        t_dual_p5 = Table([
            [Paragraph("<b>Screen 1: Specialist Selection & Booking</b>", img_label_style), Paragraph("<b>Screen 2: Live Waiting Queue & Teleconsultation</b>", img_label_style)],
            [img_doc_book, img_doc_queue]
        ], colWidths=[261, 262])
        t_dual_p5.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('TOPPADDING', (0,0), (-1,-1), 2),
        ]))
        story.append(t_dual_p5)
    story.append(Spacer(1, 6))

    desc_p5 = Table([
        [
            Paragraph("<b>Doctor Discovery & Slot Booking:</b><br/>"
                      "• <b>Specialty Directory:</b> Cardiologists, Orthopedic Surgeons, Neurologists, and General Physicians.<br/>"
                      "• <b>Doctor Profiles:</b> Dr. Ananya Sharma (MD General Medicine, 12 yrs exp, ₹500 fee).<br/>"
                      "• <b>Appointment Types:</b> Choose In-Clinic physical consultation or Live Video Teleconsultation.", bullet_style),
            Paragraph("<b>Virtual Queue & Teleconsultation:</b><br/>"
                      "• <b>Live Token Progression:</b> Displays current token serving vs your token number (e.g., <i>Token #1 — Your Turn</i>).<br/>"
                      "• <b>Estimated Waiting Time:</b> Dynamic countdown calculated from active consultations.<br/>"
                      "• <b>Join Teleconsultation Room:</b> Tap the green button to initiate high-definition encrypted audio/video consultation.", bullet_style)
        ]
    ], colWidths=[261, 262])
    desc_p5.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(desc_p5)

    # ==================== PAGE 6: HEALTH RECORDS & CITYWIDE DRUG STOCK ====================
    story.append(PageBreak())
    story.append(Paragraph("3.4 Patient Electronic Health Records & Citywide Medicine Stock", h1_style))
    story.append(Paragraph(
        "Golden Hour maintains an integrated electronic health record ledger and offers citywide real-time "
        "medicine stock discovery so patients and families never have to travel between pharmacies in an emergency.",
        body_style
    ))
    story.append(Spacer(1, 3))

    img_ehr = get_fitted_image("screenshots/Screenshot_20261002-142236.png", target_width_inch=2.68, max_height_inch=5.95)
    img_drugs = get_fitted_image("screenshots/Screenshot_20261002-142252.png", target_width_inch=2.68, max_height_inch=5.95)

    if img_ehr and img_drugs:
        t_dual_p6 = Table([
            [Paragraph("<b>Screen 1: Digital Prescription & Encounters</b>", img_label_style), Paragraph("<b>Screen 2: Citywide Live Medicine Availability</b>", img_label_style)],
            [img_ehr, img_drugs]
        ], colWidths=[261, 262])
        t_dual_p6.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('TOPPADDING', (0,0), (-1,-1), 2),
        ]))
        story.append(t_dual_p6)
    story.append(Spacer(1, 6))

    desc_p6 = Table([
        [
            Paragraph("<b>EHR Prescription Management:</b><br/>"
                      "• <b>Encounter History:</b> Complete timeline of consultations, treating physician, and clinic notes.<br/>"
                      "• <b>Prescribed Medications:</b> Lists active medicines (Amlodipine 5mg, Aspirin 75mg, Sorbitrate 5mg) with dosage schedules.<br/>"
                      "• <b>Check Citywide Stock:</b> 1-Tap button on any medication to search inventory across all city hospitals.", bullet_style),
            Paragraph("<b>Citywide Hospital Drug Stock:</b><br/>"
                      "• <b>Multi-Facility Stock Ledger:</b> Real-time inventory at SRN Hospital (250 units), Medanta Hospital (250 units), and MLN Hospital.<br/>"
                      "• <b>Emergency Stock Alert:</b> Highlights critical drugs nearing depletion.<br/>"
                      "• <b>Direct Pharmacy Calling:</b> Tap to call the hospital emergency dispensary to hold medications.", bullet_style)
        ]
    ], colWidths=[261, 262])
    desc_p6.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(desc_p6)

    # ==================== PAGE 7: AMBULANCE DRIVER CONSOLE ====================
    story.append(PageBreak())
    story.append(Paragraph("4. Role 2: Ambulance Pilot / Driver Command Console", h1_style))
    story.append(Paragraph(
        "Empowers paramedic pilots with instant audio dispatch alerts, live telemetry, on-scene arrival verification, "
        "and false-alarm protection.",
        body_style
    ))
    story.append(Spacer(1, 3))

    img_drv = get_fitted_image("screenshots/Screenshot_20261002-135118.png", target_width_inch=3.05, max_height_inch=6.75)
    drv_desc = [
        Paragraph("<b>Paramedic Mission Lifecycle:</b>", h2_style),
        Paragraph("<b>1. Duty State Management:</b> Toggle between <b>ON DUTY</b> and <b>OFF DUTY</b> in the top header. The glowing green badge confirms live discoverability by the city emergency dispatch engine.", bullet_style),
        Paragraph("<b>2. Emergency Dispatch Acceptance:</b> When a distress signal rings, a high-priority dispatch card displays patient severity, distance (e.g., 2.1 km), and driving ETA. Tap <b>'Accept Emergency'</b> to lock the mission.", bullet_style),
        Paragraph("<b>3. Arrival at Patient Location:</b> Upon reaching the patient's coordinates, tap <b>'Marked at Patient Location'</b>. This notifies both patient and ER trauma desk that paramedics have reached the scene.", bullet_style),
        Paragraph("<b>4. False Alarm Protection ('Patient Not Found'):</b> If the caller cannot be located or the distress ping was fraudulent, tap <i>'Patient Not Found / False Request'</i>. The mission closes safely with status <code>FALSE_ALARM</code> without penalizing the driver.", bullet_style),
        Paragraph("<b>5. Patient Onboard & Hospital Transfer:</b> Once stabilized inside the ambulance, tap <i>'Patient Onboard ➔ En Route to Hospital'</i>.", bullet_style),
        Paragraph("<b>6. Trauma Bay Handover:</b> At the ER entrance, tap <i>'Complete Handover & Trip'</i> to transition clinical custody and return to standby.", bullet_style),
    ]

    t_p7 = Table([[img_drv, drv_desc]], colWidths=[3.05*inch, 4.2*inch])
    t_p7.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_p7)
    story.append(Spacer(1, 8))

    box_p7 = Table([[
        Paragraph("<b>Paramedic Safety Standard:</b> The <i>'Patient Not Found / False Request'</i> button directly solves the nationwide problem of fraudulent emergency calls wasting ambulance fuel. It safely terminates the call in the dispatch database and keeps the pilot's performance rating 100% protected.", callout_style)
    ]], colWidths=[523])
    box_p7.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F0FDF4")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#BBF7D0")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(box_p7)

    # ==================== PAGE 8: GPS NAVIGATION & LIVE HOSPITAL TELEMETRY ====================
    story.append(PageBreak())
    story.append(Paragraph("4.5 Emergency Turn-by-Turn GPS Navigation & Hospital Telemetry", h1_style))
    story.append(Paragraph(
        "While en route, ambulance pilots receive continuous hospital capacity telemetry and 1-tap integration "
        "with turn-by-turn navigation systems to bypass traffic congestion.",
        body_style
    ))
    story.append(Spacer(1, 3))

    img_nav = get_fitted_image("screenshots/Screenshot_20261002-142348.png", target_width_inch=3.05, max_height_inch=6.75)
    nav_desc = [
        Paragraph("<b>In-Transit Hospital Telemetry & Routing:</b>", h2_style),
        Paragraph("<b>1. Destination Trauma Center:</b> Dynamically locks onto the nearest verified emergency hospital (e.g., <i>Apollo Hospital ER</i>).", bullet_style),
        Paragraph("<b>2. Live En-Route Hospital Capacity:</b> Displays real-time hospital ledger metrics directly on the navigation HUD: <b>18 free general beds, 4 available ICU beds</b>.", bullet_style),
        Paragraph("<b>3. Traffic ETA Calibration:</b> Real-time ETA calculation (e.g., <i>8 mins (3.2 km)</i>) continuously accounts for city traffic conditions.", bullet_style),
        Paragraph("<b>4. Google Maps Turn-by-Turn Integration:</b> Tap <b>'Start Voice Navigation'</b> to launch native Google Maps with siren routing instructions.", bullet_style),
        Paragraph("<b>5. Direct ER Desk Hotline:</b> 1-Tap phone button connects the ambulance pilot directly to the triage nurse at Apollo Hospital ER for vitals streaming before arrival.", bullet_style),
        Paragraph("<b>6. Divert Protocol:</b> If destination ICU beds drop to zero while en route, the system flashes a capacity alert offering 1-tap re-routing to the next best trauma center.", bullet_style),
    ]

    t_p8 = Table([[img_nav, nav_desc]], colWidths=[3.05*inch, 4.2*inch])
    t_p8.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_p8)
    story.append(Spacer(1, 8))

    box_p8 = Table([[
        Paragraph("<b>Golden Hour Innovation:</b> Unlike standalone GPS map apps that are completely blind to hospital bed availability, Golden Hour synchronizes real-time bed numbers directly into the navigation cockpit so paramedics never arrive at a hospital with zero ICU beds.", callout_style)
    ]], colWidths=[523])
    box_p8.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#BFDBFE")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(box_p8)

    # ==================== PAGE 9: HOSPITAL ER COMMAND CENTER ====================
    story.append(PageBreak())
    story.append(Paragraph("5. Role 3: Hospital ER Command Center & Fleet Coordination", h1_style))
    story.append(Paragraph(
        "Provides trauma triage nurses and ER directors with a central command desk for tracking critical incoming cases, "
        "trauma bay readiness, and inbound ambulance telemetry.",
        body_style
    ))
    story.append(Spacer(1, 3))

    img_hosp = get_fitted_image("screenshots/Screenshot_20261002-135133.png", target_width_inch=3.05, max_height_inch=6.75)
    hosp_desc = [
        Paragraph("<b>Emergency Room Operations:</b>", h2_style),
        Paragraph("<b>1. Apollo Multi-Specialty ER Console:</b> Real-time dashboard monitoring incoming distress pings, triage severity levels, and critical care bays.", bullet_style),
        Paragraph("<b>2. Trauma Bay Readiness:</b> Monitors active trauma bays (e.g., Bay 1, Bay 2) and on-call trauma surgeons in real time.", bullet_style),
        Paragraph("<b>3. Linked Fleet Telemetry:</b> Tracks inbound affiliated ambulances transporting acute patients with live countdown ETAs.", bullet_style),
        Paragraph("<b>4. Pre-Arrival Bed Reservation:</b> Pre-arrival vitals streaming enables triage staff to tap <b>'Reserve Bed'</b>, guaranteeing ready trauma bays upon vehicle arrival.", bullet_style),
        Paragraph("<b>5. Doctor & Community Referrals Hub:</b> Separate dedicated tab for incoming doctor clinic and rural ASHA Sangini referrals.", bullet_style),
        Paragraph("<b>6. Unread Notification Bell Badge:</b> Header bell displays a prominent red <b>'1'</b> badge when a new referral arrives. Tapping it opens the referral queue and automatically resets the badge to 0.", bullet_style),
    ]

    t_p9 = Table([[img_hosp, hosp_desc]], colWidths=[3.05*inch, 4.2*inch])
    t_p9.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_p9)
    story.append(Spacer(1, 8))

    box_p9 = Table([[
        Paragraph("<b>Live Referrals Verification Note:</b> To view incoming referrals sent by doctors or rural ASHA workers, switch from the 'Emergencies' tab to the <b>'Doctor / Community Referrals'</b> tab at the top. The red notification badge '1' on the bell icon confirms an unreviewed referral is waiting.", callout_style)
    ]], colWidths=[523])
    box_p9.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FFFBEB")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#FDE68A")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(box_p9)

    # ==================== PAGE 10: BED CAPACITY & DRUG STOCK ====================
    story.append(PageBreak())
    story.append(Paragraph("5.2 Live Bed & ICU Ledger & Resuscitation Drug Inventory", h1_style))
    story.append(Paragraph(
        "Hospital staff maintain dynamic bed availability counters and life-saving resuscitation medicine stock, "
        "broadcasting live status across the entire regional emergency network.",
        body_style
    ))
    story.append(Spacer(1, 3))

    img_cap = get_fitted_image("screenshots/Screenshot_20261002-135142.png", target_width_inch=2.68, max_height_inch=5.95)
    img_med = get_fitted_image("screenshots/Screenshot_20261002-135147.png", target_width_inch=2.68, max_height_inch=5.95)

    if img_cap and img_med:
        t_dual_p10 = Table([
            [Paragraph("<b>Screen 1: Live Bed & ICU Ledger</b>", img_label_style), Paragraph("<b>Screen 2: Emergency Drug Stock Inventory</b>", img_label_style)],
            [img_cap, img_med]
        ], colWidths=[261, 262])
        t_dual_p10.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('TOPPADDING', (0,0), (-1,-1), 2),
        ]))
        story.append(t_dual_p10)
    story.append(Spacer(1, 6))

    desc_p10 = Table([
        [
            Paragraph("<b>Dynamic Bed Ledger Controls:</b><br/>"
                      "• <b>General Ward Beds (22/30):</b> 1-Tap <code>-1 Bed (Admit)</code> and <code>+1 Bed (Discharge)</code> buttons.<br/>"
                      "• <b>Critical ICU Units (4/6):</b> 1-Tap <code>-1 ICU (Occupy)</code> and <code>+1 ICU (Free)</code> buttons.<br/>"
                      "• <b>Network Broadcast:</b> Tap <i>'Sync Capacity with Network'</i> to update ambulance routing algorithms in real time.", bullet_style),
            Paragraph("<b>Emergency Medicine Inventory:</b><br/>"
                      "• <b>Core Resuscitation Stock:</b> Adrenaline (1:1000), Aspirin 75mg, Atropine 0.6mg, Insulin 40IU, Normal Saline 500ml.<br/>"
                      "• <b>Low Stock Alerts:</b> Highlighted in amber when count dips below safety threshold.<br/>"
                      "• <b>Restock Logging:</b> Fast + / - count increments for clinical pharmacists.", bullet_style)
        ]
    ], colWidths=[261, 262])
    desc_p10.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(desc_p10)

    # ==================== PAGE 11: DOCTOR OPD & PRESCRIPTION MODAL ====================
    story.append(PageBreak())
    story.append(Paragraph("6. Role 4: Doctor OPD Clinic Console & Clinical Prescription", h1_style))
    story.append(Paragraph(
        "Streamlines outpatient queue management, electronic prescriptions, and instant emergency referrals "
        "when a clinic patient exhibits acute life-threatening symptoms.",
        body_style
    ))
    story.append(Spacer(1, 3))

    img_doc_dash = get_fitted_image("screenshots/Screenshot_20261002-135030.png", target_width_inch=2.68, max_height_inch=5.95)
    img_modal = get_fitted_image("screenshots/Screenshot_20261002-135043.png", target_width_inch=2.68, max_height_inch=5.95)

    if img_doc_dash and img_modal:
        t_dual_p11 = Table([
            [Paragraph("<b>Screen 1: Doctor OPD Queue Dashboard</b>", img_label_style), Paragraph("<b>Screen 2: Clinical Consultation & Rx Modal</b>", img_label_style)],
            [img_doc_dash, img_modal]
        ], colWidths=[261, 262])
        t_dual_p11.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('TOPPADDING', (0,0), (-1,-1), 2),
        ]))
        story.append(t_dual_p11)
    story.append(Spacer(1, 6))

    desc_p11 = Table([
        [
            Paragraph("<b>OPD Queue & Token Progression:</b><br/>"
                      "• <b>Active Token Tracker:</b> Displays today's patient queue and waiting count.<br/>"
                      "• <b>1-Tap Call Next Patient:</b> Advances the queue number and alerts the patient app.<br/>"
                      "• <b>Patient Quick Stats:</b> Name, age, sex, and chief complaint visible at a glance.", bullet_style),
            Paragraph("<b>Clinical Consultation & Hospital Referral:</b><br/>"
                      "• <b>Vitals & Diagnosis:</b> Record Blood Pressure, Pulse, and primary clinical diagnosis.<br/>"
                      "• <b>Standard Rx Suggestion:</b> Quick chips for Paracetamol, Pantoprazole, Amoxicillin.<br/>"
                      "• <b>Hospital Referral Toggle:</b> Switch <b>'Refer Patient to Hospital'</b> to ON, select destination facility, priority (HIGH / NORMAL), and transmit directly to ER desk.", bullet_style)
        ]
    ], colWidths=[261, 262])
    desc_p11.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(desc_p11)

    # ==================== PAGE 12: ASHA RURAL HEALTHCARE CONSOLE ====================
    story.append(PageBreak())
    story.append(Paragraph("7. Role 5: ASHA Sangini / Rural Frontline Worker Console", h1_style))
    story.append(Paragraph(
        "Brings tertiary emergency healthcare to remote villages with point-of-care screening, dual-language AI triage, "
        "and 100% offline-first synchronization.",
        body_style
    ))
    story.append(Spacer(1, 3))

    img_asha = get_fitted_image("screenshots/Screenshot_20261002-135210.png", target_width_inch=3.05, max_height_inch=6.75)
    asha_desc = [
        Paragraph("<b>Grassroots Community Healthcare:</b>", h2_style),
        Paragraph("<b>1. Village Patient Directory:</b> Manages 13+ rural beneficiaries including high-risk pregnant mothers, hypertensive elderly, and vulnerable infants.", bullet_style),
        Paragraph("<b>2. Doorstep Vitals Logging:</b> Field screening for Blood Pressure (BP), Pulse Rate, SpO2 Blood Oxygen, and Capillary Blood Glucose.", bullet_style),
        Paragraph("<b>3. Dual-Language AI Guidance:</b> Immediate clinical triage instructions formatted in simple <b>Hindi & English</b> (e.g., <i>'उच्च जोखिम (HIGH): मरीज को तुरंत नजदीकी प्राथमिक स्वास्थ्य केंद्र या जिला अस्पताल भेजें।'</i>).", bullet_style),
        Paragraph("<b>4. Digital Frontline Referral:</b> Transmit referrals to Swaroop Rani Nehru Hospital or Naini PHC with a unique tracking code (e.g., <code>REF-ASHA-XXXX</code>).", bullet_style),
        Paragraph("<b>5. 100% Offline-First Architecture:</b> Fully operational in zero-connectivity village areas. Referrals queue locally and auto-synchronize to Firestore the moment connection is detected.", bullet_style),
        Paragraph("<b>6. Emergency 108 Dispatch Trigger:</b> Frontline workers can summon a dedicated 108 emergency ambulance directly to village coordinates with a single tap.", bullet_style),
    ]

    t_p12 = Table([[img_asha, asha_desc]], colWidths=[3.05*inch, 4.2*inch])
    t_p12.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_p12)
    story.append(Spacer(1, 8))

    box_p12 = Table([[
        Paragraph("<b>Offline Synchronization Architecture:</b> In rural remote tribal areas with zero cellular reception, ASHA workers can complete all vital screenings and generate referral codes without crashing. The background sync worker detects signal resumption and syncs data seamlessly.", callout_style)
    ]], colWidths=[523])
    box_p12.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FDF2F8")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#FBCFE8")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(box_p12)

    # ==================== PAGE 13: ASHA PATIENT PROFILE & DIGITAL REFERRAL ====================
    story.append(PageBreak())
    story.append(Paragraph("7.4 ASHA Maternal Care & Digital Hospital Referral", h1_style))
    story.append(Paragraph(
        "High-risk maternal profiling enables early detection of pre-eclampsia and gestational complications, "
        "routing rural mothers directly to tertiary trauma centers before acute crisis occurs.",
        body_style
    ))
    story.append(Spacer(1, 3))

    img_pat_prof = get_fitted_image("screenshots/Screenshot_20261002-135219.png", target_width_inch=2.68, max_height_inch=5.95)
    img_ref = get_fitted_image("screenshots/Screenshot_20261002-135225.png", target_width_inch=2.68, max_height_inch=5.95)

    if img_pat_prof and img_ref:
        t_dual_p13 = Table([
            [Paragraph("<b>Screen 1: High-Risk Patient Profile</b>", img_label_style), Paragraph("<b>Screen 2: Digital Referral Selection</b>", img_label_style)],
            [img_pat_prof, img_ref]
        ], colWidths=[261, 262])
        t_dual_p13.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('TOPPADDING', (0,0), (-1,-1), 2),
        ]))
        story.append(t_dual_p13)
    story.append(Spacer(1, 6))

    desc_p13 = Table([
        [
            Paragraph("<b>Maternal Profiling (Radhika Devi):</b><br/>"
                      "• <b>Demographics & Vitals:</b> 24y, Blood: O+, High-Risk Pregnancy (EDD: 20/12/2026).<br/>"
                      "• <b>Clinical Risk Indicators:</b> Elevated BP, history of anemia, and swollen extremities.<br/>"
                      "• <b>Emergency 108 SOS:</b> Red button dispatches rural emergency ambulance to village.", bullet_style),
            Paragraph("<b>Digital Referral Transmission:</b><br/>"
                      "• <b>Target Facility Selection:</b> Swaroop Rani Nehru Hospital, Naini PHC, Shankargarh CHC, Kamla Nehru Hospital.<br/>"
                      "• <b>Reason for Referral:</b> Severe gestational hypertension / tertiary care requirement.<br/>"
                      "• <b>Automatic Bed Hold:</b> Pushes case into hospital ER queue and triggers the red notification bell.", bullet_style)
        ]
    ], colWidths=[261, 262])
    desc_p13.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(desc_p13)

    # ==================== PAGE 14: MEDICAL ADMINISTRATOR DESK ====================
    story.append(PageBreak())
    story.append(Paragraph("8. Role 6: Medical Administrator & Authority Console", h1_style))
    story.append(Paragraph(
        "Provides Chief Medical Officers (CMO) and regulatory health administrators with credential auditing, "
        "facility licensing verification, and regional health compliance monitoring.",
        body_style
    ))
    story.append(Spacer(1, 3))

    img_adm = get_fitted_image("screenshots/Screenshot_20261002-140509.png", target_width_inch=3.05, max_height_inch=6.75)
    adm_desc = [
        Paragraph("<b>Administrative Verification Desk:</b>", h2_style),
        Paragraph("<b>1. Credential Auditing Desk:</b> Verification hub for newly registered doctors, hospitals, clinics, and ambulance units.", bullet_style),
        Paragraph("<b>2. Medical License Verification:</b> Inspects state medical registration numbers (e.g., MCI/State Council ID) and facility addresses before authorizing accounts.", bullet_style),
        Paragraph("<b>3. Approve / Reject Controls:</b> Instant 1-tap approval promotes providers to active network status; rejection revokes platform access.", bullet_style),
        Paragraph("<b>4. ICU & Bed Capacity Compliance:</b> Verifies claimed ICU unit numbers and surgical readiness against official hospital filings.", bullet_style),
        Paragraph("<b>5. Citywide Network Monitoring:</b> Tracks emergency response metrics across Prayagraj, average dispatch times, and golden hour survival statistics.", bullet_style),
        Paragraph("<b>6. Audit Trail & Security Logs:</b> Immutable Firestore security logs recording all patient data access, emergency dispatches, and hospital admissions.", bullet_style),
    ]

    t_p14 = Table([[img_adm, adm_desc]], colWidths=[3.05*inch, 4.2*inch])
    t_p14.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_p14)
    story.append(Spacer(1, 8))

    box_p14 = Table([[
        Paragraph("<b>Regulatory Governance:</b> By enforcing state medical license audits before clinical accounts are activated, Golden Hour prevents unqualified personnel from dispensing prescriptions or accepting emergency trauma transfers.", callout_style)
    ]], colWidths=[523])
    box_p14.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(box_p14)

    # ==================== PAGE 15: TROUBLESHOOTING & SIGN-OFF ====================
    story.append(PageBreak())
    story.append(Paragraph("9. Evaluator Troubleshooting & Test Matrix", h1_style))
    story.append(Paragraph(
        "Use this reference matrix during evaluations to quickly understand expected behaviors and troubleshooting steps:",
        body_style
    ))
    story.append(Spacer(1, 4))

    tb_data = [
        [Paragraph("Evaluation Scenario", table_header), Paragraph("Expected Behavior / Root Cause", table_header), Paragraph("Evaluator Action / Solution", table_header)],
        [
            Paragraph("<b>Referral not visible on hospital desk</b>", table_cell),
            Paragraph("ER desk is currently showing the active Emergencies tab rather than Referrals.", table_cell),
            Paragraph("Switch to the <b>'Doctor / Community Referrals'</b> tab and pull down to refresh the queue.", table_cell),
        ],
        [
            Paragraph("<b>Notification bell badge shows '1'</b>", table_cell),
            Paragraph("A new referral has arrived and has not yet been reviewed by triage staff.", table_cell),
            Paragraph("Tap directly on the <b>Bell Icon</b> in the header. It opens the referral list and resets the badge to 0.", table_cell),
        ],
        [
            Paragraph("<b>Testing without active Internet</b>", table_cell),
            Paragraph("Simulating zero-connectivity rural village environments.", table_cell),
            Paragraph("Use ASHA or Driver mode freely. All records save to local SQLite/AsyncStorage and sync to Firestore when online.", table_cell),
        ],
        [
            Paragraph("<b>Device location alert appears</b>", table_cell),
            Paragraph("Location service disabled or restricted on evaluator's phone.", table_cell),
            Paragraph("Grant <i>'Precise Location While Using App'</i> in Android Settings to activate proximity dispatch.", table_cell),
        ],
        [
            Paragraph("<b>Rapid testing of multiple roles</b>", table_cell),
            Paragraph("Evaluator testing all 6 roles sequentially on a single mobile device.", table_cell),
            Paragraph("Tap <b>‹ Back / Switch Role</b> on the top-left of any dashboard to instantly change roles without logging out.", table_cell),
        ],
        [
            Paragraph("<b>Emergency cancellation test</b>", table_cell),
            Paragraph("Testing false alarm prevention and driver protection.", table_cell),
            Paragraph("Within 3 seconds tap <i>'Cancel Emergency'</i> or pilot can tap <i>'Patient Not Found / False Request'</i> with zero penalty.", table_cell),
        ],
    ]
    t_trouble = Table(tb_data, colWidths=[150, 160, 213])
    t_trouble.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F172A")),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4.5),
        ('TOPPADDING', (0,0), (-1,-1), 4.5),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor("#F8FAFC"), colors.white]),
    ]))
    story.append(t_trouble)
    story.append(Spacer(1, 14))

    signoff_p = (
        "<b>Golden Hour</b> bridges the critical divide between distress calls and hospital trauma bays. "
        "Through coordinated AI triage, live hospital bed synchronization, driver false-alarm protection, and rural "
        "ASHA connectivity, the platform ensures that no life is lost due to delays during the golden hour.<br/><br/>"
        "<b>Architected for India's Healthcare Ecosystem:</b> Fully compliant with ABDM standards, trilingual English/Hindi/Marathi support, "
        "and offline-first synchronization for underserved rural communities."
    )
    story.append(Paragraph(signoff_p, ParagraphStyle("Signoff", fontName="Helvetica", fontSize=8.8, leading=13, textColor=colors.HexColor("#334155"))))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated: {filename}")


if __name__ == "__main__":
    create_user_manual_pdf()
