# Orphaned-write audit — manifest fields nothing reads

> Compiled 2026-08-05. Tool: `scripts/orphan-field-audit.mjs`
> (re-runnable, reports only — it never edits).

---

## 1 · Why this exists

This is the codebase's documented recurring failure, not a
hypothesis. From CLAUDE-PRODUCT's own changelog: `pageMode` (the
renderer read `siteMode`), `motif` (the renderer read `motifs`),
`spacing`, `themeName`, `scriptFont` — each one a control a host
could operate, writing a field no renderer ever read. The picker
lights up; the site never changes. Nothing fails, so nobody finds
out except the host, who concludes the product is broken.

The method: for each of the 130 `StoryManifest` fields, count
writes (assignments, object-literal keys) separately from reads,
and flag anything written-but-unread, or read only outside the
renderer.

It's a heuristic and it has false positives — CSS `visibility:
hidden` and a local `let ogImage` both showed up. That's the
intended trade: it shrinks 130 fields to a dozen worth reading by
hand.

## 2 · The finding that mattered

**The wizard was paying for four AI images per run that the site
cannot display.**

The chain, verified end to end:

1. `useBackgroundCook` fires as soon as occasion + palette resolve.
   The palette has a default, so this is effectively step 1.
2. It POSTs `/api/decor/library` with all four slots — divider,
   sectionStamps, confetti, footerBouquet.
3. That route makes **four `openaiGenerateImage` calls**. Image
   generation is the most expensive call in the product.
4. The result folds into `manifest.decorLibrary` at finish.
5. `ThemedSite` reads `manifest.decorLibrary` **never** — zero
   references across `redesign/`, `site/` and `app/sites/`.

Venue and vibe are part of the cache signature, so changing either
re-keys and cooks four more. A host trying three palettes paid for
twelve images and saw none of them on their site.

This is the shape the historical bugs had, plus a bill.

**What changed:** `SPECULATIVE_DECOR_COOK = false`. Not a deletion
— the stationery Studio *does* offer these assets as card
flourishes, so the capability stays and hosts still generate decor
deliberately from the editor's Decor Library, through the same
routes writing the same fields. What stops is paying for four
images on the chance a host later opens the Studio.

`decor-cook.test.ts` fences it as a *relationship*, not a constant:
it reads the renderer, and only requires the pre-warm to be off
while nothing draws `decorLibrary`. Wire it into `ThemedSite` and
the fence lifts on its own — so it can't become a test people
delete to get work done.

## 3 · Everything else was clean

**Written but never read (7 reported):** all false positives or
inert. `visibility` and `generatedAt` matched CSS and an unrelated
interface; `ogImage` matched a local variable; `blockStyles`,
`signatureDecor` and `hashtags` are written only by templates,
Editions and demo fixtures — dead weight from the deleted
renderers, but no host control writes them, so no host is misled.

**Read but never by a renderer (16 reported):** all legitimate.
These are API-, dashboard- or Studio-facing by design —
`voiceDNA`, `seatingPlan`, `celebration`, `factSheet`,
`dayOfContact`, `schemaVersion` and so on. `comingSoon` looked
suspicious (written in `db.ts` on insert) and turned out to be
read in the same file, filtering coming-soon sites out of listings.

**The distinction that matters** and that the tool now encodes: a
field written by a *template or migration helper* is sediment; a
field written by a *control a host can operate* is a lie. Only the
decor cook was in the second category.

## 4 · Re-running it

```
node scripts/orphan-field-audit.mjs
```

Read the output as leads, not verdicts. For each hit ask the one
question that decides everything: **can a host set this from the
UI?** If yes and no renderer reads it, that's the bug.
