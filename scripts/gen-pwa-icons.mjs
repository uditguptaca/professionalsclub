// Generates the PWA icon set from the brand leaf. Run once (or whenever the
// mark changes): node scripts/gen-pwa-icons.mjs
//
// Two families:
//   pwa-*.png          "any" purpose - leaf on cream, comfortable margin
//   pwa-maskable-*.png "maskable" - extra safe-zone padding so Android's
//                      adaptive mask (circle, squircle) never clips the leaf
//   apple-touch-icon   180px, solid background (iOS composites no alpha)
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const LEAF_PATH = 'M256 24l-30 56c-3 6-9 5-16 1l-38-20 21 100c4 20-9 20-17 11l-59-63-15 41c-2 4-6 4-13 3l-73-15 20 68c4 15 7 21-5 25l-31 15 137 111c6 5 8 13 5 21l-12 39 132-17c4 0 7 3 6 7l-6 100h34l-6-100c-1-4 2-7 6-7l132 17-12-39c-3-8-1-16 5-21l137-111-31-15c-12-4-9-10-5-25l20-68-73 15c-7 1-11 1-13-3l-15-41-59 63c-8 9-21 9-17-11l21-100-38 20c-7 4-13 5-16-1l-30-56z';

const svg = (canvas, leafScale) => {
  const leafSize = canvas * leafScale;
  const offset = (canvas - leafSize) / 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}">
      <rect width="${canvas}" height="${canvas}" fill="#FFF7ED"/>
      <g transform="translate(${offset},${offset}) scale(${leafSize / 512})">
        <path d="${LEAF_PATH}" fill="#E85D04"/>
      </g>
    </svg>`
  );
};

mkdirSync('public/icons', { recursive: true });

const jobs = [
  ['public/icons/pwa-192.png', 192, 0.72],
  ['public/icons/pwa-512.png', 512, 0.72],
  // Maskable safe zone is the inner 80% circle; keep the mark inside ~58%.
  ['public/icons/pwa-maskable-192.png', 192, 0.55],
  ['public/icons/pwa-maskable-512.png', 512, 0.55],
  ['public/apple-touch-icon.png', 180, 0.68],
];

for (const [out, size, scale] of jobs) {
  await sharp(svg(size, scale)).png().toFile(out);
  console.log('wrote', out);
}
