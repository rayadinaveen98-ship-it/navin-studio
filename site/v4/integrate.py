"""Add the reviewed A+C public homepage without replacing other SPA routes.

This standard-library-only transform is deliberately invoked *after* the
existing V3/M3 template and project editorial assets have been bundled.
"""
from pathlib import Path
import re

def integrate(site: str, root: Path) -> str:
    base=root/'v4'
    home=(base/'home.html').read_text(encoding='utf-8')
    css=(base/'home.css').read_text(encoding='utf-8')
    js=(base/'home.js').read_text(encoding='utf-8')
    old=re.search(r'<!-- HOME -->[\s\S]*?(?=<!-- CREATIONS -->)',site)
    if old is None or 'id="view-home"' not in old.group():
        raise ValueError('V4 integration: expected existing public home view is missing')
    replacement='<!-- HOME V4.2 · A+C REVIEW -->\n<section class="view is-active v4-home" id="view-home" data-view="home" aria-label="Home"><div class="v4-site-shell">'+home+'</div></section>\n'
    site=site[:old.start()]+replacement+site[old.end():]
    # Existing public CSS and JS remain first, V4 Home additions run afterward.
    if site.count('</style>')!=1 or site.count('</script>')<1:raise ValueError('Unexpected public site structure')
    site=site.replace('</style>','\n/* V4.2 reviewed public Home */\n'+css+'\n</style>',1)
    pos=site.rfind('</script>')
    # A separate script avoids interfering with V3 runtime initialization order;
    # project data script is application/json, never executable.
    site=site[:pos+len('</script>')]+'\n<script>\n'+js+'\n</script>'+site[pos+len('</script>'):]
    # V4.3 project enhancement loads after the M3 route function and V4.2 Home.
    worlds_css=(base/'worlds.css').read_text(encoding='utf-8')
    worlds_js=(base/'worlds.js').read_text(encoding='utf-8')
    site=site.replace('</style>','\n/* V4.3 Project Worlds public enhancement */\n'+worlds_css+'\n</style>',1)
    last=site.rfind('</script>')
    site=site[:last+len('</script>')]+'\n<script>\n'+worlds_js+'\n</script>'+site[last+len('</script>'):]
    return site
