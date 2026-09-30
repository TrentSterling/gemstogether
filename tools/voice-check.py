"""Check generated speech content with the existing cached Whisper base model."""
import json
import argparse
import re
from difflib import SequenceMatcher
from pathlib import Path
import numpy as np
import soundfile as sf
import torch
from faster_whisper import WhisperModel

out=Path(__file__).resolve().parent/'out/voices'
parser=argparse.ArgumentParser();parser.add_argument('--voice');parser.add_argument('--round', choices=['original','ryan','deep'], default='original');args=parser.parse_args()
if args.round=='ryan':
    out=out/'ryan-round2'
elif args.round=='deep':
    out=out/'deep-round3'
cache=Path.home()/'.cache/huggingface/hub/models--Systran--faster-whisper-base/snapshots'
model=WhisperModel(str(next(cache.iterdir())),device='cuda',compute_type='float16')
norm=lambda s: re.sub('[^a-z]','',s.lower())
receipts=[]
for clip in json.loads((out/'catalog.json').read_text(encoding='utf-8')):
    if args.voice and clip['voice']!=args.voice:
        continue
    audio,rate=sf.read(out/clip['file'],dtype='float32')
    segments,_=model.transcribe(str(out/clip['file']),language='en',beam_size=5,
        initial_prompt='Gems Together. Tidepool. Resonance. Supernova.',condition_on_previous_text=False)
    text=' '.join(s.text.strip() for s in segments)
    similarity=SequenceMatcher(None,norm(text),norm(clip['text'])).ratio()
    energy=float(np.sqrt(np.mean(audio**2)))
    result={'file':clip['file'],'expected':clip['text'],'heard':text,
            'similarity':round(similarity,3),'rms':round(energy,4),
            'pass':similarity>=.95 and energy>.025 and float(np.max(np.abs(audio)))<.98}
    receipts.append(result)
    print(json.dumps(result),flush=True)
prior=out/'speech-results.json'
if args.voice and prior.exists():
    replaced={r['file'] for r in receipts}
    receipts=[r for r in json.loads(prior.read_text(encoding='utf-8')) if r['file'] not in replaced]+receipts
prior.write_text(json.dumps(receipts,indent=2),encoding='utf-8')
failed=[r for r in receipts if not r['pass']]
print(len(receipts)-len(failed),'passed;',len(failed),'need listening review',flush=True)
raise SystemExit(1 if failed else 0)
