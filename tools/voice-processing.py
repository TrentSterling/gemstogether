"""Local processing gauntlet for the shipped Silver performances.

No TTS or publishing. Render all 19 lines for every preset, then build a real
game sandbox with isolated saves and no public-room connection. --check checks
four representative compressed calls per preset with the cached Whisper model.
"""
import argparse
import base64
import hashlib
import importlib.util
import json
import re
import shutil
import subprocess
import sys
from difflib import SequenceMatcher
from pathlib import Path

sys.dont_write_bytecode = True
import numpy as np
import parselmouth
import soundfile as sf
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tools/out/voices/processing-round7'
SOURCE = ROOT / 'tools/out/announcer'
PAGE = ROOT / 'tools/voice-processing.html'
KEYS = ['welcome-back', 'brilliant', 'resonance', 'supernova']
BODY = ('highpass=f=48,equalizer=f=120:t=q:w=0.75:g=3.5,'
        'equalizer=f=380:t=q:w=0.8:g=-2,equalizer=f=3000:t=q:w=0.8:g=-1.5,'
        'acompressor=threshold=0.08:ratio=2.5:attack=12:release=150:makeup=1')


def preset(key, name, group, note, **settings):
    return dict(id=key, name=name, group=group, note=note, semitones=0,
                formants=1, body=False, **settings)


# Explicit settings instead of a random search: first isolate changes, then
# compare complete chains. Higher wet levels intentionally bracket the subtle rows.
PRESETS = [
    preset('dry', '01 / Shipped Silver', 'Depth', 'The exact live MP3s; the baseline.'),
    preset('body', '02 / Chest and control', 'Depth', 'More low body, less upper edge; gentle compression.'),
    preset('vowels', '03 / Darker vowels', 'Depth', 'Same pitch and timing; vowel resonance lowered 10%.'),
    preset('down2', '04 / Two down', 'Depth', 'Two semitones lower; original vowel shape and timing.'),
    preset('down4', '05 / Four down', 'Depth', 'Four semitones lower; original vowel shape and timing.'),
    preset('deep', '06 / Deep and rounded', 'Depth', 'Four down, 8% darker vowels, body EQ and control.'),
    preset('room', '07 / Close chamber', 'Space', 'A short 0.45-second room; 22% wet, 18 ms pre-delay.'),
    preset('plate', '08 / Smooth plate', 'Space', 'A denser 1.0-second tail; 25% wet, 28 ms pre-delay.'),
    preset('hall', '09 / Spacious hall', 'Space', 'A longer 1.6-second tail; 30% wet, 38 ms pre-delay.'),
    preset('reflections', '10 / Early reflections', 'Space', 'Three quiet reflections at 24, 43 and 67 ms; no long tail.'),
    preset('slap90', '11 / Ninety millisecond echo', 'Echo', 'Dark 90 ms repeat, with two quieter repeats.'),
    preset('slap160', '12 / One-sixty echo', 'Echo', 'A more distinct 160 ms repeat, with two quieter repeats.'),
    preset('eighth', '13 / Eighth-note echo', 'Echo', '341 ms repeats at the game\'s 88 BPM, filtered and fading.'),
    preset('quarter', '14 / Quarter-note echo', 'Echo', '682 ms repeats at 88 BPM; the widest echo comparison.'),
    preset('deep-room', '15 / Deep chamber', 'Combined', 'Two down, darker vowels and body, plus a 0.75-second chamber.'),
    preset('deep-plate', '16 / Deep luminous plate', 'Combined', 'Four down, darker vowels and body, plus a 1.2-second plate.'),
    preset('deep-echo', '17 / Deep echo and room', 'Combined', 'Four down and body, 170 ms echoes, with a short room beneath.'),
    preset('deep-hall', '18 / Deep grand hall', 'Combined', 'Four down and body, with a conspicuous 2.3-second hall tail.'),
    preset('deep-bloom', '19 / Deep stereo bloom', 'Combined', 'Four down, body, a quiet stereo double and 1.3-second space.'),
    preset('cabinet', '20 / Cabinet ambience', 'Combined', 'Two down and body, using the gem SFX room\'s decay, filter and seed.'),
]
CONFIG = {
    'body': dict(body=True), 'vowels': dict(formants=.90),
    'down2': dict(semitones=-2), 'down4': dict(semitones=-4),
    'deep': dict(semitones=-4, formants=.92, body=True),
    'room': dict(room=dict(rt60=.45, wet=.22, pre=.018, cutoff=3800)),
    'plate': dict(room=dict(rt60=1., wet=.25, pre=.028, cutoff=4300)),
    'hall': dict(room=dict(rt60=1.6, wet=.30, pre=.038, cutoff=3200)),
    'reflections': dict(echo=dict(taps=[[.024,.22],[.043,.15],[.067,.09]], cutoff=3400)),
    'slap90': dict(echo=dict(delay=.09, wet=.28, feedback=.30, repeats=3, cutoff=3000)),
    'slap160': dict(echo=dict(delay=.16, wet=.26, feedback=.35, repeats=3, cutoff=3000)),
    'eighth': dict(echo=dict(delay=60/88/2, wet=.26, feedback=.42, repeats=4, cutoff=2800)),
    'quarter': dict(echo=dict(delay=60/88, wet=.24, feedback=.42, repeats=4, cutoff=2400)),
    'deep-room': dict(semitones=-2, formants=.94, body=True, room=dict(rt60=.75, wet=.25, pre=.022, cutoff=3500)),
    'deep-plate': dict(semitones=-4, formants=.92, body=True, room=dict(rt60=1.2, wet=.29, pre=.030, cutoff=3800)),
    'deep-echo': dict(semitones=-4, formants=.92, body=True,
                     echo=dict(delay=.17, wet=.28, feedback=.36, repeats=4, cutoff=2600),
                     room=dict(rt60=.45, wet=.13, pre=.020, cutoff=3200)),
    'deep-hall': dict(semitones=-4, formants=.90, body=True, room=dict(rt60=2.3, wet=.38, pre=.040, cutoff=2800)),
    'deep-bloom': dict(semitones=-4, formants=.92, body=True, double=True,
                      room=dict(rt60=1.3, wet=.23, pre=.028, cutoff=3400)),
    'cabinet': dict(semitones=-2, formants=.94, body=True, cabinet=True),
}
for entry in PRESETS:
    entry.update(CONFIG.get(entry['id'], {}))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run_audio(audio, rate, filters):
    command = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-nostdin',
               '-f', 'f64le', '-ar', str(rate), '-ac', str(1 if audio.ndim == 1 else audio.shape[1]),
               '-i', '-', '-af', filters, '-ar', str(rate), '-f', 'f64le', '-']
    result = subprocess.run(command, input=audio.astype('<f8').tobytes(), capture_output=True, check=True)
    return np.frombuffer(result.stdout, dtype='<f8').copy().reshape((-1, audio.shape[1])) if audio.ndim == 2 else np.frombuffer(result.stdout, dtype='<f8').copy()


