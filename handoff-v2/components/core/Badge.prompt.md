A small status / category marker. Two shapes share one component:

```jsx
<Badge tone="olive">Live</Badge>                 {/* mono uppercase label */}
<Badge tone="gold" variant="pill" dot>Pressed</Badge>  {/* soft pill + dot */}
```

`variant="label"` (default) is the mono-uppercase editorial voice — the Pearloom default. `variant="pill"` is a softer rounded chip. Tones map to the palette (`plum` is reserved for destructive/error states). Use sparingly — never pepper a screen with them.
