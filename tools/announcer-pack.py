"""Build the selected Silver crystal announcer, keeping the legacy options.

--natural preserves the three approved round-six performances and generates
remaining lines from the exact frozen Silver reference, without pitch or tone
effects. The default installs frozen Original 07 MP3s.
--legacy rebuilds the earlier pitch-shifted pack for archival work.
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
from base64 import b64encode

os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'
os.environ['NUMBA_CACHE_DIR'] = str(Path(__file__).resolve().parent/'out/announcer/.cache/numba')
Path(os.environ['NUMBA_CACHE_DIR']).mkdir(parents=True, exist_ok=True)
sys.dont_write_bytecode = True
import numpy as np
import parselmouth
import soundfile as sf
import torch

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'tools/out/announcer'
OUT.mkdir(parents=True, exist_ok=True)
spec = importlib.util.spec_from_file_location('voice_sampler', ROOT/'tools/voice-sampler.py')
sampler = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sampler)
sampler.OUT = OUT
LINES = {
    'welcome': 'Welcome to Gems Together!',
    'welcome-back': 'Welcome back to Gems Together!',
    'dawn': 'Welcome to Dawn Shallows!',
    'tidepool': 'Welcome to Tidepool!',
    'ember': 'Welcome to Ember Reef!',
    'aurora': 'Welcome to Aurora Deep!',
    'starfall': 'Welcome to Starfall!',
    'prism-heart': 'Welcome to Prism Heart!',
    'dazzling': 'Dazzling! Look at you go!',
    'brilliant': 'Brilliant! Beautifully done!',
    'crown': 'Crown of Light! Beautifully done!',
    'parade': 'Prism Parade! Keep that light moving!',
    'constellation': 'Constellation! Look at you shine!',
    'resonance': 'Resonance! Let it shine!',
    'team': 'Team Resonance! Better together!',
    'radiant': 'Radiant Resonance! Beautifully done!',
    'prismatic': 'Prismatic Resonance! That was dazzling!',
    'supernova': 'Supernova! That was beautiful!',
    'complete': 'Beautifully done! What a journey!',
}
VOICES = {
    'founder': {'name': 'Warm founder', 'reference': 'founder-reference.wav',
        'source': 'qwen-gems-founder-supernova.wav'},
    'cave': {'name': 'Cave-inspired clean', 'reference': 'cave-reference.wav',
        'source': 'qwen-cave-clean-supernova.wav'},
}
REFERENCE_TEXT = 'Supernova! That was beautiful!'
DEPTHS = [-2, -4, -6]


def median_pitch(audio, rate):
    track = parselmouth.Sound(audio, sampling_frequency=rate).to_pitch_ac(
        pitch_floor=60, pitch_ceiling=500).selected_array['frequency']
    voiced = track[track > 0]
    return round(float(np.median(voiced)), 2) if len(voiced) else None


def save(name, key, audio, rate, seconds, details):
    sampler.save(name, key, LINES[key], audio, rate, seconds,
        {'medianPitchHz': median_pitch(audio, rate), **details})


def build_legacy():
    references = ROOT/'tools/voice-references'
    references.mkdir(exist_ok=True)
    for voice in VOICES.values():
        ref = references/voice['reference']
        if not ref.exists():
            shutil.copyfile(ROOT/'tools/out/voices/ryan-round2'/voice['source'], ref)
    needed = [(voice, key) for voice in VOICES for key in LINES
              if not (OUT/(voice+'-'+key+'.json')).exists()]
    if needed:
        from qwen_tts import Qwen3TTSModel
        cache = Path.home()/'.cache/huggingface/hub/models--Qwen--Qwen3-TTS-12Hz-1.7B-Base'
        revision = (cache/'refs/main').read_text(encoding='utf-8').strip()
        model = Qwen3TTSModel.from_pretrained(str(cache/'snapshots'/revision),
            device_map='cuda:0', dtype=torch.bfloat16, attn_implementation='sdpa', local_files_only=True)
        for voice, info in VOICES.items():
            ref = references/info['reference']
            audio, rate = sf.read(ref, dtype='float32')
            prompt = model.create_voice_clone_prompt(ref_audio=(audio, rate),
                ref_text=REFERENCE_TEXT, x_vector_only_mode=False)
            for key, text in LINES.items():
                if (OUT/(voice+'-'+key+'.json')).exists():
                    continue
                torch.manual_seed(290926)
                started = time.perf_counter()
                wavs, rate = model.generate_voice_clone(text=text, language='English',
                    voice_clone_prompt=prompt, max_new_tokens=260, non_streaming_mode=True)
                save(voice, key, wavs[0], rate, time.perf_counter()-started,
                    {'engine': 'Qwen3 1.7B Base', 'speaker': info['name'], 'seed': 290926,
                     'modelRevision': revision, 'reference': info['reference'],
                     'referenceText': REFERENCE_TEXT, 'referenceSha256': hashlib.sha256(ref.read_bytes()).hexdigest()})
        del model
        gc.collect()
        torch.cuda.empty_cache()
    clips = []
    profiles = {}
    for voice, info in VOICES.items():
        for depth in DEPTHS:
            name = voice+'-'+str(-depth)
            profiles[name] = {'name': info['name'], 'semitones': depth, 'clips': {}}
            for key, text in LINES.items():
                receipt = OUT/(name+'-'+key+'.json')
                wav = receipt.with_suffix('.wav')
                if not receipt.exists():
                    source = OUT/(voice+'-'+key+'.wav')
                    audio, rate = sf.read(source, dtype='float32')
                    started = time.perf_counter()
                    manipulation = parselmouth.praat.call(parselmouth.Sound(audio, sampling_frequency=rate),
                        'To Manipulation', .01, 60, 500)
                    tier = parselmouth.praat.call(manipulation, 'Extract pitch tier')
                    parselmouth.praat.call(tier, 'Multiply frequencies', 0, len(audio)/rate, 2**(depth/12))
                    parselmouth.praat.call([tier, manipulation], 'Replace pitch tier')
                    shifted = parselmouth.praat.call(manipulation, 'Get resynthesis (overlap-add)').values[0].astype(np.float32)
                    save(name, key, shifted, rate, time.perf_counter()-started,
                         {'engine': 'Qwen3 Base + Praat PSOLA', 'speaker': info['name'],
                          'semitones': depth, 'durationFactor': 1.0, 'formantRatio': 1.0,
                          'source': source.name, 'sourcePitchHz': median_pitch(audio, rate),
                          'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest()})
                mp3 = wav.with_suffix('.mp3')
                if not mp3.exists():
                    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav),
                        '-codec:a', 'libmp3lame', '-b:a', '64k', '-ar', '24000', '-ac', '1', str(mp3)], check=True)
                clip = json.loads(receipt.read_text(encoding='utf-8'))
                clip['mp3'] = mp3.name
                clips.append(clip)
                profiles[name]['clips'][key] = {'text': text, 'duration': clip['duration'],
                    'data': b64encode(mp3.read_bytes()).decode('ascii'),
                    'sha256': hashlib.sha256(mp3.read_bytes()).hexdigest()}
    (OUT/'catalog.json').write_text(json.dumps(clips, indent=2), encoding='utf-8')
    asset = {'version': 1, 'engine': 'Qwen3-TTS-12Hz-1.7B-Base',
        'modelLicense': 'Apache-2.0', 'defaultProfile': 'founder-4', 'profiles': profiles}
    target = ROOT/'tools/announcer-pack.json'
    target.write_text(json.dumps(asset, separators=(',', ':')), encoding='utf-8')
    print('Built', len(clips), 'clips;', target.stat().st_size, 'embedded bytes;', target, flush=True)


def load_module(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT/'tools'/file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build_silver(retry_reviewed=False):
    from base64 import b64decode
    target = ROOT/'tools/announcer-pack.json'
    previous_pack = json.loads(target.read_text(encoding='utf-8'))
    legacy = {name: profile for name, profile in previous_pack['profiles'].items() if name != 'silver'}
    helper = load_module('silver_production_helper', 'deep-voice-audition.py')
    helper.OUT = helper.sampler.OUT = OUT
    levels = load_module('silver_production_levels', 'deep-voice-level.py')
    frozen = ROOT/'tools/voice-references/silver-reference.wav'
    metadata = json.loads(frozen.with_suffix('.json').read_text(encoding='utf-8'))
    if digest(frozen) != metadata['sha256']:
        raise ValueError('Selected Silver reference changed')
    direction = load_module('silver_production_direction', 'voice-silver.py').DELIVERIES[2]
    # Importing the direction module loads the same helper under another name.
    helper.OUT = helper.sampler.OUT = OUT
    approved_hashes = {
        'welcome-back': '7229edc4edd5fd426742b15f56e85951d31e472a3d91359b5dd294ea4f3a75ca',
        'brilliant': '240daea512668f32602f3705bae865bc3cae2a0ba9a85c0e48e4339b2d73145c',
        'resonance': '3494069224aa4ef1854a3d9fb97c2c4b81e7b170884a2dc4f80fa4fc6feb3214',
    }
    model = None
    speech_path = OUT/'speech-results.json'
    speech = {r['line']: r for r in json.loads(speech_path.read_text(encoding='utf-8'))
              if r['voice'] == 'silver'} if speech_path.exists() else {}
    try:
        for key, text in LINES.items():
            receipt_path = OUT/('silver-'+key+'.json')
            old = json.loads(receipt_path.read_text(encoding='utf-8')) if receipt_path.exists() else None
            seed = old.get('seed', 42) if old else 42
            if retry_reviewed and key not in approved_hashes and old and (
                    old['medianPitchHz'] > 165 or not speech.get(key, {'pass': True})['pass']):
                seeds = [42, 133, 300926, 97]
                if seed not in seeds or seeds.index(seed) == len(seeds)-1:
                    raise ValueError('Review generation after maximum retries: '+key)
                rejected = OUT/'rejected'
                rejected.mkdir(exist_ok=True)
                stem = 'silver-'+key+'-seed'+str(seed)
                shutil.copyfile(OUT/old['file'], rejected/(stem+'.wav'))
                shutil.copyfile(receipt_path, rejected/(stem+'.json'))
                seed = seeds[seeds.index(seed)+1]
            style = direction[4] if key in ['welcome', 'welcome-back', 'dawn', 'tidepool', 'ember', 'aurora', 'starfall', 'prism-heart'] else direction[5]
            details = {'label': 'Silver master', 'engine': 'Qwen3 1.7B Base',
                       'speaker': 'Silver master / arcade lift', 'seed': seed,
                       'modelRevision': metadata['baseModelRevision'],
                       'reference': frozen.name, 'referenceSha256': metadata['sha256'],
                       'referenceText': metadata['text'], 'deliveryDirection': style,
                       'finalPitchEdit': False, 'toneEffects': False,
                       'semitones': 0, 'formantRatio': 1, 'durationFactor': 1}
            if key in approved_hashes:
                source = ROOT/'tools/voice-references'/('silver-approved-'+key+'.wav')
                if not source.exists():
                    shutil.copyfile(ROOT/'tools/out/voices/silver-round6'/('silver-arcade-'+key+'.wav'), source)
                if digest(source) != approved_hashes[key]:
                    raise ValueError('Approved Silver performance changed: '+key)
                details.update(approvedSourceSha256=digest(source), retainPcm=True)
                if not helper.cached('silver', key, details):
                    path = OUT/('silver-'+key+'.wav')
                    shutil.copyfile(source, path)
                    audio, rate = sf.read(path)
                    measured = helper.prep.pitch(path)
                    clip = {'voice': 'silver', 'line': key, 'text': text, 'file': path.name,
                            'duration': round(len(audio)/rate, 3), 'sampleRate': rate,
                            'medianPitchHz': measured['medianHz'], 'pitch10Hz': measured['p10Hz'],
                            'pitch90Hz': measured['p90Hz'], 'sha256': digest(path),
                            'fingerprint': helper.fingerprint(details), **details}
                    receipt_path.write_text(json.dumps(clip, indent=2), encoding='utf-8')
                print('Retained approved Silver', key, flush=True)
                continue
            if helper.cached('silver', key, details):
                continue
            if model is None:
                from qwen_tts import Qwen3TTSModel
                cache = Path.home()/'.cache/huggingface/hub/models--Qwen--Qwen3-TTS-12Hz-1.7B-Base/snapshots'/metadata['baseModelRevision']
                print('Loading cached Base model for selected Silver speaker', flush=True)
                model = Qwen3TTSModel.from_pretrained(str(cache), device_map='cuda:0',
                    dtype=torch.bfloat16, attn_implementation='sdpa', local_files_only=True)
                audio, rate = sf.read(frozen, dtype='float32')
                prompt = model.create_voice_clone_prompt(ref_audio=(audio, rate),
                    ref_text=metadata['text'], x_vector_only_mode=False)
            print('Generating Silver', key, 'seed', seed, flush=True)
            torch.manual_seed(seed)
            started = time.perf_counter()
            instruction_ids = model._tokenize_texts([model._build_instruct_text(style)])
            wavs, rate = model.generate_voice_clone(text=text, language='English',
                voice_clone_prompt=prompt, instruct_ids=instruction_ids,
                max_new_tokens=260, non_streaming_mode=True)
            helper.save('silver', key, text, wavs[0], rate, started, details)
    finally:
        if model is not None:
            del model
            gc.collect()
            torch.cuda.empty_cache()
    clips = [json.loads((OUT/('silver-'+key+'.json')).read_text(encoding='utf-8')) for key in LINES]
    (OUT/'catalog.json').write_text(json.dumps(clips, indent=2), encoding='utf-8')
    levels.normalize(OUT)
    clips = json.loads((OUT/'catalog.json').read_text(encoding='utf-8'))
    profile = {'name': 'Silver master', 'semitones': 0, 'clips': {}}
    for clip in clips:
        wav = OUT/clip['file']
        mp3 = wav.with_suffix('.mp3')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav),
            '-codec:a', 'libmp3lame', '-b:a', '64k', '-ar', '24000', '-ac', '1', str(mp3)], check=True)
        clip['mp3'] = mp3.name
        clip['mp3Sha256'] = digest(mp3)
        profile['clips'][clip['line']] = {'text': clip['text'], 'duration': clip['duration'],
            'data': b64encode(mp3.read_bytes()).decode('ascii'), 'sha256': digest(mp3)}
        (OUT/('silver-'+clip['line']+'.json')).write_text(json.dumps(clip, indent=2), encoding='utf-8')
    for name, voice in legacy.items():
        for key, item in voice['clips'].items():
            mp3 = OUT/(name+'-'+key+'.mp3')
            data = b64decode(item['data'])
            if hashlib.sha256(data).hexdigest() != item['sha256']:
                raise ValueError('Legacy embedded clip checksum mismatch')
            mp3.write_bytes(data)
            clips.append({'voice': name, 'line': key, 'text': item['text'], 'mp3': mp3.name,
                          'duration': item['duration'], 'mp3Sha256': item['sha256']})
    (OUT/'catalog.json').write_text(json.dumps(clips, indent=2), encoding='utf-8')
    asset = {'version': 2, 'engine': 'Qwen3-TTS-12Hz-1.7B-Base', 'modelLicense': 'Apache-2.0',
             'defaultProfile': 'silver', 'profiles': {'silver': profile, **legacy}}
    target.write_text(json.dumps(asset, separators=(',', ':')), encoding='utf-8')
    print('Built', len(clips), 'clips; default Silver master; no new pitch or tone effects.', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--legacy', action='store_true')
    parser.add_argument('--retry-reviewed', action='store_true')
    parser.add_argument('--natural', action='store_true', help='Rebuild the earlier unprocessed Silver pack')
    args = parser.parse_args()
    if args.legacy:
        build_legacy()
    elif args.natural:
        build_silver(args.retry_reviewed)
    else:
        if args.retry_reviewed:
            parser.error('--retry-reviewed requires --natural; crystal takes are frozen')
        load_module('selected_crystal', 'announcer-crystal.py').install()
