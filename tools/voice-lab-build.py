"""Build a self-contained local listening page from actual generated receipts."""
import argparse
import json
from pathlib import Path
root=Path(__file__).resolve().parent
out=root/'out/voices'
parser=argparse.ArgumentParser()
parser.add_argument('--round', choices=['original','ryan'], default='original')
args=parser.parse_args()
order=['af_heart','am_puck','am_fenrir','qwen-serena','qwen-ryan','omni-female','omni-male']
if args.round=='ryan':
    out=out/'ryan-round2'
    order=['qwen-ryan','qwen-ryan-baritone','qwen-ryan-minus2','qwen-ryan-minus4',
           'qwen-cave-clean','qwen-cave-pa','qwen-gems-founder','qwen-cave-reference']
lines=['tidepool','dazzling','team','supernova']
results_path=out/'speech-results.json'
speech_results={r['file']:r for r in json.loads(results_path.read_text(encoding='utf-8'))} if results_path.exists() else {}
clips=[]
for voice in order:
    for line in lines:
        path=out/(voice+'-'+line+'.json')
        if path.exists():
            clip=json.loads(path.read_text(encoding='utf-8'))
            if not (out/clip['file']).exists():
                raise FileNotFoundError(clip['file'])
            if clip['file'] in speech_results:
                check=speech_results[clip['file']]
                clip.update(recognizedText=check['heard'], speechReview=not check['pass'])
            clips.append(clip)
html=(root/'voice-lab.html').read_text(encoding='utf-8').replace('__VOICE_CATALOG__',json.dumps(clips))
if args.round=='ryan':
    html=html.replace('A little voice,<br>a lot of light.', 'Ryan, lower.<br>A founder, warmer.')
    html=html.replace('Warm and playful voices for stage welcomes, big chains and moments together.',
        'Ryan is your pick. Compare a lower delivery prompt, two pitch shifts, custom founder designs and a clone of your actual Cave-inspired announcer.')
    html=html.replace('src="music-bed.wav"','src="../music-bed.wav"')
    html=html.replace('src="../clips/','src="../../clips/')
    html=html.replace('Dry voice samples, trimmed and adjusted to similar listening levels.',
        'Samples are adjusted to similar listening levels. The PA row adds your original speaker effects; all other rows are clean.')
    html=html.replace('<section><small>THE JOURNEY</small>',
        '<section><small>YOUR EXISTING ANNOUNCER</small><h2>The facility voice you liked.</h2>'
        '<p>The actual dawn take from your WHACKO run, for a direct reference.</p>'
        '<p class="hint">Original PA take</p><audio controls preload="metadata" src="facility-reference.wav"></audio>'
        '<p class="hint">The same original take before speaker effects</p><audio controls preload="metadata" src="facility-reference-clean.wav"></audio></section>'
        '<section><small>THE JOURNEY</small>')
elif (out/'ryan-round2/catalog.json').exists():
    html=html.replace('<div class="toolbar">',
        '<p><a href="ryan-round2/index.html">Ryan, lower pitches and Cave-inspired custom voices</a></p><div class="toolbar">')
out.mkdir(parents=True, exist_ok=True)
(out/'index.html').write_text(html,encoding='utf-8')
(out/'catalog.json').write_text(json.dumps(clips,indent=2),encoding='utf-8')
print(len(clips),'actual clips;',len(set(c['voice'] for c in clips)),'voices;',out/'index.html')
