#!/usr/bin/env python3
"""Validate NAVIN STUDIO's intentionally public editorial catalog.

Run: python3 scripts/validate_catalog.py
Only Python's standard library is used. This validates metadata structure,
not the existence, signing, safety, or approval of any external APK.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "data" / "projects.json"
CATEGORIES = {"apps", "games", "films", "stories", "learning", "experiences"}
STATES = {"draft", "published", "archived"}


def valid_https(value: object) -> bool:
    if not isinstance(value, str):
        return False
    url = urlsplit(value)
    return url.scheme == "https" and bool(url.netloc) and not url.username and not url.password


def validate(data: object) -> list[str]:
    errors: list[str] = []
    if not isinstance(data, dict):
        return ["catalog root must be an object"]
    if data.get("schema_version") != 1:
        errors.append("schema_version must be 1")
    if data.get("editorial_status") not in {"draft", "approved"}:
        errors.append("editorial_status must be 'draft' or 'approved'")
    projects = data.get("projects")
    if not isinstance(projects, list):
        return errors + ["projects must be an array"]

    seen: set[str] = set()
    for index, project in enumerate(projects):
        prefix = f"projects[{index}]"
        if not isinstance(project, dict):
            errors.append(f"{prefix} must be an object")
            continue
        project_id = project.get("id")
        if not isinstance(project_id, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", project_id):
            errors.append(f"{prefix}.id must be kebab-case")
        elif project_id in seen:
            errors.append(f"{prefix}.id is duplicated")
        else:
            seen.add(project_id)

        if not isinstance(project.get("name"), str) or not project["name"].strip():
            errors.append(f"{prefix}.name is required")
        if not isinstance(project.get("summary"), str) or not project["summary"].strip():
            errors.append(f"{prefix}.summary is required")
        if project.get("category") not in CATEGORIES:
            errors.append(f"{prefix}.category is invalid")
        if project.get("catalog_state") not in STATES:
            errors.append(f"{prefix}.catalog_state is invalid")
        if not isinstance(project.get("repository"), str) or not re.fullmatch(
            r"[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+", project["repository"]
        ):
            errors.append(f"{prefix}.repository must be 'owner/repo'")

        tag = project.get("published_release_tag")
        demo = project.get("approved_demo_url")
        download = project.get("approved_download_url")
        if tag is not None and (not isinstance(tag, str) or not tag.strip()):
            errors.append(f"{prefix}.published_release_tag must be null or a nonempty string")
        for key, value in (("approved_demo_url", demo), ("approved_download_url", download)):
            if value is not None and not valid_https(value):
                errors.append(f"{prefix}.{key} must be null or an HTTPS URL")
        if project.get("catalog_state") != "published" and any(
            value is not None for value in (tag, demo, download)
        ):
            errors.append(f"{prefix}: unpublished entries cannot contain release or demo links")
        if download is not None and tag is None:
            errors.append(f"{prefix}: approved download requires a release tag")
        if project.get("catalog_state") == "published" and data.get("editorial_status") != "approved":
            errors.append(f"{prefix}: publishing requires catalog editorial approval")
    return errors


def main() -> int:
    try:
        data = json.loads(CATALOG.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"Catalog cannot be read: {exc}", file=sys.stderr)
        return 1
    errors = validate(data)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print(f"Catalog valid: {len(data['projects'])} entries checked.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
