# Changelog

## 3.2.4 hosting patch 2 (2026-09-26) Point ping

- **Right-click a gem to point at it.** Your co-op partners see a pulsing reticle with a bobbing chevron on that gem, in your player colour, for about 2.5 seconds (plus a soft glass ping if their sound is on). Nothing gets selected, grabbed or swapped on either side, and the board stays in sync. You see your own marker too. Right-click again to re-ping, or on another gem to move it. Mouse only for now.
- The two extra floats ride on the cursor packet only while a point is live; otherwise the packet is the original 44 bytes, so a partner on the previous build keeps every cursor cue.
- `tools/verify.mjs` 22 checks; new `tools/coop-point.mjs` (two real browsers in a private room, 10 checks).

## 3.2.4 hosting patch 1 (2026-09-26)

- **Right click no longer opens Chrome's "Save image as" menu** over the board or the GPU buttons (long-press callout on iOS too). The co-op code box and About links keep their normal menus.
- Browser shortcuts no longer fire game hotkeys: Ctrl/Cmd/Alt + key is left to the browser (Ctrl+F used to go fullscreen, Ctrl+D started Showcase, Alt+Left was swallowed).
- Trackpad pinch and Ctrl+wheel over the board no longer zoom the page.
- Internal save keys and the co-op network name are gemstogether now (saves from launch day reset).
- `tools/verify.mjs`: 19 checks, including a real right-click on a gem and on a GPU button.

## 3.2.4 (2026-09-26) First hosted version

Live at https://tront.xyz/gemstogether/. ChatGPT's 3.2.4 drop, plus hosting polish via `tools/polish.py`:

- Canonical, author, Open Graph and Twitter meta; OG image (Showcase cascade, full-bleed band).
- "No moves, reshuffling" toast without the em dash.
- tront.xyz About block with JSON-LD (`seo/about.py gemstogether`).
