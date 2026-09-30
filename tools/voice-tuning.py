"""Actual F0 correction on retained Silver, with dry and stereo comparisons.

Praat PitchTier editing / PSOLA; not the Antares plug-in. Inspired by the local
glados project's pitch_correct.py, with a lower tracking floor, logarithmic
range control, explicit retune time and measured resynthesis. OG game snippets
are listening references only. Rendered assets remain local.
"""
import argparse
import base64
import hashlib
import importlib.util
import json
import shutil
import subprocess
import sys
from pathlib import Path

sys.dont_write_bytecode = True
import numpy as np
import parselmouth
import soundfile as sf
from scipy.ndimage import median_filter
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('processing', ROOT/'tools/voice-processing.py')
pg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pg)
OUT = ROOT/'tools/out/voices/tuning-round9'
pg.OUT = OUT
pg.PAGE = ROOT/'tools/voice-tuning.html'
BODY = ('highpass=f=48,equalizer=f=170:t=q:w=0.7:g=4,'
        'equalizer=f=450:t=q:w=0.8:g=-2,equalizer=f=3000:t=q:w=0.8:g=-4,'
        'acompressor=threshold=0.07:ratio=2:attack=15:release=130:makeup=1')
PRESETS = [
    dict(id='dry', name='01 / Shipped Silver', group='Controls',
         note='Exact live clips. The original performance, before depth or tuning.'),
    dict(id='deep-echo', name='02 / Previous closest: 17', group='Controls',
         note='Exact Deep echo and room from the last round. Keep this as a reference.'),
    dict(id='clean-deep', name='03 / Depth without the tube', group='Dry depth',
         note='Four semitones lower, slightly darker vowels. No tuning, echo or room.',
         semitones=-4, formants=.92),
    dict(id='gentle-tune', name='04 / Gentle low tuning', group='Pitch correction / dry',
         note='Calmer pitch movement around F-sharp 2 (92 Hz), with gentle note attraction.',
         centerMidi=42, flatten=.60, snap=.55, retuneSeconds=.045, formants=.92),
    dict(id='hard-tune', name='05 / Hard chromatic snap', group='Pitch correction / dry',
         note='Fast, full semitone locking. Hear the exposed tuning before adding any space.',
         centerMidi=42, flatten=.35, snap=1., retuneSeconds=.005, formants=.92),
    dict(id='note-lock', name='06 / One low crystal note', group='Pitch correction / dry',
         note='All voiced syllables held at F-sharp 2 (92 Hz). The deliberately synthetic extreme.',
         centerMidi=42, flatten=1., snap=1., retuneSeconds=0., formants=.92),
    dict(id='crystal-tune', name='07 / Tuned stereo crystal', group='Pitch correction / layered',
         note='Tighter low notes, stronger short stereo doubles and low-mid body. A small bloom, no long echo.',
         centerMidi=42, flatten=.65, snap=1., retuneSeconds=.012, formants=.92,
         body=True, stereo=dict(center=.60, wet=.65, cents=12, left=.012, right=.027),
         room=dict(rt60=.25, wet=.10, pre=.010, cutoff=3200)),
    dict(id='crystal-low', name='08 / Dark crystal: E2', group='Pitch correction / layered',
         note='Lower 82 Hz centre, nearly level notes and a more prominent stereo layer. Short bloom only.',
         centerMidi=40, flatten=.85, snap=1., retuneSeconds=.008, formants=.88,
         body=True, stereo=dict(center=.40, wet=.80, cents=11, left=.009, right=.026),
         room=dict(rt60=.30, wet=.12, pre=.012, cutoff=2800)),
]
pg.PRESETS = PRESETS


def midi(hz):
    return 69 + 12*np.log2(np.maximum(hz, 1e-10)/440)


def hz(note):
    return 440*2**((np.asarray(note)-69)/12)


