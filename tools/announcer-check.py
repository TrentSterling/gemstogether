"""Transcribe the actual compressed game clips with the cached local Whisper."""
import argparse
import hashlib
import json
import re
from difflib import SequenceMatcher
from pathlib import Path
import numpy as np
import soundfile as sf
from faster_whisper import WhisperModel

out = Path(__file__).resolve().parent/'out/announcer'
parser=argparse.ArgumentParser();parser.add_argument('--line');parser.add_argument('--voice');args=parser.parse_args()
cache = Path.home()/'.cache/huggingface/hub/models--Systran--faster-whisper-base/snapshots'
model = WhisperModel(str(next(cache.iterdir())), device='cuda', compute_type='float16')
normalize = lambda s: re.sub('[^a-z]', '', s.lower())
results = []
prompt = 'Gems Together. Dawn Shallows. Tidepool. Ember Reef. Aurora Deep. Starfall. Prism Heart. Dazzling. Brilliant. Crown of Light. Prism Parade. Constellation. Resonance. Radiant Resonance. Prismatic Resonance. Supernova.'
for clip in json.loads((out/'catalog.json').read_text(encoding='utf-8')):
    if args.line and clip['line']!=args.line:
        continue
    if args.voice and clip['voice']!=args.voice:
        continue
    audio, rate = sf.read(out/clip['mp3'], dtype='float32')
    segments, _ = model.transcribe(str(out/clip['mp3']), language='en', beam_size=5,
        initial_prompt=prompt, condition_on_previous_text=False)
    heard = ' '.join(s.text.strip() for s in segments)
    score = SequenceMatcher(None, normalize(heard), normalize(clip['text'])).ratio()
    attempts=[{'prompt':'game glossary','heard':heard,'similarity':round(score,3)}]
    if score < .95:
        # The glossary can bias "done" toward the stage name "Dawn". Retain
        # that result and independently retry without any lexical prompt.
        plain,_=model.transcribe(str(out/clip['mp3']),language='en',beam_size=5,
                                condition_on_previous_text=False)
        plain_heard=' '.join(s.text.strip() for s in plain)
        plain_score=SequenceMatcher(None,normalize(plain_heard),normalize(clip['text'])).ratio()
        attempts.append({'prompt':'none','heard':plain_heard,'similarity':round(plain_score,3)})
        if plain_score>score:
            heard,score=plain_heard,plain_score
    peak = float(np.max(np.abs(audio)))
    energy = float(np.sqrt(np.mean(audio**2)))
    result = {'voice': clip['voice'], 'line': clip['line'], 'file': clip['mp3'],
        'mp3Sha256': hashlib.sha256((out/clip['mp3']).read_bytes()).hexdigest(),
        'expected': clip['text'], 'heard': heard, 'similarity': round(score, 3),
        'recognitionAttempts': attempts,
        'peak': round(peak, 4), 'rms': round(energy, 4),
        'pass': score >= .95 and energy > .025 and peak < .98}
    results.append(result)
    print(('PASS ' if result['pass'] else 'REVIEW ')+clip['mp3']+' / '+heard, flush=True)
prior=out/'speech-results.json'
if (args.line or args.voice) and prior.exists():
    replaced={r['file'] for r in results}
    results=[r for r in json.loads(prior.read_text(encoding='utf-8')) if r['file'] not in replaced]+results
prior.write_text(json.dumps(results, indent=2), encoding='utf-8')
failed = [r for r in results if not r['pass']]
print(len(results)-len(failed), 'passed;', len(failed), 'need review', flush=True)
raise SystemExit(1 if failed else 0)
