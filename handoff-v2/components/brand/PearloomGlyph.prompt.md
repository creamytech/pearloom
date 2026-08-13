The Pearloom logo: the woven-pear glyph, the "Pear/loom" wordmark, and the combined lockup. Use anywhere the brand signs itself — nav, footers, splash, loaders, password gates.

```jsx
<PearloomLogo size={28} />
<PearloomGlyph size={40} />
<PearloomWordmark size={32} />
```

- `PearloomGlyph` — strokes only, no fills except leaf + pearl. Override `color` / `gold` for tinting on themed surfaces (e.g. a guest site's accent); keep `paper` matched to the surface behind it so the pearl ring reads.
- `PearloomWordmark` — the italic "loom" is the signature; never set it upright.
- `PearloomLogo` — glyph + wordmark with correct gap; the default for headers.
