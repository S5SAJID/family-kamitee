# Development Guide

Read [ARCHITECTURE.md](ARCHITECTURE.md) first. This file covers how to build features here.

## Setup

```bash
npm install
npm run dev            # browser, http://localhost:1420 (no native APIs; fallbacks are used)
npm run desktop:dev    # Tauri window (needs Rust + MSVC build tools)
npm run check          # typecheck + project rules + i18n; must pass before every commit
npx astryx <cmd>       # Astryx CLI, needs Node ≥ 22.13
```

Reset local data: **Settings → Reload Sample Data**, or DevTools → Application → Local Storage → delete `kameti-khata-v1`.

## Strict rules

**Bold** = enforced automatically by `npm run check` / CI. The rest is enforced in review.

### Product
1. **100% offline.** No fetch, CDNs, remote fonts or URLs (except `wa.me`).
2. **Randomness only via `secureRandomInt` / `secureShuffle`.**
3. Draws are final. Never add undo/edit for draws; persist before animating.
4. Destructive or final actions need an `AlertDialog`; money, draw and membership changes need a `LogEntry`.
5. **Every user-facing string goes through `t()` with both `en` and `ru` keys** (placeholders identical).
6. Money via `useMoney()` / `money()`, dates via `fmtDate` / `fmtShortDate` / `fmtDateTime`. Never `toLocaleString` directly.

### Architecture
7. Business logic lives in `lib/` as pure functions; components only render and call actions.
8. State changes only through store actions. No local copies of store data.
9. **Storage only in `store.ts`; Tauri APIs only in `platform.ts`.**
10. Persisted shape changes need `version` + `migrate` (see ARCHITECTURE → Schema changes).
11. Derived data is computed (`calc.ts`), never stored.

### UI (Astryx; also see `AGENTS.md`)
12. **No raw `<div>`/`<span>`, no `style={{}}`, no hex colours, no `xstyle`; subpath imports (`@astryxdesign/core/Button`).**
13. Discover before building: `astryx component <Name>`. Don't invent props.
14. Every page uses `PageFrame` with one primary action and a `contentWidth` from `PAGE_WIDTH`.
15. Records are `Table` / `List` rows. `Card` only for KPI tiles / standalone widgets. Status = `Token` / `StatusDot` (`Status.tsx`), never colour alone.
16. Custom CSS only in `src/styles/app.css` inside `@layer app`, tokens only.
17. Interactive targets are `size="lg"` for primary flows (senior-friendly); one control size per row.

### Code
18. **No `any`, no `@ts-ignore`, no `console.*`.**
19. Named exports; `import type` for types; one component per file in `components/` / `views/`.
20. Immutable updates; ids via `uid(prefix)`; timestamps as ISO strings.

## UI patterns

| Need | Use |
| --- | --- |
| Page shell | `PageFrame` (`title`, `subtitle`, `actions`, `end`, `contentWidth`) |
| Width | `PAGE_WIDTH.form` 720 · `.overview` 1080 · `.default` 1200 · `.wide` 1360 |
| Spacing | Stack `gap`: 1–2 inside a group, 4–8 between groups |
| Grouping | gap → `Divider` → `Section` → `Card`. `Section padding={0}` bleeds to the edges; use it only around `List` / `Table` |
| Side details | `LayoutPanel width={380}` in `end`; below 1024px render a `Dialog` (`useMediaQuery('(max-width: 1024px)')`) |
| Headings | `level={1}` page (PageFrame only) · `2` section · `3` list header |
| Secondary text | `Text color="secondary"` or `type="supporting"`. `Text` has no error colour: use `Icon icon="error" color="error"` + `Text` |
| Icons | Semantic name (`"check"`, `"clock"`, `"close"`…) or a lucide component: `<Icon icon={Wallet} />`. `Button icon` takes `<Icon/>`; `SideNavItem icon` takes the component |
| Confirm | `AlertDialog` (`title`, `description`, `actionLabel`, `onAction`) |
| Feedback | `const showToast = useToast(); showToast({body})` (returns a function, not an object) |
| Async button | `Button clickAction={async () => …}` (built-in loading state) |
| Empty / no committee | `EmptyState`; every view early-returns when `!data.committee` |
| Forms | `FormLayout` + controlled inputs; show `status={{type:'error'}}` only after a submit attempt (`tried` flag) |
| Motion | Web Animations API (`el.animate`), shorter when `prefers-reduced-motion`; sound only if `settings.sound` |

Large-text mode applies `zoom: 1.18` to the whole app. Check new layouts with it on, in Roman Urdu (longer
strings) and at 800px width.

