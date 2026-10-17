import os
import fitz
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.shapes import MSO_SHAPE
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from lxml import etree

def add_solid_transparent_hyperlink(slide, x, y, w, h, url):
    """Adds a solid-fill 1% alpha transparent shape that catches mouse clicks across 100% of its area."""
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Pt(x), Pt(y), Pt(w), Pt(h))
    shape.fill.solid()
    shape.fill.fore_color.rgb = RGBColor(255, 255, 255)

    spPr = shape.element.spPr
    solidFill = spPr.find('{http://schemas.openxmlformats.org/drawingml/2006/main}solidFill')
    srgbClr = solidFill.find('{http://schemas.openxmlformats.org/drawingml/2006/main}srgbClr')
    alpha = etree.SubElement(srgbClr, '{http://schemas.openxmlformats.org/drawingml/2006/main}alpha')
    alpha.set('val', '1000')

    ln = spPr.find('{http://schemas.openxmlformats.org/drawingml/2006/main}ln')
    if ln is not None:
        spPr.remove(ln)
    noFillLn = etree.SubElement(spPr, '{http://schemas.openxmlformats.org/drawingml/2006/main}ln')
    etree.SubElement(noFillLn, '{http://schemas.openxmlformats.org/drawingml/2006/main}noFill')

    shape.click_action.hyperlink.address = url
    return shape


