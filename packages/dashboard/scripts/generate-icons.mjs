// Genereert alle PWA/iOS app-iconen uit icons/icon-source.svg
// Run: node scripts/generate-icons.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pub = join(__dirname, '..', 'public');
const iconsDir = join(pub, 'icons');
const src = readFileSync(join(iconsDir, 'icon-source.svg'));

const BRAND = '#2563eb';

// Standaard (transparante achtergrond niet nodig — bron is full-bleed)
const standard = [
  { size: 192, out: join(iconsDir, 'icon-192.png') },
  { size: 512, out: join(iconsDir, 'icon-512.png') },
];

// Maskable: extra marge (safe zone) zodat Android-maskers niets afsnijden.
// We schalen het logo naar 80% en plaatsen het op een brand-blauwe achtergrond.
const maskable = [
  { size: 192, out: join(iconsDir, 'maskable-192.png') },
  { size: 512, out: join(iconsDir, 'maskable-512.png') },
];

// Apple touch icon: 180x180, ondergrond gevuld (iOS toont geen transparantie).
const apple = { size: 180, out: join(iconsDir, 'apple-touch-icon.png') };

async function renderStandard({ size, out }) {
  await sharp(src).resize(size, size).png().toFile(out);
  console.log('✓', out);
}

async function renderMaskable({ size, out }) {
  const inner = Math.round(size * 0.78);
  const logo = await sharp(src).resize(inner, inner).png().toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BRAND,
    },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toFile(out);
  console.log('✓', out);
}

async function renderApple({ size, out }) {
  // Bron is al full-bleed met blauwe achtergrond → gewoon resizen op witte safe ground.
  await sharp(src)
    .resize(size, size)
    .flatten({ background: BRAND })
    .png()
    .toFile(out);
  console.log('✓', out);
}

await Promise.all([
  ...standard.map(renderStandard),
  ...maskable.map(renderMaskable),
  renderApple(apple),
]);

console.log('Klaar — alle iconen gegenereerd.');