def lower(audio, rate, semitones, formants):
    if not semitones and formants == 1:
        return audio.copy()
    sound = parselmouth.Sound(audio, sampling_frequency=rate)
    if formants != 1:
        voiced = sound.to_pitch_ac(pitch_floor=40, pitch_ceiling=500).selected_array['frequency']
        median = float(np.median(voiced[voiced > 0]))
        return parselmouth.praat.call(sound, 'Change gender', 40, 500, formants,
                                     median * 2**(semitones/12), 1, 1).values[0]
    manipulation = parselmouth.praat.call(sound, 'To Manipulation', .01, 40, 500)
    tier = parselmouth.praat.call(manipulation, 'Extract pitch tier')
    parselmouth.praat.call(tier, 'Multiply frequencies', 0, len(audio)/rate, 2**(semitones/12))
    parselmouth.praat.call([tier, manipulation], 'Replace pitch tier')
    return parselmouth.praat.call(manipulation, 'Get resynthesis (overlap-add)').values[0]


def filtered(audio, rate, cutoff):
    audio = sosfilt(butter(2, 110, 'highpass', fs=rate, output='sos'), audio, axis=0)
    return sosfilt(butter(2, cutoff, fs=rate, output='sos'), audio, axis=0)


def echo(audio, rate, settings):
    taps = settings.get('taps') or [[settings['delay']*(i+1), settings['wet']*settings['feedback']**i]
                                  for i in range(settings['repeats'])]
    stereo = np.column_stack([audio, audio]) if audio.ndim == 1 else audio
    wet = filtered(stereo, rate, settings['cutoff'])
    result = np.pad(stereo, ((0, round(max(t[0] for t in taps)*rate)), (0, 0)))
    for seconds, gain in taps:
        start = round(seconds*rate)
        result[start:start+len(audio)] += wet * gain
    return result


