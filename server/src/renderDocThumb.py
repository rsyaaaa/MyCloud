#!/usr/bin/env python3
import sys
import os
import zipfile
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw, ImageFont

def get_font():
    try:
        # Try loading a readable system font if available, or default
        for font_path in [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSans.ttf"
        ]:
            if os.path.exists(font_path):
                return ImageFont.truetype(font_path, 14), ImageFont.truetype(font_path, 18), ImageFont.truetype(font_path, 11)
    except Exception:
        pass
    default = ImageFont.load_default()
    return default, default, default

def render_fallback_sheet(title, ext, texts, out_path, accent_color='#C2410C'):
    width, height = 480, 640
    img = Image.new('RGB', (width, height), color='#F4F4F5')
    draw = ImageDraw.Draw(img)

    # Paper sheet in center with subtle shadow & border
    pad_x = 24
    pad_y = 20
    # Shadow
    draw.rectangle([pad_x + 3, pad_y + 3, width - pad_x + 3, height - pad_y + 3], fill='#E4E4E7')
    # Sheet
    draw.rectangle([pad_x, pad_y, width - pad_x, height - pad_y], fill='#FFFFFF', outline='#D4D4D8', width=1)

    # Top accent bar
    draw.rectangle([pad_x, pad_y, width - pad_x, pad_y + 8], fill=accent_color)

    # Extension Badge
    badge_w = 64
    badge_h = 24
    badge_x = pad_x + 18
    badge_y = pad_y + 18
    draw.rectangle([badge_x, badge_y, badge_x + badge_w, badge_y + badge_h], fill=accent_color)

    font_body, font_title, font_small = get_font()

    ext_text = (ext or 'DOC').upper().replace('.', '')[:5]
    draw.text((badge_x + 8, badge_y + 4), ext_text, fill='#FFFFFF', font=font_small)

    # Document Title
    y = badge_y + 36
    x = pad_x + 18
    max_w = width - pad_x * 2 - 36

    # Draw Title
    title_words = title.split()
    cur_line = ""
    for w in title_words:
        test = (cur_line + " " + w).strip()
        if len(test) > 36:
            draw.text((x, y), cur_line, fill='#09090B', font=font_title)
            y += 22
            cur_line = w
            if y > pad_y + 110:
                break
        else:
            cur_line = test
    if cur_line and y <= pad_y + 110:
        draw.text((x, y), cur_line, fill='#09090B', font=font_title)
        y += 24

    # Divider line
    y += 8
    draw.line([(x, y), (width - pad_x - 18, y)], fill='#E4E4E7', width=1)
    y += 16

    # Draw content excerpts
    line_count = 0
    max_lines = 18
    for block in texts:
        if line_count >= max_lines or y > height - pad_y - 30:
            break
        words = block.split()
        cur_line = ""
        for w in words:
            test = (cur_line + " " + w).strip()
            if len(test) > 42:
                if cur_line:
                    draw.text((x, y), cur_line, fill='#3F3F46', font=font_body)
                    y += 18
                    line_count += 1
                cur_line = w
                if line_count >= max_lines or y > height - pad_y - 30:
                    break
            else:
                cur_line = test
        if cur_line and line_count < max_lines and y <= height - pad_y - 30:
            draw.text((x, y), cur_line, fill='#3F3F46', font=font_body)
            y += 22
            line_count += 1

    # Bottom watermark/footer line
    draw.line([(x, height - pad_y - 24), (width - pad_x - 18, height - pad_y - 24)], fill='#F4F4F5', width=1)

    img.save(out_path, 'WEBP', quality=82)

def render_pdf(pdf_path, out_path):
    import pypdfium2 as pdfium
    pdf = pdfium.PdfDocument(pdf_path)
    if len(pdf) == 0:
        raise ValueError("PDF is empty")
    page = pdf[0]
    img = page.render(scale=1.5).to_pil()
    if img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Save as WebP
    img.save(out_path, 'WEBP', quality=82)