def build_startup_pptx():
    source_pptx = "Golden_Hour_SIH26133_Presentation.pptx"
    prs = Presentation(source_pptx)
    s1 = prs.slides[0]

    # 1. Clean Slide 1: Remove SIH shapes
    to_delete = []
    for sh in s1.shapes:
        if sh.name in ['Picture 1', 'Picture 4', 'Title 7', 'Subtitle 3', 'TextBox 9', 'Freeform: Shape 26']:
            to_delete.append(sh._element)

    for elem in to_delete:
        elem.getparent().remove(elem)

    # 2. Slide 1 Top Bar Rectangle & Text
    top_bar = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.76))
    top_bar.fill.solid()
    top_bar.fill.fore_color.rgb = RGBColor(245, 247, 250)
    top_bar.line.color.rgb = RGBColor(218, 224, 233)
    top_bar.line.width = Pt(1)

    tb_text = s1.shapes.add_textbox(Inches(0.4), Inches(0.12), Inches(9.5), Inches(0.5))
    p = tb_text.text_frame.paragraphs[0]
    r1 = p.add_run()
    r1.text = "STARTUP CONFLUENCE 2026   "
    r1.font.name = "Calibri"
    r1.font.bold = True
    r1.font.size = Pt(20)
    r1.font.color.rgb = RGBColor(0, 32, 96)

    r2 = p.add_run()
    r2.text = "|   INNOVATION & INVESTOR PITCH DECK"
    r2.font.name = "Calibri"
    r2.font.bold = False
    r2.font.size = Pt(16)
    r2.font.color.rgb = RGBColor(100, 116, 139)

    # Badge: STAGE: MVP READY
    badge = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(10.5), Inches(0.18), Inches(2.3), Inches(0.4))
    badge.fill.solid()
    badge.fill.fore_color.rgb = RGBColor(225, 245, 235)
    badge.line.fill.background()
    bp = badge.text_frame.paragraphs[0]
    bp.alignment = PP_ALIGN.CENTER
    br = bp.add_run()
    br.text = "STAGE: MVP READY"
    br.font.name = "Calibri"
    br.font.bold = True
    br.font.size = Pt(12)
    br.font.color.rgb = RGBColor(16, 120, 72)

    # 3. Golden Hour Logo & Title positioning
    for sh in s1.shapes:
        if sh.name == 'Picture 8':
            sh.left = Inches(0.5)
            sh.top = Inches(1.05)
            sh.width = Inches(0.7)
            sh.height = Inches(0.7)
        elif sh.name == 'TextBox 5':
            sh.left = Inches(1.3)
            sh.top = Inches(0.95)
            sh.width = Inches(5.0)
            sh.height = Inches(0.8)
            sh.text_frame.clear()
            p = sh.text_frame.paragraphs[0]
            r_g = p.add_run()
            r_g.text = "Golden "
            r_g.font.name = "Calibri"
            r_g.font.bold = True
            r_g.font.size = Pt(40)
            r_g.font.color.rgb = RGBColor(245, 158, 11)
            r_h = p.add_run()
            r_h.text = "Hour"
            r_h.font.name = "Calibri"
            r_h.font.bold = True
            r_h.font.size = Pt(40)
            r_h.font.color.rgb = RGBColor(0, 32, 96)

    # Tagline
    tag_box = s1.shapes.add_textbox(Inches(0.5), Inches(1.9), Inches(7.0), Inches(0.5))
    tp = tag_box.text_frame.paragraphs[0]
    tr = tp.add_run()
    tr.text = "AI-Powered Emergency Care Coordination & Connected Healthcare Platform"
    tr.font.name = "Calibri"
    tr.font.italic = True
    tr.font.size = Pt(14)
    tr.font.color.rgb = RGBColor(71, 85, 105)

    # 4. Startup Details Table Box on the Left
    info_box = s1.shapes.add_textbox(Inches(0.5), Inches(2.6), Inches(6.8), Inches(4.0))
    tf = info_box.text_frame
    tf.word_wrap = True

    items = [
        ("Industry / Domain", "HealthTech  •  Emergency Response  •  B2B/B2G SaaS"),
        ("Target Market", "50,000+ Rural/Semi-Urban PHCs & 70,000+ Private Hospitals"),
        ("Core Innovation", "Multilingual Voice AI Triage, Live Telemetry & ABDM Sync"),
        ("Product Stage", "Fully Functional MVP (Android APK + Cloud Telemetry Engine)"),
        ("Founder & Lead", "Akshat Srivastava (Founder & Lead Developer)"),
        ("Team Name", "Life Line Coders"),
        ("Key Deliverables", "Working APK  |  Demo Video  |  User Manual  |  GitHub Code")
    ]

    for idx, (label, val) in enumerate(items):
        p = tf.add_paragraph() if idx > 0 else tf.paragraphs[0]
        p.space_after = Pt(10)
        p.space_before = Pt(2)
        r_bullet = p.add_run()
        r_bullet.text = "•  "
        r_bullet.font.name = "Calibri"
        r_bullet.font.bold = True
        r_bullet.font.size = Pt(14)
        r_bullet.font.color.rgb = RGBColor(0, 32, 96)

        r_lbl = p.add_run()
        r_lbl.text = f"{label:18} :  "
        r_lbl.font.name = "Calibri"
        r_lbl.font.bold = True
        r_lbl.font.size = Pt(13)
        r_lbl.font.color.rgb = RGBColor(0, 32, 96)

        r_val = p.add_run()
        r_val.text = val
        r_val.font.name = "Calibri"
        r_val.font.bold = False
        r_val.font.size = Pt(13)
        r_val.font.color.rgb = RGBColor(30, 41, 59)

    # Contact Box
    contact_box = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.5), Inches(6.8), Inches(6.8), Inches(0.45))
    contact_box.fill.solid()
    contact_box.fill.fore_color.rgb = RGBColor(241, 245, 249)
    contact_box.line.fill.background()
    cp = contact_box.text_frame.paragraphs[0]
    cr = cp.add_run()
    cr.text = "Contact: akshatsrivastava912@gmail.com   |   GitHub: akshat9335/GoldenHourApp"
    cr.font.name = "Calibri"
    cr.font.size = Pt(11)
    cr.font.color.rgb = RGBColor(71, 85, 105)

    # 5. Slide 1 Right Side: Core Value Proposition & Impact Container (NO repeated mockups!)
    val_container = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(7.6), Inches(0.95), Inches(5.3), Inches(6.3))
    val_container.fill.solid()
    val_container.fill.fore_color.rgb = RGBColor(248, 250, 254)
    val_container.line.color.rgb = RGBColor(210, 222, 240)
    val_container.line.width = Pt(1)

    val_header = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(7.6), Inches(0.95), Inches(5.3), Inches(0.55))
    val_header.fill.solid()
    val_header.fill.fore_color.rgb = RGBColor(0, 32, 96)
    val_header.line.fill.background()
    vhp = val_header.text_frame.paragraphs[0]
    vhp.alignment = PP_ALIGN.CENTER
    vhr = vhp.add_run()
    vhr.text = "CORE VALUE PROPOSITION & IMPACT"
    vhr.font.name = "Calibri"
    vhr.font.bold = True
    vhr.font.size = Pt(13)
    vhr.font.color.rgb = RGBColor(255, 255, 255)

    cards_info = [
        ("The 60-Minute 'Golden Hour'",
         "Over 50% of trauma fatalities occur in the first hour. Golden Hour eliminates discovery, routing, and triage delays to maximize patient survival rates.",
         RGBColor(245, 158, 11)),
        ("Multilingual Voice AI Triage",
         "Empowers rural citizens and ASHA workers with instant vernacular voice SOS parsing and AI clinical severity scoring (Gemini-backed).",
         RGBColor(16, 120, 72)),
        ("Real-Time Telemetry & ER Prep",
         "Streams live patient vitals directly from ambulance to hospital trauma bays, enabling surgical teams and ICU beds to be ready before arrival.",
         RGBColor(0, 102, 153)),
        ("ABDM & Scalable SaaS Model",
         "Seamless Ayushman Bharat (ABDM/FHIR) digital health records sync + B2B subscription for private hospitals & B2G integration for 108 fleets.",
         RGBColor(107, 70, 193))
    ]

    card_y = 1.62
    for title, desc, col in cards_info:
        # Mini card
        mc = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(7.75), Inches(card_y), Inches(5.0), Inches(1.25))
        mc.fill.solid()
        mc.fill.fore_color.rgb = RGBColor(255, 255, 255)
        mc.line.color.rgb = RGBColor(225, 232, 242)
        mc.line.width = Pt(1)

        # Left color bar
        bar = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(7.75), Inches(card_y), Inches(0.08), Inches(1.25))
        bar.fill.solid()
        bar.fill.fore_color.rgb = col
        bar.line.fill.background()

        # Text in mini card
        mtb = s1.shapes.add_textbox(Inches(7.9), Inches(card_y + 0.05), Inches(4.75), Inches(1.15))
        mtb.text_frame.word_wrap = True
        p1 = mtb.text_frame.paragraphs[0]
        r_t = p1.add_run()
        r_t.text = title
        r_t.font.name = "Calibri"
        r_t.font.bold = True
        r_t.font.size = Pt(12.5)
        r_t.font.color.rgb = RGBColor(0, 32, 96)

        p2 = mtb.text_frame.add_paragraph()
        p2.space_before = Pt(3)
        r_d = p2.add_run()
        r_d.text = desc
        r_d.font.name = "Calibri"
        r_d.font.size = Pt(10.5)
        r_d.font.color.rgb = RGBColor(51, 65, 85)

        card_y += 1.34

    # 6. Slides 2 to 6: Remove top-right SIH logo picture on all slides
    for idx in range(1, len(prs.slides)):
        s = prs.slides[idx]
        to_del = []
        for sh in s.shapes:
            if sh.shape_type == 13: # Picture
                left_in = sh.left / 914400
                top_in = sh.top / 914400
                if left_in > 10.0 and top_in < 1.0:
                    to_del.append(sh._element)
        for elem in to_del:
            elem.getparent().remove(elem)
            print(f"Slide {idx+1}: Removed top-right SIH logo shape!")

    out_pptx = "Golden_Hour_Startup_PitchDeck.pptx"
    art_pptx = r"C:\Users\Admin\.gemini\antigravity\brain\160a95f8-5e11-42e1-8655-2a7f95c1d2d8\Golden_Hour_Startup_PitchDeck.pptx"
    prs.save(out_pptx)
    prs.save(art_pptx)
    print("Saved Golden_Hour_Startup_PitchDeck.pptx and synced to artifacts!")


