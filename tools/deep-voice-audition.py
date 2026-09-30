"""Local deep Qwen auditions, isolated from the embedded game pack.

Run C:/py/python.exe tools/deep-voice-audition.py --mode compare.
Uses cached models only. Never plays audio or writes announcer-pack.json/index.html.
"""
import argparse
import gc
import hashlib
import importlib.util
import json
import os
import sys
import time
from pathlib import Path

os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'
sys.dont_write_bytecode = True
import numpy as np
import parselmouth
import soundfile as sf
import torch

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tools/out/voices/deep-round3'
SOURCE = ROOT / 'tools/out/announcer'
cache = OUT / '.cache/numba'
cache.mkdir(parents=True, exist_ok=True)
os.environ['NUMBA_CACHE_DIR'] = str(cache)


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(file))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


prep = load('deep_plan', 'deep-voice-plan.py')
sampler = load('deep_sampler', 'voice-sampler.py')
sampler.OUT = OUT


def fingerprint(details):
    return hashlib.sha256(json.dumps(details, sort_keys=True).encode()).hexdigest()


def cached(voice, key, details):
    path = OUT / (voice + '-' + key + '.json')
    if not path.exists():
        return False
    receipt = json.loads(path.read_text(encoding='utf-8'))
    audio = OUT / receipt['file']
    return (receipt.get('fingerprint') == fingerprint(details) and audio.is_file()
            and prep.digest(audio) == receipt.get('sha256'))


def save(voice, key, text, audio, rate, started, details):
    sampler.save(voice, key, text, audio, rate, time.perf_counter() - started,
                 {**details, 'fingerprint': fingerprint(details)})
    path = OUT / (voice + '-' + key + '.json')
    receipt = json.loads(path.read_text(encoding='utf-8'))
    wav = OUT / receipt['file']
    measured = prep.pitch(wav)
    receipt.update(medianPitchHz=measured['medianHz'], pitch10Hz=measured['p10Hz'],
                   pitch90Hz=measured['p90Hz'], sha256=prep.digest(wav),
                   pitchReview=measured['medianHz'] > 150)
    path.write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    print('PITCH', voice, key, measured['medianHz'], 'Hz', flush=True)


def baselines(plan):
    for profile in ['founder-4', 'cave-6']:
        for key, text in plan['lines'].items():
            source = SOURCE / (profile + '-' + key + '.mp3')
            details = {'label': 'Current ' + ('Warm founder / -4' if profile.startswith('founder') else 'Cave / -6'),
                       'engine': 'Current Qwen pack / matched level',
                       'description': 'Your existing compressed take, adjusted to the same audition level.',
                       'source': str(source), 'sourceSha256': prep.digest(source)}
            voice = 'baseline-' + profile
            if cached(voice, key, details):
                continue
            started = time.perf_counter()
            audio, rate = sf.read(source, dtype='float32')
            save(voice, key, text, audio, rate, started, details)


def edited(plan):
    for candidate in plan['editedCandidates']:
        for key, text in plan['lines'].items():
            source = SOURCE / (candidate['voice'] + '-' + key + '.wav')
            details = {'label': ('Warm founder' if candidate['voice'] == 'founder' else 'Cave') + ' / deep edit',
                       'engine': 'Existing Qwen take / pitch + formant edit',
                       'description': 'Original delivery, much lower pitch and slightly darker resonance.',
                       'source': str(source), 'sourceSha256': prep.digest(source),
                       'pitchFactor': candidate['pitchFactor'], 'semitones': candidate['semitones'],
                       'formantRatio': candidate['formantRatio'], 'durationFactor': 1}
            voice = 'edited-' + candidate['voice']
            if cached(voice, key, details):
                continue
            started = time.perf_counter()
            audio, rate = sf.read(source, dtype='float64')
            old_median = prep.pitch(source)['medianHz']
            changed = parselmouth.praat.call(parselmouth.Sound(audio, sampling_frequency=rate),
                'Change gender', 45, 500, candidate['formantRatio'],
                old_median * candidate['pitchFactor'], 1, 1)
            if changed.sampling_frequency != rate:
                changed = changed.resample(rate)
            shifted = changed.values[0].astype(np.float32)
            if abs(len(shifted) - len(audio)) > rate * .02:
                raise ValueError('Edit unexpectedly changed delivery duration: ' + source.name)
            save(voice, key, text, shifted, rate, started, details)