def space(audio, rate, settings):
    stereo = np.column_stack([audio, audio]) if audio.ndim == 1 else audio
    length = round(settings['rt60']*rate)
    time = np.arange(length)/rate
    rng = np.random.default_rng(300930)
    result = np.zeros((len(audio)+length+round(settings['pre']*rate)-1, 2))
    result[:len(audio)] = stereo
    for channel in range(2):
        ir = rng.normal(size=length)*np.exp(-time*np.log(1000)/settings['rt60'])
        ir *= 1-np.exp(-time/0.008)
        ir = filtered(ir, rate, settings['cutoff'])
        for seconds, gain in [[.017,.16],[.032,.12],[.051,.09]]:
            if round(seconds*rate) < length:
                ir[round(seconds*rate)] += gain*np.linalg.norm(ir)
        ir /= max(np.linalg.norm(ir), 1e-12)
        ir = np.pad(ir, (round(settings['pre']*rate), 0))
        result[:,channel] += settings['wet']*fftconvolve(stereo[:,channel], ir)
    return result


def cabinet(audio, rate):
    # Same xorshift32, low-pass recurrence, decay and 1.2 s extent as JewelAudio.
    state = 8928
    length = round(rate*1.2)
    result = np.zeros((len(audio)+length-1, 2))
    result[:len(audio)] = audio[:,None]
    for channel in range(2):
        ir = np.zeros(length)
        low = 0.
        for i in range(length):
            state ^= (state << 13) & 0xffffffff
            state ^= state >> 17
            state ^= (state << 5) & 0xffffffff
            state &= 0xffffffff
            low = low*.67 + (state/4294967296*2-1)*.33
            t = i/rate
            ir[i] = low*np.exp(-t*5.5)*min(1, t/.021)
        ir /= max(np.linalg.norm(ir), 1e-12)
        result[:,channel] += .27*fftconvolve(audio, ir)
    return result


def double(audio, rate):
    result = np.column_stack([audio, audio])
    result = np.pad(result, ((0, round(.022*rate)), (0,0)))
    for channel, cents, seconds in [[0,-6,.018],[1,6,.022]]:
        shifted = run_audio(audio, rate, f'rubberband=pitch={2**(cents/1200)}:formant=preserved:transients=smooth')
        shifted = filtered(shifted, rate, 3500)
        start = round(seconds*rate)
        result[start:start+min(len(shifted),len(result)-start),channel] += .14*shifted[:len(result)-start]
    return result


def loudness(path):
    result=subprocess.run(['ffmpeg','-hide_banner','-nostdin','-i',str(path),
        '-af','loudnorm=I=-24:TP=-1.5:LRA=11:print_format=json','-f','null','-'],
        capture_output=True,text=True,check=True)
    return json.JSONDecoder().raw_decode(result.stderr[result.stderr.rfind('{'):])[0]


def normalize(catalog):
    # Linear gain preserves long echo/reverb tails. FFmpeg's dynamic loudnorm
    # can change its gating between passes for long decays; measure the result.
    (OUT/'raw').mkdir(exist_ok=True)
    receipts=[]
    for c in catalog:
        path=OUT/c['file'];raw=OUT/'raw'/c['file']
        if not c.get('normalization'):
            shutil.copyfile(path,raw)
        elif digest(raw)!=c['normalization']['rawSha256']:
            raise ValueError('Retained raw changed: '+c['file'])
        source,rate=sf.read(raw,dtype='float64')
        measured=loudness(raw)
        gain=1. if c['retainPcm'] else 10**((-24-float(measured['input_i']))/20)
        for _ in range(4):
            if c['retainPcm']:
                shutil.copyfile(raw,path)
            else:
                if np.max(np.abs(source*gain))>.83:
                    raise ValueError('Loudness matching needs peak limiting: '+c['file'])
                sf.write(path,source*gain,rate,subtype='PCM_16')
            measured=loudness(path)
            error=-24-float(measured['input_i'])
            if abs(error)<=.35:
                break
            gain*=10**(error/20)
        actual,actual_rate=sf.read(path)
        detail=dict(file=path.name,targetLUFS=-24,measuredLUFS=float(measured['input_i']),
            truePeakDb=float(measured['input_tp']),raw='raw/'+path.name,rawSha256=digest(raw),
            gain=round(gain,6),channels=sf.info(path).channels,
            **{'pass':abs(error)<=.35 and float(measured['input_tp'])<=-1.3
                    and abs(len(actual)/actual_rate-len(source)/rate)<.005})
        if not detail['pass']:
            raise ValueError('Loudness check failed: '+str(detail))
        c.update(normalization=detail,sha256=digest(path),
                 peak=round(float(np.max(np.abs(actual))),5),rms=round(float(np.sqrt(np.mean(actual**2))),5))
        receipts.append(detail)
        (OUT/(c['voice']+'-'+c['line']+'.json')).write_text(json.dumps(c,indent=2),encoding='utf-8')
        print('LEVEL',path.name,detail['measuredLUFS'],detail['truePeakDb'],flush=True)
    (OUT/'level-results.json').write_text(json.dumps(receipts,indent=2),encoding='utf-8')


