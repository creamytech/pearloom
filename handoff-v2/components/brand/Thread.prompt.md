The visual atom of Pearloom — two strands (olive + gold) used as every divider, rule, and editorial flourish. Replaces `<hr>` everywhere.

```jsx
<Thread />                          {/* weave — the signature */}
<Thread variant="straight" />       {/* two parallel hairlines */}
<Thread variant="single" />         {/* one gold hairline */}
<Thread variant="bullet" height={16} /> {/* rule with a centered bead */}
```

Use `weave` for section breaks and hero/modal entrances, `single` for the 1px gold rule that leads a mono label, `bullet` to center an ornament between two rules. Width defaults to 100% — constrain it with a wrapper.