def fresh(plan):
    print('Importing Qwen with the local audition cache', flush=True)
    from qwen_tts import Qwen3TTSModel
    refs = []
    model = None
    try:
        for design in plan['freshDesigns']:
            voice = design['id']
            details = {'label': design['label'], 'engine': 'Qwen3 VoiceDesign / reference',
                       'description': design['description'], 'style': design['style'],
                       'seed': design['seed'], 'modelRevision': plan['models']['VoiceDesign']['revision']}
            if not cached(voice, 'reference', details):
                if model is None:
                    print('Loading cached VoiceDesign model', flush=True)
                    model = Qwen3TTSModel.from_pretrained(plan['models']['VoiceDesign']['path'],
                        device_map='cuda:0', dtype=torch.bfloat16, attn_implementation='sdpa', local_files_only=True)
                started = time.perf_counter()
                torch.manual_seed(design['seed'])
                wavs, rate = model.generate_voice_design(text=plan['freshReferenceText'], language='English',
                    instruct=design['style'], max_new_tokens=750, non_streaming_mode=True)
                save(voice, 'reference', plan['freshReferenceText'], wavs[0], rate, started, details)
            refs.append((design, OUT / (voice + '-reference.wav')))
    finally:
        if model is not None:
            del model
            gc.collect()
            torch.cuda.empty_cache()
    model = None
    try:
        for design, reference in refs:
            voice = design['id']
            details = {'label': design['label'], 'engine': 'Qwen3 Base / new deep reference',
                       'description': design['description'], 'style': design['style'],
                       'seed': 290926, 'modelRevision': plan['models']['Base']['revision'],
                       'reference': reference.name, 'referenceSha256': prep.digest(reference),
                       'referenceText': plan['freshReferenceText']}
            needed = [(key, text) for key, text in plan['lines'].items() if not cached(voice, key, details)]
            if not needed:
                continue
            if model is None:
                print('Loading cached Base model for consistent speakers', flush=True)
                model = Qwen3TTSModel.from_pretrained(plan['models']['Base']['path'],
                    device_map='cuda:0', dtype=torch.bfloat16, attn_implementation='sdpa', local_files_only=True)
            audio, rate = sf.read(reference, dtype='float32')
            prompt = model.create_voice_clone_prompt(ref_audio=(audio, rate),
                ref_text=plan['freshReferenceText'], x_vector_only_mode=False)
            for key, text in needed:
                print('Generating', voice, key, flush=True)
                started = time.perf_counter()
                torch.manual_seed(290926)
                wavs, rate = model.generate_voice_clone(text=text, language='English', voice_clone_prompt=prompt,
                    max_new_tokens=260, non_streaming_mode=True)
                save(voice, key, text, wavs[0], rate, started, details)
            del prompt
    finally:
        if model is not None:
            del model
            gc.collect()
            torch.cuda.empty_cache()


