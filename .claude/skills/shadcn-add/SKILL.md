---
name: shadcn-add
description: Install a shadcn/ui component correctly into the web app. Use whenever a shadcn primitive is needed (button, dialog, table, etc.). Ensures components.json is set up and the CLI runs from the repo root.
---

# shadcn-add

## Steps

1. **Check `components.json` exists** at the repo root. If not, initialize once:
   ```bash
   pnpm dlx shadcn@latest init
   ```
   During init pick: TypeScript yes, style default, tailwind config existing, RSC yes, base color slate, css variables yes, alias `@/components`.

2. **Add the component(s)** from the repo root:
   ```bash
   pnpm dlx shadcn@latest add <component> [<component>...]
   ```
   Example: `pnpm dlx shadcn@latest add button dialog input select table dropdown-menu`.

3. **Verify** the files landed at `components/ui/<name>.tsx` and that callers import them as `@/components/ui/<name>`.

4. **Do not hand-edit generated files** for cosmetic tweaks. If a variant is missing, extend the component via CVA in the same file, or wrap it in a feature component under `components/<feature>/`.

## When the mobile app needs the same primitive

The mobile repo builds equivalent primitives on NativeWind — same prop shape and variant names — under `components/ui/`. Do not try to run the shadcn CLI there. Keep the visual language coordinated across repos by matching names and variants.

## Common mistakes

- Missing `components.json` — the CLI silently fails to write files.
- Editing generated files for behavior changes that should be a wrapper component.
- Importing from a relative path instead of `@/components/ui/...` — breaks when the file moves.
