---
name: sync-shared-to-mobile
description: Copy the canonical src/shared/ folder from this web repo into the sibling mobile repo. Run this whenever anything under src/shared/ changes here — the mobile repo is a mirror and drifts silently without it.
---

# sync-shared-to-mobile

The web repo owns `src/shared/`. The mobile repo has an identical copy. This skill keeps them lockstep.

## Assumption about layout

The user typically has both repos as siblings under `C:\Users\Akashaba\Desktop\FInance tracker\`:

```
FInance tracker/
├── web/     ← this repo
└── mobile/
```

If the mobile repo is elsewhere, ask the user for its absolute path before proceeding.

## Steps

1. **Diff first — never blind-overwrite.**
   ```bash
   diff -r src/shared/ ../mobile/src/shared/ | head -100
   ```
   Show the diff to the user. If anything on the mobile side looks like local edits (should never happen — mobile treats `src/shared/` as read-only), stop and ask.

2. **Copy over.**
   ```bash
   rsync -a --delete src/shared/ ../mobile/src/shared/
   ```
   `--delete` is important — a file removed here should be removed there too.

3. **Verify mobile typechecks against the new shared code.**
   ```bash
   cd ../mobile && pnpm typecheck
   ```
   If it fails, the shared change broke a mobile call site. Either fix it in the mobile app (usual case) or roll back the shared change and rethink the API.

4. **Commit both repos separately with matched messages.** Example:
   - web: `shared: add BankImportRow schema`
   - mobile: `sync shared: add BankImportRow schema (web SHA <abbrev>)`

## When NOT to sync

- Mid-refactor when the API isn't stable yet — batch the sync at the end.
- When only `types.gen.ts` changed and the change is additive (new column) — but even then, sync soon so the mobile app can use the new column.

## Never

- Do not edit `mobile/src/shared/` directly. That drift is untraceable and is the whole reason this skill exists.
- Do not sync when the web repo has uncommitted changes to `src/shared/` — commit first so the sync is reproducible.
