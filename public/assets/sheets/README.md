# Asset sheets

Drop the transparent-background PNG sheets here with these exact filenames:

| Filename | Contents |
|---|---|
| `sheet-1-stills.png` | Editorial still-lifes (pear, invite, vase, linen, envelope, wax seal, cup, polaroids, journal, gift, ribbon tag, lavender card) |
| `sheet-2-icons.png` | Line icons (calendar, gift, suitcase, camera, map, toasts, rings, etc.) |
| `sheet-3-pears.png` | Pearloom pear logo + badge variations |
| `sheet-4-threads.png` | Thread dividers + corner flourishes (olive + gold) |
| `sheet-5-flowers.png` | Pressed flower sprigs + bouquets |

Then run from the repo root:

```sh
npm run assets:extract
```

Output lands in `public/assets/v2/{stills,icons,pears,threads,flowers}/` with files named
`still-01.png`, `flower-01.png`, etc. (numbered top-to-bottom, left-to-right as they appear
on the sheet).

After extraction, inventory each directory and rename files semantically —
`flower-02.png` → `lavender-sprig.png` etc. — so the components reference them by meaning.

The script auto-trims each crop, so re-running is idempotent. If the merge gap is off
(flower stems separate from blooms, or two sprigs glue together), bump `mergeGap` per
sheet in `scripts/extract-assets.ts`.
