#!/usr/bin/env node
/**
 * Emit a resized WebP next to every heavy image that src/ actually references.
 *
 * The repo's "PNG" heroes are really 1024x1024 JPEGs saved at near-max quality
 * (~800KB each), so most of the win here is the re-encode, not the resize.
 *
 * Idempotent: a .webp that is newer than its source is left alone.
 * Never deletes or overwrites a source file.
 *
 * Usage: node scripts/optimize-images.mjs [--force]
 */
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const MIN_BYTES = 150 * 1024;
const QUALITY = 78;
/** No decorative image ships over this; quality steps down until it fits. */
const BUDGET_BYTES = 150 * 1024;
const MIN_QUALITY = 48;

/** Full-bleed heroes and section backgrounds keep more width than cards do. */
const HERO = /skyline|hero|_bg\b|-bg\b|background/i;
const WIDTH_HERO = 1280;
const WIDTH_CARD = 800;

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

/**
 * Every /foo/bar.{png,jpg,webp} path mentioned anywhere under src/, mapped back
 * to the source file on disk. Once the refs have been rewritten to .webp the
 * only thing left pointing at the sources is the .webp name, so a .webp ref
 * resolves to whichever original still sits beside it — that is what keeps a
 * second run of this script finding work to skip instead of finding nothing.
 */
async function referencedSources() {
  const refs = new Set();
  const re = /\/[A-Za-z0-9_./-]+\.(?:png|jpe?g|webp)/g;
  for await (const file of walk(path.join(ROOT, 'src'))) {
    if (!/\.(tsx?|jsx?|css|mjs)$/.test(file)) continue;
    for (const m of (await readFile(file, 'utf8')).matchAll(re)) refs.add(m[0]);
  }

  const sources = new Set();
  for (const ref of refs) {
    if (!/\.webp$/i.test(ref)) {
      sources.add(ref);
      continue;
    }
    for (const ext of ['.png', '.jpg', '.jpeg']) {
      const cand = ref.replace(/\.webp$/i, ext);
      try {
        await stat(path.join(PUBLIC, cand));
        sources.add(cand);
        break;
      } catch { /* try the next extension */ }
    }
  }
  return [...sources].sort();
}

const kb = (n) => (n / 1024).toFixed(0).padStart(6) + ' KB';

const rows = [];
let before = 0;
let after = 0;
let skipped = 0;

const force = process.argv.includes('--force');

for (const ref of await referencedSources()) {
  const src = path.join(PUBLIC, ref);
  let srcStat;
  try {
    srcStat = await stat(src);
  } catch {
    console.warn(`missing   ${ref}`);
    continue;
  }
  if (srcStat.size < MIN_BYTES) continue;

  const out = src.replace(/\.(png|jpe?g)$/i, '.webp');
  if (out === src) continue;

  // A sibling .png and .jpg would both want the same .webp — refuse to guess.
  const rival = /\.png$/i.test(src) ? src.replace(/\.png$/i, '.jpg') : src.replace(/\.jpe?g$/i, '.png');
  try {
    await stat(rival);
    console.warn(`conflict  ${ref} — ${path.basename(rival)} wants the same .webp, skipping`);
    continue;
  } catch { /* no rival, carry on */ }

  const width = HERO.test(path.basename(src)) ? WIDTH_HERO : WIDTH_CARD;

  let outStat = null;
  try {
    outStat = await stat(out);
  } catch { /* not built yet */ }

  if (outStat && !force && outStat.mtimeMs >= srcStat.mtimeMs) {
    skipped++;
    before += srcStat.size;
    after += outStat.size;
    rows.push([ref, srcStat.size, outStat.size, `cached ${width}w`]);
    continue;
  }

  // Encode against a hard per-file ceiling. The portal dashboard hero is a
  // skyline on every open, so no single decorative image gets to be 200KB;
  // busy source images just take a lower quality to fit the same budget.
  let quality = QUALITY;
  let buf = await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality }).toBuffer();
  while (buf.length > BUDGET_BYTES && quality > MIN_QUALITY) {
    quality -= 10;
    buf = await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality }).toBuffer();
  }
  await writeFile(out, buf);

  const meta = await sharp(buf).metadata();
  before += srcStat.size;
  after += buf.length;
  rows.push([ref, srcStat.size, buf.length, `${meta.width}x${meta.height} q${quality}`]);
}

const w = Math.max(20, ...rows.map((r) => r[0].length));
console.log('\n' + 'file'.padEnd(w) + '  ' + 'before'.padStart(9) + '  ' + 'after'.padStart(9) + '   saved  output');
console.log('-'.repeat(w + 40));
for (const [ref, b, a, note] of rows.sort((x, y) => y[1] - y[2] - (x[1] - x[2]))) {
  const pct = (((b - a) / b) * 100).toFixed(0).padStart(4) + '%';
  console.log(ref.padEnd(w) + '  ' + kb(b) + '  ' + kb(a) + '   ' + pct + '  ' + note);
}
console.log('-'.repeat(w + 40));
console.log(
  'TOTAL'.padEnd(w) +
    '  ' + kb(before) + '  ' + kb(after) +
    '   ' + (((before - after) / before) * 100).toFixed(0).padStart(4) + '%' +
    `  ${rows.length} files (${skipped} cached), saved ${((before - after) / 1024 / 1024).toFixed(2)} MB`,
);
