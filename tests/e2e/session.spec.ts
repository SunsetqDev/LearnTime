import { expect, test, type Page } from '@playwright/test';

async function setFocusMinutes(page: Page, minutes: number) {
  await page.goto('/settings');
  const field = page.getByRole('spinbutton', { name: 'Учёба' });
  await field.fill(String(minutes));
  await field.blur();
}

/**
 * Главный сценарий: выбрал предмет → запустил сессию → она закончилась сама → видна в статистике.
 * Без подделки времени: учёба длится 1 минуту, конец сессии ловят настоящие часы в Web Worker.
 */
test('запустил сессию → завершил → увидел в статистике', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/subjects');
  await page.getByRole('button', { name: 'Математика', exact: true }).click();
  await expect(page.getByRole('list').getByText('Математика')).toBeVisible();
  await setFocusMinutes(page, 1);

  await page.goto('/');
  await page.getByRole('button', { name: /^Предмет:/ }).click();
  await page.getByRole('option', { name: 'Математика' }).click();
  await page.getByLabel('Задача на сессию').fill('Вариант ЕНТ №3');

  await page.getByRole('button', { name: 'Начать учёбу' }).click();
  await expect(page.getByText('Идёт · Учёба')).toBeVisible();
  await expect(page).toHaveTitle(/· Учёба — Фокус/);

  await expect(page.getByText(/Сессия засчитана — 1 мин/)).toBeVisible({ timeout: 75_000 });
  await expect(page.getByRole('button', { name: 'Начать перерыв' })).toBeVisible();
  await expect(page.getByLabel('Сессии сегодня').getByText('Вариант ЕНТ №3')).toBeVisible();

  await page.goto('/stats');
  const history = page.locator('section', {
    has: page.getByRole('heading', { name: 'История сессий' }),
  });
  await expect(history.getByRole('listitem').getByText('Математика')).toBeVisible();
  await expect(history.getByText('Вариант ЕНТ №3')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Сводка' })).toContainText('1');
});

test('прерванная сессия учитывается отдельно', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать учёбу' }).click();
  // Прерванные короче минуты не пишутся — ждём чуть больше минуты.
  await page.waitForTimeout(62_000);
  await page.getByRole('button', { name: 'Прервать' }).click();
  await expect(page.getByLabel('Сессии сегодня').getByText('прервана')).toBeVisible();

  await page.goto('/stats');
  await expect(page.getByRole('region', { name: 'Сводка' })).toContainText('100%');
});
