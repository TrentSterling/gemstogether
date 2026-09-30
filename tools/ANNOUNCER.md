# Gems Together announcer

Trent chose the **Warm founder** and **Cave-inspired clean** designs from the
Qwen round-two audition, then asked for both voices to be lower. Each identity
has nineteen lines at -2, -4 and -6 semitones. Warm founder / -4 is the default;
all six profiles are selectable in Audio > Announcer voices, with previews,
an on/off toggle and independent voice volume.

Current casting review is at `tools/out/voices/deep-round3/index.html`.
After the follow-up at `tools/out/voices/tone-round4/index.html`, Trent prefers
the fresh baritone and also likes Cave with darker resonance. He requested
broader described-character casting at `tools/out/voices/casting-round5/index.html`.
These rankings have not changed the embedded pack or its default.
See [VOICE-AUDITIONS.md](VOICE-AUDITIONS.md).

The exact new line is **“Welcome back to Gems Together!”** It plays once after
the first audio interaction on a return visit. New players hear “Welcome to
Gems Together!” instead. Ordinary clears keep their musical sounds. New worlds,
completed large chains, Resonance, payouts and challenge completions get short
celebrations.

## Generate and listen

```powershell
cd C:/trontstack/gemstogether
C:/py/python.exe tools/announcer-pack.py
C:/py/python.exe tools/announcer-check.py
python tools/announcer-lab.py
python tools/polish.py
node tools/announcer-audit.mjs
```

Open `tools/out/announcer/index.html` to compare the exact compressed clips.
The welcome-back line appears first. Filenames use
`<voice>-<depth>-<line>.mp3`, for example `founder-4-welcome-back.mp3`.
Depth is the number of semitones below the original take; a larger number is
deeper. `cave` is Cave-inspired clean and `founder` is Warm founder.
WAVs and generation receipts are kept beside the MP3s in the ignored output
folder. Unnumbered WAVs are the original, unshifted synthesized takes.

The voices use Qwen3-TTS 1.7B Base with the approved synthetic reference takes
in `tools/voice-references/`. Reference text: “Supernova! That was beautiful!”
The reference WAVs are retained in source control so future lines keep the
selected speaker identity. Pitch shifting uses Praat PSOLA, preserving
duration and formants. Generation trims silence, matches levels and adds
short edge fades; FFmpeg compresses the final mono clips to 24 kHz / 64 kbps.

`announcer-pack.json` contains 114 MP3s and their checksums. `polish.py` embeds
it into the single HTML file. The browser lazily decodes the selected clips.
Playback needs no TTS service or model.
Only the selected Qwen voices ship; the earlier OmniVoice audition remains
local. The Qwen model's recorded license is Apache-2.0.

## Playback and validation

The voice bus respects master mute and volume, and gently ducks both generated
music and a loaded track. It allows one speaker and one pending cue, with a
seven-second minimum interval and a 45-second repeat guard. Pending cues can
wait through the interval; changing boards or voices, muting or hiding the tab
cancels them. Practice, Showcase and photo mode stay quiet; explicit previews
remain available in the settings panel. Jennifer's calm preset disables speech.
Voice and pitch choices stay local when sharing a board.

The real Chrome gate passed **136/136**: all 114 embedded clips decode with
bounded peaks and nonzero energy, first and returning greetings, duck/restore,
mute, queueing, saved settings, phone layout, a real nine-wave cascade,
stage travel, payouts and private host/peer playback with matching hashes.
Cached Whisper checked the actual compressed audio: **114/114** spoken-content
checks passed.
Receipts are `tools/out/announcer/runtime-results.json` and
`tools/out/announcer/speech-results.json`.
