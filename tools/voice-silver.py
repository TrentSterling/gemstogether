"""Audition the selected Silver master speaker, without changing the game.

Cached Qwen Base delivery experiments keep the exact liked synthetic reference.
Clean DSP rows keep the exact liked performances. No reference-game audio is
used as a speaker prompt. Run with C:/py/python.exe; then level/check/build silver.
"""
import argparse
import gc
import hashlib
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tools/out/voices/silver-round6'
SOURCE = ROOT / 'tools/out/voices/casting-round5'
REFERENCE = ROOT / 'tools/voice-references/silver-reference.wav'
EXPECTED_REFERENCE = '3043e39c2689dddba1f6dfb6840b8a3ecbe6c2211d32fd5a20952add90215ad8'
os.environ['NUMBA_CACHE_DIR'] = str(OUT / '.cache/numba')
Path(os.environ['NUMBA_CACHE_DIR']).mkdir(parents=True, exist_ok=True)

import numpy as np
import parselmouth
import soundfile as sf
import torch
from scipy.signal import butter, fftconvolve, sosfilt

spec = importlib.util.spec_from_file_location('silver_audition', Path(__file__).with_name('deep-voice-audition.py'))
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
helper.OUT = helper.sampler.OUT = OUT

BODY = ('highpass=f=55,equalizer=f=140:t=q:w=0.8:g=2,'
        'equalizer=f=420:t=q:w=1:g=-1.5,equalizer=f=2200:t=q:w=0.9:g=1,'
        'acompressor=threshold=0.11:ratio=2:attack=12:release=120:makeup=1')
DELIVERIES = [
    ('silver-warm', 'Silver / warm welcome', 133,
     'A slower, reassuring greeting; warm satisfaction in the celebrations.',
     'Speak smoothly and calmly with a warm reassuring smile. Take an unhurried breath between the welcome and the game name. Use rounded deep vowels, a relaxed low register and a gentle falling ending. Clear comfortable speech, with no rasp or whisper.',
     'Celebrate warmly with a broad delighted smile. Strong rhythmic word stresses and a satisfying confident ending, while keeping the smooth deep chest voice. More expression than a neutral reading, with clear consonants and no shouting.'),
    ('silver-proud', 'Silver / proud delight', 56,
     'A calm, inviting greeting; stronger emphasis and a smile on the wins.',
     'Welcome the returning player with quiet confident warmth, in a smooth deep resonant voice. Calm and inviting, like an old friend returning. Rounded sustained welcome, a slight pause before the game name, then a clear soft landing. No excitement or rasp.',
     'Announce a magnificent achievement with expressive proud delight. Give the first word a strong clear attack and the following phrase a joyful rhythmic lift. Full smooth bass resonance, emphatic consonants and a decisive falling finish. Keep the pitch low and the tone clean.'),
    ('silver-arcade', 'Silver / arcade lift', 42,
     'A velvety greeting; the most projected, animated victory delivery.',
     'Speak in a velvety smooth deep voice, with calm comforting warmth and measured pacing. Make welcome back feel like a reassuring invitation. Let the vowels resonate and the ending settle gently. Clean close microphone, no gravel or rasp.',
     'A rich smooth low arcade announcer celebrates with theatrical delight and strong projection. Bold rhythmic emphasis, clear energetic attacks and long rounded resonant vowels. Sound thrilled and warmly proud, with an expansive smile and concise falling endings. Stay in the deep comfortable register, without rasp or raised-pitch shouting.'),
]
EFFECTS = [
    ('silver-lower', 'Silver / four down', 'Four semitones lower, preserving the vowel shape and timing.', 'lower'),
    ('silver-body', 'Silver / body + control', 'Gentle bass and clarity EQ plus compression; the original delivery.', 'body'),
    ('silver-hall', 'Silver / soft halo', 'The original delivery with a restrained diffuse room tail.', 'hall'),
    ('silver-wide', 'Silver / subtle double', 'The original delivery with a quiet stereo double. Try headphones.', 'wide'),
    ('silver-polish', 'Silver / body + halo', 'Combines the gentle EQ and compression with the restrained room tail.', 'polish'),
    ('silver-lower-polish', 'Silver / four down + halo', 'Four semitones lower, with the gentle EQ, compression and restrained room tail.', 'lower-polish'),
]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def measure(audio, rate):
    mono = audio.mean(axis=1) if audio.ndim == 2 else audio
    if not len(mono) or not np.isfinite(audio).all():
        raise ValueError('Invalid audio')
    track = parselmouth.Sound(mono, sampling_frequency=rate).to_pitch_ac(
        pitch_floor=45, pitch_ceiling=500).selected_array['frequency']
    voiced = track[track > 0]
    if not len(voiced):
        raise ValueError('No voiced frames')
    return {'medianHz': round(float(np.median(voiced)), 2),
            'p10Hz': round(float(np.percentile(voiced, 10)), 2),
            'p90Hz': round(float(np.percentile(voiced, 90)), 2),
            'seconds': round(len(mono) / rate, 4)}


