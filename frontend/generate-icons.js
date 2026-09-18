import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const INPUT = path.join('public', 'logo.jpg');
const OUT_DIR = 'public';

const sizes = [48, 96, 144, 192, 384, 512];

async function generate() {
  if (!fs.existsSync(INPUT)) {
    console.error('Missing logo.jpg');
    return;
  }

  const baseImage = sharp(INPUT);

  // Generate standard PWA icons
  for (const size of sizes) {
    await baseImage
      .clone()
      .resize(size, size)
      .toFormat('png')
      .toFile(path.join(OUT_DIR, `pwa-${size}x${size}.png`));
    console.log(`Generated pwa-${size}x${size}.png`);
  }

  // Generate apple-touch-icon (usually 180x180)
  await baseImage
    .clone()
    .resize(180, 180)
    .toFormat('png')
    .toFile(path.join(OUT_DIR, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // Generate maskable icon (padding required for safe zone)
  // Maskable icons are 512x512. We'll shrink the logo to 80% (410x410) and pad with background color (#13141c).
  await baseImage
    .clone()
    .resize(410, 410, { fit: 'contain', background: '#13141c' })
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: '#13141c'
    })
    .toFormat('png')
    .toFile(path.join(OUT_DIR, 'maskable-icon.png'));
  console.log('Generated maskable-icon.png');
}

generate().catch(console.error);
