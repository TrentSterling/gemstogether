"""Crops every corner around the true projected orb centre (crosshair) for each size: tools/out/align/<label>-sheet.png"""
import json, sys
from PIL import Image, ImageDraw
label = sys.argv[1] if len(sys.argv) > 1 else 'after'
D = json.load(open(f'tools/out/align/{label}-corners.json'))
tiles = []
for size, v in D.items():
    im = Image.open(v['file']).convert('RGB'); k = im.width / int(size.split('x')[0])
    for (x, y) in v['orbs']:
        r = int(70 * k * (0.6 if size.startswith('390') else 1)); cx, cy = int(x * k), int(y * k)
        t = im.crop((cx - r, cy - r, cx + r, cy + r)).resize((180, 180)); d = ImageDraw.Draw(t)
        d.line([(80, 90), (100, 90)], fill=(0, 255, 0), width=1); d.line([(90, 80), (90, 100)], fill=(0, 255, 0), width=1)
        tiles.append((size, t))
S = Image.new('RGB', (180 * 4, 200 * (len(tiles) // 4)), (13, 20, 23)); d = ImageDraw.Draw(S)
for i, (size, t) in enumerate(tiles):
    x, y = (i % 4) * 180, (i // 4) * 200; S.paste(t, (x, y + 18))
    if i % 4 == 0: d.text((x + 4, y + 3), f'{label} {size}', fill=(232, 236, 239))
S.save(f'tools/out/align/{label}-sheet.png'); print('wrote', f'tools/out/align/{label}-sheet.png')
