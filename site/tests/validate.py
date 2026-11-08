#!/usr/bin/env python3
"""Validate public catalog, release publication constraints, and reproducible output."""
from pathlib import Path
import json, re, subprocess
ROOT=Path(__file__).resolve().parents[1]
catalog=json.loads((ROOT/'data/projects.json').read_text(encoding='utf-8'))
releases=json.loads((ROOT/'data/releases.json').read_text(encoding='utf-8'))
assert catalog['schema_version']==1
assert releases['schema_version']==1
assert catalog['editorial_status'] in ('draft','approved')
seen=set()
for p in catalog['projects']:
    assert re.fullmatch('[a-z0-9]+(?:-[a-z0-9]+)*',p['id'])
    assert p['id'] not in seen;seen.add(p['id'])
    assert p['catalog_state'] in ('draft','published','archived')
    assert re.fullmatch('[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+',p['repository'])
    if p['catalog_state']!='published':
        assert p['published_release_tag'] is None
        assert p['approved_download_url'] is None
        assert p['approved_demo_url'] is None
for item in releases['published_releases']:
    assert item['approved'] and item['qa_passed'] and item['signature_checked']
    assert re.fullmatch('[a-f0-9]{40}',item['source_commit'])
    assert re.fullmatch('[a-f0-9]{64}',item['sha256'])
    p=next(p for p in catalog['projects'] if p['id']==item['project_id'])
    assert p['catalog_state']=='published'
    assert item['release_tag']==p['published_release_tag']
    assert item['download_url']==p['approved_download_url']
    assert re.match(r'^https://github\.com/[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+/releases/download/',item['download_url'])
root_catalog=ROOT.parent/'data/projects.json'
if root_catalog.exists():
    assert json.loads(root_catalog.read_text(encoding='utf-8'))['projects']==catalog['projects']
subprocess.run(['python3',str(ROOT/'build.py'),'--check'],check=True)
print(f'PASS: {len(seen)} known projects and {len(releases["published_releases"])} approved releases; build reproducible')
