import { expect, test } from '@playwright/test';

const PAGES = ['/', '/stats', '/subjects', '/achievements', '/settings'];

test('горячие клавиши: пробел — старт и пауза, «?» — справка', async ({ page, isMobile }) => {
  test.skip(isMobile, 'на телефоне нет клавиатуры');
  await page.goto('/');
  await page.keyboard.press('Space');
  await expect(page.getByText('Идёт · Учёба')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByText('Пауза · Учёба')).toBeVisible();
  await page.keyboard.press('Shift+Slash');
  await expect(page.getByRole('dialog', { name: 'Горячие клавиши' })).toBeVisible();
});

test('сессия восстанавливается после перезагрузки', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать учёбу' }).click();
  await expect(page.getByText('Идёт · Учёба')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Идёт · Учёба')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Пауза' })).toBeVisible();
});

test('у всех кнопок, ссылок и полей есть доступное имя', async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll('button, a[href], input, select')]
        .filter((el) => {
          const h = el as HTMLInputElement;
          if (h.hidden || h.type === 'file' || h.closest('[aria-hidden="true"]')) return false;
          const named =
            h.getAttribute('aria-label') ??
            h.getAttribute('aria-labelledby') ??
            h.getAttribute('title') ??
            (h.textContent.trim() ||
              (h.id && document.querySelector(`label[for="${h.id}"]`)) ||
              h.closest('label'));
          return !named;
        })
        .map((el) => el.outerHTML.slice(0, 80)),
    );
    expect(unnamed, path).toEqual([]);
  }
});

test('нет горизонтальной прокрутки на узком экране (360 px)', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'только телефон');
  await page.setViewportSize({ width: 360, height: 740 });
  for (const path of PAGES) {
    await page.goto(path);
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test('работает офлайн после первого визита', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Начать учёбу' })).toBeVisible();
  await page.goto('/stats');
  await expect(page.getByRole('heading', { name: 'Аналитика' })).toBeVisible();
  await context.setOffline(false);
});
