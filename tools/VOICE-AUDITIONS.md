# Local announcer auditions

## Current direction: smooth, deep Silver master

Trent selected **Silver master** from round five: the bass he wanted without
rasp. He wants variations with more celebratory energy, but a smooth, deep,
calming "Welcome back". His specific tonal reference is **Bejeweled 2**.
This supersedes the earlier baritone/Cave ranking below. On 2026-09-30 he
selected **Silver / arcade lift**, at its original pitch with no final tone
effects, and explicitly authorized the remaining lines and publishing the
browser game. Production generation and validation are in [ANNOUNCER.md](ANNOUNCER.md).

The focused comparison is `tools/out/voices/silver-round6/index.html`:
the exact liked Silver, three requested delivery directions and six DSP rows.
The DSP rows are four semitones down (timing/formants preserved), gentle
EQ/compression, a diffuse short room tail, a quiet stereo double, EQ plus room,
and the lower pitch plus EQ/room. Thirty final clips pass speech and level
checks; the player passes 46 checks, including real reference playback and
Stop cancellation. Asset checks pass 92/92, including exact baseline WAVs,
the frozen reference, stereo channels and game/pack hashes.

The exact prepared synthetic Silver reference is now retained in
`tools/voice-references/silver-reference.wav` with provenance in its JSON.
SHA256: `3043e39c2689dddba1f6dfb6840b8a3ecbe6c2211d32fd5a20952add90215ad8`.
The nine new calls share this reference, with no final pitch edit. Qwen Base
has no documented style-instruction API: these experiments pass instruction
embeddings through the locally inspected model's `instruct_ids` path. The
prompts describe requested moods, not verified subjective results. Two high
calls were retried with the same speaker reference; rejected takes remain
local. Final new calls measure 100-146 Hz. The lower DSP rows measure 96-119 Hz.

Three publicly playable Bejeweled 2 snippets are retained locally under
`tools/out/voices/bejeweled2-reference/`, with source URLs and hashes. Their
measured median pitches are 73 Hz (Excellent), 88 Hz (Welcome back) and 92 Hz
(Incredible). These short recordings contain effects; measurements do not
prove a perceptual match. Level-matched listening references appear at the
bottom of the page. They are never cloning inputs or game assets.

```powershell
C:/py/python.exe tools/voice-silver.py
# Only if reviewing a high-register call: add --retry-reviewed.
C:/py/python.exe tools/deep-voice-level.py --round silver
C:/py/python.exe tools/voice-check.py --round silver
python tools/voice-lab-build.py --round silver
node tools/voice-lab-audit.mjs --silver
```

The generator needs retained round-five outputs, local Bejeweled listening
references and the already cached Base model. It verifies reference and clip
hashes before cache reuse. The normalizer preserves stereo and keeps an
already level-matched baseline byte-identical. No production pack changes.

## Earlier casting

Trent wants a deeper Bejeweled-style announcer with Qwen's expressive energy.
After round four, the fresh baritone is his favourite and Cave with darker
resonance is also good. He explicitly requested a shotgun casting of more
described characters, with less focus on Cave. The game pack remains unchanged
while he listens; his audition ranking does not choose the production default.

Round five casts twelve new descriptions at
`tools/out/voices/casting-round5/index.html`: velvet arcade, bronze champion,
thunder king, grand carnival, golden broadcaster, granite storyteller, regal
judge, roguish champion, honey bass, heroic herald, silver master and canyon
bass. Each uses one retained designed reference and the same three short lines.
The favourite baritone and darker Cave are comparison rows. The page exposes
each exact description. If a native reference measures above 165 Hz, its median
is prepared at 115 Hz with 0.9 formants before the Base model generates the calls.
The native reference remains retained and the final new calls have no pitch edit.
This is local character casting; no original Bejeweled reference match is verified.

Round five is ready and open in Firefox: 42/42 actual speech checks, 42/42
level/duration checks and 55/55 browser/player checks. Final new calls measure
66-167 Hz. Four high-register calls needed another generation seed; each kept
its original speaker reference. Their rejected takes are retained under
`rejected/`. `--retry-reviewed` retries high-register or speech-review calls
without replacing a character. The two comparison rows match round four's PCM
exactly. Playback now also handles Stop during a pending play request without
showing an obsolete cancellation error.

```powershell
C:/py/python.exe tools/voice-casting.py
C:/py/python.exe tools/deep-voice-level.py --round casting
C:/py/python.exe tools/voice-check.py --round casting
python tools/voice-lab-build.py --round casting
node tools/voice-lab-audit.mjs --casting
```

