"""Match the actual audition clips' loudness; retain the untouched outputs."""
import json
import hashlib
import argparse
import math
import shutil
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf

OUT = Path(__file__).resolve().parent / 'out/voices/deep-round3'
TARGET = -24
FILTER = f'loudnorm=I={TARGET}:TP=-1.5:LRA=11'


def command(args):
    result = subprocess.run(['ffmpeg', '-hide_banner', '-nostdin', '-y', *args],
                            capture_output=True, text=True, check=True)
    start = result.stderr.rfind('{')
    if start < 0:
        raise ValueError('FFmpeg did not report loudness')
    return json.JSONDecoder().raw_decode(result.stderr[start:])[0]


def normalize(folder):
    global OUT
    OUT = Path(folder)
    catalog = json.loads((OUT / 'catalog.json').read_text(encoding='utf-8'))
    (OUT / 'raw').mkdir(exist_ok=True)
    receipts = []
    for clip in catalog:
        path = (OUT / clip['file']).resolve()
        if path.parent != OUT.resolve():
            raise ValueError('Unexpected audition path: ' + str(path))
        raw = OUT / 'raw' / path.name
        # A new render must replace an older retained source before normalization.
        if not raw.exists() or not clip.get('normalization'):
            shutil.copyfile(path, raw)
        elif clip['normalization'].get('rawSha256') and hashlib.sha256(raw.read_bytes()).hexdigest() != clip['normalization']['rawSha256']:
            raise ValueError('Retained raw audio changed: ' + raw.name)
        info = command(['-i', str(raw), '-af', FILTER + ':print_format=json', '-f', 'null', '-'])
        if not math.isfinite(float(info['input_i'])):
            raise ValueError('Cannot measure speech loudness: ' + path.name)
        params = ':'.join([
            FILTER, 'measured_I=' + info['input_i'], 'measured_TP=' + info['input_tp'],
            'measured_LRA=' + info['input_lra'], 'measured_thresh=' + info['input_thresh'],
            'offset=' + info['target_offset'], 'linear=true', 'print_format=json',
        ])
        channels = sf.info(raw).channels
        if clip.get('retainPcm') and abs(float(info['input_i']) - TARGET) <= .5:
            shutil.copyfile(raw, path)
        else:
            command(['-i', str(raw), '-af', params, '-ar', '24000', '-ac', str(channels), '-c:a', 'pcm_s16le', str(path)])
        measured = command(['-i', str(path), '-af', FILTER + ':print_format=json', '-f', 'null', '-'])
        audio, rate = sf.read(path)
        source, source_rate = sf.read(raw)
        detail = {
            'file': path.name, 'targetLUFS': TARGET, 'measuredLUFS': float(measured['input_i']),
            'truePeakDb': float(measured['input_tp']), 'raw': 'raw/' + path.name,
            'rawSha256': hashlib.sha256(raw.read_bytes()).hexdigest(), 'channels': channels,
            'pass': abs(float(measured['input_i']) - TARGET) <= .5
                    and float(measured['input_tp']) <= -1.3
                    and abs(len(audio)/rate - len(source)/source_rate) <= .01
                    and sf.info(path).channels == channels,
        }
        if not detail['pass']:
            raise ValueError('Loudness/duration check failed: ' + str(detail))
        clip.update(peak=round(float(np.max(np.abs(audio))), 4),
                    rms=round(float(np.sqrt(np.mean(audio**2))), 4), normalization=detail,
                    sha256=hashlib.sha256(path.read_bytes()).hexdigest())
        (OUT / (clip['voice'] + '-' + clip['line'] + '.json')).write_text(
            json.dumps(clip, indent=2), encoding='utf-8')
        receipts.append(detail)
        print(path.name, detail['measuredLUFS'], 'LUFS', detail['truePeakDb'], 'dBTP')
    (OUT / 'catalog.json').write_text(json.dumps(catalog, indent=2), encoding='utf-8')
    (OUT / 'level-results.json').write_text(json.dumps(receipts, indent=2), encoding='utf-8')
    print(len(receipts), 'loudness and duration checks passed; raw outputs retained.')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--round', choices=['deep', 'tone', 'casting', 'silver'], default='deep')
    chosen = parser.parse_args().round
    folder = OUT.parent / {'deep': 'deep-round3', 'tone': 'tone-round4', 'casting': 'casting-round5', 'silver': 'silver-round6'}[chosen]
    normalize(folder)


if __name__ == '__main__':
    main()
