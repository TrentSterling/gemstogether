# Gems Together desktop

The wrapper runs the same standalone game through a secure local `gems://` origin.
It keeps browser progression and saves in Electron's own persistent profile.
Public co-op remains the default; network access is needed for co-op signalling.
Solo play, procedural music, all modes and progression work without a network.

```powershell
cd C:/trontstack/gemstogether/desktop
npm ci
npm start
npm run smoke
npm run package
```

`dist/3.3.3/Gems Together-win32-x64/Gems Together.exe` is the portable Windows build.
The release receipt also includes `dist/GemsTogether-3.3.3-win-x64.zip`; extract
the whole folder before running the executable.
Journey > Comfort exposes window sizes and fullscreen. Controllers can navigate
menus with the D-pad, select with A/Cross, return with B/Circle, and scroll with
the triggers. Controller legends recognize PlayStation and Xbox layouts.

Steam preparation uses `steamworks.js` 0.4.0. The browser earns the IDs in
`achievements.json`; the isolated preload forwards only those achievement IDs
to the main process. Set your registered app ID before launching from Steam:

```powershell
$env:GEMSTOGETHER_STEAM_APP_ID='YOUR_APP_ID'
npm start
```

Create the exact API names in `achievements.json` in your Steamworks dashboard.
No development App ID is silently substituted. Without your App ID and a
running Steam client, achievements remain local and the game remains playable.
Steam delivery, store setup, signing and live achievement verification need the
project's Steamworks account and registered App ID.

The embedded announcer and its Audio settings work offline, including “Welcome
back to Gems Together!” and both selected voices at three lower pitches.

The smoke test boots the real GPU game, checks the isolated preload, rejects an
unknown achievement ID, changes window resolution, toggles fullscreen and
decodes all six welcome-back variants through WebAudio, checks the six stage
harmonies and exercises the Resonance music filter.
Pass `--smoke` to a packaged executable to run the same test on that build.

The final local 3.3.3 executable and the executable extracted from its ZIP both
passed this native gate. Their embedded HTML matches the browser-tested source.
For automated packaged checks, run the guarded launcher from a normal Windows
shell in the repository root:

```powershell
python tools/windows-smoke.py 'desktop/dist/3.3.3/Gems Together-win32-x64/Gems Together.exe' 'tools/out/harmony/windows-final-smoke' --preflight
python tools/windows-smoke.py 'desktop/dist/3.3.3/Gems Together-win32-x64/Gems Together.exe' 'tools/out/harmony/windows-final-smoke'
```

The launcher refuses restricted security tokens before starting Electron,
keeps crash dialogs out of automated checks, enforces a 45-second timeout and
rejects stale receipts. Its error mode is local to the test process and inherited
by its children ([Windows process error mode](https://devblogs.microsoft.com/oldnewthing/20160204-00/?p=92972)).
The game's Electron sandbox remains enabled; no directory ACL changes are needed.

Primary API references: [Electron context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
and [Steamworks.js](https://github.com/ceifa/steamworks.js).
