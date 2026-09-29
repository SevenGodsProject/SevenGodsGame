import { createRequire } from 'node:module'; const sharp = createRequire('C:/Users/kimi1/SevenGodsGame/package.json')('sharp');
const SRC = 'C:/Users/kimi1/SevenGodsGame/public/assets/gods/taiyo/front_640.webp';
const SIZE = 1024, ART = 860, OFF = (SIZE - ART) / 2;
// GOD_THEME_COLOR.taiyo.base = #e8b33d → 暗色平板（同色相・明度 ~12%）
const PLATE = { r: 0x2a, g: 0x1f, b: 0x08, alpha: 1 };
const art = await sharp(SRC).resize(ART, ART, { kernel: 'lanczos3' }).png().toBuffer();
await sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: PLATE } })
  .composite([{ input: art, left: OFF, top: OFF }])
  .png({ compressionLevel: 9 }).toFile('input_taiyo_1024.png');
const m = await sharp('input_taiyo_1024.png').metadata();
console.log('composite', m.width, m.height, m.channels, 'offset', OFF, 'scale', ART/640);
