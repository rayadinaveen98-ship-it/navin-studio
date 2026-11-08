#!/usr/bin/env python3
"""Resolve the immutable commit pointed to by a *published* GitHub tag.

This helper is read-only. A GitHub Release's target_commitish may be a branch
name and must not be treated as evidence of the release's source commit.
"""
from __future__ import annotations

import re
from urllib.parse import quote

REPO_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
TAG_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._+-]{0,127}$")
SHA_PATTERN = re.compile(r"^[a-fA-F0-9]{40}$")


def resolve_tag_commit(repo: str, tag: str, fetch) -> str:
    """Resolve lightweight/annotated tags, with a bounded dereference chain."""
    if not isinstance(repo, str) or not REPO_PATTERN.fullmatch(repo):
        raise ValueError("Invalid GitHub repository")
    if not isinstance(tag, str) or not TAG_PATTERN.fullmatch(tag):
        raise ValueError("Invalid tag (slashes and control characters not allowed)")
    url = f"https://api.github.com/repos/{repo}/git/ref/tags/{quote(tag, safe='')}"
    ref = fetch(url)
    if not isinstance(ref, dict) or ref.get("ref") != f"refs/tags/{tag}":
        raise ValueError("Git tag ref unavailable or unexpected")
    obj = ref.get("object")
    seen = set()
    for _ in range(5):
        if not isinstance(obj, dict):
            raise ValueError("Missing tag target")
        kind, sha = obj.get("type"), obj.get("sha")
        if not isinstance(sha, str) or not SHA_PATTERN.fullmatch(sha):
            raise ValueError("Invalid Git object SHA")
        sha = sha.lower()
        if sha in seen:
            raise ValueError("Circular annotated tag reference")
        seen.add(sha)
        if kind == "commit":
            return sha
        if kind != "tag":
            raise ValueError("Release tag does not resolve to a commit")
        annotation = fetch(f"https://api.github.com/repos/{repo}/git/tags/{sha}")
        if not isinstance(annotation, dict) or annotation.get("sha", "").lower() != sha:
            raise ValueError("Annotated tag object mismatch")
        obj = annotation.get("object")
    raise ValueError("Annotated tag nesting exceeds safety limit")