def freeze_reference():
    source = SOURCE / 'silver-prepared-reference.wav'
    if digest(source) != EXPECTED_REFERENCE:
        raise ValueError('The selected Silver speaker reference changed')
    if REFERENCE.exists() and digest(REFERENCE) != EXPECTED_REFERENCE:
        raise ValueError('Retained Silver reference differs from the selected one')
    if not REFERENCE.exists():
        shutil.copyfile(source, REFERENCE)
    original = json.loads((SOURCE / 'silver-brilliant.json').read_text(encoding='utf-8'))
    previous = json.loads(REFERENCE.with_suffix('.json').read_text(encoding='utf-8')) if REFERENCE.with_suffix('.json').exists() else {}
    record = {**previous, 'speaker': 'Silver master', 'file': REFERENCE.name, 'sha256': digest(REFERENCE),
              'synthetic': True, 'text': original['referenceText'], 'style': original['style'],
              'designSeed': original['designSeed'], 'designModelRevision': '5ecdb67327fd37bb2e042aab12ff7391903235d3',
              'baseModelRevision': original['modelRevision'], 'preparation': original['referencePreparation'],
              'selection': 'Trent selected the round-five Silver master; smooth deep bass without rasp.',
              'productionSelectionPending': previous.get('productionSelectionPending', True), 'measurements': measure(*sf.read(REFERENCE))}
    REFERENCE.with_suffix('.json').write_text(json.dumps(record, indent=2), encoding='utf-8')
    return record


def reference_listening():
    folder = OUT.parent / 'bejeweled2-reference'
    sources = json.loads((folder / 'sources.json').read_text(encoding='utf-8'))
    results = []
    for source in sources:
        path = folder / source['file']
        audio, rate = sf.read(path)
        result = {**source, 'sha256': digest(path), 'measurement': measure(audio, rate)}
        target = folder / ('matched-' + path.stem + '.wav')
        # Local listening only, independently level-matched. Never a cloning input.
        first = subprocess.run(['ffmpeg', '-hide_banner', '-nostdin', '-i', str(path),
            '-af', 'loudnorm=I=-24:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
            capture_output=True, text=True, check=True)
        info = json.JSONDecoder().raw_decode(first.stderr[first.stderr.rfind('{'):])[0]
        params = ':'.join(['loudnorm=I=-24:TP=-1.5:LRA=11',
            'measured_I=' + info['input_i'], 'measured_TP=' + info['input_tp'],
            'measured_LRA=' + info['input_lra'], 'measured_thresh=' + info['input_thresh'],
            'offset=' + info['target_offset'], 'linear=true'])
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
            '-i', str(path), '-af', params, '-ar', '24000', '-c:a', 'pcm_s16le', str(target)], check=True)
        result.update(listeningFile='../bejeweled2-reference/' + target.name,
                      listeningSha256=digest(target))
        results.append(result)
        print('REFERENCE', path.name, json.dumps(result['measurement']), flush=True)
    (OUT / 'reference-results.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
    return results


def retained(source, voice, key, details, transform=None):
    if helper.cached(voice, key, details):
        return
    receipt = json.loads((SOURCE / ('silver-' + key + '.json')).read_text(encoding='utf-8'))
    audio, rate = sf.read(source, dtype='float64')
    changed = transform(audio, rate) if transform else audio
    path = OUT / (voice + '-' + key + '.wav')
    if transform:
        sf.write(path, changed, rate, subtype='FLOAT')
    else:
        shutil.copyfile(source, path)
    actual, rate = sf.read(path)
    pitch = measure(actual, rate)
    source_pitch = measure(audio, rate)['medianHz']
    expected_ratio = 2**(details.get('additionalSemitones', 0)/12)
    check = {'file': path.name, 'sourcePitchHz': source_pitch, 'pitchHz': pitch['medianHz'],
             'channels': sf.info(path).channels, 'durationDelta': round((len(actual)-len(audio))/rate, 4),
             'expectedPitchRatio': expected_ratio,
             'pass': np.isfinite(actual).all().item() and abs(pitch['medianHz']/source_pitch-expected_ratio) < .08}
    if not check['pass']:
        raise ValueError('Processing unexpectedly changed pitch: ' + str(check))
    record = {'voice': voice, 'line': key, 'text': receipt['text'], 'file': path.name,
              'duration': round(len(actual)/rate, 3), 'sampleRate': rate, 'channels': sf.info(path).channels,
              'medianPitchHz': pitch['medianHz'], 'pitch10Hz': pitch['p10Hz'], 'pitch90Hz': pitch['p90Hz'],
              'sha256': digest(path), 'fingerprint': helper.fingerprint(details),
              'measurementCheck': check, **details}
    (OUT / (voice + '-' + key + '.json')).write_text(json.dumps(record, indent=2), encoding='utf-8')
    print('PROCESS', voice, key, json.dumps(check), flush=True)


def halo(audio, rate):
    rng = np.random.default_rng(133)
    times = np.arange(round(rate * .5)) / rate
    tail = rng.normal(size=len(times)) * np.exp(-times * np.log(1000) / .5)
    tail = sosfilt(butter(2, [160, 4300], fs=rate, btype='bandpass', output='sos'), tail)
    tail /= np.sqrt(np.sum(tail ** 2))
    wet = fftconvolve(audio, np.pad(tail, (round(rate * .018), 0)))
    return np.pad(audio, (0, len(wet)-len(audio))) + .12 * wet


def double(audio, rate):
    # Delays are quiet parallel taps; dry centre remains identical in both channels.
    left, right = round(rate * .021), round(rate * .033)
    dry = np.pad(audio, (0, right))
    return np.stack([dry + .1*np.pad(audio, (left, right-left)),
                     dry + .1*np.pad(audio, (right, 0))], axis=1)


def filtered(audio, rate):
    result = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-nostdin',
        '-f', 'f64le', '-ar', str(rate), '-ac', '1', '-i', '-', '-af', BODY,
        '-f', 'f64le', '-'], input=audio.astype('<f8').tobytes(), capture_output=True, check=True)
    return np.frombuffer(result.stdout, dtype='<f8')


