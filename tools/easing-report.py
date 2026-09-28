"""Easing audit report: crops the frame-stepped captures from tools/easing-audit.mjs into before/after
filmstrips and writes tools/out/easing/index.html (static, open it in any browser).
    node tools/easing-audit.mjs tools/out/before.html before
    node tools/easing-audit.mjs index.html after
    python tools/easing-report.py
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
E = ROOT / 'tools' / 'out' / 'easing'
C = E / 'crops'
C.mkdir(exist_ok=True)
S = {L: json.loads((E / L / 'samples.json').read_text()) for L in ('before', 'after')}

BOX = {'swap': (520, 300, 760, 436), 'combo': (900, 270, 1200, 425), 'toast': (430, 735, 850, 800), 'float': (540, 350, 740, 460)}


def crop(label, scene, name, tag=None, mark=False):
    im = Image.open(E / label / name).crop(BOX[scene])
    if mark:
        d = ImageDraw.Draw(im)
        d.rectangle([0, 0, im.width - 1, im.height - 1], outline=(255, 70, 90), width=4)
    out = C / f'{label}-{name}'
    im.save(out)
    return f'crops/{out.name}'


def strip(label, scene, names, captions, marks=()):
    cells = []
    for n, cap in zip(names, captions):
        src = crop(label, scene, n, mark=n in marks)
        cls = ' class="snap"' if n in marks else ''
        cells.append(f'<figure{cls}><img src="{src}" alt="{scene} {label} {cap}"><figcaption>{cap}</figcaption></figure>')
    return f'<div class="strip">{"".join(cells)}</div>'


# ---- swap curves (SVG) ----
def curve(frames, key, colour):
    xs = [f[key] for f in frames]
    pts = ' '.join(f'{40 + i * 14:.1f},{150 - (x + .7) * 100:.1f}' for i, x in enumerate(xs))
    dots = ''.join(f'<circle cx="{40 + i * 14:.1f}" cy="{150 - (x + .7) * 100:.1f}" r="2.6" fill="{colour}"/>' for i, x in enumerate(xs))
    return f'<polyline points="{pts}" fill="none" stroke="{colour}" stroke-width="2.2"/>{dots}'


fb, fa = S['before']['swap']['frames'], S['after']['swap']['frames']
jump = max(range(1, len(fb)), key=lambda i: abs(fb[i]['ax'] - fb[i - 1]['ax']))
jumpa = max(abs(fa[i]['ax'] - fa[i - 1]['ax']) for i in range(1, len(fa)))
grid = ''.join(f'<line x1="40" x2="660" y1="{150 - (v + .7) * 100:.1f}" y2="{150 - (v + .7) * 100:.1f}" class="g"/><text x="34" y="{154 - (v + .7) * 100:.1f}" class="ax" text-anchor="end">{v:+.2f}</text>' for v in (-.47, 0, .47))
ticks = ''.join(f'<text x="{40 + i * 14}" y="200" class="ax" text-anchor="middle">{i}</text>' for i in range(0, 44, 5))
svg = f'''<svg viewBox="0 0 680 215" role="img" aria-label="Gem x position per frame, before and after">
{grid}{ticks}
<text x="350" y="213" class="ax" text-anchor="middle">frame (1/60 s)</text>
{curve(fb, 'ax', 'var(--bad)')}{curve(fa, 'ax', 'var(--good)')}
<line x1="{40 + jump * 14}" x2="{40 + jump * 14}" y1="10" y2="190" stroke="var(--bad)" stroke-dasharray="4 4"/>
<text x="{46 + jump * 14}" y="22" class="note" fill="var(--bad)">frame {jump}: teleport {abs(fb[jump]['ax'] - fb[jump - 1]['ax']):.2f} units in one frame</text>
<text x="{46 + 22 * 14}" y="182" class="note" fill="var(--good)">after: overshoot to {min(f['ax'] for f in fa):.2f}, settle -0.47</text>
</svg>'''

swapn = [f'swap-{i:02d}.png' for i in range(8, 36)]
swapcap = [f'f{i}' for i in range(8, 36)]
sb = strip('before', 'swap', swapn, swapcap, marks={f'swap-{jump:02d}.png'})
sa = strip('after', 'swap', swapn, swapcap)

comn = [f'combo-{i:02d}.png' for i in range(0, 45, 2)]
comcap = [f'f{i * 2}' for i in range(0, 45, 2)]
cb, ca = strip('before', 'combo', comn, comcap), strip('after', 'combo', comn, comcap)
alpha = ' '.join(f'{f["al"]:.2f}' if f['al'] is not None else '-' for f in S['after']['combo']['frames'][::4])

tn = [f'toast-{i:03d}.png' for i in list(range(0, 20, 2)) + list(range(160, 190, 4))]
tcap = [f'f{int(n[6:9])}' for n in tn]
tb, ta = strip('before', 'toast', tn, tcap), strip('after', 'toast', tn, tcap)

fln = [f'float-{i:02d}.png' for i in range(0, 24, 2)]
flcap = [f'f{i}' for i in range(0, 24, 2)]
flb, fla = strip('before', 'float', fln, flcap), strip('after', 'float', fln, flcap)

ROWS = [
    ('Swap (valid)', 'smoothstep, .205 s, z arc + squeeze', 'animateActors, <code>m.type===\'swap\'?smooth(t)</code>', 'ok', 'Reads well. Kept.'),
    ('Swap (invalid) return', 'quintic in-out .23 s, from home to home', 'trySwap + reject branch in update()', 'fixed', 'One-frame teleport back, then a wobble in place. Now holds the swapped spot, returns with back-out overshoot over .34 s.'),
    ('Fall', 'ballistic (gravity 38) + damped spring land', 'startFall / animateActors fall branch', 'ok', 'Physically driven, stretch in flight, squash on land. Kept.'),
    ('Shuffle', 'quintic in-out .68 s, column stagger, z arc .65', 'shuffle()', 'ok', 'Dramatic on purpose. Kept.'),
    ('Hover lift', 'exponential approach, rate 26', 'animateActors hover', 'ok', 'Frame-rate independent. Kept.'),
    ('Clear pop', '(1 - t^2)(1 + .13 sin) over .135 s', 'animateActors pop', 'ok', 'Kept.'),
    ('Anticipation charge', 'smoothstep scale + energy t^2', 'animateActors charge', 'ok', 'Kept.'),
    ('Shock reaction', 'damped sine (32 Hz, decay 14)', 'animateActors reactions', 'ok', 'Kept.'),
    ('Score counter', 'exponential approach, rate 12', 'update() displayScore', 'ok', 'Kept.'),
    ('Combo plaque', 'none: on at cascade 2, off at comboEnd', 'CabinetUI draw, comboEnd block', 'fixed', 'Popped in and out. Now slides in with overshoot, number punches on each new step, fades and drifts out over .3 s.'),
    ('Toast', 'none: on, 2.8 s, off', 'CabinetUI draw, toastUntil block', 'fixed', 'Popped in and out. Now fades and rises in (.18 s), fades and settles out (.26 s).'),
    ('Score float', 'exp rise, linear fade, no entrance', 'CabinetUI floats', 'fixed', 'Appeared at full size. Now pops in at 1.5x and settles in about .2 s.'),
]
table = ''.join(f'<tr class="{v}"><td>{m}</td><td>{c}</td><td class="code">{w}</td><td><span class="pill {v}">{v.upper()}</span></td><td>{n}</td></tr>' for m, c, w, v, n in ROWS)

html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Easing Audit</title>
<style>
:root{{--bg:#0b1418;--panel:#12222a;--ink:#dfe9ea;--dim:#8aa3a8;--line:#26414a;--gold:#d4b471;--good:#5fe0a8;--bad:#ff5a74}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 system-ui,Segoe UI,sans-serif}}
main{{max-width:1180px;margin:0 auto;padding:28px 16px 80px}}h1{{font-size:28px;margin:0 0 4px;color:var(--gold)}}h2{{font-size:20px;margin:40px 0 8px;color:var(--gold)}}
.sub{{color:var(--dim);margin:0 0 20px}}section{{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:18px;margin:18px 0}}
table{{width:100%;border-collapse:collapse;font-size:14px}}td,th{{padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top;text-align:left}}th{{color:var(--dim);font-weight:600}}
.code,code{{font-family:ui-monospace,Consolas,monospace;font-size:12.5px;color:#b8d7da}}
.pill{{font:700 11px ui-monospace,monospace;padding:2px 8px;border-radius:99px}}.pill.ok{{background:#1c3b33;color:var(--good)}}.pill.fixed{{background:#3d2030;color:#ffb0bf}}
.row{{display:flex;align-items:center;gap:10px;margin:14px 0 6px}}.tag{{font:700 12px ui-monospace,monospace;padding:3px 9px;border-radius:5px}}.tag.b{{background:#3d1a22;color:var(--bad)}}.tag.a{{background:#16392d;color:var(--good)}}
.strip{{display:flex;gap:6px;overflow-x:auto;padding-bottom:8px}}figure{{margin:0;flex:0 0 auto;text-align:center}}figure img{{display:block;height:118px;border-radius:5px;border:1px solid var(--line)}}
figure.snap img{{border:2px solid var(--bad)}}figcaption{{font:11px ui-monospace,monospace;color:var(--dim);margin-top:3px}}figure.snap figcaption{{color:var(--bad);font-weight:700}}
svg{{width:100%;height:auto;background:#0d1b21;border-radius:8px}}.g{{stroke:var(--line)}}.ax{{fill:var(--dim);font:11px ui-monospace,monospace}}.note{{font:12px ui-monospace,monospace}}
.legend{{display:flex;gap:18px;font:12px ui-monospace,monospace;color:var(--dim);margin:6px 0}}.legend b{{display:inline-block;width:18px;height:3px;vertical-align:middle;margin-right:6px}}
pre{{background:#0d1b21;border:1px solid var(--line);border-radius:8px;padding:12px;overflow-x:auto;font:12.5px/1.5 ui-monospace,Consolas,monospace;color:#cfe3e5;white-space:pre-wrap}}
.kv{{display:grid;grid-template-columns:max-content 1fr;gap:4px 14px;font:13px ui-monospace,monospace}}.kv span:nth-child(odd){{color:var(--dim)}}
</style></head><body><main>
<h1>Gems Together: easing audit</h1>
<p class="sub">Every motion in the drop, checked frame by frame. Captures are stepped on a manual clock at 1/60 s per frame (game clock and <code>performance.now</code> both pinned), so the frames are exact, not sampled from a live run. Before = the hosted Resonance build; after = the same build with the easing patch. Cells 27 and 28 on the seed-43 board.</p>

<section><h2 style="margin-top:0">Inventory</h2><table><tr><th>Motion</th><th>Curve (as shipped)</th><th>Where</th><th>Verdict</th><th>Notes</th></tr>{table}</table></section>

<h2>1. Invalid swap: the snap</h2>
<section>
<div class="kv"><span>cause</span><span><code>board.swap()</code> returns null on a no-match swap, so the actors keep their home cell (<code>a.at</code>). The slide ends at <code>FEEL.swap</code> = .205 s but the reject starts at the phase deadline, .205 + .014 s. In that gap the actor is drawn at <code>cellXY(a.at)</code>: home.</span>
<span>then</span><span>the reject motion eases from <code>actor.pos</code> (already home) to home, so only the <code>sin(t*TAU)*.024</code> wobble moves.</span>
<span>measured</span><span>before: largest single-frame jump {abs(fb[jump]['ax'] - fb[jump - 1]['ax']):.2f} world units at frame {jump} (a whole cell). after: largest single-frame step {jumpa:.2f}.</span></div>
<div class="legend"><span><b style="background:var(--bad)"></b>before</span><span><b style="background:var(--good)"></b>after</span><span>gem A x position, world units (home -0.47, swapped +0.47)</span></div>
{svg}
<div class="row"><span class="tag b">BEFORE</span><span class="sub" style="margin:0">frame {jump} outlined: the teleport</span></div>{sb}
<div class="row"><span class="tag a">AFTER</span><span class="sub" style="margin:0">holds the swapped spot, then bounces back off an invisible wall</span></div>{sa}
<pre>// before
this.swapResult=this.board.swap(a,b);
...motion(a,this.swapPositions[i],'reject',.23,0,i?1:-1)        // from = actor.pos (already home)
e = m.type==='swap' ? smooth(t) : easeIO(t)                      // quintic in-out
// after
if(!this.swapResult){{aa.move.duration=bb.move.duration=FEEL.swap+FEEL.swapSettle;}}   // no gap before the deadline
this.motion(a,this.swapPositions[i],'reject',.34,0,i?1:-1);a.move.from=this.swapPositions[1-i].slice();
e = m.type==='reject' ? 1+2.7*(t-1)**3+1.7*(t-1)**2 : ...        // back-out, ~11% overshoot
deadline .24 -> .35 s so input unlocks when the gem has landed</pre>
</section>

<h2>2. Combo plaque</h2>
<section><p class="sub" style="margin-top:0">Shown at cascade x2, bumped to x3 at frame 24, ends at frame 60. After-build opacity every 4th frame: <code>{alpha}</code></p>
<div class="row"><span class="tag b">BEFORE</span></div>{cb}<div class="row"><span class="tag a">AFTER</span><span class="sub" style="margin:0">slide in with overshoot, x3 number punch, fade and drift out</span></div>{ca}</section>

<h2>3. Toast</h2>
<section><p class="sub" style="margin-top:0">First 20 frames, then frames 160 to 188 (the 2.8 s toast ends at frame 168).</p>
<div class="row"><span class="tag b">BEFORE</span></div>{tb}<div class="row"><span class="tag a">AFTER</span></div>{ta}</section>

<h2>4. Score float</h2>
<section><div class="row" style="margin-top:0"><span class="tag b">BEFORE</span></div>{flb}<div class="row"><span class="tag a">AFTER</span><span class="sub" style="margin:0">pops in at 1.5x, settles in about .2 s</span></div>{fla}</section>

<p class="sub">Regenerate: <code>node tools/easing-audit.mjs tools/out/before.html before</code>, <code>node tools/easing-audit.mjs index.html after</code>, <code>python tools/easing-report.py</code>. Errors during capture: before {S['before']['errors']}, after {S['after']['errors']}.</p>
</main></body></html>'''
(E / 'index.html').write_text(html, encoding='utf-8')
print('wrote', E / 'index.html', 'teleport frame', jump)