def tune(audio, rate, p):
    sound = parselmouth.Sound(audio, sampling_frequency=rate)
    manipulation = parselmouth.praat.call(sound, 'To Manipulation', .005, 50, 450)
    source_tier = parselmouth.praat.call(manipulation, 'Extract pitch tier')
    count = parselmouth.praat.call(source_tier, 'Get number of points')
    times = np.array([parselmouth.praat.call(source_tier, 'Get time from index', i)
                      for i in range(1, count+1)])
    old_hz = np.array([parselmouth.praat.call(source_tier, 'Get value at index', i)
                       for i in range(1, count+1)])
    if not count:
        raise ValueError('No voiced points for tuning')
    old_midi = midi(old_hz)
    centre = p['centerMidi']
    target = centre+(old_midi-np.median(old_midi))*(1-p['flatten'])
    # Prevent implausible tracker excursions from becoming note jumps.
    target = np.clip(target, centre-7, centre+7)
    notes = np.round(target)
    if p['snap'] == 1 and p['flatten'] < 1:
        notes = median_filter(notes, size=5, mode='nearest')
    corrected = target+(notes-target)*p['snap']
    # Time constant is explicit. Reset at unvoiced gaps, preserving consonants.
    tau = p['retuneSeconds']
    tracked = corrected.copy()
    if tau:
        for i in range(1, count):
            dt = times[i]-times[i-1]
            if dt < .035:
                tracked[i] = tracked[i-1]+(1-np.exp(-dt/tau))*(corrected[i]-tracked[i-1])
    tier = parselmouth.praat.call('Create PitchTier', 'tuned', 0, len(audio)/rate)
    for t, frequency in zip(times, hz(tracked)):
        parselmouth.praat.call(tier, 'Add point', float(t), float(frequency))
    parselmouth.praat.call([tier, manipulation], 'Replace pitch tier')
    result = parselmouth.praat.call(manipulation, 'Get resynthesis (overlap-add)').values[0]
    if abs(len(result)-len(audio)) > 1:
        raise ValueError('Pitch correction altered timing')
    return result, dict(times=times.tolist(), inputHz=old_hz.tolist(),
                        targetHz=hz(tracked).tolist(), centerHz=float(hz(centre)))


def spread(audio, rate, settings):
    length = len(audio)+round(max(settings['left'], settings['right'])*rate)
    result = np.zeros((length, 2))
    result[:len(audio)] = settings['center']*audio[:, None]
    for channel, sign, delay in [(0, -1, settings['left']), (1, 1, settings['right'])]:
        shift = pg.run_audio(audio, rate,
            f"rubberband=pitch={2**(sign*settings['cents']/1200)}:formant=preserved:transients=smooth")
        shift = sosfilt(butter(2, [48, 4000], 'bandpass', fs=rate, output='sos'), shift)
        start = round(delay*rate)
        n = min(len(shift), length-start)
        result[start:start+n, channel] += settings['wet']*shift[:n]
    return result


