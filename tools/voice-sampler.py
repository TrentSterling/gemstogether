"""Generate short, repeatable auditions using Trent's existing local GPU TTS.

Run C:/py/python.exe tools/voice-sampler.py --engine kokoro or qwen.
Nothing plays through the system speakers. Outputs live in tools/out/voices.
"""
import argparse
import gc
import json
import os
import sys
import time
from pathlib import Path

import numpy as np
import soundfile as sf
import torch

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'tools/out/voices'
OUT.mkdir(parents=True, exist_ok=True)
LINES = [
    ('tidepool', 'Welcome to Tidepool!'),
    ('dazzling', 'Dazzling! Look at you go!'),
    ('team', 'Team Resonance! Better together!'),
    ('supernova', 'Supernova! That was beautiful!'),
]
STYLE = ('Speak in English as a warm, playful game companion. Smile in your voice, '
         'with bright, genuine delight. Use a clear, quick game announcement, '
         'a little musical lift and crisp endings. Friendly and encouraging, '
         'with natural energy and no shouting. Read only the provided line.')


def save(voice, key, text, audio, rate, seconds, details):
    audio = np.asarray(audio, dtype=np.float32).reshape(-1)
    if not len(audio) or not np.isfinite(audio).all():
        raise ValueError('Invalid generated audio for ' + voice)
    active = np.flatnonzero(np.abs(audio) > .005)
    if not len(active):
        raise ValueError('Silent generated audio for ' + voice)
    # Remove excess silence; retain 60ms of breathing room around the performance.
    margin = int(rate * .06)
    audio = audio[max(0, active[0]-margin):min(len(audio), active[-1]+margin+1)]
    rms = float(np.sqrt(np.mean(audio ** 2)))
    gain = min(.125/max(rms, 1e-6), .89/max(float(np.max(np.abs(audio))), 1e-6))
    audio *= gain
    edge = min(int(rate*.005), len(audio)//2)
    audio[:edge] *= np.linspace(0, 1, edge)
    audio[-edge:] *= np.linspace(1, 0, edge)
    target = OUT / (voice + '-' + key + '.wav')
    sf.write(target, audio, rate, subtype='PCM_16')
    receipt = {'voice': voice, 'line': key, 'text': text, 'file': target.name,
               'duration': round(len(audio)/rate, 3), 'sampleRate': rate,
               'generationSeconds': round(seconds, 2), 'peak': round(float(np.max(np.abs(audio))), 4),
               'rms': round(float(np.sqrt(np.mean(audio**2))), 4), **details}
    (OUT / (voice+'-'+key+'.json')).write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    print(json.dumps(receipt), flush=True)


def kokoro():
    from kokoro import KPipeline
    pipeline = KPipeline(lang_code='a', device='cuda')
    for voice in ['af_heart', 'am_puck', 'am_fenrir']:
        for key, text in LINES:
            if (OUT / (voice+'-'+key+'.json')).exists():
                continue
            torch.manual_seed(290926)
            begin = time.perf_counter()
            chunks = [audio.numpy() for _, _, audio in pipeline(text, voice=voice, speed=1.04)]
            save(voice, key, text, np.concatenate(chunks), 24000, time.perf_counter()-begin,
                 {'engine': 'Kokoro 82M', 'speaker': voice, 'speed': 1.04, 'style': 'Natural voice; no style prompt'})


def qwen():
    from qwen_tts import Qwen3TTSModel
    model = Qwen3TTSModel.from_pretrained('Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice',
        device_map='cuda:0', dtype=torch.bfloat16, attn_implementation='sdpa', local_files_only=True)
    for voice in ['serena', 'ryan']:
        for key, text in LINES:
            name = 'qwen-'+voice
            if (OUT / (name+'-'+key+'.json')).exists():
                continue
            torch.manual_seed(290926)
            begin = time.perf_counter()
            wavs, rate = model.generate_custom_voice(text=text, language='English', speaker=voice,
                instruct=STYLE, max_new_tokens=160, non_streaming_mode=True)
            save(name, key, text, wavs[0], rate, time.perf_counter()-begin,
                 {'engine': 'Qwen3 1.7B', 'speaker': voice, 'style': STYLE})
    del model
    gc.collect()
    torch.cuda.empty_cache()


def omni(retry=False):
    studio = Path('C:/trontstack/clonedrepos/VoiceStudio')
    sys.dont_write_bytecode = True
    sys.path.insert(0, str(studio))
    os.environ['HF_HOME'] = str(OUT.parent/'voice-models')
    from omnivoice import OmniVoice
    model = OmniVoice.from_pretrained('k2-fsa/OmniVoice', device_map='cuda:0',
        dtype=torch.bfloat16, attn_implementation='eager', load_asr=False)
    reference_text = 'The little lights are waiting for you. Take your time, and see where they lead. Every gem is a small invitation to play.'
    for gender in ['female', 'male']:
        if retry and gender!='female':
            continue
        name = 'omni-'+gender
        tags = gender+', young adult, moderate pitch, american accent'
        seed=290931 if gender=='female' else 290926
        torch.manual_seed(seed)
        ref_path = OUT/(name+'-reference.wav')
        if not retry and ref_path.exists() and ref_path.stat().st_size>44:
            reference, rate = sf.read(ref_path, dtype='float32')
        else:
            reference = np.asarray(model.generate(text=reference_text, language='en', instruct=tags,
                num_step=32, postprocess_output=False)[0],dtype=np.float32).reshape(-1)
            rate = model.sampling_rate
            sf.write(ref_path, reference, rate, subtype='PCM_16')
        prompt = model.create_voice_clone_prompt(ref_audio=(torch.from_numpy(reference), rate),
            ref_text=reference_text, preprocess_prompt=False)
        for key, text in LINES:
            if not retry and (OUT/(name+'-'+key+'.json')).exists():
                continue
            torch.manual_seed(seed)
            begin = time.perf_counter()
            audio = model.generate(text=text, language='en', voice_clone_prompt=prompt,
                num_step=32, speed=1.04, postprocess_output=False)[0]
            save(name, key, text, audio, model.sampling_rate, time.perf_counter()-begin,
                 {'engine': 'VoiceStudio / OmniVoice', 'speaker': 'Synthetic '+gender+' design',
                  'style': tags, 'license': 'CC-BY-NC; local audition only',
                  'seed': seed, 'dtype': 'bfloat16',
                  'reference': ref_path.name, 'sourceCommit': '0834c8be28460fc4e0518bdb31eb57c494b253b2'})


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--engine', choices=['kokoro', 'qwen', 'omni'], required=True)
    parser.add_argument('--retry-female', action='store_true')
    args = parser.parse_args()
    print('Device:', torch.cuda.get_device_name(0), flush=True)
    if args.engine=='omni':
        omni(retry=args.retry_female)
    else:
        {'kokoro': kokoro, 'qwen': qwen}[args.engine]()