## Code patterns

### View skeleton
```tsx
export function Payouts() {
  const t = useT();
  const data = useData();
  if (!data.committee) return <PageFrame title={t('po.title')}><EmptyState title={t('dash.noCommitteeTitle')} /></PageFrame>;
  const c = data.committee;
  const stats = roundStats(data, data.currentRound);        // derive with calc.ts

  return (
    <PageFrame title={t('po.title')} subtitle={t('po.subtitle')} contentWidth={PAGE_WIDTH.default}
      actions={<Button variant="primary" size="lg" label={t('po.export')} clickAction={…} />}>
      <VStack gap={6}>…</VStack>
    </PageFrame>
  );
}
```

### Store action
```ts
// store.ts: declare in `Actions`, implement immutably, log anything that matters
addMember: m =>
  set(s => ({
    members: [...s.members, m],
    log: [...s.log, log({type: 'member', detail: `+ ${m.name}`})],
  })),
```

### Pure logic
```ts
// calc.ts: no store, no DOM, no Date.now() inside (pass time in)
export function overdueMembers(data: KametiData, round: number, today: Date): Member[] { … }
```

### Table rows
```tsx
interface Row extends Record<string, unknown> { id: string; member: Member; paid: number }
const columns: TableColumn<Row>[] = [
  {key: 'member', header: t('member'), width: proportional(1, {minWidth: 200}), renderCell: r => …},
  {key: 'status', header: t('status'), width: pixel(140), renderCell: r => <PayStatusToken status={…} />},
];
<Table<Row> data={rows} columns={columns} idKey="id" density="balanced" hasHover />
```
Build `rows` in `useMemo`.

### i18n
```ts
// i18n.ts: add to BOTH dictionaries, same placeholders
'po.due': 'Due {d}',            // en
'po.due': '{d} tak',            // ru
t('po.due', {d: fmtShortDate(date)})
```
Key prefix = area: `nav hdr dash kh dr hi se su pin cc st pm iv log wa rc`, plus a new one per page.
Dynamic families (`t(\`pm.${mode}\`)`) need a key for every union member.
Roman Urdu: everyday spoken words (Ada, Baqi, Qist, Parchi, Rakam, Haqdaar). Keep it short and polite (*karein*).

## Recipes

**New page.** Add a `ViewId` in `types.ts` → `views/X.tsx` → `NAV` + the `page` map in `App.tsx` → `nav.x` keys.

**New setting.** Add a field to `Settings` + `defaultSettings` (the `merge` fills old installs) → control in `Settings.tsx` → `se.*` keys.

**New persisted field.** Add it to the type and `emptyData()` → `sample.ts` → `partialize` / `selectData` → `version` + `migrate` → check `importData` with an old backup.

**New payment mode.** Extend `PayMode` → add to `PAY_MODES` → `pm.<mode>` in en/ru. Receipts and WhatsApp pick it up.

**New log type.** Extend `LogType` → `log.<type>` en/ru → icon in `LOG_ICON` (`History.tsx`).

**New native capability.** Install the npm plugin + Cargo crate → `.plugin(...)` in `lib.rs` → least-privilege
permission in `capabilities/default.json` → wrapper with a browser fallback in `platform.ts` → update the CSP only if unavoidable.

**Release.** Bump `version` in `tauri.conf.json` (+ `package.json`, `Cargo.toml`) → commit → `git tag vX.Y.Z && git push --follow-tags`.

## Workflow

- Branches: `feat/…`, `fix/…`, `chore/…` off `main`. Squash-merge.
- Commits: **Conventional Commits** (`feat:`, `fix:`, `refactor:`, `docs:`, `ci:`, `chore:`).
- Versioning: **SemVer**. Breaking a backup or persisted format = major.
- PRs use `.github/pull_request_template.md`; CI must be green.

## Definition of done

- `npm run check` and `npm run build` pass.
- Tested by hand in the browser and once in `desktop:dev` if native APIs are touched:
  sample data + fresh committee (upfront and round-by-round), English + Roman Urdu, 800px + wide window, large text.
- Screenshots in the PR for UI changes.
- Docs updated if architecture, rules or invariants changed.

## Known gaps

- No unit tests yet. First target: `calc.ts` (dates, pot, `secureShuffle` distribution) with Vitest.
- `updateMember` doesn't write a log entry.
- Data is not encrypted at rest; the PIN only gates the UI.
- Astryx theme is injected at runtime: `astryx theme build` can't compile a theme extending the generated module yet.
- Single JS chunk (~930 KB). Fine for a local app; code-split views if it grows.
