"""Round two: Ryan pitch controls and the existing Cave-inspired Qwen design.

Run with C:/py/python.exe. Uses cached models only, never plays audio, and keeps
round-one clips intact. Each take records its exact prompt, seed and processing.
"""
import gc
import hashlib
import importlib.util
import json
import os
import shutil
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
sampler_spec = importlib.util.spec_from_file_location('voice_sampler', Path(__file__).with_name('voice-sampler.py'))
sampler = importlib.util.module_from_spec(sampler_spec)
sampler_spec.loader.exec_module(sampler)

ORIGINAL = sampler.OUT
OUT = ORIGINAL / 'ryan-round2'
OUT.mkdir(parents=True, exist_ok=True)
sampler.OUT = OUT
PRESET_PATH = Path('C:/trontstack/glados/presets/facility_pa.json')
PRESET_BYTES = PRESET_PATH.read_bytes()
PRESET = json.loads(PRESET_BYTES)
FACILITY_STYLE = PRESET['tts']['instruct']
FACILITY_SEED = PRESET['tts']['seed']
LOW_RYAN_STYLE = (
    'Speak in English with a lower, resonant baritone pitch and a mature, grounded '
    'male timbre. Keep your delivery animated, warm and playful, with a smile, '
    'bold comic emphasis and lively pitch movement within the lower register. '
    'Project clearly at normal announcer volume. Use crisp, quick endings. '
    'Read only the provided line.'
)
WARM_DESIGN_STYLE = (
    'A mature American man in his fifties with a rich, deep gravelly baritone, '
    'chesty resonance and the confident charisma of a 1950s company founder. '
    'Warm and playfully eccentric, delighted by small victories, with bold comic '
    'emphasis and expressive pitch movement in a lower register. Speaks clearly '
    'at full projected volume, encouraging and proud, with punchy concise endings.'
)


def pitch(audio, rate):
    track = parselmouth.Sound(audio, sampling_frequency=rate).to_pitch_ac(
        pitch_floor=60, pitch_ceiling=500).selected_array['frequency']
    voiced = track[track > 0]
    return round(float(np.median(voiced)), 2) if len(voiced) else None


def write(name, label, description, key, text, audio, rate, seconds, details):
    sampler.save(name, key, text, audio, rate, seconds,
                 {'label': label, 'description': description,
                  'medianPitchHz': pitch(audio, rate), **details})


def exists(name, key):
    return (OUT / (name+'-'+key+'.wav')).exists() and (OUT / (name+'-'+key+'.json')).exists()


def cached_model(name):
    cache = Path.home()/'.cache/huggingface/hub'/('models--Qwen--'+name)
    revision = (cache/'refs/main').read_text(encoding='utf-8').strip()
    path = cache/'snapshots'/revision
    if not (path/'model.safetensors').exists():
        raise FileNotFoundError('Model is not cached: '+str(path))
    return str(path)


def pitch_variants():
    for key, text in sampler.LINES:
        source = ORIGINAL / ('qwen-ryan-'+key+'.wav')
        audio, rate = sf.read(source, dtype='float32')
        median = pitch(audio, rate)
        if median is None:
            raise ValueError('No voiced frames in '+str(source))
        original = json.loads(source.with_suffix('.json').read_text(encoding='utf-8'))
        original.update(label='Ryan / original', description='The warm, playful take you picked.',
                        medianPitchHz=median)
        shutil.copyfile(source, OUT / source.name)
        (OUT / source.with_suffix('.json').name).write_text(json.dumps(original, indent=2), encoding='utf-8')
        for semitones in [-2, -4]:
            name = 'qwen-ryan-minus'+str(-semitones)
            if exists(name, key):
                continue
            started = time.perf_counter()
            manipulation = parselmouth.praat.call(parselmouth.Sound(audio, sampling_frequency=rate),
                'To Manipulation', .01, 60, 500)
            tier = parselmouth.praat.call(manipulation, 'Extract pitch tier')
            parselmouth.praat.call(tier, 'Multiply frequencies', 0, len(audio)/rate, 2**(semitones/12))
            parselmouth.praat.call([tier, manipulation], 'Replace pitch tier')
            shifted = parselmouth.praat.call(manipulation, 'Get resynthesis (overlap-add)').values[0].astype(np.float32)
            write(name, 'Ryan / '+str(semitones)+' semitones',
                  'The original performance with pitch shifted down; duration and formant ratio preserved.',
                  key, text, shifted, rate, time.perf_counter()-started,
                  {'engine': 'Qwen3 Ryan + Praat pitch shift', 'speaker': 'ryan',
                   'source': source.name, 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                   'style': original['style'], 'processing': {'semitones': semitones,
                   'algorithm': 'Praat PSOLA / multiply pitch tier frequencies',
                   'formantRatio': 1.0, 'durationFactor': 1.0}, 'sourceMedianPitchHz': median})