def pitch_stats(audio, rate):
    s = parselmouth.Sound(audio, sampling_frequency=rate)
    pitch = s.to_pitch_ac(time_step=.005, pitch_floor=50, pitch_ceiling=300)
    f = pitch.selected_array['frequency']
    voiced = f > 0
    m = midi(f[voiced])
    return dict(times=pitch.xs()[voiced].tolist(), hz=f[voiced].tolist(),
                medianHz=float(np.median(f[voiced])),
                spanSemitones=float(np.percentile(m,90)-np.percentile(m,10)),
                medianNoteErrorCents=float(np.median(np.abs(m-np.round(m)))*100))


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    guards={name:pg.digest(ROOT/name) for name in ['index.html','tools/announcer-pack.json']}
    pack=json.loads((ROOT/'tools/announcer-pack.json').read_text(encoding='utf-8'))
    catalog=[]
    tuning=[]
    old=ROOT/'tools/out/voices/processing-round7'
    previous={c['voice']+'/'+c['line']:c for c in json.loads((old/'catalog.json').read_text(encoding='utf-8'))}
    for p in PRESETS:
        for key, original in pack['profiles']['silver']['clips'].items():
            stem=p['id']+'-'+key
            path=OUT/(stem+'.wav')
            source=pg.SOURCE/('silver-'+key+'.wav')
            record=json.loads((pg.SOURCE/('silver-'+key+'.json')).read_text(encoding='utf-8'))
            if pg.digest(source)!=record['sha256']:
                raise ValueError('Shipped source changed: '+key)
            correction=None
            if p['id']=='dry':
                shutil.copyfile(source,path)
            elif p['id']=='deep-echo':
                c=previous['deep-echo/'+key]
                if pg.digest(old/c['file'])!=c['sha256'] or pg.digest(old/c['mp3'])!=c['mp3Sha256']:
                    raise ValueError('Previous closest changed')
                shutil.copyfile(old/c['file'],path)
            else:
                audio, rate=sf.read(source,dtype='float64')
                if p['id']=='clean-deep':
                    changed=pg.lower(audio,rate,p['semitones'],p['formants'])
                else:
                    changed=pg.lower(audio,rate,0,p['formants'])
                    changed, contour=tune(changed,rate,p)
                    stats=pitch_stats(changed,rate)
                    # Analyse the actual dry resynthesis, before doubles/room.
                    correction=dict(preset=p['id'],line=key,**stats,contour=contour)
                    tuning.append(correction)
                    sf.write(OUT/(stem+'-tuned-only.wav'),changed,rate,subtype='FLOAT')
                if p.get('body'):
                    changed=pg.run_audio(changed,rate,BODY)
                if p.get('stereo'):
                    changed=spread(changed,rate,p['stereo'])
                if p.get('room'):
                    changed=pg.space(changed,rate,p['room'])
                # PSOLA can produce isolated peaks on consonant boundaries.
                # Bound these before matching loudness; compensate limiter latency.
                changed=pg.run_audio(changed,rate,
                    'alimiter=limit=0.25:attack=3:release=60:level=false:latency=true')
                n=min(len(changed),round(.010*rate))
                fade=np.linspace(1,0,n)
                changed[-n:] *= fade[:,None] if changed.ndim==2 else fade
                if not np.isfinite(changed).all():
                    raise ValueError('Non-finite render')
                sf.write(path,changed,rate,subtype='FLOAT')
            clip=dict(voice=p['id'],label=p['name'],engine='Silver / retained performance / Praat F0 correction',
                      line=key,text=original['text'],file=path.name,preset=p,
                      sourceSha256=pg.digest(source),sourceMp3Sha256=original['sha256'],
                      retainPcm=p['id'] in ['dry','deep-echo'],duration=sf.info(path).duration)
            if not clip['retainPcm']:
                clip['peakProtection']=dict(limit=.25,attackMs=3,releaseMs=60,latencyCompensated=True)
            catalog.append(clip)
        print('Rendered',p['name'],'/ 19 calls',flush=True)
    pg.normalize(catalog)
    embedded={p['id']:{} for p in PRESETS}
    for c in catalog:
        mp3=OUT/(c['voice']+'-'+c['line']+'.mp3')
        if c['voice']=='dry':
            mp3.write_bytes(base64.b64decode(pack['profiles']['silver']['clips'][c['line']]['data']))
        elif c['voice']=='deep-echo':
            shutil.copyfile(old/previous['deep-echo/'+c['line']]['mp3'],mp3)
        else:
            subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-y',
                '-i',str(OUT/c['file']),'-ar','24000','-b:a','96k',str(mp3)],check=True)
        c.update(mp3=mp3.name,mp3Sha256=pg.digest(mp3))
        (OUT/(c['voice']+'-'+c['line']+'.json')).write_text(json.dumps(c,indent=2),encoding='utf-8')
        embedded[c['voice']][c['line']]=dict(data=base64.b64encode(mp3.read_bytes()).decode(),
            text=c['text'],sha256=c['mp3Sha256'],duration=c['duration'])
    (OUT/'catalog.json').write_text(json.dumps(catalog,indent=2),encoding='utf-8')
    (OUT/'tuning-results.json').write_text(json.dumps(tuning,indent=2),encoding='utf-8')
    checks=[]
    for r in tuning:
        if r['preset']=='note-lock':
            checks.append(dict(name='Resynthesized fixed note: '+r['line'],
                passed=abs(12*np.log2(r['medianHz']/float(hz(42))))<.30 and r['spanSemitones']<.5,
                medianHz=r['medianHz'],spanSemitones=r['spanSemitones']))
    for key in pg.KEYS:
        soft=next(r for r in tuning if r['preset']=='gentle-tune' and r['line']==key)
        hard=next(r for r in tuning if r['preset']=='hard-tune' and r['line']==key)
        checks.append(dict(name='Harder correction reduces note error: '+key,
            passed=hard['medianNoteErrorCents']<soft['medianNoteErrorCents'],
            gentleCents=soft['medianNoteErrorCents'],hardCents=hard['medianNoteErrorCents']))
    (OUT/'pitch-checks.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
    print('Actual pitch checks:',sum(c['passed'] for c in checks),'/',len(checks),flush=True)
    plan=dict(presets=PRESETS,previewKeys=pg.KEYS,clipCount=len(catalog),guards=guards,
        productionChanged=False,selectionPending=True,default='dry',gameBpm=88,
        processing='Praat PitchTier correction / overlap-add; not Antares AutoTune',
        pitchChecks=checks,localEngineReference='C:/trontstack/glados/glados_voice/dsp/effects/pitch_correct.py',
        praatDocumentation='https://www.fon.hum.uva.nl/praat/manual/PitchTier.html')
    (OUT/'plan.json').write_text(json.dumps(plan,indent=2),encoding='utf-8')
    pg.write_player(plan,pack,embedded)
    for name,checksum in guards.items():
        if pg.digest(ROOT/name)!=checksum:
            raise RuntimeError('Production changed')
    print('Built eight comparisons /',len(catalog),'calls; production unchanged.',flush=True)
    if not all(c['passed'] for c in checks):
        raise ValueError('Pitch resynthesis needs review; see pitch-checks.json')


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
