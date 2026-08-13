A labelled text input. Mono-uppercase label sits above a warm paper field whose hairline border warms to olive on focus (with a soft focus ring).

```jsx
<Field label="Your names" placeholder="Mira & Jun" onChange={setNames} />
<Field label="A note to guests" multiline rows={4} hint="Pear will polish it later." />
```

Labels are **plain words** the host already knows ("Your names", "Date", "A note") — never jargon (BRAND §7). Set `multiline` for a textarea. Controlled (`value`) or uncontrolled (`defaultValue`).