def lower(audio, rate):
    sound = parselmouth.Sound(audio, sampling_frequency=rate)
    manipulation = parselmouth.praat.call(sound, 'To Manipulation', .01, 45, 500)
    tier = parselmouth.praat.call(manipulation, 'Extract pitch tier')
    parselmouth.praat.call(tier, 'Multiply frequencies', 0, len(audio)/rate, 2**(-4/12))
    parselmouth.praat.call([tier, manipulation], 'Replace pitch tier')
    return parselmouth.praat.call(manipulation, 'Get resynthesis (overlap-add)').values[0]


def processing(lines):
    for key in lines:
        source = SOURCE / ('silver-' + key + '.wav')
        retained(source, 'silver-current', key, {
            'label': 'Silver / your favourite', 'engine': 'Exact liked performance',
            'description': 'The Silver master you selected, retained unchanged.',
            'source': str(source), 'sourceSha256': digest(source), 'retainPcm': True,
            'finalPitchEdit': False, 'referenceSha256': EXPECTED_REFERENCE})
        raw = SOURCE / 'raw' / source.name
        for voice, label, description, effect in EFFECTS:
            details = {'label': label, 'engine': 'Silver / retained performance + processing',
                       'description': description, 'source': str(raw), 'sourceSha256': digest(raw),
                       'effect': effect, 'ffmpegFilter': BODY if effect in ['body', 'polish', 'lower-polish'] else None,
                       'room': {'wet': .12, 'decaySeconds': .5, 'preDelaySeconds': .018,
                                'bandpassHz': [160, 4300], 'seed': 133} if effect in ['hall', 'polish', 'lower-polish'] else None,
                       'double': {'wet': .1, 'delaySeconds': [.021, .033], 'stereo': True} if effect == 'wide' else None,
                       'additionalSemitones': -4 if effect in ['lower', 'lower-polish'] else 0,
                       'formantRatio': 1, 'durationFactor': 1,
                       'finalPitchEdit': effect in ['lower', 'lower-polish'], 'referenceSha256': EXPECTED_REFERENCE}
            def transform(audio, rate, effect=effect):
                if effect in ['lower', 'lower-polish']:
                    audio = lower(audio, rate)
                if effect in ['body', 'polish', 'lower-polish']:
                    audio = filtered(audio, rate)
                return halo(audio, rate) if effect in ['hall', 'polish', 'lower-polish'] else double(audio, rate) if effect == 'wide' else audio
            retained(raw, voice, key, details, transform)


