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
        self.line(36, 42, 559, 42)

        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(36, 30, "Confidential — Evaluator & User Operations Guide")
        page_text = f"Page {self._pageNumber} of {total_pages}"
        self.drawRightString(559, 30, page_text)
        self.restoreState()


def create_user_manual_pdf(filename="Golden_Hour_Complete_User_Manual.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=46,
        bottomMargin=48,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "CoverTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=6,
    )

    subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#E11D48"),
        spaceAfter=10,
    )

    h1_style = ParagraphStyle(
        "H1",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=19,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        "H2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#0284C7"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#1E293B"),
        spaceAfter=6,
    )

    bullet_style = ParagraphStyle(
        "Bullet",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.2,
        leading=13.2,
        textColor=colors.HexColor("#334155"),
        leftIndent=12,
        spaceAfter=4,
    )

    callout_style = ParagraphStyle(
        "Callout",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=9.2,
        leading=13,
        textColor=colors.HexColor("#0F172A"),
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

    # --- COVER BANNER ---
    badge_html = "<font color='#E11D48'><b>EMERGENCY MEDICAL RESPONSE PLATFORM</b></font> | VERSION 1.0 PRODUCTION BUILD"
    story.append(Paragraph(badge_html, ParagraphStyle("Badge", fontName="Helvetica-Bold", fontSize=8.5, textColor=colors.HexColor("#E11D48"))))
    story.append(Spacer(1, 4))
    story.append(Paragraph("🚑 Golden Hour (Project 911)", title_style))
    story.append(Paragraph("Complete End-to-End User Manual & Operations Guide", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#E11D48"), spaceBefore=2, spaceAfter=8))

    intro_p = (
        "<b>Golden Hour</b> is a mission-critical Emergency Medical Response & Interoperability platform "
        "designed around the vital first 60 minutes after trauma or acute onset. It seamlessly connects Citizens, "
        "Ambulance Pilots, Hospital Emergency Rooms, OPD Doctors, and Rural ASHA Sanginis in real time."
    )
    story.append(Paragraph(intro_p, body_style))
    story.append(Spacer(1, 6))

    # --- SECTION 1: INSTALLATION & APK DOWNLOAD ---
    story.append(Paragraph("1. Standalone APK Download & Installation", h1_style))
    apk_info = (
        "Golden Hour is distributed directly as an optimized, standalone <b>Android APK package (.apk)</b>. "
        "There is no requirement to install development tools or node packages."
    )
    story.append(Paragraph(apk_info, body_style))

    story.append(Paragraph("• <b>Step 1: Download APK:</b> Tap the provided APK download link or scan the distribution QR code.", bullet_style))
    story.append(Paragraph("• <b>Step 2: Install Package:</b> Open the downloaded file on your Android device. If prompted by Android security, enable <i>'Install unknown apps'</i> for your browser.", bullet_style))
    story.append(Paragraph("• <b>Step 3: Launch:</b> Tap the Golden Hour icon on your home screen or app drawer.", bullet_style))
    story.append(Paragraph("• <b>Step 4: Location Access:</b> On the first prompt, select <i>'While using the app'</i> to enable live emergency matching and GPS ambulance telemetry.", bullet_style))
    story.append(Spacer(1, 8))

    # --- SECTION 2: 1-TAP DEMO ACCESS & ROLES TABLE ---
    story.append(Paragraph("2. Quick Demo Credentials & Role Switching", h1_style))
    demo_intro = (
        "For immediate evaluation and live demonstration without manual registration or OTPs, "
        "each login screen provides a dedicated <b>1-Tap Quick Demo Button</b>:"
    )
    story.append(Paragraph(demo_intro, body_style))

    demo_data = [
        [Paragraph("Role", table_header), Paragraph("Route", table_header), Paragraph("Demo Button", table_header), Paragraph("Pre-loaded Identity", table_header)],
        [Paragraph("<b>Citizen / Patient</b>", table_cell), Paragraph("/login", table_cell), Paragraph("Explore as Demo Patient", table_cell), Paragraph("<b>Rahul Sharma</b> (+91 98765 43210, O+)", table_cell)],
        [Paragraph("<b>Ambulance Pilot</b>", table_cell), Paragraph("/driver-login", table_cell), Paragraph("Quick Demo Pilot", table_cell), Paragraph("<b>Rajesh Kumar</b> (Ambulance UP-70-EMG-108)", table_cell)],
        [Paragraph("<b>Hospital ER Desk</b>", table_cell), Paragraph("/hospital-login", table_cell), Paragraph("Quick Demo Hospital", table_cell), Paragraph("<b>Apollo Multi-Specialty</b> / SRN Trauma", table_cell)],
        [Paragraph("<b>OPD Doctor</b>", table_cell), Paragraph("/doctor-login", table_cell), Paragraph("Quick Demo Doctor", table_cell), Paragraph("<b>Dr. Priya Sharma, MD</b> (Civil Lines Clinic)", table_cell)],
        [Paragraph("<b>ASHA Worker</b>", table_cell), Paragraph("/asha-login", table_cell), Paragraph("Quick Demo ASHA", table_cell), Paragraph("<b>Sunita Verma</b> (ASHA Sangini Rural)", table_cell)],
    ]
    t_demo = Table(demo_data, colWidths=[110, 80, 140, 193])
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

    story.append(Paragraph("• <b>Trilingual Switcher:</b> Tap the Globe icon in the top-right corner to toggle between <b>English</b>, <b>हिंदी (Hindi)</b>, and <b>मराठी (Marathi)</b> instantly.", bullet_style))
    story.append(Paragraph("• <b>Instant Role Switching:</b> Tap <b>‹ Back / Switch Role</b> on the top-left of any dashboard to switch between user roles in 1 tap.", bullet_style))
    story.append(Spacer(1, 10))

    # --- SECTION 3: PATIENT ROLE (WITH IMAGE) ---
    story.append(PageBreak())
    story.append(Paragraph("3. Role 1: Citizen / Patient Emergency Portal", h1_style))
    story.append(Paragraph("Designed for high-stress situations with instant response, clinical verification, and live tracking.", body_style))

    # Image + description side by side or stacked
    if os.path.exists("patient_voice_sos_1790928620228.jpg"):
        img_p = Image("patient_voice_sos_1790928620228.jpg", width=2.4*inch, height=4.2*inch)
        desc_cell = [
            Paragraph("<b>Key Features & Workflow:</b>", h2_style),
            Paragraph("<b>1. One-Tap SOS:</b> A prominent pulsating red button. Once triggered, a 3-second safety window allows cancellation of accidental touches before dispatching.", bullet_style),
            Paragraph("<b>2. Voice AI Emergency SOS:</b> Tap the microphone to dictate symptoms (e.g., <i>'Severe crushing chest pain radiating to left arm'</i>). A clinical validation layer distinguishes between casual medicine questions and genuine trauma, ensuring emergency services are never dispatched falsely.", bullet_style),
            Paragraph("<b>3. False Alarm Cancellation:</b> Tap <i>'Cancel Emergency'</i> and select a reason to recall units immediately with zero penalty.", bullet_style),
            Paragraph("<b>4. Live Telemetry & Tracking:</b> Once accepted, view the approaching ambulance on a live map, driver details, and traffic-aware dynamic ETA.", bullet_style),
            Paragraph("<b>5. Past Appointments Accordion:</b> Previous clinical consultations and digital prescriptions are neatly collapsed into a clean dropdown to keep the screen uncluttered.", bullet_style),
            Paragraph("<b>6. Medical Profile:</b> Pre-configured Blood Group, allergies, and chronic conditions are automatically sent with the SOS alert.", bullet_style),
        ]
        t_pat = Table([[img_p, desc_cell]], colWidths=[2.5*inch, 4.7*inch])
        t_pat.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(t_pat)
    story.append(Spacer(1, 12))

    # --- SECTION 4: AMBULANCE DRIVER (WITH IMAGE) ---
    story.append(PageBreak())
    story.append(Paragraph("4. Role 2: Ambulance Pilot / Driver Console", h1_style))
    story.append(Paragraph("Empowers paramedics with high-priority proximity dispatches, GPS routing, and patient status transitions.", body_style))

    if os.path.exists("ambulance_pilot_telemetry_1790928727636.jpg"):
        img_d = Image("ambulance_pilot_telemetry_1790928727636.jpg", width=2.4*inch, height=4.2*inch)
        desc_cell_d = [
            Paragraph("<b>Paramedic Operations Lifecycle:</b>", h2_style),
            Paragraph("<b>1. Duty State:</b> Toggle between <b>ON DUTY</b> and <b>OFF DUTY</b>. When green, the vehicle is discoverable by the dispatch engine.", bullet_style),
            Paragraph("<b>2. Instant Dispatch Alert:</b> Audio chime sounds with a dispatch card indicating patient severity, distance, and ETA. Tap <b>'Accept Emergency'</b>.", bullet_style),
            Paragraph("<b>3. Arrival at Patient Location:</b> Upon arriving at the coordinates, tap <b>'Marked at Patient Location'</b>. This alerts both patient and hospital that first responders are on-scene.", bullet_style),
            Paragraph("<b>4. False Request Protection ('Patient Not Found'):</b> If the patient is missing or the call was prank/false, tap <i>'Patient Not Found / False Request'</i>. The trip safely terminates as <code>FALSE_ALARM</code> without driver penalty.", bullet_style),
            Paragraph("<b>5. Patient Onboard & Hospital Handover:</b> Stabilize the patient, tap <i>'Patient Onboard ➔ En Route to Hospital'</i>, and upon reaching the trauma bay, tap <i>'Complete Handover & Trip'</i>.", bullet_style),
        ]
        t_drv = Table([[img_d, desc_cell_d]], colWidths=[2.5*inch, 4.7*inch])
        t_drv.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(t_drv)
    story.append(Spacer(1, 12))

    # --- SECTION 5: HOSPITAL ER COMMAND CENTER (WITH IMAGE) ---
    story.append(PageBreak())
    story.append(Paragraph("5. Role 3: Hospital ER Command Center & Capacity Desk", h1_style))
    story.append(Paragraph("Provides real-time visibility over bed capacities, incoming ambulance trauma, and doctor/ASHA referrals.", body_style))

    if os.path.exists("hospital_er_dashboard_1790928700037.jpg"):
        img_h = Image("hospital_er_dashboard_1790928700037.jpg", width=2.4*inch, height=4.2*inch)
        desc_cell_h = [
            Paragraph("<b>Emergency Room Desk Functions:</b>", h2_style),
            Paragraph("<b>1. Dynamic Bed & ICU Management:</b> Under the <i>'Capacity'</i> tab, update Available General Beds, ICU Beds, and Ventilators in real time.", bullet_style),
            Paragraph("<b>2. Inbound Ambulance Triage:</b> Incoming ambulances display patient vitals pre-arrival. Tap <b>'Reserve Bed'</b> to allocate trauma bay capacity.", bullet_style),
            Paragraph("<b>3. Doctor & Community Referrals Hub:</b> Switch between <b>[Emergencies]</b> and <b>[Doctor / Community Referrals]</b>. New referrals illuminate an unread red <b>'1'</b> badge on the header bell icon.", bullet_style),
            Paragraph("<b>4. Bell Badge Clear:</b> Tapping the bell icon instantly opens the referrals queue and clears the badge to 0.", bullet_style),
            Paragraph("<b>5. Complete Admission ➔ Discharge Lifecycle:</b><br/>"
                      "• <b>Accept:</b> Tap <i>'Accept & Reserve Bed'</i> (Holds 1 bed).<br/>"
                      "• <b>Admit:</b> Tap <i>'Patient Arrived / Admit'</i>.<br/>"
                      "• <b>Discharge:</b> Tap <i>'Discharge & Free Bed'</i> (Releases the held bed back into available capacity).", bullet_style),
        ]
        t_hosp = Table([[img_h, desc_cell_h]], colWidths=[2.5*inch, 4.7*inch])
        t_hosp.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(t_hosp)
    story.append(Spacer(1, 12))

    # --- SECTION 6: DOCTOR OPD CONSOLE (WITH IMAGE) ---
    story.append(PageBreak())
    story.append(Paragraph("6. Role 4: Doctor OPD Clinic & Teleconsultation", h1_style))
    story.append(Paragraph("Streamlines outpatient clinic queues, digital prescriptions, and emergency referrals to tertiary hospitals.", body_style))

    if os.path.exists("teleconsultation_console_1790928673883.jpg"):
        img_doc = Image("teleconsultation_console_1790928673883.jpg", width=2.4*inch, height=4.2*inch)
        desc_cell_doc = [
            Paragraph("<b>Clinical OPD Consultation Flow:</b>", h2_style),
            Paragraph("<b>1. Live Token Queue:</b> View queued patient tokens under <code>/queue</code>. Tap <b>'Call Next Patient'</b> to begin consultation.", bullet_style),
            Paragraph("<b>2. Digital Prescription & Diagnosis:</b> Select conditions (e.g., <i>Acute Angina</i>, <i>Typhoid</i>), record vitals (BP, Pulse, SpO2), and prescribe standard medicines with dosages (<code>1-0-1</code>).", bullet_style),
            Paragraph("<b>3. Hospital Referral Toggle:</b> If the patient requires critical care, toggle <b>'Refer Patient to Hospital'</b> to ON. Select the hospital, priority (<b>HIGH / NORMAL</b>), and clinical reason (e.g., <i>'Urgent ICU & Cath Lab needed'</i>).", bullet_style),
            Paragraph("<b>4. Instant ER Dispatch:</b> Tapping <i>'Complete Consultation'</i> saves the electronic health record and automatically transmits the referral to the hospital desk.", bullet_style),
            Paragraph("<b>5. Teleconsultation:</b> Real-time HD audio/video consultation with remote rural patients with built-in in-call clinical notes.", bullet_style),
        ]
        t_doc = Table([[img_doc, desc_cell_doc]], colWidths=[2.5*inch, 4.7*inch])
        t_doc.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(t_doc)
    story.append(Spacer(1, 12))

    # --- SECTION 7: ASHA RURAL HEALTHCARE (WITH IMAGE) ---
    story.append(PageBreak())
    story.append(Paragraph("7. Role 5: ASHA Sangini / Rural Frontline Worker", h1_style))
    story.append(Paragraph("Empowers rural health workers with point-of-care screening, dual-language AI triage, and offline referral sync.", body_style))

    if os.path.exists("asha_rural_console_1790928646305.jpg"):
        img_asha = Image("asha_rural_console_1790928646305.jpg", width=2.4*inch, height=4.2*inch)
        desc_cell_asha = [
            Paragraph("<b>Rural Grassroots Features:</b>", h2_style),
            Paragraph("<b>1. Village Patient Directory:</b> Manage high-risk pregnant women, infants, and hypertensive elderly in rural sub-centers.", bullet_style),
            Paragraph("<b>2. Home Visit Logging:</b> Record point-of-care diagnostics: Blood Pressure (e.g., <code>150/100</code>), SpO2, Pulse, and Blood Sugar.", bullet_style),
            Paragraph("<b>3. Dual-Language AI Guidance:</b> Immediate clinical triage instructions in simple <b>Hindi & English</b> (e.g., <i>'उच्च जोखिम (HIGH): मरीज को तुरंत नजदीकी प्राथमिक स्वास्थ्य केंद्र या जिला अस्पताल भेजें।'</i>).", bullet_style),
            Paragraph("<b>4. Digital Referral Code:</b> Transmit referral to Swaroop Rani Nehru Hospital or Naini PHC with a unique code (e.g., <code>REF-ASHA-XXXX</code>).", bullet_style),
            Paragraph("<b>5. Offline-First Resilience:</b> Operates 100% offline without cellular network. Referrals and visits queue locally and auto-synchronize to the cloud once network connectivity is restored.", bullet_style),
        ]
        t_asha = Table([[img_asha, desc_cell_asha]], colWidths=[2.5*inch, 4.7*inch])
        t_asha.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(t_asha)
    story.append(Spacer(1, 12))

    # --- SECTION 8: TROUBLESHOOTING & EVALUATION GUIDE ---
    story.append(PageBreak())
    story.append(Paragraph("8. Troubleshooting & Evaluation Guide", h1_style))
    story.append(Paragraph("Quick reference guide for test scenarios and evaluation checks:", body_style))

    tb_data = [
        [Paragraph("Scenario / Issue", table_header), Paragraph("Root Cause", table_header), Paragraph("Recommended Action", table_header)],
        [
            Paragraph("<b>Referral not visible on hospital desk</b>", table_cell),
            Paragraph("Viewing wrong tab or cached state", table_cell),
            Paragraph("Ensure you are on the <b>'Doctor / Community Referrals'</b> tab. Pull down from top to refresh the list.", table_cell),
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
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor("#F8FAFC"), colors.white]),
    ]))
    story.append(t_trouble)
    story.append(Spacer(1, 14))

    # Sign-off box
    signoff_p = (
        "<b>Golden Hour (Project 911)</b> bridges the critical divide between distress calls and hospital doors. "
        "Through coordinated AI triage, live hospital bed synchronization, driver false-alarm protection, and rural "
        "ASHA connectivity, the platform ensures that no life is lost due to delays during the golden hour."
    )
    story.append(Paragraph(signoff_p, ParagraphStyle("Signoff", fontName="Helvetica", fontSize=9, leading=13, textColor=colors.HexColor("#475569"))))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated: {filename}")


if __name__ == "__main__":
    create_user_manual_pdf()
