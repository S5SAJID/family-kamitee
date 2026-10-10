## What & why
<!-- One or two sentences. Link the issue if there is one. -->

## Screenshots
<!-- Required for any UI change: before / after, English AND Roman Urdu, and a narrow (~800px) window. -->

## Checklist (docs/DEVELOPER_GUIDE.md → "Definition of done")
- [ ] `npm run check` passes (typecheck + project rules + i18n)
- [ ] New strings added to **both** `en` and `ru` in `src/lib/i18n.ts`
- [ ] Only Astryx components + tokens; no raw `<div>`, inline styles or hex colours
- [ ] Business logic is in `src/lib/` (pure functions), not in components
- [ ] Store changes are backwards compatible (or `version` + `migrate` added in `store.ts`)
- [ ] Destructive or final actions have a confirmation (`AlertDialog`) and a log entry
- [ ] Works offline; no new network calls; native APIs only via `src/lib/platform.ts`
- [ ] Tested by hand: sample data, fresh committee, compact window, Roman Urdu
