#!/usr/bin/env python3
"""Build the single-file distribution of the LALISA archive.

Inlines css/styles.css and every js/ script referenced by index.html into
one self-contained HTML file at dist/lalisa-archive.html.

Usage:
    python3 tools/build.py                # writes dist/lalisa-archive.html
    python3 tools/build.py --artifact OUT # also writes a headless fragment
                                          # (no doctype/html/head/body) for
                                          # environments that wrap the page.
"""
import re, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def read(p):
    with open(os.path.join(ROOT, p), encoding="utf-8") as f:
        return f.read()

def build():
    html = read("index.html")
    css = read("css/styles.css")
    html = re.sub(
        r'<link rel="stylesheet" href="css/styles.css">',
        lambda m: "<style>\n" + css + "\n</style>",
        html,
    )
    def inline_js(m):
        src = m.group(1)
        return "<script>\n" + read(src).replace("</script", "<\\/script") + "\n</script>"
    html = re.sub(r'<script src="([^"]+)"></script>', inline_js, html)
    os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
    out = os.path.join(ROOT, "dist", "lalisa-archive.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print("wrote", out, len(html), "bytes")
    return html

def artifact(html, out_path):
    """Emit a body-only fragment: <title> + font links + style + app markup + scripts."""
    head = html.split("<head>", 1)[1].split("</head>", 1)[0]
    body = html.split("<body>", 1)[1].rsplit("</body>", 1)[0]
    title = re.search(r"<title>.*?</title>", head, re.S).group(0)
    links = "\n".join(re.findall(r'<link rel="preconnect"[^>]*>|<link href="https://fonts[^>]*>', head))
    style = re.search(r"<style>.*?</style>", head, re.S).group(0)
    frag = title + "\n" + links + "\n" + style + "\n" + body
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(frag)
    print("wrote", out_path, len(frag), "bytes")

if __name__ == "__main__":
    doc = build()
    if len(sys.argv) > 2 and sys.argv[1] == "--artifact":
        artifact(doc, sys.argv[2])
