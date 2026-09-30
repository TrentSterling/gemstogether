"""Build the selected announcer pack locally; no model or network at game runtime.

Voice identity comes from the approved round-two clean samples. New lines use
the cached Qwen Base model, then Praat PSOLA lowers pitch without slowing speech.
Run C:/py/python.exe tools/announcer-pack.py. Outputs auditable WAV/MP3 receipts
under tools/out/announcer and an embedded game asset at tools/announcer-pack.json.
"""
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


def build():
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


if __name__ == '__main__':
    build()
