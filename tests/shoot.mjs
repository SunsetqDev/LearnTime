// Скриншоты для проверки вёрстки и README: node tests/shoot.mjs <url> <outDir> [theme]
import { chromium } from '@playwright/test';

const [url = 'http://localhost:5181', out = 'docs/screenshots', theme = 'light'] =
  process.argv.slice(2);

const seed = async (page) => {
  await page.evaluate(async () => {
    const open = () =>
      new Promise((res, rej) => {
        const r = indexedDB.open('focus');
        r.onsuccess = () => res(r.result);
        r.onerror = rej;
      });
    const idb = await open();
    const put = (store, rows) =>
      new Promise((res) => {
        const tx = idb.transaction(store, 'readwrite');
        rows.forEach((row) => tx.objectStore(store).put(row));
        tx.oncomplete = res;
      });
    const subjects = [
      ['Математика', 'cobalt'],
      ['Физика', 'vermilion'],
      ['История Казахстана', 'jade'],
      ['Английский язык', 'ochre'],
    ].map(([name, color], order) => ({
      id: `sub-${order}`,
      name,
      color,
      archived: 0,
      order,
      createdAt: 1,
    }));
    await put('subjects', subjects);
    let rnd = 7;
    const rand = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
    const pad = (x) => String(x).padStart(2, '0');
    const rows = [];
    for (let d = 0; d < 200; d++) {
      if (rand() < 0.28 && d > 0) continue;
      const k = 1 + Math.floor(rand() * (d < 30 ? 6 : 4));
      for (let i = 0; i < k; i++) {
        const day = new Date();
        day.setDate(day.getDate() - d);
        const h = [9, 15, 16, 16, 17, 17, 18, 19, 20, 21][Math.floor(rand() * 10)];
        day.setHours(
          d === 0 ? Math.min(h, new Date().getHours()) : h,
          Math.floor(rand() * 50),
          0,
          0,
        );
        const intr = rand() < 0.14;
        const ms = (intr ? 6 + rand() * 14 : 25) * 60000;
        const startedAt = day.getTime() + i * 1700000;
        rows.push({
          id: 's-' + startedAt.toString(36),
          mode: 'focus',
          status: intr ? 'interrupted' : 'completed',
          startedAt,
          endedAt: startedAt + ms,
          dayKey: `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`,
          hour: day.getHours(),
          plannedMs: 1500000,
          actualMs: Math.round(ms),
          pauses: 0,
          subjectId: rand() < 0.1 ? null : `sub-${Math.floor(rand() * 4)}`,
          task: i === 0 && d === 0 ? 'Вариант ЕНТ №4' : '',
        });
      }
    }
    await put('sessions', rows);
    idb.close();
  });
};

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 960 }],
  ['mobile', { width: 390, height: 844 }],
]) {
  const ctx = await browser.newContext({
    viewport,
    colorScheme: theme,
    deviceScaleFactor: name === 'mobile' ? 2 : 1,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto(url);
  await page.waitForTimeout(800);
  await seed(page);
  for (const [route, file] of [
    ['/', 'timer'],
    ['/stats', 'stats'],
    ['/subjects', 'subjects'],
    ['/achievements', 'achievements'],
    ['/settings', 'settings'],
  ]) {
    await page.goto(url + route);
    await page.waitForTimeout(1800);
    await page.screenshot({
      path: `${out}/${file}-${name}-${theme}.png`,
      fullPage: route === '/stats',
    });
  }
  await ctx.close();
}
await browser.close();
console.log('ok');
