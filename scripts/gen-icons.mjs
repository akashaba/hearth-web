// Renders public/logo-source.svg (the master brand mark) into every icon
// size the app needs. Re-run any time the source changes:
//   cd web && node scripts/gen-icons.mjs
import sharp from 'sharp'
import { readFile, mkdir, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const WEB = resolve(process.cwd())
const MOBILE = resolve(WEB, '..', 'mobile')
const SOURCE = await readFile(resolve(WEB, 'public', 'logo-source.svg'))

const targets = [
  // Web (Next.js App Router auto-picks up these filenames)
  { path: `${WEB}/app/icon.png`,           size: 512, bg: null,        note: 'browser tab favicon (Next.js auto)' },
  { path: `${WEB}/app/apple-icon.png`,     size: 180, bg: '#059669',   note: 'iOS home-screen when web-added' },
  { path: `${WEB}/public/logo-192.png`,    size: 192, bg: null,        note: 'PWA manifest + in-app brand mark' },
  { path: `${WEB}/public/logo-512.png`,    size: 512, bg: null,        note: 'PWA manifest large' },

  // Mobile (Expo)
  { path: `${MOBILE}/assets/icon.png`,           size: 1024, bg: '#059669', note: 'iOS app icon (opaque, Apple auto-rounds)' },
  { path: `${MOBILE}/assets/adaptive-icon.png`,  size: 1024, bg: '#059669', note: 'Android adaptive foreground' },
  { path: `${MOBILE}/assets/splash-icon.png`,    size: 1024, bg: null,      note: 'splash glyph (transparent — Expo composites)' },
  { path: `${MOBILE}/assets/favicon.png`,        size: 48,   bg: null,      note: 'Expo web target favicon' },
]

for (const t of targets) {
  await mkdir(dirname(t.path), { recursive: true })
  // density controls how sharp rasterizes the SVG — higher = crisper edges.
  let img = sharp(SOURCE, { density: 512 }).resize(t.size, t.size, { fit: 'cover' })
  if (t.bg) img = img.flatten({ background: t.bg })
  await img.png().toFile(t.path)
  const s = await stat(t.path)
  console.log(`  ${(s.size / 1024).toFixed(1).padStart(6)} KB  ${t.size.toString().padStart(4)}px  ${t.path.replace(WEB, '.').replace(MOBILE, '../mobile')}  — ${t.note}`)
}
console.log(`\ndone — ${targets.length} icons generated from public/logo-source.svg`)
