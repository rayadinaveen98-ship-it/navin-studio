#!/usr/bin/env python3
"""Regenerate the standalone public site using only Python's standard library."""
from pathlib import Path
import json, re, sys
ROOT=Path(__file__).resolve().parent
catalog=json.loads((ROOT/'data/projects.json').read_text(encoding='utf-8'))
releases=json.loads((ROOT/'data/releases.json').read_text(encoding='utf-8'))
assert catalog['schema_version']==1 and isinstance(catalog['projects'],list)
assert releases['schema_version']==1 and isinstance(releases['published_releases'],list)
src=(ROOT/'src/app.js').read_text(encoding='utf-8')
css=(ROOT/'src/styles.css').read_text(encoding='utf-8')+'\n'+(ROOT/'src/project_experience.css').read_text(encoding='utf-8')
template=(ROOT/'template.html').read_text(encoding='utf-8')
def refresh_json(source,variable,data):
    expression=rf'(const {variable} = )\{{.*?\}}(;\s*)'
    replacement=json.dumps(data,ensure_ascii=False,separators=(',',':'))
    return re.sub(expression,lambda m:m.group(1)+replacement+m.group(2),source,count=1,flags=re.S)
src=refresh_json(src,'BUNDLED_CATALOG',catalog)
src=refresh_json(src,'BUNDLED_RELEASES',releases)
# Public project stories share the validated catalog and route state with the shell.
src+='\n'+(ROOT/'src/project_experience.js').read_text(encoding='utf-8')
site=template.replace('{{STYLES}}',css).replace('{{APP}}',src)
if '{{STYLES}}' in site or '{{APP}}' in site or '<script>' not in site:
    raise SystemExit('Template markers missing or nested incorrectly.')
output=ROOT/'index.html'
if '--check' in sys.argv:
    if not output.is_file() or output.read_text(encoding='utf-8')!=site:
        raise SystemExit('Build is stale. Run python3 site/build.py and commit changes.')
    print('PASS: output is reproducible')
else:
    output.write_text(site,encoding='utf-8')
    print(f'Wrote {output}: {len(site.encode("utf-8"))} bytes')