def build(pack, guards):
    catalog = []
    for p in PRESETS:
        for key, original in pack['profiles']['silver']['clips'].items():
            stem = p['id']+'-'+key
            record_path = OUT/(stem+'.json')
            source = SOURCE/('silver-'+key+'.wav')
            record = json.loads((SOURCE/('silver-'+key+'.json')).read_text(encoding='utf-8'))
            if digest(source) != record['sha256']:
                raise ValueError('Shipped Silver PCM changed: '+str(source))
            fingerprint = hashlib.sha256(json.dumps(dict(preset=p, source=digest(source),
                code=digest(Path(__file__)), pipeline=1), sort_keys=True).encode()).hexdigest()
            previous = json.loads(record_path.read_text(encoding='utf-8')) if record_path.exists() else {}
            if (previous.get('fingerprint') == fingerprint and (OUT/previous['file']).exists()
                    and digest(OUT/previous['file']) == previous['sha256']
                    and (OUT/previous['mp3']).exists() and digest(OUT/previous['mp3']) == previous['mp3Sha256']):
                catalog.append(previous)
                continue
            path = OUT/(stem+'.wav')
            if p['id'] == 'dry':
                shutil.copyfile(source, path)
            else:
                audio, rate = sf.read(source, dtype='float64')
                changed = lower(audio, rate, p['semitones'], p['formants'])
                if abs(len(changed)-len(audio))/rate > .015:
                    raise ValueError('Pitch processing changed timing: '+stem)
                if p['body']:
                    changed = run_audio(changed, rate, BODY)
                if p.get('double'):
                    changed = double(changed, rate)
                if p.get('echo'):
                    changed = echo(changed, rate, p['echo'])
                if p.get('room'):
                    changed = space(changed, rate, p['room'])
                if p.get('cabinet'):
                    changed = cabinet(changed, rate)
                changed[-min(len(changed),round(.01*rate)):] *= np.linspace(1,0,min(len(changed),round(.01*rate)))[:,None] if changed.ndim==2 else np.linspace(1,0,min(len(changed),round(.01*rate)))
                if not np.isfinite(changed).all():
                    raise ValueError('Invalid render: '+stem)
                sf.write(path, changed, rate, subtype='FLOAT')
            clip = dict(voice=p['id'], label=p['name'], engine='Silver / retained production performance',
                        line=key, text=original['text'], file=path.name, fingerprint=fingerprint,
                        sourceSha256=digest(source), sourceMp3Sha256=original['sha256'],
                        preset=p, retainPcm=p['id']=='dry', duration=sf.info(path).duration)
            record_path.write_text(json.dumps(clip, indent=2), encoding='utf-8')
            catalog.append(clip)
        print('Rendered',p['name'],'/ 19 calls',flush=True)
    (OUT/'catalog.json').write_text(json.dumps(catalog, indent=2),encoding='utf-8')
    normalize(catalog)
    embedded = {p['id']:{} for p in PRESETS}
    for c in catalog:
        mp3 = OUT/(c['voice']+'-'+c['line']+'.mp3')
        if c['voice']=='dry':
            mp3.write_bytes(base64.b64decode(pack['profiles']['silver']['clips'][c['line']]['data']))
        else:
            subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-y',
                '-i',str(OUT/c['file']),'-ar','24000','-b:a','96k',str(mp3)],check=True)
        c.update(mp3=mp3.name,mp3Sha256=digest(mp3))
        (OUT/(c['voice']+'-'+c['line']+'.json')).write_text(json.dumps(c,indent=2),encoding='utf-8')
        embedded[c['voice']][c['line']] = dict(data=base64.b64encode(mp3.read_bytes()).decode(),
            text=c['text'],sha256=c['mp3Sha256'],duration=c['duration'])
    (OUT/'catalog.json').write_text(json.dumps(catalog,indent=2),encoding='utf-8')
    plan=dict(presets=PRESETS,previewKeys=KEYS,clipCount=len(catalog),guards=guards,
              productionChanged=False,selectionPending=True,default='dry',gameBpm=88,
              ffmpegDocumentation='https://ffmpeg.org/ffmpeg-filters.html')
    (OUT/'plan.json').write_text(json.dumps(plan,indent=2),encoding='utf-8')
    write_player(plan, pack, embedded)
    for name,checksum in guards.items():
        if digest(ROOT/name)!=checksum:
            raise RuntimeError('Production changed during local auditions: '+name)
    print('Built',len(PRESETS),'presets /',len(catalog),'calls; production hashes unchanged.',flush=True)