Round four is the focused processing comparison at
`tools/out/voices/tone-round4/index.html`: unchanged Cave / -6, darker vowel
resonance, another two semitones down, gentle EQ/compression/short room and the
unchanged baritone. Its fifteen clips passed speech and level checks; its player
passed 24 checks. Both unchanged rows match the prior audition PCM exactly.

```powershell
C:/py/python.exe tools/voice-tone.py
C:/py/python.exe tools/deep-voice-level.py --round tone
C:/py/python.exe tools/voice-check.py --round tone
python tools/voice-lab-build.py --round tone
node tools/voice-lab-audit.mjs --tone
```

The warm/playful casting below is historical. Round three compared the fresh
bass and baritone with pitch/formant edits of the earlier performances.

The third round uses the exact same three lines for every candidate: Welcome
back to Gems Together, Brilliant / Beautifully done, and Resonance / Let it
shine. Two current-pack rows provide listening baselines. Fresh characters use
one designed reference each, lowered before the cached Base model generates the
three lines. Descriptions alone produced 223-308 Hz calls; those raw casting
experiments are retained locally. The reference-first variants have no final
pitch shift. Speaker identity stays tied to the same retained reference.
The edited rows preserve relative pitch across the three performances and
their duration, with a 0.9 formant ratio. Auditions do not change the game pack.

```powershell
C:/py/python.exe tools/deep-voice-plan.py
C:/py/python.exe tools/deep-voice-audition.py --mode compare --low-reference
C:/py/python.exe tools/deep-voice-level.py
C:/py/python.exe tools/voice-check.py --round deep
python tools/voice-lab-build.py --round deep
node tools/voice-lab-audit.mjs --deep
```

Open `tools/out/voices/deep-round3/index.html` after generation. Exact descriptions,
seeds, reference hashes, offline model revisions, processing and measurements
live alongside the audio. `deep-voice-plan.py` only prepares and measures; it
does not synthesize. The generator sets a workspace-local Numba cache so its
Librosa import can run without writing to the Python installation. Both models
are already cached; no model download is required.

Measurements of the actual embedded MP3s: Warm founder / -4 is approximately
203, 274 and 253 Hz for the three lines; Cave / -6 is 139, 185 and 175 Hz.
These describe measured median pitch, not expression or perceived quality.
A 105 Hz source-set target requires about -19 semitones for founder and -15
for Cave, so compare the edited versions by ear rather than assuming they
will sound natural. The listening page retains current voices as a baseline.

Trent's round-three listening ranking is **Current Cave / -6** first and
**Fresh booming baritone / low reference** second. Neither yet matches his
desired Bejeweled announcer tone. Keep these performances as the next comparison
bases. Discuss modest additional pitch lowering, separate formant changes and
light compression / short reverb before rendering more variants. His favourite
was not the deepest Cave edit; a numerical pitch target cannot choose the voice.
At that stage the specific Bejeweled reference was pending. This is a provisional audition
ranking, not a production-pack selection.

The reference-first generation yielded 87-138 Hz calls without shifting the
finished clips. The audition clips are matched to -24 LUFS, with original
renders retained under `raw/`; exact loudness, peaks and duration receipts are
in `level-results.json`. Cached Whisper checks the actual normalized audio.

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
OmniVoice is excluded from the game and portable package. The later selected
Qwen voices ship in patch 22; see [ANNOUNCER.md](ANNOUNCER.md).

## Validation

`tools/voice-lab-audit.mjs` verifies real browser playback and decoded durations
for every clip, desktop/phone controls and the music bed. Sample receipts
measure nonzero energy and bounded peaks. `tools/voice-check.py` uses the existing
cached Whisper base model to check the spoken line and flag listening review.
The stage video alongside the samples
is a deterministic real-game capture; its fade is checked separately by
`tools/expedition-stage.mjs`.

Trent subsequently preferred Qwen / Ryan, then selected the round-two Warm
founder and Cave-inspired clean designs and requested lower pitches. Patch 22
ships both selected identities at -2, -4 and -6 semitones, with nineteen lines
each, local controls, a cooldown and music ducking. The requested welcome-back
line is included. Ordinary clears keep their existing musical sounds. The
original and round-two audition pages remain available for comparison.

Current receipts: seven candidates, 28 clips, 34/34 listening-page checks and
28/28 independent speech-content checks. The first OmniVoice female design was
garbled; a fresh design seed and bfloat16 generation passed all four lines.