def custom_ryan():
    name = 'qwen-ryan-baritone'
    if all(exists(name, key) for key, _ in sampler.LINES):
        return
    from qwen_tts import Qwen3TTSModel
    model = Qwen3TTSModel.from_pretrained(cached_model('Qwen3-TTS-12Hz-1.7B-CustomVoice'),
        device_map='cuda:0', dtype=torch.bfloat16, attn_implementation='sdpa', local_files_only=True)
    for key, text in sampler.LINES:
        if exists(name, key):
            continue
        torch.manual_seed(290926)
        started = time.perf_counter()
        wavs, rate = model.generate_custom_voice(text=text, language='English', speaker='ryan',
            instruct=LOW_RYAN_STYLE, max_new_tokens=200, non_streaming_mode=True)
        write(name, 'Ryan / baritone prompt', 'A new Ryan performance asking for a lower register and lively expression.',
              key, text, wavs[0], rate, time.perf_counter()-started,
              {'engine': 'Qwen3 1.7B CustomVoice', 'speaker': 'ryan', 'style': LOW_RYAN_STYLE, 'seed': 290926})
    del model
    gc.collect()
    torch.cuda.empty_cache()


def designed_voices():
    designs = [
        ('qwen-cave-clean', 'Cave-inspired / clean', FACILITY_STYLE, FACILITY_SEED,
         'Your existing facility_pa voice description and seed, without the speaker effects.'),
        ('qwen-gems-founder', 'Gems / warm founder', WARM_DESIGN_STYLE, 42,
         'A new deep, gravelly founder description with a warmer, playful delivery.'),
    ]
    if all(exists(name, key) for name, _, _, _, _ in designs for key, _ in sampler.LINES):
        return
    from qwen_tts import Qwen3TTSModel
    model = Qwen3TTSModel.from_pretrained(cached_model('Qwen3-TTS-12Hz-1.7B-VoiceDesign'),
        device_map='cuda:0', dtype=torch.bfloat16, attn_implementation='sdpa', local_files_only=True)
    for name, label, style, seed, description in designs:
        for key, text in sampler.LINES:
            if exists(name, key):
                continue
            torch.manual_seed(seed)
            started = time.perf_counter()
            wavs, rate = model.generate_voice_design(text=text, language='English',
                instruct=style, max_new_tokens=200, non_streaming_mode=True)
            details = {'engine': 'Qwen3 1.7B VoiceDesign', 'speaker': 'designed male', 'style': style, 'seed': seed}
            if name == 'qwen-cave-clean':
                details.update(sourcePreset=str(PRESET_PATH), sourcePresetSha256=hashlib.sha256(PRESET_BYTES).hexdigest())
            write(name, label, description, key, text, wavs[0], rate, time.perf_counter()-started, details)
    del model
    gc.collect()
    torch.cuda.empty_cache()


def facility_effects():
    # Read the existing owned DSP implementation without creating bytecode there.
    sys.path.insert(0, 'C:/trontstack/glados')
    from glados_voice.dsp.chain import DSPChain
    from scipy.signal import resample_poly
    for key, text in sampler.LINES:
        name = 'qwen-cave-pa'
        if exists(name, key):
            continue
        source = OUT / ('qwen-cave-clean-'+key+'.wav')
        audio, rate = sf.read(source, dtype='float32')
        started = time.perf_counter()
        # Original facility DSP was tuned for 44.1 kHz; process at that rate.
        audio = resample_poly(audio, 147, 80).astype(np.float32)
        audio = DSPChain.from_preset(PRESET).process(audio, 44100)
        audio = resample_poly(audio, 80, 147).astype(np.float32)
        write(name, 'Cave-inspired / PA', 'The same clean take through your original gritty facility PA effects.',
              key, text, audio, rate, time.perf_counter()-started,
              {'engine': 'Qwen3 VoiceDesign + facility_pa DSP', 'speaker': 'designed male',
               'style': FACILITY_STYLE, 'seed': FACILITY_SEED, 'source': source.name,
               'sourcePreset': str(PRESET_PATH), 'sourcePresetSha256': hashlib.sha256(PRESET_BYTES).hexdigest(),
               'processing': PRESET['dsp']})


