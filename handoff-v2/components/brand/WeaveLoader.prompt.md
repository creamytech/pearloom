The single Pearloom loading indicator — two threads weave across each other on a loop. Use it instead of any spinner; pair with the word "Threading…", never "Loading…".

```jsx
<WeaveLoader size="md" label="Threading…" />
<WeaveLoader size="sm" inline />   {/* inside a button */}
```

Five sizes (`xs`–`xl`). `inline` aligns it in a text/button row. Falls back to a quiet gold pulse under `prefers-reduced-motion`.