def render_docx(docx_path, out_path):
    texts = []
    try:
        with zipfile.ZipFile(docx_path) as z:
            if 'word/document.xml' in z.namelist():
                xml_data = z.read('word/document.xml')
                tree = ET.fromstring(xml_data)
                for elem in tree.iter():
                    if elem.text and elem.text.strip():
                        t = elem.text.strip()
                        if t and (not texts or texts[-1] != t):
                            texts.append(t)
    except Exception:
        pass

    title = texts[0] if texts else os.path.basename(docx_path)
    body_texts = texts[1:] if len(texts) > 1 else texts
    render_fallback_sheet(title, 'DOCX', body_texts, out_path, accent_color='#2563EB')

def render_pptx(pptx_path, out_path):
    texts = []
    try:
        with zipfile.ZipFile(pptx_path) as z:
            # Check slide 1
            if 'ppt/slides/slide1.xml' in z.namelist():
                xml_data = z.read('ppt/slides/slide1.xml')
                tree = ET.fromstring(xml_data)
                for elem in tree.iter():
                    if elem.text and elem.text.strip():
                        t = elem.text.strip()
                        if t and (not texts or texts[-1] != t):
                            texts.append(t)
    except Exception:
        pass
    title = texts[0] if texts else os.path.basename(pptx_path)
    render_fallback_sheet(title, 'PPTX', texts[1:], out_path, accent_color='#D97706')

def render_xlsx(xlsx_path, out_path):
    texts = []
    try:
        with zipfile.ZipFile(xlsx_path) as z:
            if 'xl/sharedStrings.xml' in z.namelist():
                xml_data = z.read('xl/sharedStrings.xml')
                tree = ET.fromstring(xml_data)
                for elem in tree.iter():
                    if elem.text and elem.text.strip():
                        t = elem.text.strip()
                        if t and (not texts or texts[-1] != t):
                            texts.append(t)
    except Exception:
        pass
    title = texts[0] if texts else os.path.basename(xlsx_path)
    render_fallback_sheet(title, 'XLSX', texts[1:], out_path, accent_color='#059669')

def render_text(txt_path, out_path, ext):
    texts = []
    try:
        with open(txt_path, 'r', encoding='utf-8', errors='ignore') as f:
            for _ in range(35):
                line = f.readline()
                if not line:
                    break
                stripped = line.strip()
                if stripped:
                    texts.append(stripped)
    except Exception:
        pass
    title = texts[0] if texts else os.path.basename(txt_path)
    render_fallback_sheet(title, ext, texts[1:], out_path, accent_color='#C2410C')

def main():
    if len(sys.argv) < 3:
        print("Usage: renderDocThumb.py <input_path> <output_path>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    if not os.path.exists(input_path):
        print(f"Error: input file '{input_path}' not found")
        sys.exit(1)

    out_dir = os.path.dirname(output_path)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    ext = os.path.splitext(input_path)[1].lower()

    try:
        if ext == '.pdf':
            render_pdf(input_path, output_path)
        elif ext in ['.docx', '.doc']:
            render_docx(input_path, output_path)
        elif ext in ['.pptx', '.ppt']:
            render_pptx(input_path, output_path)
        elif ext in ['.xlsx', '.xls']:
            render_xlsx(input_path, output_path)
        elif ext in ['.txt', '.md', '.json', '.csv', '.log', '.js', '.py', '.html', '.css', '.xml']:
            render_text(input_path, output_path, ext)
        else:
            # General fallback
            render_fallback_sheet(os.path.basename(input_path), ext, [], output_path)
        print(f"Successfully generated document thumbnail: {output_path}")
    except Exception as e:
        print(f"Failed primary renderer ({e}), using fallback card...")
        try:
            render_fallback_sheet(os.path.basename(input_path), ext, [], output_path)
            print(f"Fallback card generated: {output_path}")
        except Exception as e2:
            print(f"Complete failure: {e2}")
            sys.exit(1)

if __name__ == '__main__':
    main()

