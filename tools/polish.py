"""Build index.html from a ChatGPT drop in versions/ for hosting at https://tront.xyz/gemstogether/.
Exact bytes except: social meta + canonical after the description, em dashes out of player-facing
strings, and the tront.xyz About block. Every replacement must match exactly once or the script aborts.
    python tools/polish.py [versions/gemstogether-v3.2.4.html]
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'versions' / 'gemstogether-v3.2.4.html'
DST = ROOT / 'index.html'
OGV = 1
html = SRC.read_text(encoding='utf-8')
orig = html


def rep(old, new, count=1):
    global html
    n = html.count(old)
    if n != count:
        sys.exit(f'ABORT: expected {count} match(es), found {n} for: {old[:90]!r}')
    html = html.replace(old, new)


DESC = 'Match three with the people you love. A co-op jewel board in the browser: everyone who opens the page plays on the same board, or share a private room code.'
rep('<title>Gems Together</title>',
    '<title>Gems Together</title>'
    '<meta name="author" content="Trent Sterling (Tront)">'
    '<link rel="canonical" href="https://tront.xyz/gemstogether/">'
    '<meta property="og:type" content="website">'
    '<meta property="og:title" content="Gems Together by Tront">'
    f'<meta property="og:description" content="{DESC}">'
    '<meta property="og:url" content="https://tront.xyz/gemstogether/">'
    f'<meta property="og:image" content="https://tront.xyz/gemstogether/og-image.png?v={OGV}">'
    '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">'
    '<meta name="twitter:card" content="summary_large_image">'
    '<meta name="twitter:title" content="Gems Together by Tront">'
    f'<meta name="twitter:description" content="{DESC}">'
    f'<meta name="twitter:image" content="https://tront.xyz/gemstogether/og-image.png?v={OGV}">')

rep("this.toast('No moves — reshuffling')", "this.toast('No moves, reshuffling')")

# Internal names: the game is Gems Together. Save keys, the co-op appId (network namespace) and the
# debug alias still said jewelbound (ChatGPT's working title); rename them. Resets pre-launch saves only.
rep("jewelbound-", "gemstogether-", 15)
rep("window.jewelbound=app;", "")

# Right-click / long-press on the canvas opened Chrome's "Save image as" menu over the board.
rep("bindInput(){const c=this.canvas;",
    "bindInput(){const c=this.canvas;c.addEventListener('contextmenu',e=>e.preventDefault());")
rep("#scene{display:block;", "#scene{-webkit-touch-callout:none;display:block;")
# Browser shortcuts also fired game hotkeys (Ctrl+F = fullscreen, Ctrl+D = Showcase, Alt+Left swallowed).
rep("let k=e.key.toLowerCase();if([' '", "if(e.ctrlKey||e.metaKey||e.altKey)return;let k=e.key.toLowerCase();if([' '")
# Trackpad pinch / Ctrl+wheel over the board zoomed the page and cropped the GPU UI.
rep("c.addEventListener('wheel',e=>{if(a.panelOpen){", "c.addEventListener('wheel',e=>{if(e.ctrlKey){e.preventDefault();return;}if(a.panelOpen){")

left = [(i + 1, l[:100]) for i, l in enumerate(html.split('\n')) if '—' in l and not l.lstrip().startswith(('/*', '//', '*')) and 'replace(/[' not in l]
print('em-dash lines outside comments:', left)
DST.write_text(html, encoding='utf-8', newline='\n')
print(f'wrote {DST} ({len(orig)} -> {len(html)} bytes)')
subprocess.run([sys.executable, 'C:/trontstack/seo/about.py', 'gemstogether'], check=True)
