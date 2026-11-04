import {
  byDay,
  byHour,
  bySubject,
  EMPTY_FILTER,
  filterHistory,
  groupByDay,
  heatmap,
  summarize,
} from '@/features/stats/model/aggregate';
import { session } from '@/test/factories';

const TODAY = '2026-11-04'; // среда

describe('сводка', () => {
  it('считает сегодня, неделю (с понедельника), месяц и всё время', () => {
    const list = [
      session('2026-11-04', 25),
      session('2026-11-02', 50), // понедельник этой недели
      session('2026-11-01', 30), // воскресенье прошлой недели, но этот месяц
      session('2026-10-20', 25, { status: 'interrupted' }),
    ];
    const s = summarize(list, TODAY);
    expect(s.todayMs).toBe(25 * 60_000);
    expect(s.weekMs).toBe(75 * 60_000);
    expect(s.monthMs).toBe(105 * 60_000);
    expect(s.totalMs).toBe(130 * 60_000);
    expect(s.interruptedShare).toBe(0.25);
    expect(s.avgMs).toBe(32.5 * 60_000);
    expect(s.activeDays).toBe(4);
  });

  it('пустая история не делит на ноль', () => {
    const s = summarize([], TODAY);
    expect(s.avgMs).toBe(0);
    expect(s.interruptedShare).toBe(0);
  });
});

describe('распределения', () => {
  it('по дням — с пустыми днями внутри диапазона и разбивкой по предметам', () => {
    const days = byDay(
      [
        session('2026-11-02', 25, { subjectId: 'm' }),
        session('2026-11-02', 15),
        session('2026-11-04', 10, { subjectId: 'm' }),
      ],
      '2026-11-01',
      '2026-11-04',
    );
    expect(days.map((d) => d.totalMs / 60_000)).toEqual([0, 40, 0, 10]);
    expect(days[1]?.bySubject.get('m')).toBe(25 * 60_000);
    expect(days[1]?.bySubject.get('')).toBe(15 * 60_000);
  });

  it('по предметам — доли и сортировка по времени', () => {
    const shares = bySubject(
      [
        session('2026-11-04', 30, { subjectId: 'a' }),
        session('2026-11-04', 10, { subjectId: 'b' }),
        session('2026-01-01', 99, { subjectId: 'b' }),
      ],
      '2026-11-01',
      TODAY,
    );
    expect(shares.map((x) => [x.subjectId, x.share])).toEqual([
      ['a', 0.75],
      ['b', 0.25],
    ]);
  });

  it('лучшее время — трёхчасовое окно с наибольшим временем', () => {
    const list = [16, 17, 17, 18, 9, 22].map((h) => session(TODAY, 25, { at: h }));
    const p = byHour(list);
    expect(p.bestStart).toBe(16);
    expect(p.hours[17]).toBe(50);
  });

  it('лучшее время не считается по паре сессий', () => {
    expect(byHour([session(TODAY)]).bestStart).toBeNull();
  });
});

describe('тепловая карта', () => {
  it('53 недели, последняя колонка — текущая неделя, будущие дни помечены', () => {
    const h = heatmap([session(TODAY, 60)], TODAY);
    expect(h.weeks).toHaveLength(53);
    const last = h.weeks.at(-1);
    expect(last?.[0]?.day).toBe('2026-11-02');
    expect(last?.[2]).toMatchObject({ day: TODAY, level: 4, future: false });
    expect(last?.[6]?.future).toBe(true);
  });

  it('уровни строятся по квантилям личной активности', () => {
    const list = [10, 20, 30, 40, 50, 60, 70, 80].map((m, i) =>
      session(`2026-10-${String(10 + i).padStart(2, '0')}`, m),
    );
    const cells = heatmap(list, TODAY)
      .weeks.flat()
      .filter((c) => c.ms > 0);
    const levels = cells.map((c) => c.level);
    expect(Math.min(...levels)).toBe(1);
    expect(Math.max(...levels)).toBe(4);
  });
});

describe('история', () => {
  const list = [
    session('2026-11-04', 25, { subjectId: 'a', at: 9 }),
    session('2026-11-04', 25, { subjectId: 'b', at: 11, status: 'interrupted' }),
    session('2026-11-01', 25, { at: 8 }),
  ];

  it('фильтрует по предмету, статусу и датам, новые сверху', () => {
    expect(filterHistory(list, { ...EMPTY_FILTER, subjectId: 'a' })).toHaveLength(1);
    expect(filterHistory(list, { ...EMPTY_FILTER, subjectId: 'none' })).toHaveLength(1);
    expect(filterHistory(list, { ...EMPTY_FILTER, status: 'interrupted' })[0]?.subjectId).toBe('b');
    expect(filterHistory(list, { ...EMPTY_FILTER, from: '2026-11-02' })).toHaveLength(2);
    expect(filterHistory(list, EMPTY_FILTER)[0]?.hour).toBe(11);
  });

  it('группирует по дням с итогом', () => {
    const groups = groupByDay(filterHistory(list, EMPTY_FILTER));
    expect(groups.map((g) => [g.day, g.items.length, g.totalMs / 60_000])).toEqual([
      ['2026-11-04', 2, 50],
      ['2026-11-01', 1, 25],
    ]);
  });
});
