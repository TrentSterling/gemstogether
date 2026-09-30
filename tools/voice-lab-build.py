"""Build a self-contained local listening page from actual generated receipts."""
import argparse
import json
from pathlib import Path
root=Path(__file__).resolve().parent
out=root/'out/voices'
parser=argparse.ArgumentParser()
parser.add_argument('--round', choices=['original','ryan','deep','tone','casting'], default='original')
args=parser.parse_args()
order=['af_heart','am_puck','am_fenrir','qwen-serena','qwen-ryan','omni-female','omni-male']
if args.round=='ryan':
    out=out/'ryan-round2'
    order=['qwen-ryan','qwen-ryan-baritone','qwen-ryan-minus2','qwen-ryan-minus4',
           'qwen-cave-clean','qwen-cave-pa','qwen-gems-founder','qwen-cave-reference']
lines=['tidepool','dazzling','team','supernova']
if args.round in ['deep','tone','casting']:
    out=out/({'deep':'deep-round3','tone':'tone-round4','casting':'casting-round5'}[args.round])
    manifest=json.loads((out/'plan.json').read_text(encoding='utf-8'))
    if manifest['status']!='generated; listening review pending':
        raise ValueError('Deep audition generation has not completed')
    order=sorted(manifest['candidates'],key=lambda voice:2 if voice.startswith('baseline-') else 1 if voice.startswith('edited-') else 0) if args.round=='deep' else manifest['candidates']
    if args.round=='casting':
        order=['reference-baritone']+[v for v in order if not v.startswith('reference-')]+['reference-cave']
    lines=list(manifest['lines'])
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
if args.round in ['deep','tone','casting']:
    html=html.replace('Gems Together | Voice auditions','Gems Together | Deep voice auditions')
    html=html.replace('Dry voice samples, trimmed and adjusted to similar listening levels.', 'All samples are matched to the same listening loudness. Original renders are retained separately.')
    html=html.replace('29 SEPTEMBER 2026','30 SEPTEMBER 2026')
    html=html.replace('A little voice,<br>a lot of light.', 'A deeper voice.<br>The same spark.')
    html=html.replace('Warm and playful voices for stage welcomes, big chains and moments together. Each candidate reads the same four lines. Pick a line to compare everyone, or listen to a voice\'s whole set.',
        'Deep Qwen voices for Gems Together. Compare fresh bass and baritone designs, deeper edits of the performances you liked, and the current voices. Each reads the same three lines.')
    html=html.replace('<option value="tidepool">Stage welcome</option><option value="dazzling">Big combo</option><option value="team">Team Resonance</option><option value="supernova">Supernova</option>',
        '<option value="welcome-back">Welcome back</option><option value="brilliant">Brilliant</option><option value="resonance">Resonance</option>')
    html=html.replace("labels={tidepool:'Stage welcome',dazzling:'Big combo',team:'Team Resonance',supernova:'Supernova'}", "labels={'welcome-back':'Welcome back',brilliant:'Brilliant',resonance:'Resonance'}")
    html=html.replace("all.textContent='All four'", "all.textContent='All three'")
    html=html.replace('src="music-bed.wav"','src="../music-bed.wav"')
    html=html.replace('gems-voice-favorite','gems-deep-voice-favorite')
    start=html.index('<section><small>THE JOURNEY</small>')
    end=html.index('</section>',start)+len('</section>')
    html=html[:start]+('<section><small>WHAT TO COMPARE</small><h2>Depth, energy and clarity.</h2>'
        '<p>The fresh voices use a new Qwen character reference, lowered before Qwen generates the short lines. Their finished clips have no pitch edit. The deep edits retain the existing performance while lowering pitch and darkening resonance. The current pack rows are your baseline.</p>'
        '<p>Try each welcome first, then the short victory calls. Listen for a full chesty sound, lively emphasis and clear words. Your favourite here does not change the game pack.</p></section>')+html[end:]
    html=html.replace('review that before selecting it for Steam','review that before publishing it')
    html=html.replace('b.dataset.clip=voice', "b.title=clip.medianPitchHz?'Measured median pitch: '+clip.medianPitchHz+' Hz':'';b.dataset.clip=voice")
    if args.round=='tone':
        html=html.replace('Gems Together | Deep voice auditions','Gems Together | Cave voice refinements')
        html=html.replace('A deeper voice.<br>The same spark.','Same voice.<br>More weight?')
        html=html.replace('Deep Qwen voices for Gems Together. Compare fresh bass and baritone designs, deeper edits of the performances you liked, and the current voices. Each reads the same three lines.',
            'Your favourite Cave performance, with one change at a time: darker vowel resonance, two more semitones down, or gentle announcer processing. The fresh baritone you ranked second is here too. Each reads the same three lines.')
        html=html.replace('gems-deep-voice-favorite','gems-tone-voice-favorite')
        html=html.replace('The fresh voices use a new Qwen character reference, lowered before Qwen generates the short lines. Their finished clips have no pitch edit. The deep edits retain the existing performance while lowering pitch and darkening resonance. The current pack rows are your baseline.',
            'Start with Cave / your favourite. Darker resonance keeps the pitch and timing; another 2 down keeps the original vowels; body + room keeps the voice and pitch while adding EQ, compression and a short room tail. These are the same performances throughout.')
        html=html.replace('identity.append(engine,title,fav)',"const note=document.createElement('p');note.className='hint';note.textContent=clips[0].description;identity.append(engine,title,note,fav)")
        html=html.replace('<div class="toolbar">','<p><a href="../deep-round3/index.html">Previous deep voice auditions</a></p><div class="toolbar">')
    elif args.round=='casting':
        html=html.replace('Gems Together | Deep voice auditions','Gems Together | Described voice casting')
        html=html.replace('A deeper voice.<br>The same spark.','Twelve characters.<br>Find the voice.')
        html=html.replace('Deep Qwen voices for Gems Together. Compare fresh bass and baritone designs, deeper edits of the performances you liked, and the current voices. Each reads the same three lines.',
            'A wider casting: twelve newly described Qwen characters, from velvet baritone to gravelly bass and theatrical showman. Your baritone favourite comes first; darker Cave is the final reference. Compare everyone on one line, then hear the full sets for the contenders.')
        html=html.replace('gems-deep-voice-favorite','gems-casting-voice-favorite')
        html=html.replace('The fresh voices use a new Qwen character reference, lowered before Qwen generates the short lines. Their finished clips have no pitch edit. The deep edits retain the existing performance while lowering pitch and darkening resonance. The current pack rows are your baseline.',
            'Each new description casts a character, then one retained reference keeps that speaker across the three lines. If the native reference was high, its depth was prepared before Qwen generated the short calls. The finished new calls have no pitch edit. Open a row\'s Voice description to see its exact casting direction.')
        html=html.replace('identity.append(engine,title,fav)',"const note=document.createElement('p');note.className='hint';note.textContent=clips[0].description;identity.append(engine,title,note,fav)")
        html=html.replace('row.append(identity,buttons);voices.append(row)',
            "row.append(identity,buttons);if(clips[0].style){const detail=document.createElement('details');detail.style.gridColumn='1 / -1';const summary=document.createElement('summary');summary.textContent='Voice description';summary.style.cursor='pointer';summary.style.color='var(--dim)';summary.style.fontSize='13px';const prompt=document.createElement('p');prompt.textContent=clips[0].style;detail.append(summary,prompt);row.append(detail);}voices.append(row)")
        html=html.replace('<div class="toolbar">','<p><a href="../tone-round4/index.html">Previous pitch and resonance comparison</a></p><div class="toolbar">')
elif args.round=='ryan':
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
