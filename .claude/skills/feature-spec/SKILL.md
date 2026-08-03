---
name: feature-spec
description: End-to-end checklist for adding a feature. Use at the start of any user-facing change so the schema, shared types, RLS, and web route land together — and the mobile counterpart is not forgotten. Two-repo aware.
---

# feature-spec — full-stack feature checklist (web repo)

Run through this before touching code. A "feature" here means anything the user sees on Dashboard, Transactions, Setup, Import, Projected, Summary, Category Breakdown, or Categories.

## 1. Anchor to the spec

- Open [docs/spec/features.md](../../../docs/spec/features.md) and locate the section for this feature.
- If the requested change isn't in the spec, update the spec first — **in both this repo and the mobile repo**. The spec is the contract, not a summary. Ask the user to confirm the wording before implementing.

## 2. Data model (this repo owns the schema)

- Identify affected tables. If new columns / tables / RPCs / views are needed, run `/supabase-migration`.
- Regenerate `src/shared/types.gen.ts` via `pnpm supabase:types`.
- For a derived view (e.g. `v_monthly_summary`), prefer a SQL view or `create function ... returns table (...)` RPC. Do not compute in the client.
- **Every new data table is `household_id`-scoped**, not `user_id`. The migration skill enforces this. Categories (global reference data) and the `households` / `household_members` tables are the only exceptions.

## 3. Shared code (`src/shared/`)

- Add or update the Zod schema for any entity the user creates/edits.
- Any formula that must match the mobile app (projection math, monthly aggregation, formatting) lives here.
- **After changes to `src/shared/`, in the mobile repo run `/sync-shared-from-web`** in the same session, or leave a clear TODO for the user.

## 4. Web implementation

- Route under `app/(app)/<segment>/page.tsx`.
- Feature components under `components/<segment>/`.
- Query keys added to `lib/query/keys.ts` — reuse existing shapes.
- shadcn primitives via `/shadcn-add`.
- Mutations invalidate the KPI queries the Dashboard depends on.

## 5. Mobile counterpart

- Note in the PR description whether a mobile counterpart is needed and whether it will be built in the same session or tracked as a follow-up.
- If in the same session: switch to the mobile repo and run its `/feature-spec` skill.
- Bank Import is an intentional exception (web-only in phase 1).

## 6. Verify

- `pnpm typecheck && pnpm lint && pnpm supabase:test`.
- Manually exercise the feature in a browser. Type-checks aren't proof the feature works.
- Confirm nothing on the Dashboard KPI grid regressed — those numbers depend on many features.

## Deliverable

Not done until:

- Migration + RLS test committed.
- Regenerated `src/shared/types.gen.ts` committed.
- Web route works.
- Mobile counterpart plan is explicit (built, tracked, or documented web-only).
- Spec matches the implementation (in both repos).
