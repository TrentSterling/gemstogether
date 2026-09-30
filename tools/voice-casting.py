"""Broad described-character casting using the cached Qwen models.

Twelve new personas; one retained reference per character; three matching lines.
The current baritone and darker Cave are comparisons. Never changes game assets.
"""
import gc
import argparse
import importlib.util
import json
import os
import shutil
import sys
import time
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tools/out/voices/casting-round5'
DESIGNS = [
    ('velvet', 'Velvet arcade', 11,
     'Smooth, rounded and rich; a delighted velvet announcer.',
     'An adult American male arcade announcer with a deep velvet bass-baritone voice, '
     'very rounded dark vowels and a full resonant chest sound. Smooth and rich with '
     'clear consonants. A confident, delighted host celebrating the player with '
     'expansive stresses and decisive falling endings. Warm theatrical speaking, '
     'a little smile, projected from his low register. Clean close microphone sound.'),
    ('bronze', 'Bronze champion', 23,
     'Warm bronze resonance, a little rasp and punchy celebration.',
     'A mature American male game announcer with a low bronze bass-baritone voice. '
     'A little natural rasp over a solid sonorous chest tone. Charismatic and '
     'triumphant with buoyant rhythm, clear diction and punchy victory calls. '
     'He sounds proud of a magnificent play, smiling through the low resonant vowels. '
     'Bold animated speaking at a comfortable deep pitch. Clean studio recording.'),
    ('thunder', 'Thunder king', 37,
     'Huge clean bass, broad vowels and forceful victory calls.',
     'An adult male English-speaking game announcer with a huge clean basso voice. '
     'Booming, majestic and powerful, full of low chest resonance, with broad '
     'rounded vowels and precise consonants. He celebrates victories with expansive '
     'dramatic emphasis, a delighted booming laugh in the tone and strong falling '
     'cadences. The sound stays deep during every excited call. Clear studio speech.'),
    ('carnival', 'Grand carnival', 49,
     'A theatrical low ringmaster with generous, playful emphasis.',
     'An American male ringmaster with a deep bass-baritone speaking voice, rich '
     'chest projection and ringing rounded vowels. An exuberant old-fashioned '
     'showman welcoming the player to a glittering spectacle. He gives each '
     'important word theatrical weight and playful musical emphasis, then lands '
     'the ending confidently in his low register. Crisp diction and lively pacing. '
     'A clean full-band studio microphone recording.'),
    ('radio', 'Golden broadcaster', 61,
     'A polished broadcast baritone with warm authority and a grin.',
     'A middle-aged American male broadcast announcer with a deep golden baritone '
     'voice, rich rounded resonance and polished diction. A warm authoritative '
     'host who sounds pleased and a little amused by the player. Strong rhythmic '
     'stresses, generous vowels and a broad confident grin in the voice. His '
     'enthusiasm comes from emphasis in a low register. Full-frequency clean '
     'studio voice recording.'),
    ('granite', 'Granite storyteller', 73,
     'A rumbling textured bass with warmth beneath the gravel.',
     'A mature American male narrator with a deep rumbling granite bass voice. '
     'Audible natural grain and gravel over a very full chest sound. Grounded '
     'and charismatic, with sincere delight and expressive emphatic victory '
     'calls. He welcomes the player with warmth, speaks at a brisk clear pace '
     'and puts firm weight on the main words. Low sonorous vowels throughout. '
     'Clean close microphone recording.'),
    ('regal', 'Regal judge', 85,
     'A rounded British bass-baritone delivering grand, approving calls.',
     'A mature British male announcer with an imposing deep bass-baritone voice '
     'and beautifully rounded vowels. Regal, resonant and clear, with impeccable '
     'diction and controlled theatrical projection. He is warmly impressed by '
     'the player, giving every victory call broad approving emphasis and a '
     'satisfying falling cadence. Animated sonorous speech in a deep register, '
     'recorded cleanly in a studio.'),
    ('rogue', 'Roguish champion', 97,
     'Rugged, confident and playful, with low rough-edged energy.',
     'An adult American male announcer with a rugged low bass-baritone voice, '
     'a rough-edged grain and strong chest resonance. Confident and roguishly '
     'playful, as if cheering an impressive arcade victory. Strong syncopated '
     'emphasis, clear consonants and an infectious low smile. He speaks with '
     'vigour and charismatic approval while keeping the vowels deep and full. '
     'Close clean studio microphone sound.'),
    ('honey', 'Honey bass', 109,
     'Warm, smooth bass with flowing emphasis and clear low endings.',
     'An adult American male speaker with a smooth honeyed bass voice, very '
     'warm rounded vowel resonance and easy low chest support. A charismatic '
     'game host delivering joyful approvals with flowing rhythmic emphasis '
     'and clean precise words. The voice has a generous smile and bright '
     'energy carried by timing, while its register remains deep. Satisfying '
     'firm endings and clear full-band studio speech.'),
    ('herald', 'Heroic herald', 121,
     'A resonant heroic baritone with grand, emphatic declarations.',
     'An adult male heroic herald speaking English with a resonant deep '
     'bass-baritone voice. Full chest projection, ringing rounded vowels '
     'and powerful clear diction. Grand and triumphant, proclaiming a '
     'magnificent victory with joyful commanding emphasis. He welcomes '
     'the player as a champion, giving strong low-pitched declarations '
     'with lively theatrical rhythm. Clean studio spoken voice.'),
    ('silver', 'Silver master', 133,
     'A crisp, elegant low baritone with controlled excitement.',
     'A mature American male master of ceremonies with an elegant deep '
     'baritone voice, rich chest resonance and exceptionally crisp diction. '
     'Clear, assured and warmly proud, with controlled excitement and '
     'playful delight. Bold rhythmic stresses, rounded full vowels and '
     'concise falling endings make each short celebration satisfying. '
     'He speaks brightly from a stable low register into a clean studio microphone.'),
    ('canyon', 'Canyon bass', 145,
     'An enormous dark bass with gravel and emphatic, approving rhythm.',
     'A mature American male arcade announcer with an enormously deep dark '
     'bass voice, cavernous chest resonance and a little natural gravel. '
     'He sounds welcoming and delighted, giving each victory call huge '
     'rounded vowels and forceful rhythmic emphasis. An expressive '
     'booming speaking performance with crisp words and a confident '
     'low ending. Full clean close microphone sound.'),
]


