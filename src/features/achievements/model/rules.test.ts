import { ACHIEVEMENTS, evaluate } from '@/features/achievements/model/rules';
import { session } from '@/test/factories';

const TODAY = '2026-11-04';
const goal = { kind: 'minutes' as const, value: 60 };
const byId = (list: ReturnType<typeof evaluate>, id: string) => list.find((a) => a.def.id === id);

describe('достижения', () => {
  it('у каждого правила уникальный id и понятное условие', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of ACHIEVEMENTS) expect(a.condition.length).toBeGreaterThan(5);
  });

  it('пустая история — ничего не открыто, прогресс нулевой', () => {
    const list = evaluate({ sessions: [], today: TODAY, goal });
    expect(list.every((a) => !a.unlocked && a.progress === 0)).toBe(true);
  });

  it('первая сессия открывает «Первый отсчёт», прерванная — нет', () => {
    expect(
      byId(
        evaluate({ sessions: [session(TODAY, 10, { status: 'interrupted' })], today: TODAY, goal }),
        'first-session',
      )?.unlocked,
    ).toBe(false);
    expect(
      byId(evaluate({ sessions: [session(TODAY)], today: TODAY, goal }), 'first-session')?.unlocked,
    ).toBe(true);
  });

  it('«Полный круг» сгорает от одного прерывания за день', () => {
    const four = [9, 10, 11, 12].map((h) => session(TODAY, 25, { at: h }));
    expect(byId(evaluate({ sessions: four, today: TODAY, goal }), 'full-cycle')?.unlocked).toBe(
      true,
    );
    const broken = [...four, session(TODAY, 5, { at: 13, status: 'interrupted' })];
    expect(byId(evaluate({ sessions: broken, today: TODAY, goal }), 'full-cycle')?.unlocked).toBe(
      false,
    );
  });

  it('прогресс частичный и не больше единицы', () => {
    const list = evaluate({
      sessions: Array.from({ length: 4 }, () => session(TODAY)),
      today: TODAY,
      goal,
    });
    expect(byId(list, 'sessions-10')?.progress).toBeCloseTo(0.4);
    expect(byId(list, 'first-session')?.progress).toBe(1);
  });

  it('«Ранний старт» не считает ночные сессии', () => {
    const list = evaluate({
      sessions: [2, 5, 6, 7, 7, 7].map((h) => session(TODAY, 25, { at: h })),
      today: TODAY,
      goal,
    });
    expect(byId(list, 'early-bird')?.value).toBe(5);
  });
});
