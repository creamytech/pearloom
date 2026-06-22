The editorial corner-mark — a mono-uppercase label flanked by a 1px gold rule. Gives any screen the feel of a printed page. Use in page corners, panel headers, modal titles, section openers.

```jsx
<Folio kicker="Edition" no={3} label="Day-of" />
<Folio no="VII" label="The Run of the Day" direction="column" />
```

`no` auto-prefixes "No." and zero-pads numbers. Set `rules={false}` to drop the gold rules, `direction="column"` for large stacked headers.
