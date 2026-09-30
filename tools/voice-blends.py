"""Blend the three closer round-nine voices; retain exact listening controls.

Two literal time-aligned mixes, then two single-voice versions combining the
steady pitch with darker vowels and short stereo layers. No TTS or publishing.
"""
import argparse
import base64
import importlib.util
import json
import shutil
import subprocess
import sys
from pathlib import Path

sys.dont_write_bytecode = True
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('tuning', ROOT/'tools/voice-tuning.py')
tuning = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tuning)
pg = tuning.pg
OLD = ROOT/'tools/out/voices/tuning-round9'
OUT = ROOT/'tools/out/voices/blends-round10'
pg.OUT = OUT
pg.PAGE = ROOT/'tools/voice-blends.html'

STEREO = dict(center=.50, wet=.72, cents=12, left=.012, right=.027)
ROOM = dict(rt60=.25, wet=.10, pre=.010, cutoff=3000)
PRESETS = [
    dict(id='dry', name='01 / Shipped Silver', group='Original controls',
         note='The exact live clips, before tuning or layering.', source='dry'),
    dict(id='note-lock', name='02 / Original 06: one low note', group='Your three closer voices',
         note='Exact original 06: steady 92 Hz, dry and deliberately robotic.', source='note-lock'),
    dict(id='crystal-tune', name='03 / Original 07: stereo crystal', group='Your three closer voices',
         note='Exact original 07: tighter low notes, stereo doubles and a small bloom.', source='crystal-tune'),
    dict(id='crystal-low', name='04 / Original 08: dark crystal', group='Your three closer voices',
         note='Exact original 08: lower 82 Hz centre, darker vowels and stronger stereo layering.', source='crystal-low'),
    dict(id='blend-balanced', name='05 / All three: balanced', group='Literal blend',
         note='20% of 06, 45% of 07 and 35% of 08. The three original treatments mixed together.',
         mix={'note-lock':.20, 'crystal-tune':.45, 'crystal-low':.35}),
    dict(id='blend-soft', name='06 / All three: softer robot', group='Literal blend',
         note='10% of 06, 60% of 07 and 30% of 08. Less fixed-note voice in the same blend.',
         mix={'note-lock':.10, 'crystal-tune':.60, 'crystal-low':.30}),
    dict(id='blend-locked', name='07 / Locked crystal, layered', group='Combined treatment',
         note='06\'s steady 92 Hz voice, with darker vowels and fuller stereo layers. One main pitch throughout.',
         centerMidi=42, flatten=1., snap=1., retuneSeconds=0., formants=.88,
         body=True, stereo=STEREO, room=ROOM),
    dict(id='blend-almost', name='08 / Almost locked, layered', group='Combined treatment',
         note='The same dark stereo treatment, with a little pitch movement to ease the robot effect.',
         centerMidi=42, flatten=.88, snap=.65, retuneSeconds=.025, formants=.88,
         body=True, stereo=STEREO, room=ROOM),
]
pg.PRESETS = PRESETS


def checked_source(catalog, preset, key, extension):
    c=catalog[preset+'/'+key]
    path=OLD/c['file' if extension=='wav' else 'mp3']
    if pg.digest(path)!=c['sha256' if extension=='wav' else 'mp3Sha256']:
        raise ValueError('Retained round-nine asset changed: '+str(path))
    return path


