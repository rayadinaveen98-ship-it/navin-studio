#!/usr/bin/env python3
"""Package ONLY public NAVIN STUDIO website files for GitHub Pages."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import shutil

SITE = Path(__file__).resolve().parents[1]
PUBLIC = ("index.html", "robots.txt", "data/projects.json", "data/releases.json", "intro/living-architecture-v3.html")


def build(source: Path, output: Path) -> list[Path]:
    source = source.resolve()
    output = output.resolve()
    if output == source or source in output.parents:
        raise ValueError("Output must be outside source, to prevent recursive or accidental publishing")
    # A local output path must not point at a symlink into a sensitive directory.
    if output.exists() and any(output.iterdir()):
        raise ValueError("Target output directory must be empty")
    html = (source / "index.html").read_text(encoding="utf-8")
    if any(marker in html for marker in ("{{STYLES}}", "{{APP}}")):
        raise ValueError("Standalone website has unexpanded build markers")
    if re.search(r"<script\b[^>]+\bsrc\s*=", html, re.I) or re.search(
        r"<link\b[^>]+rel=[\"']stylesheet[\"'][^>]+href=", html, re.I
    ):
        raise ValueError("Website is not self-contained: external local scripts/stylesheets detected")
    for filename in PUBLIC:
        file = source / filename
        if not file.is_file() or file.is_symlink():
            raise ValueError(f"Missing or unsafe public file: {filename}")
    catalog = json.loads((source / "data/projects.json").read_text())
    releases = json.loads((source / "data/releases.json").read_text())
    if catalog.get("schema_version") != 1 or releases.get("schema_version") != 1:
        raise ValueError("Unrecognized public data schema")
    output.mkdir(parents=True, exist_ok=True)
    for filename in PUBLIC:
        target = output / filename
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source / filename, target)
    (output / ".nojekyll").write_text("", encoding="utf-8")
    return [output / item for item in PUBLIC]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SITE)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    copied = build(args.source, args.output)
    print("Built minimal public Pages artifact:")
    for path in copied:
        print(" -", path.relative_to(args.output.resolve()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
