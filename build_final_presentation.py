import pymupdf

def build_final_pdf():
    orig_pdf_path = r"C:\Users\Admin\.gemini\antigravity\brain\160a95f8-5e11-42e1-8655-2a7f95c1d2d8\.user_uploaded\media_1790936186389.pdf"
    new_slide2_path = "enhanced_slide_2.png"
    new_slide6_path = "enhanced_slide_6.png"
    out_pdf_path = "Golden_Hour_SIH26133_Final_Presentation.pdf"
    art_pdf_path = r"C:\Users\Admin\.gemini\antigravity\brain\160a95f8-5e11-42e1-8655-2a7f95c1d2d8\Golden_Hour_SIH26133_Final_Presentation.pdf"

    orig_doc = pymupdf.open(orig_pdf_path)
    final_doc = pymupdf.open()

    clickable_links_slide6 = [
        ("Smart India Hackathon", 32, 106, 260, 18, "https://www.sih.gov.in/"),
        ("Ayushman Bharat Digital Mission (ABDM)", 32, 123, 325, 18, "https://abdm.gov.in/"),
        ("MoHFW Healthcare Guidelines", 32, 141, 270, 19, "https://www.mohfw.gov.in/"),
        ("ABDM Digital Health Framework", 32, 191, 220, 18, "https://abdm.gov.in/"),
        ("Telemedicine Guidelines", 32, 208, 180, 18, "https://www.mohfw.gov.in/pdf/Telemedicine.pdf"),
        ("Comprehensive Primary Healthcare", 32, 225, 235, 18, "https://nhsrcindia.org/"),
        ("App link (Prototype APK)", 32, 246, 420, 50, "https://drive.google.com/file/d/1DjNVllfmDO0dMCmqSco1yLzNUFJ_s1Ie/view?usp=drivesdk"),
        ("App Manual & Guide link (PDF)", 32, 299, 420, 50, "https://drive.google.com/file/d/13T6n8MtCcO78936hAwHKXWWar8z5qT0l/view?usp=drivesdk"),
        ("Git link", 32, 349, 360, 20, "https://github.com/akshat9335/GoldenHourApp"),
    ]

    for i in range(len(orig_doc)):
        orig_page = orig_doc[i]
        rect = orig_page.rect

        if i == 1: # Slide 2
            new_page = final_doc.new_page(width=rect.width, height=rect.height)
            new_page.insert_image(rect, filename=new_slide2_path)
            print(f"Page 2 replaced with enhanced slide 2 ({rect.width}x{rect.height})")
        elif i == 5: # Slide 6
            new_page = final_doc.new_page(width=rect.width, height=rect.height)
            new_page.insert_image(rect, filename=new_slide6_path)
            for link_name, x, y, w, h, url in clickable_links_slide6:
                link_rect = pymupdf.Rect(x, y, x + w, y + h)
                new_page.insert_link({
                    "kind": pymupdf.LINK_URI,
                    "from": link_rect,
                    "uri": url,
                })
                print(f"   Page 6 embedded link: {link_name} -> {url}")
            print(f"Page 6 replaced with enhanced slide 6 with all active links ({rect.width}x{rect.height})")
        else:
            final_doc.insert_pdf(orig_doc, from_page=i, to_page=i)
            print(f"Page {i+1} copied from original")

    final_doc.save(out_pdf_path)
    final_doc.save(art_pdf_path)
    print("Successfully built Golden_Hour_SIH26133_Final_Presentation.pdf")

if __name__ == '__main__':
    build_final_pdf()
