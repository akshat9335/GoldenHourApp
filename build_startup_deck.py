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

    # Remove SIH shapes from Slide 1
    # Shapes to delete: Shape 6 (SIH logo), Shape 2 (SIH brain bulb), Shape 3, Shape 4, Shape 5
    # Delete backwards by index to avoid index shifting
    to_delete = []
    for i, sh in enumerate(s1.shapes):
        if sh.name in ['Picture 1', 'Picture 4', 'Title 7', 'Subtitle 3', 'TextBox 9', 'Freeform: Shape 26']:
            to_delete.append(sh._element)

    for elem in to_delete:
        elem.getparent().remove(elem)

    # 1. Top Bar Rectangle
    top_bar = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.76))
    top_bar.fill.solid()
    top_bar.fill.fore_color.rgb = RGBColor(245, 247, 250)
    top_bar.line.color.rgb = RGBColor(218, 224, 233)
    top_bar.line.width = Pt(1)

    # Top Bar Text
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

    # 2. Golden Hour Logo & Title positioning
    # Position existing logo (Shape with hourglass) and title (TextBox 5)
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

    # 3. Startup Details Table Box
    info_box = s1.shapes.add_textbox(Inches(0.5), Inches(2.6), Inches(7.0), Inches(4.0))
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

    # 4. Right side: Live Working Prototype screens
    s1.shapes.add_picture("s3_mockups.png", Inches(7.6), Inches(0.95), width=Inches(5.2), height=Inches(6.3))

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
    p1.draw_rect(fitz.Rect(40, 492, 540, 524), color=None, fill=(0.95, 0.96, 0.98))
    p1.insert_text(
        fitz.Point(50, 511),
        'Contact: akshatsrivastava912@gmail.com   |   GitHub: akshat9335/GoldenHourApp',
        fontfile=r'C:\Windows\Fonts\calibri.ttf',
        fontname='Calibri',
        fontsize=11.5,
        color=(71/255, 85/255, 105/255)
    )

    # 4. Right side: Live Working Prototype screens
    p1.insert_image(fitz.Rect(565, 70, 935, 522), filename='s3_mockups.png')

    out_pdf = "Golden_Hour_Startup_PitchDeck.pdf"
    art_pdf = r"C:\Users\Admin\.gemini\antigravity\brain\160a95f8-5e11-42e1-8655-2a7f95c1d2d8\Golden_Hour_Startup_PitchDeck.pdf"
    doc.save(out_pdf)
    doc.save(art_pdf)
    print("Saved Golden_Hour_Startup_PitchDeck.pdf and synced to artifacts!")


if __name__ == "__main__":
    build_startup_pptx()
    build_startup_pdf()