def helper():
    spec = importlib.util.spec_from_file_location('casting_helper', Path(__file__).with_name('deep-voice-audition.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.OUT = OUT
    module.sampler.OUT = OUT
    cache = OUT / '.cache/numba'
    cache.mkdir(parents=True, exist_ok=True)
    os.environ['NUMBA_CACHE_DIR'] = str(cache)
    return module


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--retry-reviewed', action='store_true',
                        help='Retry high-register or speech-review calls with the same character reference')
    args = parser.parse_args()
    h = helper()
    import numpy as np
    import parselmouth
    import soundfile as sf
    import torch
    guards = {name: h.prep.digest(ROOT / name) for name in ['index.html', 'tools/announcer-pack.json']}
    source_plan = json.loads((ROOT / 'tools/out/voices/deep-round3/plan.json').read_text(encoding='utf-8'))
    models = source_plan['models']
    for model in models.values():
        if not (Path(model['path']) / 'model.safetensors').is_file():
            raise FileNotFoundError('Cached model is missing: ' + model['name'])
    designs = [{'id': voice, 'label': label, 'seed': seed, 'description': description, 'style': style}
               for voice, label, seed, description, style in DESIGNS]
    plan = {'models': models, 'lines': source_plan['lines'], 'freshDesigns': designs,
            'freshReferenceText': h.prep.REFERENCE_TEXT}
    print('Casting 12 described characters; cached models only.', flush=True)
    refs = h.fresh(plan, references_only=True)
    speech_path = OUT / 'speech-results.json'
    speech_checks = {r['file']: r for r in json.loads(speech_path.read_text())} if speech_path.exists() else {}
    from qwen_tts import Qwen3TTSModel
    model = None
    order = []
    try:
        for design, original in refs:
            voice = design['id']
            order.append(voice)
            original_pitch = h.prep.pitch(original)['medianHz']
            reference = original
            preparation = {'pitchChanged': False, 'formantRatio': 1}
            # Retain every native design. Prepare only a high reference's depth;
            # the new short calls are generated, never shifted after synthesis.
            if original_pitch > 165:
                reference = OUT / (voice + '-prepared-reference.wav')
                preparation = {'pitchChanged': True, 'formantRatio': .9, 'targetMedianHz': 115,
                               'source': original.name, 'sourceSha256': h.prep.digest(original)}
                if not h.cached(voice, 'prepared-reference', preparation):
                    audio, rate = sf.read(original, dtype='float64')
                    changed = parselmouth.praat.call(parselmouth.Sound(audio, sampling_frequency=rate),
                        'Change gender', 45, 500, .9, 115, 1, 1)
                    if changed.sampling_frequency != rate:
                        changed = changed.resample(rate)
                    h.save(voice, 'prepared-reference', plan['freshReferenceText'], changed.values[0], rate,
                           time.perf_counter(), preparation)
            reference_note = 'depth prepared on the reference' if preparation['pitchChanged'] else 'natural reference pitch'
            details = {'label': design['label'], 'engine': 'Qwen VoiceDesign + Base',
                       'description': design['description'] + ' (' + reference_note + '.)',
                       'style': design['style'], 'designSeed': design['seed'], 'seed': 300926,
                       'modelRevision': models['Base']['revision'],
                       'reference': reference.name, 'referenceSha256': h.prep.digest(reference),
                       'referenceText': plan['freshReferenceText'], 'referencePreparation': preparation,
                       'nativeReferencePitchHz': original_pitch, 'finalPitchEdit': False}
            needed = []
            for key, text in plan['lines'].items():
                receipt = OUT / (voice + '-' + key + '.json')
                previous = json.loads(receipt.read_text()) if receipt.exists() else {}
                line_details = {**details, 'seed': previous.get('seed', 300926)}
                if previous.get('castingRetryCount'):
                    line_details['castingRetryCount'] = previous['castingRetryCount']
                review = previous and (previous.get('medianPitchHz', 0) > 170
                         or not speech_checks.get(previous['file'], {'pass': True})['pass'])
                if args.retry_reviewed and review:
                    count = previous.get('castingRetryCount', 0)
                    if count >= 3:
                        continue
                    rejected = OUT / 'rejected'
                    rejected.mkdir(exist_ok=True)
                    tag = voice + '-' + key + '-seed' + str(previous['seed'])
                    shutil.copyfile(OUT / previous['file'], rejected / (tag + '.wav'))
                    shutil.copyfile(receipt, rejected / (tag + '.json'))
                    line_details.update(seed=[290926, 42, 56][count], castingRetryCount=count + 1)
                    print('Retrying reviewed call', voice, key, 'seed', line_details['seed'], flush=True)
                if not h.cached(voice, key, line_details):
                    needed.append((key, text, line_details))
            if not needed:
                continue
            if model is None:
                print('Loading cached Base model for the three-line sets', flush=True)
                model = Qwen3TTSModel.from_pretrained(models['Base']['path'], device_map='cuda:0',
                    dtype=torch.bfloat16, attn_implementation='sdpa', local_files_only=True)
            audio, rate = sf.read(reference, dtype='float32')
            prompt = model.create_voice_clone_prompt(ref_audio=(audio, rate),
                ref_text=plan['freshReferenceText'], x_vector_only_mode=False)
            for key, text, line_details in needed:
                print('Generating', design['label'], key, flush=True)
                started = time.perf_counter()
                torch.manual_seed(line_details['seed'])
                wavs, rate = model.generate_voice_clone(text=text, language='English', voice_clone_prompt=prompt,
                    max_new_tokens=260, non_streaming_mode=True)
                h.save(voice, key, text, wavs[0], rate, started, line_details)
            del prompt
    finally:
        if model is not None:
            del model
            gc.collect()
            torch.cuda.empty_cache()
    for voice, label, parent in [('reference-baritone', 'Your baritone favourite', 'baritone-current'),
                                  ('reference-cave', 'Cave / darker resonance', 'cave-resonance')]:
        order.append(voice)
        for key, text in plan['lines'].items():
            source = ROOT / 'tools/out/voices/tone-round4/raw' / (parent + '-' + key + '.wav')
            details = {'label': label, 'engine': 'Your liked comparison',
                       'description': 'Retained unchanged from the previous round, at matched loudness.',
                       'source': str(source), 'sourceSha256': h.prep.digest(source), 'retainPcm': True}
            if not h.cached(voice, key, details):
                target = OUT / (voice + '-' + key + '.wav')
                shutil.copyfile(source, target)
                audio, rate = sf.read(target)
                measured = h.prep.pitch(target)
                receipt = {'voice': voice, 'line': key, 'text': text, 'file': target.name,
                           'duration': round(len(audio)/rate, 3), 'sampleRate': rate,
                           'medianPitchHz': measured['medianHz'], 'sha256': h.prep.digest(target),
                           'fingerprint': h.fingerprint(details),
                           'peak': round(float(np.max(np.abs(audio))), 4),
                           'rms': round(float(np.sqrt(np.mean(audio**2))), 4), **details}
                (OUT / (voice + '-' + key + '.json')).write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    clips = [json.loads((OUT / (voice + '-' + key + '.json')).read_text(encoding='utf-8'))
             for voice in order for key in plan['lines']]
    for name, checksum in guards.items():
        if h.prep.digest(ROOT / name) != checksum:
            raise RuntimeError('Game changed during casting: ' + name)
    plan.update(status='generated; listening review pending', candidates=order, clipCount=len(clips),
                gameHtmlSha256=guards['index.html'], gamePackSha256=guards['tools/announcer-pack.json'],
                referenceMatchVerified=False)
    (OUT / 'catalog.json').write_text(json.dumps(clips, indent=2), encoding='utf-8')
    (OUT / 'plan.json').write_text(json.dumps(plan, indent=2), encoding='utf-8')
    print('Completed', len(clips), 'clips from 12 new described characters and two liked comparisons.', flush=True)


if __name__ == '__main__':
    main()
