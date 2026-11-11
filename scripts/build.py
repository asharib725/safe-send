#!/usr/bin/env python3
"""Build Safe Send.

1. tokens/tokens.json  -> src/styles/tokens.css   (CSS custom properties + type classes)
2. Inter subsets       -> base64 WOFF @font-face  (so the live page looks the same everywhere)
3. src/index.html      -> dist/index.html          (CSS and JS inlined into one file)
4. src/case-study.html -> dist/case-study/index.html (fonts and screenshots inlined)

No dependencies beyond Python 3 and fontTools.
"""
import base64, io, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, DIST = ROOT / "src", ROOT / "dist"
FONT_DIR = pathlib.Path("/usr/share/fonts/opentype/inter")


def tokens_css(tok):
    out = [":root {"]
    for group, shades in tok["color"].items():
        for name, val in shades.items():
            out.append(f"  --color-{group}-{name}: {val};")
    for name, val in tok["font"].items():
        out.append(f"  --font-{name}: {val};")
    for name, px in tok["space"].items():
        out.append(f"  --space-{name}: {px}px;")
    for name, px in tok["radius"].items():
        out.append(f"  --radius-{name}: {px}px;")
    for name, val in tok["elevation"].items():
        out.append(f"  --elevation-{name}: {val};")
    for name, val in tok["motion"].items():
        out.append(f"  --motion-{name}: {val};")
    for name, px in tok["size"].items():
        out.append(f"  --size-{name}: {px}px;")
    out.append("}")
    for name, t in tok["type"].items():
        fam = "var(--font-display)" if t["family"] == "display" else "var(--font-text)"
        out.append(
            f".t-{name} {{ font-family: {fam}; font-size: {t['size']}px; line-height: {t['line']}px; "
            f"font-weight: {t['weight']}; letter-spacing: {t['tracking']}em; }}"
        )
    return "\n".join(out) + "\n"


def font_faces():
    try:
        from fontTools import subset
        from fontTools.ttLib import TTFont
    except ImportError:
        print("fontTools missing: falling back to system fonts", file=sys.stderr)
        return ""
    unicodes = list(range(0x20, 0x7F)) + list(range(0xA0, 0x100)) + [
        0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2026, 0x2192, 0x2190, 0x2212, 0x00D7]
    faces = [("Inter", "Inter-Regular.otf", 400), ("Inter", "Inter-SemiBold.otf", 600),
             ("Inter Display", "InterDisplay-SemiBold.otf", 600)]
    css = []
    for family, file, weight in faces:
        path = FONT_DIR / file
        if not path.exists():
            continue
        font = TTFont(str(path))
        opts = subset.Options(); opts.flavor = "woff"; opts.layout_features = ["kern", "liga", "tnum", "calt"]
        sub = subset.Subsetter(options=opts); sub.populate(unicodes=unicodes); sub.subset(font)
        buf = io.BytesIO(); font.flavor = "woff"; font.save(buf)
        b64 = base64.b64encode(buf.getvalue()).decode()
        css.append(f"@font-face {{ font-family: '{family}'; font-weight: {weight}; font-style: normal; "
                   f"font-display: swap; src: url(data:font/woff;base64,{b64}) format('woff'); }}")
    return "\n".join(css) + "\n"


def inline(html):
    def css(m):
        return "<style>\n" + (SRC / m.group(1)).read_text() + "</style>"
    def js(m):
        return "<script>\n" + (SRC / m.group(1)).read_text() + "</script>"
    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css, html)
    html = re.sub(r'<script src="([^"]+)"></script>', js, html)
    return html


def build_case_study(fonts):
    """src/case-study.html -> dist/case-study/index.html, with fonts and screenshots inlined."""
    src = SRC / "case-study.html"
    if not src.exists():
        return
    html = inline(src.read_text()).replace("/*FONTS*/", fonts)
    def img(m):
        data = base64.b64encode((ROOT / m.group(1)).read_bytes()).decode()
        return f'src="data:image/webp;base64,{data}"'
    html = re.sub(r'src="(assets/[^"]+\.webp)"', img, html)
    out = DIST / "case-study"; out.mkdir(parents=True, exist_ok=True)
    (out / "index.html").write_text(html)
    print(f"dist/case-study/index.html  {len(html)/1024:.0f} KB")


def main():
    tok = json.loads((ROOT / "tokens" / "tokens.json").read_text())
    (SRC / "styles").mkdir(parents=True, exist_ok=True)
    (SRC / "styles" / "tokens.css").write_text(tokens_css(tok))
    # tokens are also exposed to JS so the design-system page renders from the same source
    (SRC / "js" / "tokens.js").write_text("window.TOKENS = " + json.dumps(tok, indent=1) + ";\n")
    html = inline((SRC / "index.html").read_text())
    fonts = font_faces()
    html = html.replace("/*FONTS*/", fonts)
    DIST.mkdir(exist_ok=True)
    (DIST / "index.html").write_text(html)
    print(f"dist/index.html  {len(html)/1024:.0f} KB")
    build_case_study(fonts)


if __name__ == "__main__":
    main()
