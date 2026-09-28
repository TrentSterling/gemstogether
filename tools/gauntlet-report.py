"""Polish gauntlet receipts: tools/out/gauntlet/index.html. One section per round from tools/gauntlet.json:
before/after clips side by side (tools/clip.mjs output) plus matched frame pairs.
    python tools/gauntlet-report.py
"""
import json
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CL = ROOT / 'tools' / 'out' / 'clips'
G = ROOT / 'tools' / 'out' / 'gauntlet'
(G / 'media').mkdir(parents=True, exist_ok=True)
rounds = json.loads((ROOT / 'tools' / 'gauntlet.json').read_text(encoding='utf-8'))


def media(name):
    for ext in ('mp4', 'gif'):
        src = CL / f'{name}.{ext}'
        if src.exists():
            shutil.copy(src, G / 'media' / src.name)
    return f'media/{name}.mp4'


def frame(name, f, box=None):
    src = CL / name / f'{f:03d}.png'
    if not src.exists():
        return ''
    im = Image.open(src)
    if box:
        im = im.crop(box)
    im.thumbnail((640, 400))
    out = G / 'media' / f'{name}-{f:03d}.jpg'
    im.convert('RGB').save(out, quality=88)
    return f'media/{out.name}'


secs = []
for r in rounds:
    b, a = r['before'], r['after']
    vids = (f'<div class="pair"><figure><video src="{media(b)}" autoplay loop muted playsinline controls></video><figcaption>Before: {r.get("beforeLabel", b)}</figcaption></figure>'
            f'<figure><video src="{media(a)}" autoplay loop muted playsinline controls></video><figcaption>After: {r.get("afterLabel", a)}</figcaption></figure></div>')
    pairs = ''
    for f, cap in r.get('frames', []):
        pairs += (f'<div class="pair"><figure><img src="{frame(b, f)}" alt="before {cap}"><figcaption>Before, {cap}</figcaption></figure>'
                  f'<figure><img src="{frame(a, f)}" alt="after {cap}"><figcaption>After, {cap}</figcaption></figure></div>')
    extra = ''
    for au, cap in r.get('audio', []):
        src = ROOT / au
        if src.exists():
            shutil.copy(src, G / 'media' / src.name)
            extra += f'<figure><audio src="media/{src.name}" controls preload="none"></audio><figcaption>{cap}</figcaption></figure>'
    for im, cap in r.get('images', []):
        src = ROOT / im
        if src.exists():
            shutil.copy(src, G / 'media' / src.name)
            extra += f'<figure><img src="media/{src.name}" alt="{cap}"><figcaption>{cap}</figcaption></figure>'
    for v, cap in r.get('videos', []):
        src = CL / f'{v}.mp4'
        if src.exists():
            shutil.copy(src, G / 'media' / src.name)
            extra += f'<figure><video src="media/{src.name}" autoplay loop muted playsinline controls></video><figcaption>{cap}</figcaption></figure>'
    if extra:
        pairs += '<h3>More</h3>' + extra
    checks = ''.join(f'<li>{c}</li>' for c in r.get('checks', []))
    notes = ''.join(f'<li>{n}</li>' for n in r.get('changes', []))
    secs.append(f'<section><h2>{r["title"]}</h2><p class="why">{r.get("why", "")}</p><h3>What changed</h3><ul>{notes}</ul>'
                f'<h3>Clips (frame-stepped, 30 fps, same deterministic board)</h3>{vids}<h3>Matched frames</h3>{pairs}<h3>Checks</h3><ul class="checks">{checks}</ul></section>')

html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Polish Gauntlet</title><style>
:root{{--bg:#0d1417;--fg:#e8ecef;--dim:#94a3ab;--line:#2a3a41;--ok:#6fe3a1}}
body{{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,sans-serif}}main{{max-width:1320px;margin:0 auto;padding:24px 16px 80px}}
h1{{font-size:28px;margin:0}}h2{{font-size:21px;margin:44px 0 4px;border-top:1px solid var(--line);padding-top:24px}}h3{{font-size:14px;color:var(--dim);margin:18px 0 8px}}
.why{{color:var(--dim);max-width:80ch}}.pair{{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}}
@media (max-width:760px){{.pair{{grid-template-columns:1fr}}}}figure{{margin:0}}video,img,audio{{width:100%;border-radius:6px;display:block;background:#000}}
figcaption{{font-size:12px;color:var(--dim);padding-top:3px}}.checks li::marker{{content:"\\2713  ";color:var(--ok)}}
</style></head><body><main><h1>Gems Together: polish gauntlet</h1>
<p class="why">Each round: make it better, check the work, receipts. Clips come from tools/clip.mjs (manual clock, so before and after show the exact same moments).</p>
{"".join(secs)}</main></body></html>'''
(G / 'index.html').write_text(html, encoding='utf-8')
print('wrote', G / 'index.html')
