"""Isolate pitch, vowel resonance and announcer processing on the liked take.

No TTS generation or game changes. Retains the exact round-three performances.
Run C:/py/python.exe tools/voice-tone.py, then the tone round's level/check/build.
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import parselmouth
import soundfile as sf
from scipy.signal import butter, fftconvolve, sosfilt

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tools/out/voices/tone-round4'
SOURCE = ROOT / 'tools/out/voices/deep-round3'
KEYS = ['welcome-back', 'brilliant', 'resonance']
TONE_FILTER = ('highpass=f=70,equalizer=f=180:t=q:w=1:g=2.5,'
               'equalizer=f=450:t=q:w=1:g=-1.5,equalizer=f=2500:t=q:w=1:g=1,'
               'acompressor=threshold=0.11:ratio=2.5:attack=8:release=100:makeup=1')
VARIANTS = [
    ('cave-current', 'Cave / your favourite', 'baseline-cave-6', 0, 1, False,
     'Current Cave / -6, unchanged except for matched listening loudness.'),
    ('cave-resonance', 'Cave / darker resonance', 'baseline-cave-6', 0, .9, False,
     'Same pitch and timing; darker vowels. Listen for weight without losing the smile.'),
    ('cave-minus2', 'Cave / another 2 down', 'baseline-cave-6', -2, 1, False,
     'Two more semitones down, to -8 total; original vowel resonance and timing.'),
    ('cave-body-room', 'Cave / body + room', 'baseline-cave-6', 0, 1, True,
     'Same voice and pitch; gentle EQ, compression and a short room tail.'),
    ('baritone-current', 'Fresh baritone / runner-up', 'booming-baritone-lowref', 0, 1, False,
     'The fresh baritone you ranked second, unchanged at the same listening loudness.'),
]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pitch(audio, rate):
    track = parselmouth.Sound(audio, sampling_frequency=rate).to_pitch_ac(
        pitch_floor=45, pitch_ceiling=500).selected_array['frequency']
    voiced = track[track > 0]
    if not len(voiced):
        raise ValueError('No voiced frames')
    return round(float(np.median(voiced)), 2)


def room(audio, rate):
    # Deterministic, band-limited diffuse decay; explicit dry/wet mix.
    rng = np.random.default_rng(300926)
    times = np.arange(round(rate * .32)) / rate
    tail = rng.normal(size=len(times)) * np.exp(-times * np.log(1000) / .32)
    tail = sosfilt(butter(2, 3500, fs=rate, output='sos'), tail)
    tail /= np.sqrt(np.sum(tail ** 2))
    impulse = np.pad(tail, (round(rate * .014), 0))
    wet = fftconvolve(audio, impulse)
    dry = np.pad(audio, (0, len(wet) - len(audio)))
    return dry + .1 * wet


def main():
    guards = {name: digest(ROOT / name) for name in ['index.html', 'tools/announcer-pack.json']}
    sources = {c['voice'] + '-' + c['line']: c
               for c in json.loads((SOURCE / 'catalog.json').read_text(encoding='utf-8'))}
    OUT.mkdir(parents=True, exist_ok=True)
    clips, checks = [], []
    for voice, label, parent, semitones, formants, effects, description in VARIANTS:
        for key in KEYS:
            original = sources[parent + '-' + key]
            source = SOURCE / 'raw' / original['file']
            audio, rate = sf.read(source, dtype='float64')
            source_pitch = pitch(audio, rate)
            details = {'source': str(source), 'sourceSha256': digest(source),
                       'sourceVoice': parent, 'additionalSemitones': semitones,
                       'formantRatio': formants, 'durationFactor': 1,
                       'ffmpegFilter': TONE_FILTER if effects else None,
                       'room': {'wet': .1, 'decaySeconds': .32, 'preDelaySeconds': .014,
                                'lowpassHz': 3500, 'seed': 300926} if effects else None}
            fingerprint = hashlib.sha256(json.dumps(details, sort_keys=True).encode()).hexdigest()
            receipt = OUT / (voice + '-' + key + '.json')
            if receipt.exists():
                previous = json.loads(receipt.read_text(encoding='utf-8'))
                cached_audio = OUT / previous['file']
                if previous.get('fingerprint') == fingerprint and cached_audio.is_file() and digest(cached_audio) == previous['sha256']:
                    clips.append(previous)
                    checks.append(previous['measurementCheck'])
                    continue
            changed = audio.copy()
            if formants != 1:
                sound = parselmouth.praat.call(parselmouth.Sound(audio, sampling_frequency=rate),
                    'Change gender', 45, 500, formants, source_pitch, 1, 1)
                changed = sound.resample(rate).values[0] if sound.sampling_frequency != rate else sound.values[0]
            elif semitones:
                manipulation = parselmouth.praat.call(parselmouth.Sound(audio, sampling_frequency=rate),
                    'To Manipulation', .01, 45, 500)
                tier = parselmouth.praat.call(manipulation, 'Extract pitch tier')
                parselmouth.praat.call(tier, 'Multiply frequencies', 0, len(audio)/rate, 2**(semitones/12))
                parselmouth.praat.call([tier, manipulation], 'Replace pitch tier')
                changed = parselmouth.praat.call(manipulation, 'Get resynthesis (overlap-add)').values[0]
            if effects:
                result = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-nostdin',
                    '-i', str(source), '-af', TONE_FILTER, '-ar', str(rate), '-ac', '1',
                    '-f', 'f32le', '-'], capture_output=True, check=True)
                changed = room(np.frombuffer(result.stdout, dtype='<f4').astype('float64'), rate)
            wav = OUT / (voice + '-' + key + '.wav')
            sf.write(wav, changed, rate, subtype='FLOAT')
            actual, actual_rate = sf.read(wav)
            median = pitch(actual[:len(audio)], actual_rate)
            ratio = median / source_pitch
            check = {'file': wav.name, 'sourcePitchHz': source_pitch, 'pitchHz': median,
                     'pitchRatio': round(ratio, 4), 'durationDelta': round((len(actual)-len(audio))/rate, 4),
                     'pass': np.isfinite(actual).all().item() and np.max(np.abs(actual)) > .05
                             and abs(ratio - 2**(semitones/12)) < .08
                             and (0.32 <= (len(actual)-len(audio))/rate <= .35 if effects
                                  else abs(len(actual)-len(audio))/rate < .015)}
            if not check['pass']:
                raise ValueError('Unexpected change: ' + str(check))
            clip = {'voice': voice, 'label': label, 'line': key, 'text': original['text'],
                    'engine': 'Qwen / retained performance', 'description': description,
                    'file': wav.name, 'duration': round(len(actual)/rate, 3), 'sampleRate': rate,
                    'medianPitchHz': median, 'sha256': digest(wav), 'fingerprint': fingerprint,
                    'measurementCheck': check, **details}
            receipt.write_text(json.dumps(clip, indent=2), encoding='utf-8')
            clips.append(clip)
            checks.append(check)
            print(label, key, json.dumps(check), flush=True)
    for name, checksum in guards.items():
        if digest(ROOT / name) != checksum:
            raise RuntimeError('Game changed during audition: ' + name)
    (OUT / 'catalog.json').write_text(json.dumps(clips, indent=2), encoding='utf-8')
    (OUT / 'measurement-results.json').write_text(json.dumps(checks, indent=2), encoding='utf-8')
    plan = {'status': 'generated; listening review pending', 'candidates': [v[0] for v in VARIANTS],
            'lines': {key: sources['baseline-cave-6-' + key]['text'] for key in KEYS},
            'gameHtmlSha256': guards['index.html'], 'gamePackSha256': guards['tools/announcer-pack.json'],
            'clipCount': len(clips), 'referenceMatchVerified': False}
    (OUT / 'plan.json').write_text(json.dumps(plan, indent=2), encoding='utf-8')
    print('Completed', len(clips), 'controlled comparisons; game unchanged.')


if __name__ == '__main__':
    main()
