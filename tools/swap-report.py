"""Invalid-swap receipts page: tools/out/swap/index.html (static, open in any browser).
    node tools/swap-audit.mjs tools/out/swap-drop.html drop     (ChatGPT's 3.2.4 drop)
    node tools/swap-audit.mjs tools/out/swap-live.html live     (git show HEAD:index.html, what is live)
    node tools/swap-audit.mjs index.html after                  (this build)
    python tools/swap-report.py
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
W = ROOT / 'tools' / 'out' / 'swap'
C = W / 'crops'
C.mkdir(exist_ok=True)
BUILDS = [('drop', 'ChatGPT drop 3.2.4'), ('live', 'Live now (patch 4)'), ('after', 'Patch 5 (this build)')]
S = {k: json.loads((W / k / 'samples.json').read_text()) for k, _ in BUILDS if (W / k / 'samples.json').exists()}
COL = {'drop': '#ff6b81', 'live': '#ffb347', 'after': '#6fe3a1'}


def box(geo):
    (x0, y0), (x1, y1) = geo
    cell = abs(x1 - x0) or 60
    return (int(min(x0, x1) - cell * .95), int((y0 + y1) / 2 - cell * .8), int(max(x0, x1) + cell * .95), int((y0 + y1) / 2 + cell * .8))


def strip(label, prefix, names, geo, caps):
    cells = []
    for n, cap in zip(names, caps):
        src = W / label / f'{prefix}-{n:02d}.png'
        if not src.exists():
            continue
        im = Image.open(src).crop(box(geo))
        out = C / f'{label}-{prefix}-{n:02d}.png'
        im.save(out)
        cells.append(f'<figure><img src="crops/{out.name}" alt="{label} {prefix} {cap}"><figcaption>{cap}</figcaption></figure>')
    return f'<div class="strip">{"".join(cells)}</div>'


def chart(series, xmax, xlabel):
    """series: [(label, colour, [(x, y)])], y = 0 home .. 1 the other cell."""
    w, h, pl, pb = 640, 220, 44, 30
    X = lambda v: pl + v / xmax * (w - pl - 10)
    Y = lambda v: 12 + (1.15 - v) / 1.3 * (h - pb - 12)
    g = [f'<line x1="{pl}" x2="{w - 10}" y1="{Y(0):.1f}" y2="{Y(0):.1f}" class="ax"/>',
         f'<line x1="{pl}" x2="{w - 10}" y1="{Y(1):.1f}" y2="{Y(1):.1f}" class="ax dash"/>',
         f'<text x="4" y="{Y(0) + 4:.1f}">home</text><text x="4" y="{Y(1) + 4:.1f}">swapped</text>',
         f'<text x="{w - 10}" y="{h - 6}" text-anchor="end">{xlabel}</text>']
    for lab, col, pts in series:
        d = ' '.join(f'{X(x):.1f},{Y(y):.1f}' for x, y in pts if x <= xmax)
        g.append(f'<polyline points="{d}" fill="none" stroke="{col}" stroke-width="2.4"/>')
    leg = ''.join(f'<span><i style="background:{c}"></i>{l}</span>' for l, c, _ in series)
    return f'<svg viewBox="0 0 {w} {h}" role="img">{"".join(g)}</svg><div class="legend">{leg}</div>'


def norm(frames, home, tkey, scale=1):
    (pa, pb) = home
    span = (pb[0] - pa[0]) or 1
    t0 = frames[0][tkey]
    return [((f[tkey] - t0) * scale, (f['ax'] - pa[0]) / span) for f in frames]


def yes(v, good=True):
    return f'<b class="{"ok" if bool(v) == good else "bad"}">{"yes" if v else "no"}</b>'


rows = []
for k, name in BUILDS:
    d = S.get(k)
    if not d:
        continue
    for mode, blk in [('solo', d['solo'])] + [(f'co-op {w}', d['coop'][w]) for w in ('host', 'peer') if w in d.get('coop', {})]:
        v = blk['verdict']
        st = blk.get('during') or blk.get('after') or {}
        reach = v['reach'] >= .95
        rows.append(f'<tr><td>{name}</td><td>{mode}</td><td>{yes(reach)}</td><td class="{"ok" if v["maxJump"] < .3 else "bad"}">{v["maxJump"]:.2f} cell</td>'
                    f'<td>{yes(v["endsHome"])}</td><td>{yes(st.get("brackets"), False)}</td><td>{yes(st.get("toast"), False)}</td></tr>')

solo_series = [(n, COL[k], norm(S[k]['solo']['frames'], S[k]['solo']['home'], 't', 1000)) for k, n in BUILDS if k in S]
coop_charts = ''
for w in ('host', 'peer'):
    ser = [(n, COL[k], norm(S[k]['coop'][w]['trace'], S[k]['coop'][w]['home'], 't')) for k, n in BUILDS if k in S and w in S[k].get('coop', {})]
    coop_charts += f'<h3>Co-op {w}: real mouse drag, sampled every frame</h3>' + chart(ser, 800, 'ms')

solo_strips = ''
for k, n in BUILDS:
    if k not in S:
        continue
    fr = list(range(0, 34, 2))
    solo_strips += f'<h3>{n}</h3>' + strip(k, 'solo', fr, S[k]['solo']['geo'], [f'{f / 60 * 1000:.0f} ms' for f in fr])

coop_strips = ''
for w in ('host', 'peer'):
    for k, n in BUILDS:
        blk = S.get(k, {}).get('coop', {}).get(w)
        if not blk or not blk.get('shots'):
            continue
        n_shots = blk['shots']
        pick = sorted({round(i * (n_shots - 1) / 13) for i in range(14)})
        coop_strips += f'<h3>Co-op {w}, {n} (0.2x slow motion, screenshots as fast as CDP allows)</h3>' + strip(k, w, pick, blk['geo'], [f'#{i}' for i in pick])

html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invalid Swap Receipts</title><style>
:root{{--bg:#0d1417;--fg:#e8ecef;--dim:#94a3ab;--line:#2a3a41;--ok:#6fe3a1;--bad:#ff6b81}}
body{{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}}main{{max-width:1180px;margin:0 auto;padding:24px 16px 80px}}
h1{{font-size:26px;margin:0 0 4px}}h2{{margin:36px 0 8px;font-size:19px}}h3{{margin:20px 0 6px;font-size:14px;color:var(--dim);font-weight:600}}
p{{color:var(--dim);max-width:78ch}}table{{border-collapse:collapse;width:100%;font-size:14px}}td,th{{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left}}
.ok{{color:var(--ok)}}.bad{{color:var(--bad)}}.strip{{display:flex;gap:4px;overflow-x:auto;padding-bottom:6px}}figure{{margin:0;flex:0 0 auto}}
figure img{{height:92px;display:block;border-radius:4px}}figcaption{{font-size:11px;color:var(--dim);text-align:center}}
svg{{width:100%;max-width:640px;background:#111b1f;border-radius:6px}}svg text{{fill:var(--dim);font-size:11px}}.ax{{stroke:#3c5059}}.dash{{stroke-dasharray:4 4}}
.legend{{display:flex;gap:16px;font-size:13px;margin:4px 0 0}}.legend i{{display:inline-block;width:12px;height:3px;margin-right:6px;vertical-align:middle}}
</style></head><body><main>
<h1>Invalid swap receipts</h1>
<p>Gems Together, patch 5. Target: Bejeweled parity. The pair swaps fully at normal swap speed, bumps into the wrong cell (squash, rattle, dust, reject sound) and swaps back the same way, in every mode. tront.xyz puts everyone in the public co-op room, so the co-op rows are the ones players actually hit. Patch 4 only fixed solo, because the harness ran <code>#solo=1</code>.</p>
<h2>Verdicts</h2>
<table><tr><th>Build</th><th>Mode</th><th>Reaches the other cell</th><th>Biggest single-frame jump</th><th>Ends home</th><th>Red brackets</th><th>Toast</th></tr>{"".join(rows)}</table>
<p>A one-cell jump is a teleport. A normal swap moves at most about 0.12 cell per 60 fps frame. Co-op rows also checked: board hashes still match, the partner's gems do not move, and nothing goes over the network.</p>
<h2>Position over time</h2><h3>Solo: frame stepped at 1/60 s</h3>{chart(solo_series, 700, 'ms')}{coop_charts}
<h2>Solo filmstrips (every 2nd frame)</h2>{solo_strips}
<h2>Co-op filmstrips</h2>{coop_strips}
<p>Generated by tools/swap-audit.mjs + tools/swap-report.py.</p></main></body></html>'''
(W / 'index.html').write_text(html, encoding='utf-8')
print('wrote', W / 'index.html')
