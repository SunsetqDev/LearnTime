// Рендер PNG-иконок PWA из public/icon.svg: node scripts/icons.mjs
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const svg = await readFile(new URL('../public/icon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const page = await browser.newPage();

const render = async (file, size, { radius = 0, pad = 0 } = {}) => {
  await page.setViewportSize({ width: size, height: size });
  // pad — запас для маскируемой иконки: Android обрезает её кругом/«сквирклом».
  const inner = Math.round(size * (1 - pad * 2));
  await page.setContent(`<html><body style="margin:0;background:#17150F;display:grid;place-items:center;height:${size}px">
    <div style="width:${inner}px;height:${inner}px;border-radius:${radius}px;overflow:hidden">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`);
  await page.screenshot({ path: new URL(`../public/${file}`, import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1') });
};

await render('pwa-192.png', 192);
await render('pwa-512.png', 512);
await render('pwa-maskable-512.png', 512, { pad: 0.1 });
await render('apple-touch-icon.png', 180);
await browser.close();
console.log('icons ok');