def write_player(plan, pack=None, embedded=None):
    page=PAGE.read_text(encoding='utf-8')
    (OUT/'index.html').write_text(page.replace('__PROCESSING_PLAN__',json.dumps(plan)),encoding='utf-8')
    if pack is None:
        return
    game=(ROOT/'index.html').read_text(encoding='utf-8')
    # Remove legacy payload from the audition clone, retaining all Silver metadata.
    clone_pack={**pack,'profiles':{'silver':pack['profiles']['silver']}}
    game,count=re.subn(r'const ANNOUNCER_PACK=.*?;\nconst ANNOUNCER_VISIT=',
        lambda m:'const ANNOUNCER_PACK='+json.dumps(clone_pack)+';\nconst ANNOUNCER_VISIT=',game,flags=re.S)
    if count!=1:
        raise ValueError('Unable to locate the shipped pack in the audition clone')
    game=game.replace('gemstogether-', 'gemstogether-'+OUT.name+'-')
    game=game.replace('<title>Gems Together', '<title>Gems Together voice sandbox')
    prelude='<script>if(!location.hash.includes("solo=1"))location.hash="solo=1";</script>'
    game=game.replace('<head>','<head>'+prelude,1) if '<head>' in game else prelude+game
    script=(ROOT/'tools/voice-processing-game.js').read_text(encoding='utf-8')
    script=script.replace('__PROCESSING_PRESETS__',json.dumps(PRESETS)).replace('__PROCESSING_AUDIO__',json.dumps(embedded))
    game=game.replace('</body>','<script>'+script+'</script></body>')
    (OUT/'game.html').write_text(game,encoding='utf-8')


def check():
    from faster_whisper import WhisperModel
    snapshots=Path.home()/'.cache/huggingface/hub/models--Systran--faster-whisper-base/snapshots'
    model=WhisperModel(str(next(snapshots.iterdir())),device='cuda',compute_type='float16')
    norm=lambda s:re.sub('[^a-z]','',s.lower())
    receipts=[]
    for c in json.loads((OUT/'catalog.json').read_text(encoding='utf-8')):
        if c['line'] not in KEYS:
            continue
        segments,_=model.transcribe(str(OUT/c['mp3']),language='en',beam_size=5,
            initial_prompt='Gems Together. Brilliant. Resonance. Supernova.',condition_on_previous_text=False)
        heard=' '.join(s.text.strip() for s in segments)
        similarity=SequenceMatcher(None,norm(heard),norm(c['text'])).ratio()
        receipt=dict(file=c['mp3'],expected=c['text'],heard=heard,similarity=round(similarity,3),
                     passed=similarity>=.95)
        receipts.append(receipt)
        print(json.dumps(receipt),flush=True)
    (OUT/'speech-results.json').write_text(json.dumps(receipts,indent=2),encoding='utf-8')
    plan=json.loads((OUT/'plan.json').read_text(encoding='utf-8'))
    plan['speechChecks']=receipts
    (OUT/'plan.json').write_text(json.dumps(plan,indent=2),encoding='utf-8')
    write_player(plan)
    print(sum(r['passed'] for r in receipts),'/',len(receipts),'compressed speech checks passed.',flush=True)
    # Strong processing is exploratory; the player shows any recognition warning.


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--check',action='store_true')
    parser.add_argument('--check-only',action='store_true')
    args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True)
    if not args.check_only:
        guards={name:digest(ROOT/name) for name in ['index.html','tools/announcer-pack.json']}
        pack=json.loads((ROOT/'tools/announcer-pack.json').read_text(encoding='utf-8'))
        build(pack,guards)
    if args.check or args.check_only:
        check()


if __name__=='__main__':
    main()