def clone_existing_founder():
    name = 'qwen-cave-reference'
    if all(exists(name, key) for key, _ in sampler.LINES):
        return
    from qwen_tts import Qwen3TTSModel
    from scipy.signal import resample_poly
    from glados_voice.dsp.chain import DSPChain
    source = Path('C:/trontstack/tront/trontbot/tts_output/qwen3_design_20260721_024400_757178.wav')
    reference, rate = sf.read(source, dtype='float32')
    transcript = json.loads((OUT/'facility-reference.json').read_text(encoding='utf-8'))['text']
    known, known_rate = sf.read(OUT/'facility-reference.wav', dtype='float32')
    processed = np.clip(DSPChain.from_preset(PRESET).process(resample_poly(reference, 147, 80).astype(np.float32), 44100), -1, 1)
    if known_rate != 44100 or len(processed) != len(known):
        raise ValueError('Raw facility reference length does not match the existing run')
    correlation = float(np.corrcoef(known, processed)[0, 1])
    # The retained raw WAV is PCM16, whereas the original DSP received the
    # pre-quantization float output. Praat's formant analysis can differ slightly.
    if correlation < .95:
        raise ValueError('Raw facility reference did not reproduce the known PA take: '+str(correlation))
    shutil.copyfile(source, OUT/'facility-reference-clean.wav')
    details = {'engine': 'Qwen3 1.7B Base / reference clone', 'speaker': 'existing facility announcer',
               'reference': 'facility-reference-clean.wav', 'sourceReference': str(source),
               'sourceReferenceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
               'referenceText': transcript, 'referenceToKnownPACorrelation': round(correlation, 6),
               'seed': 290926, 'style': 'Identity from the existing clean WHACKO dawn take; no delivery instruction.'}
    (OUT/'facility-reference-clean.json').write_text(json.dumps(details, indent=2), encoding='utf-8')
    model = Qwen3TTSModel.from_pretrained(cached_model('Qwen3-TTS-12Hz-1.7B-Base'),
        device_map='cuda:0', dtype=torch.bfloat16, attn_implementation='sdpa', local_files_only=True)
    prompt = model.create_voice_clone_prompt(ref_audio=(reference, rate), ref_text=transcript, x_vector_only_mode=False)
    for key, text in sampler.LINES:
        if exists(name, key):
            continue
        torch.manual_seed(290926)
        started = time.perf_counter()
        wavs, output_rate = model.generate_voice_clone(text=text, language='English',
            voice_clone_prompt=prompt, max_new_tokens=200, non_streaming_mode=True)
        write(name, 'Cave-inspired / reference clone', 'New lines anchored to the actual clean WHACKO announcer take.',
              key, text, wavs[0], output_rate, time.perf_counter()-started, details)
    del model
    gc.collect()
    torch.cuda.empty_cache()


if __name__ == '__main__':
    reference = Path('C:/trontstack/glados/output/whacko/pa_07_dawn.wav')
    shutil.copyfile(reference, OUT/'facility-reference.wav')
    (OUT/'facility-reference.json').write_text(json.dumps({'source': str(reference),
        'sourceSha256': hashlib.sha256(reference.read_bytes()).hexdigest(),
        'text': "Would you look at that. Sunrise. Shift's over, carny. The hearse is running, your money is good, and I have never been prouder of a man holding a mallet."}, indent=2), encoding='utf-8')
    pitch_variants()
    custom_ryan()
    designed_voices()
    facility_effects()
    clone_existing_founder()
    print('Round two complete:', OUT, flush=True)
