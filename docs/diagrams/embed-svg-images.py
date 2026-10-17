#!/usr/bin/env python3
"""Make Graphviz/`diagrams` SVGs self-contained (portable + no leaked local paths).

`diagrams` renders SVG with `<image xlink:href="/abs/local/path/icon.png">` — the icons are
referenced by FILESYSTEM PATH, not embedded. So the SVG renders fine where it was generated but
is **broken when opened standalone** (in a browser / on GitHub Pages): every icon 404s and the
poster looks empty. It also leaks the author's local path into a committed file.

This rewrites every local `xlink:href` image reference to an inline **base64 data URI**, so the
SVG carries its own icons and renders anywhere. Idempotent (skips refs already `data:`/`http(s)`).

Usage:
  python embed-svg-images.py <file-or-dir> [<file-or-dir> ...]
  # default: ../static/img/architecture
"""
from __future__ import annotations

import base64
import mimetypes
import re
import sys
from pathlib import Path

_HREF = re.compile(r'xlink:href="([^"]+)"')


def _inline(svg: Path) -> int:
    text = svg.read_text(encoding="utf-8")
    replaced = 0

    def sub(m: re.Match) -> str:
        nonlocal replaced
        ref = m.group(1)
        if ref.startswith(("data:", "http://", "https://", "#")):
            return m.group(0)
        p = Path(ref)
        if not p.is_absolute():
            p = (svg.parent / ref).resolve()
        if not p.exists():
            print(f"  WARN missing image, left as-is: {ref}")
            return m.group(0)
        mime = mimetypes.guess_type(str(p))[0] or "image/png"
        b64 = base64.b64encode(p.read_bytes()).decode("ascii")
        replaced += 1
        return f'xlink:href="data:{mime};base64,{b64}"'

    out = _HREF.sub(sub, text)
    if replaced:
        svg.write_text(out, encoding="utf-8")
    return replaced


def main(argv: list[str]) -> int:
    targets = argv or [str(Path(__file__).resolve().parent.parent / "static" / "img" / "architecture")]
    svgs: list[Path] = []
    for t in targets:
        p = Path(t)
        svgs.extend(sorted(p.glob("*.svg")) if p.is_dir() else [p])
    if not svgs:
        print("no SVGs found"); return 0
    for svg in svgs:
        n = _inline(svg)
        print(f"{svg.name}: embedded {n} image(s){' (already self-contained)' if n == 0 else ''}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