def build_startup_pdf():
    source_pdf = "Golden_Hour_SIH26133_Final_Presentation.pdf"
    doc = fitz.open(source_pdf)
    p1 = doc[0]

    # Redact entire Slide 1 content
    p1.add_redact_annot(fitz.Rect(0, 0, 960, 540), fill=(1, 1, 1))
    p1.apply_redactions()

    # 1. Top Bar
    p1.draw_rect(fitz.Rect(0, 0, 960, 55), color=None, fill=(0.96, 0.97, 0.99))
    p1.draw_line(fitz.Point(0, 55), fitz.Point(960, 55), color=(0.85, 0.88, 0.92), width=1)

    p1.insert_text(
        fitz.Point(40, 36),
        'STARTUP CONFLUENCE 2026',
        fontfile=r'C:\Windows\Fonts\calibrib.ttf',
        fontname='Calibri-Bold',
        fontsize=20,
        color=(0, 32/255, 96/255)
    )
    p1.insert_text(
        fitz.Point(295, 36),
        '|   INNOVATION & INVESTOR PITCH DECK',
        fontfile=r'C:\Windows\Fonts\calibri.ttf',
        fontname='Calibri',
        fontsize=16,
        color=(100/255, 116/255, 139/255)
    )

    # Startup stage pill at top right
    p1.draw_rect(fitz.Rect(755, 14, 925, 42), color=None, fill=(0.88, 0.96, 0.92))
    p1.insert_text(
        fitz.Point(772, 32),
        'STAGE: MVP READY',
        fontfile=r'C:\Windows\Fonts\calibrib.ttf',
        fontname='Calibri-Bold',
        fontsize=12,
        color=(16/255, 120/255, 72/255)
    )

    # 2. Golden Hour Logo & Title
    p1.insert_image(fitz.Rect(40, 78, 92, 130), filename='s1_pic_8.png')

    p1.insert_text(
        fitz.Point(102, 116),
        'Golden',
        fontfile=r'C:\Windows\Fonts\calibrib.ttf',
        fontname='Calibri-Bold',
        fontsize=38,
        color=(245/255, 158/255, 11/255)
    )
    p1.insert_text(
        fitz.Point(226, 116),
        'Hour',
        fontfile=r'C:\Windows\Fonts\calibrib.ttf',
        fontname='Calibri-Bold',
        fontsize=38,
        color=(0, 32/255, 96/255)
    )

    # Tagline
    p1.insert_text(
        fitz.Point(42, 150),
        'AI-Powered Emergency Care Coordination & Connected Healthcare Platform',
        fontfile=r'C:\Windows\Fonts\calibrii.ttf',
        fontname='Calibri-Italic',
        fontsize=14.5,
        color=(71/255, 85/255, 105/255)
    )

    # 3. Clean Key Information Table on the Left
    items = [
        ('Industry / Domain', 'HealthTech  •  Emergency Response  •  B2B/B2G SaaS'),
        ('Target Market', '50,000+ Rural/Semi-Urban PHCs & 70,000+ Private Hospitals'),
        ('Core Innovation', 'Multilingual Voice AI Triage, Live Telemetry & ABDM Sync'),
        ('Product Stage', 'Fully Functional MVP (Android APK + Cloud Telemetry Engine)'),
        ('Founder & Lead', 'Akshat Srivastava (Founder & Lead Developer)'),
        ('Team Name', 'Life Line Coders'),
        ('Key Deliverables', 'Working APK  |  Demo Video  |  User Manual  |  GitHub Code')
    ]

    y_pos = 196
    for label, val in items:
        p1.draw_circle(fitz.Point(46, y_pos - 4), 3, color=None, fill=(0, 32/255, 96/255))
        p1.insert_text(fitz.Point(58, y_pos), label, fontfile=r'C:\Windows\Fonts\calibrib.ttf', fontname='Calibri-Bold', fontsize=13, color=(0, 32/255, 96/255))
        p1.insert_text(fitz.Point(168, y_pos), ':', fontfile=r'C:\Windows\Fonts\calibrib.ttf', fontname='Calibri-Bold', fontsize=13, color=(0, 32/255, 96/255))
        p1.insert_text(fitz.Point(178, y_pos), val, fontfile=r'C:\Windows\Fonts\calibri.ttf', fontname='Calibri', fontsize=12.5, color=(30/255, 41/255, 59/255))
        y_pos += 44

    # Bottom Contact info bar
    p1.draw_rect(fitz.Rect(40, 492, 530, 524), color=None, fill=(0.95, 0.96, 0.98))
    p1.insert_text(
        fitz.Point(50, 511),
        'Contact: akshatsrivastava912@gmail.com   |   GitHub: akshat9335/GoldenHourApp',
        fontfile=r'C:\Windows\Fonts\calibri.ttf',
        fontname='Calibri',
        fontsize=11.5,
        color=(71/255, 85/255, 105/255)
    )

    # 4. Slide 1 Right Side: Core Value Proposition & Impact Container (NO repeated mockups!)
    rx0, ry0, rx1, ry1 = 555, 72, 935, 524
    p1.draw_rect(fitz.Rect(rx0, ry0, rx1, ry1), color=(0.82, 0.87, 0.94), fill=(0.97, 0.98, 1.0), width=1)

    # Header Bar
    p1.draw_rect(fitz.Rect(rx0, ry0, rx1, ry0 + 38), color=None, fill=(0, 32/255, 96/255))
    p1.insert_text(
        fitz.Point(rx0 + 20, ry0 + 25),
        'CORE VALUE PROPOSITION & IMPACT',
        fontfile=r'C:\Windows\Fonts\calibrib.ttf',
        fontname='Calibri-Bold',
        fontsize=13.5,
        color=(1, 1, 1)
    )

    cards = [
        ("The 60-Minute 'Golden Hour'",
         "Over 50% of trauma fatalities occur in the first hour. Golden Hour eliminates discovery, routing, and triage delays to maximize patient survival rates.",
         (245/255, 158/255, 11/255)),
        ("Multilingual Voice AI Triage",
         "Empowers rural citizens and ASHA workers with instant vernacular voice SOS parsing and AI clinical severity scoring (Gemini-backed).",
         (16/255, 120/255, 72/255)),
        ("Real-Time Telemetry & ER Prep",
         "Streams live patient vitals directly from ambulance to hospital trauma bays, enabling surgical teams and ICU beds to be ready before arrival.",
         (0, 102/255, 153/255)),
        ("ABDM & Scalable SaaS Model",
         "Seamless Ayushman Bharat (ABDM/FHIR) digital health records sync + B2B subscription for private hospitals & B2G integration for 108 fleets.",
         (107/255, 70/255, 193/255))
    ]

    cy = ry0 + 48
    for title, desc, accent_color in cards:
        p1.draw_rect(fitz.Rect(rx0 + 10, cy, rx1 - 10, cy + 90), color=(0.88, 0.91, 0.95), fill=(1, 1, 1), width=1)
        p1.draw_rect(fitz.Rect(rx0 + 10, cy, rx0 + 15, cy + 90), color=None, fill=accent_color)

        p1.insert_text(
            fitz.Point(rx0 + 24, cy + 20),
            title,
            fontfile=r'C:\Windows\Fonts\calibrib.ttf',
            fontname='Calibri-Bold',
            fontsize=13,
            color=(0, 32/255, 96/255)
        )

        tb_rect = fitz.Rect(rx0 + 24, cy + 26, rx1 - 18, cy + 86)
        p1.insert_textbox(
            tb_rect,
            desc,
            fontfile=r'C:\Windows\Fonts\calibri.ttf',
            fontname='Calibri',
            fontsize=11,
            color=(51/255, 65/255, 85/255)
        )
        cy += 100

    # 5. Pages 2 to 6: Remove top-right SIH logo with surgical precision
    for p_idx in range(1, 6):
        p = doc[p_idx]
        p.add_redact_annot(fitz.Rect(825, 0, 955, 54), fill=(1, 1, 1))
        p.apply_redactions()
        print(f"Page {p_idx+1}: Removed top-right SIH logo in PDF.")

    out_pdf = "Golden_Hour_Startup_PitchDeck.pdf"
    art_pdf = r"C:\Users\Admin\.gemini\antigravity\brain\160a95f8-5e11-42e1-8655-2a7f95c1d2d8\Golden_Hour_Startup_PitchDeck.pdf"
    doc.save(out_pdf)
    doc.save(art_pdf)
    print("Saved Golden_Hour_Startup_PitchDeck.pdf and synced to artifacts!")


if __name__ == "__main__":
    build_startup_pptx()
    build_startup_pdf()
