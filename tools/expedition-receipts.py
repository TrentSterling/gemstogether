"""Collect the 3.3 release evidence without modifying earlier rounds."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
Image.open(root/'tools/out/og-04.png').crop((0,30,1200,660)).save(root/'og-image.png')
path = root/'tools/gauntlet.json'
rounds = json.loads(path.read_text(encoding='utf-8'))
title = 'Round 17 (3.3.0 / patch 21): your journey, together'
entry = {
    'title': title,
    'why': "Trent: implement every remaining priority and brainstorm except MIDI. Add warm, playful voice auditions and make stage travel smooth.",
    'before': 'before-expedition-cascade', 'beforeLabel': '3.2.4 / patch 20',
    'after': 'expedition-3.3-cascade', 'afterLabel': '3.3.0 / patch 21',
    'changes': [
        'Saved stage journey, lifetime treasury, six cabinet ornaments and 22 milestones; tap onboarding and comfort choices.',
        'Shared Timed, Moves, four puzzles and daily boards; high fives, team fanfare, named chains, session highlights and best-run ghost.',
        'Stage props and 3.2-second background/prop transitions. A real move continues during travel on WebGPU and WebGL.',
        'Local photo mode with stamped PNG export, living gems, music meters, spectator cheers and Jennifer calm preset.',
        'Portable Windows build and isolated Steam preparation; local voice audition tools compare identical announcer lines.'
    ],
    'frames': [[40,'Same deterministic cascade']],
    'images': [
        ['tools/out/expedition/webgpu-1280-board.png','Desktop cabinet and tap hint'],
        ['tools/out/expedition/webgpu-390-board.png','Phone cabinet'],
        ['tools/out/expedition/prism-treasury.png','Unlocked Prism Heart and treasury ornaments'],
        ['tools/out/expedition/webgpu-1280-play.png','Shared challenge menu'],
        ['tools/out/expedition/photo-mode.png','Local photo view']
    ],
    'videos': [['expedition-3.3-stage','Stage fade; play continues']],
    'checks': [
        'Original verify 22/22; feature/private co-op 48/48; desktop/phone/backend visual checks 68/68.',
        'Isolated public spectator, team moments and host migration 15/15; stage travel and shooting stars on both backends 16/16.',
        'Existing co-op Resonance 10/10 and point ping 10/10; invalid swaps slide out and home for solo, host and peer, with matching hashes and zero errors.',
        'Packaged Windows executable: real WebGPU, 64 gems, isolated preload, unknown achievement rejected, resolution/fullscreen and progression pass.',
        'Before/after cascade and stage clips: zero errors. Seven voices and 28 actual WAVs; audition browser gate 34/34, independent spoken-content check 28/28 and signal/peak/duration receipts.'
    ]
}
for i, prior in enumerate(rounds):
    if prior['title'] == title:
        rounds[i] = entry
        break
else:
    rounds.append(entry)
path.write_text(json.dumps(rounds,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('OG v3 and release round written')
