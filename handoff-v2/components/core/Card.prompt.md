The paper surface — the middle layer of every Pearloom screen (grain → **paper** → ink). Warm cream fill, hairline tan border, restrained 12px radius, soft warm shadow.

```jsx
<Card padding={28}>
  <h3 className="pl-heading">Mira & Jun</h3>
  <p className="pl-body">A bright Saturday in Point Reyes.</p>
</Card>

<Card interactive onClick={open}>…</Card>
```

Cards are **paper, never glass** — glass is reserved for floating chrome (toasts, palettes). Set `interactive` for a hover lift. Compose freely with `Thread`, `Folio`, `Badge`.
