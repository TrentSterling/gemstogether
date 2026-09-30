"""Prepare the next audition from actual local clips, without synthesizing audio.

Run C:/py/python.exe tools/deep-voice-plan.py. Records compressed-clip pitch,
source hashes and offline model readiness. Does not alter the game or voice pack.
"""
import hashlib
import json
from pathlib import Path

import numpy as np
import parselmouth
import soundfile as sf

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'tools/announcer-pack.json'
SOURCE = ROOT / 'tools/out/announcer'
OUT = ROOT / 'tools/out/voices/deep-round3'
KEYS = ['welcome-back', 'brilliant', 'resonance']
DESIGNS = [
    {
        'id': 'deep-bass', 'label': 'Deep bass announcer', 'seed': 42,
        'description': 'Clean, rounded bass with emphatic short victory calls.',
        'style': (
            'An adult American male game announcer with an exceptionally deep '
            'natural bass voice, full chest resonance, dark rounded vowels and '
            'clear powerful consonants. Broad and sonorous, like a grand arcade '
            'announcer celebrating a magnificent jewel cascade. Keep the whole '
            'performance in his low comfortable register, with expressive '
            'rhythmic emphasis, warm delight and confident punchy endings. '
            'Full projected speaking volume. Clear and clean, with no whisper, '
            'falsetto, raised-pitch shouting, radio filter or megaphone effects.'
        ),
    },
    {
        'id': 'booming-baritone', 'label': 'Warm booming baritone', 'seed': 56,
        'description': 'A warmer low baritone with a little grain and playful energy.',
        'style': (
            'A mature American male announcer with a very low booming bass '
            'baritone, rich chest resonance and a little gravel in the voice. '
            'Warm, charismatic and playfully proud of the player. Animated '
            'victory calls with strong stresses, crisp diction and concise '
            'endings, while staying in a deep register throughout. A huge '
            'welcoming voice with a smile, not a soft or flat reading. '
            'Full projected speaking volume, naturally deep vowels and a '
            'clean close microphone sound, without radio processing.'
        ),
    },
]
REFERENCE_TEXT = (
    'Welcome back to Gems Together! Those little gems are waiting. Take your '
    'time, make your move, and let the board shine. Brilliant! Beautifully done! '
    'Resonance! Let it shine!'
)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pitch(path):
    audio, rate = sf.read(path, dtype='float64')
    if audio.ndim != 1 or not len(audio) or not np.isfinite(audio).all():
        raise ValueError('Invalid mono clip: ' + str(path))
    track = parselmouth.Sound(audio, sampling_frequency=rate).to_pitch_ac(
        pitch_floor=45, pitch_ceiling=500).selected_array['frequency']
    voiced = track[track > 0]
    if not len(voiced):
        raise ValueError('No voiced frames: ' + str(path))
    return {
        'medianHz': round(float(np.median(voiced)), 2),
        'p10Hz': round(float(np.percentile(voiced, 10)), 2),
        'p90Hz': round(float(np.percentile(voiced, 90)), 2),
        'seconds': round(len(audio) / rate, 4),
    }


def prepare():
    pack_hash = digest(PACK)
    pack = json.loads(PACK.read_text(encoding='utf-8'))
    lines = {key: pack['profiles']['founder-4']['clips'][key]['text'] for key in KEYS}
    baselines = []
    for profile in ['founder-4', 'founder-6', 'cave-4', 'cave-6']:
        for key, text in lines.items():
            path = SOURCE / (profile + '-' + key + '.mp3')
            checksum = digest(path)
            if checksum != pack['profiles'][profile]['clips'][key]['sha256']:
                raise ValueError('Local clip differs from embedded pack: ' + path.name)
            baselines.append({
                'profile': profile, 'line': key, 'text': text,
                'path': str(path), 'sha256': checksum, **pitch(path),
            })
    models = {}
    for suffix in ['VoiceDesign', 'Base']:
        name = 'Qwen3-TTS-12Hz-1.7B-' + suffix
        cache = Path.home() / '.cache/huggingface/hub' / ('models--Qwen--' + name)
        revision = (cache / 'refs/main').read_text(encoding='utf-8').strip()
        snapshot = cache / 'snapshots' / revision
        if not (snapshot / 'model.safetensors').is_file():
            raise FileNotFoundError('Offline model is missing: ' + str(snapshot))
        models[suffix] = {'name': name, 'revision': revision, 'path': str(snapshot)}
    # A single factor per existing speaker retains relative pitch between lines.
    edits = []
    for voice in ['founder', 'cave']:
        paths = [SOURCE / (voice + '-' + key + '.wav') for key in KEYS]
        measured = [pitch(path)['medianHz'] for path in paths]
        source_median = float(np.median(measured))
        factor = 105 / source_median
        edits.append({
            'voice': voice, 'sourcePaths': [str(path) for path in paths],
            'sourceHashes': [digest(path) for path in paths],
            'sourceMedianHz': round(source_median, 2), 'targetMedianHz': 105,
            'pitchFactor': round(factor, 6),
            'semitones': round(float(12 * np.log2(factor)), 2),
            'formantRatio': .9, 'durationFactor': 1,
            'note': 'Preserve the original delivery; compare the large shift by ear.',
        })
    plan = {
        'status': 'prepared; new auditions not generated',
        'comparisonChoicePending': True, 'outputDirectory': str(OUT),
        'gamePackSha256': pack_hash, 'models': models, 'lines': lines,
        'freshDesigns': DESIGNS, 'freshReferenceText': REFERENCE_TEXT,
        'freshWorkflow': 'Design one reference per character, then clone it for all three lines.',
        'editedCandidates': edits, 'compressedBaselines': baselines,
        'listeningChecks': [
            'Deep register with expressive energy, rather than flat delivery.',
            'Clear pronunciation and no processing warble or muddiness.',
            'One recognizable speaker across all three lines.',
            'Audition dry and over the existing soundtrack at matched levels.',
        ],
    }
    if digest(PACK) != pack_hash:
        raise RuntimeError('Voice pack changed during preparation')
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'prepared-plan.json').write_text(json.dumps(plan, indent=2), encoding='utf-8')
    print('Verified', len(baselines), 'actual embedded MP3 baselines and two cached Qwen models.')
    for clip in baselines:
        print(clip['profile'], clip['line'], str(clip['medianHz']) + ' Hz')
    for edit in edits:
        print('Edit comparison:', edit['voice'], str(edit['semitones']) + ' semitones to target 105 Hz')
    print('Prepared', OUT / 'prepared-plan.json', '; no new audio generated.')


if __name__ == '__main__':
    prepare()
