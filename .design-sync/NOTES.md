# design-sync notes — Pearloom

## What the DS is built from (important)

The synced design system is built from **`handoff-v2/`**, the team's
self-contained DS extraction — NOT from `src/components/*` (the Next app's
internal components, which depend on `@/` aliases, framer-motion, Radix, and
aren't standalone-renderable). `handoff-v2/components/**/*.jsx` are pure
`react` + `var(--pl-*)` token components with clean JSDoc — exactly what the
converter wants. This decoupling is deliberate: the synced bundle tracks
`handoff-v2/`, not the live app. If the real app components change, this
bundle does NOT follow automatically.

15 components: brand (Folio, Monogram, Pearl, PearloomGlyph,
PearloomWordmark, PearloomLogo, Thread, WeaveLoader), core (Badge, Button,
Card, Eyebrow, Field), motifs (Divider, Motif). `window.Pearloom`.

## Two generated build inputs (committed, regenerate if handoff-v2 changes)

- `handoff-v2/_ds_entry.js` — barrel that `export *`s every component so the
  bundle + `componentSrcMap` see all 15. Add a line here if a component is
  added to `handoff-v2/components/`.
- `handoff-v2/_ds_styles.css` — the `cssEntry`. A **concatenation** of
  `handoff-v2/tokens/*.css` in `styles.css` order (fonts.css first so its
  remote `@import` leads). We concatenate because the converter's `tokensGlob`
  only copies from an npm `tokensPkg`, and these tokens live as loose files.
  **If any `handoff-v2/tokens/*.css` changes, regenerate it:**
  ```sh
  { cat handoff-v2/tokens/fonts.css; for f in colors typography spacing motion chrome textures animation base; do echo ""; cat "handoff-v2/tokens/$f.css"; done; } > handoff-v2/_ds_styles.css
  ```

## Environment setup for the converter

- The repo is a Next app and is usually NOT `npm install`ed. The DS
  components only need React, so we install `react`/`react-dom`
  (match the repo's version, currently 19.2.4) into the isolated
  `.ds-sync/node_modules` and pass `--node-modules ./.ds-sync/node_modules`.
- `PKG_DIR` resolves to the repo root (the `--entry` barrel walks up to the
  root `package.json`, name `pearloom`). All `cfg.*` paths are repo-root-relative.
- `[DTS_REACT] @types/react not found` warning is benign — the components are
  plain-prop `.jsx`; `.d.ts` bodies extract fully from the JSDoc. (@types/react
  is installed in `.ds-sync` but ts-morph resolves from the un-installed repo root.)

## Playwright / render check

Chromium **build 1194** is pre-installed at `/opt/pw-browsers`
(`PLAYWRIGHT_BROWSERS_PATH`). The render check needs a playwright whose
`browsers.json` pins 1194 → **`playwright@1.56.1`** (installed in `.ds-sync`).
NOTE: the repo pins `@playwright/test ^1.59.1`, which pins chromium **1217** —
a MISMATCH that fails with "Executable doesn't exist". Do not trust the repo
pin; verify the cache build and match it.

WeaveLoader's capture is slow (its infinite SVG stroke animation stalls the
capture stability wait for a minute+). Expected, not a hang.

## Known render warns

None — 15/15 previews render cleanly and all 15 authored cells grade `good`.

## Upload auth (the one blocker)

`DesignSync` needs the interactive `/design-login` scope. In **Claude Code on
the web** that flow can't run, so upload is impossible from a web session.
`/design-consent` grants the design-*agent* scope and does **not** unblock
DesignSync. To upload: run `/design-login` in an interactive Claude Code
(desktop app or CLI) and re-run `/design-sync`, OR use "Send to Claude Code
Web" from claude.ai/design. The bundle is fully built + verified, so upload
is a single incremental pass (empty project → incremental path).

## Re-sync (one command, after the setup above)

```sh
# fresh clone: re-stage scripts, install deps, then:
node .ds-sync/resync.mjs --config .design-sync/config.json \
  --node-modules ./.ds-sync/node_modules \
  --entry ./handoff-v2/_ds_entry.js --out ./ds-bundle \
  --remote .design-sync/.cache/remote-sync.json   # omit --remote on the very first sync
```

## Re-sync risks

- **Source decoupling** (above): bundle tracks `handoff-v2/`, not the live app.
- **`_ds_styles.css` staleness**: regenerate it if `handoff-v2/tokens/*.css`
  change (command above) — nothing does this automatically.
- **Fonts are remote** (Google Fonts `@import` in `tokens/fonts.css`): no font
  binaries ship; `[FONT_REMOTE]` is expected and benign. If the brand ever
  self-hosts, add `@font-face` + `cfg.extraFonts`.
- **Playwright pin drift**: the pre-installed chromium build can change with
  the environment; always match `playwright` to the cached build, not the
  repo's `@playwright/test` pin.