def deliveries(lines, reference, retry_reviewed=False):
    model = None
    try:
        models = json.loads((OUT.parent / 'deep-round3/prepared-plan.json').read_text(encoding='utf-8'))['models']
        for voice, label, seed, description, welcome, victory in DELIVERIES:
            for key, text in lines.items():
                direction = welcome if key == 'welcome-back' else victory
                receipt_path = OUT / (voice + '-' + key + '.json')
                previous = json.loads(receipt_path.read_text(encoding='utf-8')) if receipt_path.exists() else None
                call_seed = previous.get('seed', seed) if previous else seed
                if retry_reviewed and previous and previous['medianPitchHz'] > 165:
                    call_seed = 133 if call_seed != 133 else 300926
                    rejected = OUT / 'rejected'
                    rejected.mkdir(exist_ok=True)
                    stem = voice + '-' + key + '-seed' + str(previous['seed'])
                    shutil.copyfile(OUT / previous['file'], rejected / (stem + '.wav'))
                    shutil.copyfile(receipt_path, rejected / (stem + '.json'))
                    print('Retrying high-register call', voice, key, 'seed', call_seed, flush=True)
                details = {'label': label, 'engine': 'Qwen Base / delivery experiment',
                           'description': description, 'deliveryDirection': direction,
                           'instructionMethod': 'Experimental instruct_ids embeddings through Base model.generate; not a documented Base style API.',
                           'reference': str(REFERENCE.relative_to(ROOT)), 'referenceSha256': EXPECTED_REFERENCE,
                           'referenceText': reference['text'], 'seed': call_seed,
                           'modelRevision': models['Base']['revision'], 'finalPitchEdit': False}
                if helper.cached(voice, key, details):
                    continue
                if model is None:
                    from qwen_tts import Qwen3TTSModel
                    print('Loading cached Base model; one frozen Silver speaker', flush=True)
                    model = Qwen3TTSModel.from_pretrained(models['Base']['path'], device_map='cuda:0',
                        dtype=torch.bfloat16, attn_implementation='sdpa', local_files_only=True)
                    audio, rate = sf.read(REFERENCE, dtype='float32')
                    prompt = model.create_voice_clone_prompt(ref_audio=(audio, rate),
                        ref_text=reference['text'], x_vector_only_mode=False)
                instruction_ids = model._tokenize_texts([model._build_instruct_text(direction)])
                print('Generating', voice, key, flush=True)
                started = time.perf_counter()
                torch.manual_seed(call_seed)
                wavs, rate = model.generate_voice_clone(text=text, language='English',
                    voice_clone_prompt=prompt, instruct_ids=instruction_ids,
                    max_new_tokens=260, non_streaming_mode=True)
                helper.save(voice, key, text, wavs[0], rate, started, details)
    finally:
        if model is not None:
            del model
            gc.collect()
            torch.cuda.empty_cache()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--retry-reviewed', action='store_true')
    args = parser.parse_args()
    guards = {name: digest(ROOT / name) for name in ['index.html', 'tools/announcer-pack.json']}
    reference = freeze_reference()
    references = reference_listening()
    lines = {key: json.loads((SOURCE / ('silver-' + key + '.json')).read_text(encoding='utf-8'))['text']
             for key in ['welcome-back', 'brilliant', 'resonance']}
    processing(lines)
    deliveries(lines, reference, args.retry_reviewed)
    candidates = ['silver-current'] + [v[0] for v in DELIVERIES] + [v[0] for v in EFFECTS]
    clips = [json.loads((OUT / (voice + '-' + key + '.json')).read_text(encoding='utf-8'))
             for voice in candidates for key in lines]
    for name, checksum in guards.items():
        if digest(ROOT / name) != checksum:
            raise RuntimeError('Game changed during audition: ' + name)
    (OUT / 'catalog.json').write_text(json.dumps(clips, indent=2), encoding='utf-8')
    (OUT / 'plan.json').write_text(json.dumps({'status': 'generated; listening review pending',
        'candidates': candidates, 'lines': lines, 'clipCount': len(clips),
        'speakerReferenceSha256': EXPECTED_REFERENCE, 'references': references,
        'gameHtmlSha256': guards['index.html'], 'gamePackSha256': guards['tools/announcer-pack.json'],
        'referenceMatchVerified': False}, indent=2), encoding='utf-8')
    print('Completed', len(clips), 'Silver comparisons; game unchanged.', flush=True)


if __name__ == '__main__':
    main()
