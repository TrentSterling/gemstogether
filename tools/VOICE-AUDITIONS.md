# Local announcer auditions

Trent chose **warm and playful** for occasional stage welcomes, big chains and
team moments. The listening lab uses identical lines for each candidate:

- Welcome to Tidepool!
- Dazzling! Look at you go!
- Team Resonance! Better together!
- Supernova! That was beautiful!

Open `tools/out/voices/index.html`. Compare one line across every voice, play a
voice's four lines, mark a favourite, or audition over the real 88 BPM soundtrack.
The page works as a local file and does not upload text or audio.

## Trent's selection and lower-register auditions

Trent chose **Qwen3 / Ryan** after listening. Kokoro and OmniVoice were too flat
for the desired expressive game announcements. The next question is Ryan's pitch
and whether a designed voice can approach the existing Cave-inspired announcer.

Open `tools/out/voices/ryan-round2/index.html`. Eight candidates read the same
four lines: original Ryan, Ryan with a lower baritone delivery prompt, Ryan with
PSOLA pitch shifts of -2 and -4 semitones, the exact `glados/presets/facility_pa.json`
VoiceDesign prompt and seed 42 heard clean, that same take through its original
PA DSP, a new deep gravelly warm founder design, and a Base-model clone anchored
to the actual clean WHACKO dawn recording. The original dawn take is included
both clean and through its PA effects. All audition files stay local and ignored.

```powershell
C:/py/python.exe tools/voice-ryan.py
python tools/voice-lab-build.py --round ryan
C:/py/python.exe tools/voice-check.py --round ryan
node tools/voice-lab-audit.mjs --ryan
```

`voice-ryan.py` uses already cached CustomVoice, VoiceDesign and Base models, with
network access disabled. The literal descriptions and seeds are saved alongside
each take, plus source hashes for the preset and processed audio. Ryan's delivery
prompt asks for a lower register, but it cannot guarantee a numerical pitch.
The PSOLA variants multiply pitch-tier frequencies while retaining duration and
leaving formants unshifted; measured median pitches are recorded for comparison.

The facility design reuses the locked preset without modifying it. Your
`glados/CASTING.md` records that changing a design's description can change the
speaker. Audition clean before adding DSP; freeze the selected reference and
use the cached Qwen3 Base cloning model for a consistent production character.
The reference clone candidate exercises that workflow using the existing dawn
take. Its clean source is checked against the known PA recording by running the
original DSP and recording waveform correlation. These short samples remain
casting tests; perceived character consistency still needs Trent's listening review.

### Round-two evidence

32 four-line clips and two existing-run references decode in the browser player.
The pitch-shifted Ryan variants measured lower on all eight takes, with duration
unchanged. A lower-register instruction alone was unreliable: three Ryan takes
measured higher than the originals. Median voiced pitches in the original Ryan
set range from 174 to 233 Hz; the actual-run reference clones range from 102 to
149 Hz. Those measurements describe pitch, not perceived performance quality.

With the stricter 0.95 normalized-text similarity threshold, Whisper recognizes
all Ryan variants and all four reference-cloned lines exactly. 27/32 clips pass;
five description-only / PA takes need listening review for Dazzling or Better
together. The player marks those buttons with "check pronunciation" and retains
the recognized text in their tooltips. Speech checks do not grade expression.

## Reproduce

Qwen3 and Kokoro use Trent's existing `C:/py` CUDA environment and cached models:

```powershell
cd C:/trontstack/gemstogether
C:/py/python.exe tools/voice-sampler.py --engine kokoro
C:/py/python.exe tools/voice-sampler.py --engine qwen
node tools/music-render.mjs index.html expedition-3.3-stage
ffmpeg -y -loglevel error -ss 12 -t 16 -i tools/out/music/journey.wav -af 'afade=t=in:d=0.2,afade=t=out:st=15.5:d=0.5' tools/out/voices/music-bed.wav
python tools/voice-lab-build.py
```

Kokoro candidates: Heart (`af_heart`), Puck (`am_puck`), Fenrir (`am_fenrir`).
Qwen3 1.7B CustomVoice candidates: Serena and Ryan, with the same warm/playful
style instruction and deterministic seed. Kokoro's natural presets use 1.04x
speed. Clips are trimmed, lightly faded at the edges and adjusted to comparable
levels, with peak protection. Every WAV has a JSON receipt with text, duration,
generation time, model, speaker, style and levels.

The [Kokoro model](https://huggingface.co/hexgrad/Kokoro-82M) and
[Qwen3 CustomVoice model](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice)
are published under Apache-2.0.

VoiceStudio was cloned to `C:/trontstack/clonedrepos/VoiceStudio`, source commit
`0834c8be28460fc4e0518bdb31eb57c494b253b2`. Its default OmniVoice engine uses
an isolated environment at `tools/out/voice-env`, sharing CUDA Torch while
keeping its newer Transformers dependencies separate from Qwen/Kokoro.
Trent explicitly approved the new 3.27 GB model download for local auditions.
Model data stays in `tools/out/voice-models`.

```powershell
tools/out/voice-env/Scripts/python.exe tools/voice-sampler.py --engine omni
python tools/voice-lab-build.py
```

OmniVoice's two synthetic voice designs use a generated reference paragraph to
keep the same persona across short lines. No person's voice is cloned. The
reference audio and original transcript are retained for reproduction.

**OmniVoice auditions are local evaluation assets.** Its pretrained weights
are [CC-BY-NC](https://huggingface.co/k2-fsa/OmniVoice#license); its tokenizer
has separate terms. VoiceStudio's application is AGPL-3.0 and its bundled
OmniVoice implementation has its own Apache-2.0 license, described in its
[license notice](https://github.com/debpalash/VoiceStudio/blob/main/LICENSE-NOTICE.md).
The game and portable package contain the existing synthesized music and
effects. No audition voice is selected or shipped as a production announcer.

## Validation

`tools/voice-lab-audit.mjs` verifies real browser playback and decoded durations
for every clip, desktop/phone controls and the music bed. Sample receipts
measure nonzero energy and bounded peaks. `tools/voice-check.py` uses the existing
cached Whisper base model to check the spoken line and flag listening review.
The stage video alongside the samples
is a deterministic real-game capture; its fade is checked separately by
`tools/expedition-stage.mjs`.

The next voice decision is artistic: compare the samples and choose the persona.
Then produce the full stage/chain/team vocabulary and wire a local volume,
cooldown and music duck into the game's audio bus. Ordinary clears keep their
existing musical sounds.

Current receipts: seven candidates, 28 clips, 34/34 listening-page checks and
28/28 independent speech-content checks. The first OmniVoice female design was
garbled; a fresh design seed and bfloat16 generation passed all four lines.