def low_references(plan):
    """Lower the character reference, then resynthesize the actual game lines."""
    from qwen_tts import Qwen3TTSModel
    model = None
    try:
        for design in plan['freshDesigns']:
            voice = design['id'] + '-lowref'
            source = OUT / (design['id'] + '-reference.wav')
            reference_details = {
                'label': design['label'] + ' / low reference',
                'engine': 'New Qwen character / lowered reference',
                'description': 'The new character reference lowered before Qwen generates the short lines.',
                'source': source.name, 'sourceSha256': prep.digest(source),
                'targetMedianHz': 105, 'formantRatio': .85, 'durationFactor': 1,
            }
            if not cached(voice, 'reference', reference_details):
                started = time.perf_counter()
                audio, rate = sf.read(source, dtype='float64')
                changed = parselmouth.praat.call(parselmouth.Sound(audio, sampling_frequency=rate),
                    'Change gender', 45, 500, .85, 105, 1, 1)
                if changed.sampling_frequency != rate:
                    changed = changed.resample(rate)
                save(voice, 'reference', plan['freshReferenceText'], changed.values[0], rate,
                     started, reference_details)
            reference = OUT / (voice + '-reference.wav')
            details = {
                'label': ('Fresh bass' if design['id'] == 'deep-bass' else 'Fresh booming baritone') + ' / low reference',
                'engine': 'Qwen3 Base / low reference first',
                'description': 'Newly generated delivery from a deepened character reference; no final pitch edit.',
                'style': design['style'], 'seed': 290926,
                'modelRevision': plan['models']['Base']['revision'],
                'reference': reference.name, 'referenceSha256': prep.digest(reference),
                'referenceText': plan['freshReferenceText'], 'referenceProcessing': reference_details,
                'finalPitchEdit': False,
            }
            needed = [(key, text) for key, text in plan['lines'].items() if not cached(voice, key, details)]
            if not needed:
                continue
            if model is None:
                print('Loading Base model for low-reference auditions', flush=True)
                model = Qwen3TTSModel.from_pretrained(plan['models']['Base']['path'],
                    device_map='cuda:0', dtype=torch.bfloat16, attn_implementation='sdpa', local_files_only=True)
            audio, rate = sf.read(reference, dtype='float32')
            prompt = model.create_voice_clone_prompt(ref_audio=(audio, rate),
                ref_text=plan['freshReferenceText'], x_vector_only_mode=False)
            for key, text in needed:
                print('Generating low-reference take', voice, key, flush=True)
                started = time.perf_counter()
                torch.manual_seed(290926)
                wavs, rate = model.generate_voice_clone(text=text, language='English',
                    voice_clone_prompt=prompt, max_new_tokens=260, non_streaming_mode=True)
                save(voice, key, text, wavs[0], rate, started, details)
            del prompt
    finally:
        if model is not None:
            del model
            gc.collect()
            torch.cuda.empty_cache()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--mode', choices=['compare', 'fresh', 'edited'], default='compare')
    parser.add_argument('--low-reference', action='store_true', help='Lower fresh character references before resynthesizing the lines')
    args = parser.parse_args()
    prep.prepare()
    plan = json.loads((OUT / 'prepared-plan.json').read_text(encoding='utf-8'))
    game_hash = prep.digest(ROOT / 'index.html')
    baselines(plan)
    if args.mode != 'fresh':
        edited(plan)
    if args.mode != 'edited':
        fresh(plan)
        if args.low_reference:
            low_references(plan)
    order = ['baseline-founder-4', 'baseline-cave-6']
    if args.mode != 'fresh':
        order += ['edited-founder', 'edited-cave']
    if args.mode != 'edited':
        order += [d['id'] + ('-lowref' if args.low_reference else '') for d in plan['freshDesigns']]
    catalog = [json.loads((OUT / (voice + '-' + key + '.json')).read_text(encoding='utf-8'))
               for voice in order for key in plan['lines']]
    if prep.digest(ROOT / 'index.html') != game_hash or prep.digest(prep.PACK) != plan['gamePackSha256']:
        raise RuntimeError('Game assets changed during the audition')
    (OUT / 'catalog.json').write_text(json.dumps(catalog, indent=2), encoding='utf-8')
    plan.update(status='generated; listening review pending', comparisonChoicePending=False, mode=args.mode,
                candidates=order, clipCount=len(catalog), gameHtmlSha256=game_hash,
                lowReferenceFirst=args.low_reference)
    (OUT / 'plan.json').write_text(json.dumps(plan, indent=2), encoding='utf-8')
    print('Completed', len(catalog), 'comparison clips; game assets unchanged.', flush=True)


if __name__ == '__main__':
    main()
