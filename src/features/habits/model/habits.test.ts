import { goalDays, goalProgress, streak } from '@/features/habits/model/habits';
import { session } from '@/test/factories';

const TODAY = '2026-11-04';

describe('серия дней', () => {
  it('считает подряд идущие дни до сегодня', () => {
    const s = streak([session('2026-11-02'), session('2026-11-03'), session(TODAY)], TODAY);
    expect(s).toMatchObject({ current: 3, best: 3, todayCounted: true, atRisk: false });
  });

  it('серия жива до конца дня, если сегодня ещё не учились', () => {
    const s = streak([session('2026-11-02'), session('2026-11-03')], TODAY);
    expect(s).toMatchObject({ current: 2, atRisk: true, todayCounted: false });
  });

  it('пропуск дня обнуляет текущую серию, но рекорд остаётся', () => {
    const list = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-11-03'].map((d) =>
      session(d),
    );
    const s = streak(list, '2026-11-05');
    expect(s.current).toBe(0);
    expect(s.best).toBe(4);
  });

  it('прерванные сессии серию не продлевают', () => {
    const s = streak([session(TODAY, 10, { status: 'interrupted' })], TODAY);
    expect(s.current).toBe(0);
  });

  it('серия через границу месяца', () => {
    const s = streak([session('2026-10-31'), session('2026-11-01')], '2026-11-01');
    expect(s.current).toBe(2);
  });
});

describe('цель дня', () => {
  it('в минутах учитывает и прерванные сессии — это реальное время', () => {
    const p = goalProgress(
      [
        session(TODAY, 25),
        session(TODAY, 10, { status: 'interrupted' }),
        session('2026-11-03', 99),
      ],
      TODAY,
      { kind: 'minutes', value: 70 },
    );
    expect(p.value).toBe(35);
    expect(p.ratio).toBeCloseTo(0.5);
    expect(p.done).toBe(false);
  });

  it('в сессиях — только завершённые', () => {
    const p = goalProgress([session(TODAY), session(TODAY, 5, { status: 'interrupted' })], TODAY, {
      kind: 'sessions',
      value: 1,
    });
    expect(p).toMatchObject({ value: 1, done: true });
  });

  it('число дней с выполненной целью', () => {
    const list = [
      session('2026-11-01', 60),
      session('2026-11-02', 30),
      session('2026-11-02', 30),
      session('2026-11-03', 20),
    ];
    expect(goalDays(list, { kind: 'minutes', value: 60 })).toBe(2);
  });
});
