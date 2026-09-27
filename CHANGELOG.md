# Changelog

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