def build():
    OUT.mkdir(parents=True,exist_ok=True)
    pack=json.loads((ROOT/'tools/announcer-pack.json').read_text(encoding='utf-8'))
    guards={name:pg.digest(ROOT/name) for name in ['index.html','tools/announcer-pack.json']}
    old={c['voice']+'/'+c['line']:c for c in json.loads((OLD/'catalog.json').read_text(encoding='utf-8'))}
    catalog=[]
    checks=[]
    pitch=[]
    source_guards={}
    for p in PRESETS:
        for key,original in pack['profiles']['silver']['clips'].items():
            stem=p['id']+'-'+key
            path=OUT/(stem+'.wav')
            correction=None
            used={}
            if p.get('source'):
                source=checked_source(old,p['source'],key,'wav')
                shutil.copyfile(source,path)
                used[str(source.relative_to(ROOT))]=pg.digest(source)
            elif p.get('mix'):
                layers=[]
                rates=[]
                for voice,gain in p['mix'].items():
                    source=checked_source(old,voice,key,'wav')
                    audio,rate=sf.read(source,dtype='float64',always_2d=True)
                    if audio.shape[1]==1:
                        audio=np.repeat(audio,2,axis=1)
                    if audio.shape[1]!=2:
                        raise ValueError('Unexpected channel layout')
                    layers.append((audio,gain))
                    rates.append(rate)
                    used[str(source.relative_to(ROOT))]=pg.digest(source)
                if len(set(rates))!=1:
                    raise ValueError('Mix sources have different sample rates')
                # All takes share the exact performance and compensated onset.
                # Zero-pad the shorter tails; never truncate a source.
                changed=np.zeros((max(len(a) for a,_ in layers),2))
                for audio,gain in layers:
                    changed[:len(audio)] += audio*gain
                sf.write(path,changed,rate,subtype='FLOAT')
            else:
                source=pg.SOURCE/('silver-'+key+'.wav')
                record=json.loads((pg.SOURCE/('silver-'+key+'.json')).read_text(encoding='utf-8'))
                if pg.digest(source)!=record['sha256']:
                    raise ValueError('Shipped source changed')
                audio,rate=sf.read(source,dtype='float64')
                changed=pg.lower(audio,rate,0,p['formants'])
                changed,contour=tuning.tune(changed,rate,p)
                stats=tuning.pitch_stats(changed,rate)
                correction=dict(preset=p['id'],line=key,**stats,contour=contour)
                pitch.append(correction)
                sf.write(OUT/(stem+'-tuned-only.wav'),changed,rate,subtype='FLOAT')
                if p['id']=='blend-locked':
                    passed=abs(12*np.log2(stats['medianHz']/float(tuning.hz(42))))<.30 and stats['spanSemitones']<.5
                else:
                    passed=abs(12*np.log2(stats['medianHz']/float(tuning.hz(42))))<1 and stats['spanSemitones']<2.5
                checks.append(dict(name='Actual single-voice pitch: '+stem,passed=bool(passed),
                    medianHz=stats['medianHz'],spanSemitones=stats['spanSemitones']))
                changed=pg.run_audio(changed,rate,tuning.BODY)
                changed=tuning.spread(changed,rate,p['stereo'])
                changed=pg.space(changed,rate,p['room'])
                changed=pg.run_audio(changed,rate,
                    'alimiter=limit=0.25:attack=3:release=60:level=false:latency=true')
                n=min(len(changed),round(.01*rate))
                changed[-n:] *= np.linspace(1,0,n)[:,None]
                if not np.isfinite(changed).all():
                    raise ValueError('Invalid render')
                sf.write(path,changed,rate,subtype='FLOAT')
                used[str(source.relative_to(ROOT))]=pg.digest(source)
            source_guards.update(used)
            clip=dict(voice=p['id'],label=p['name'],line=key,text=original['text'],
                engine='Silver / retained performances / blend and layer audition',
                file=path.name,preset=p,retainPcm=bool(p.get('source')),
                sourceHashes=used,duration=sf.info(path).duration)
            catalog.append(clip)
        print('Rendered',p['name'],'/ 19 calls',flush=True)
    pg.normalize(catalog)
    embedded={p['id']:{} for p in PRESETS}
    for c in catalog:
        mp3=OUT/(c['voice']+'-'+c['line']+'.mp3')
        if c['retainPcm']:
            source=checked_source(old,c['preset']['source'],c['line'],'mp3')
            shutil.copyfile(source,mp3)
            source_guards[str(source.relative_to(ROOT))]=pg.digest(source)
        else:
            subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-y',
                '-i',str(OUT/c['file']),'-ar','24000','-b:a','96k',str(mp3)],check=True)
        c.update(mp3=mp3.name,mp3Sha256=pg.digest(mp3))
        (OUT/(c['voice']+'-'+c['line']+'.json')).write_text(json.dumps(c,indent=2),encoding='utf-8')
        embedded[c['voice']][c['line']]=dict(data=base64.b64encode(mp3.read_bytes()).decode(),
            text=c['text'],sha256=c['mp3Sha256'],duration=c['duration'])
    (OUT/'catalog.json').write_text(json.dumps(catalog,indent=2),encoding='utf-8')
    (OUT/'tuning-results.json').write_text(json.dumps(pitch,indent=2),encoding='utf-8')
    (OUT/'pitch-checks.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
    plan=dict(presets=PRESETS,previewKeys=pg.KEYS,clipCount=len(catalog),guards=guards,
        productionChanged=False,selectionPending=True,default='dry',gameBpm=88,
        sourceGuards=source_guards,expectedPitchChecks=len(checks),expectedPresetCount=8,
        favouriteStorageKey='gems-blends-round10-favourites',
        auditProbes=dict(space='blend-balanced',switch='blend-soft',depth='blend-locked',
                         voice='blend-almost',file='blend-balanced'),
        firefoxProbes=dict(space='blend-balanced',voice='blend-almost',automatic='blend-locked'),
        processing='Time-aligned PCM blends; Praat single-voice correction, darker formants and short stereo layers',
        pitchChecks=checks)
    (OUT/'plan.json').write_text(json.dumps(plan,indent=2),encoding='utf-8')
    pg.write_player(plan,pack,embedded)
    for name,checksum in {**guards,**source_guards}.items():
        if pg.digest(ROOT/name)!=checksum:
            raise ValueError('Retained source changed: '+name)
    print('Actual pitch checks:',sum(r['passed'] for r in checks),'/',len(checks),flush=True)
    print('Built eight comparisons / 152 calls; production and round-nine sources unchanged.',flush=True)
    if not all(r['passed'] for r in checks):
        raise ValueError('Pitch correction needs review')


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--check',action='store_true')
    parser.add_argument('--check-only',action='store_true')
    args=parser.parse_args()
    if not args.check_only:
        build()
    if args.check or args.check_only:
        pg.check()


if __name__=='__main__':
    main()
