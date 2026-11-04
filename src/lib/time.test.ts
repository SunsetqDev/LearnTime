import { addDays, dayKey, diffDays, weekStart } from '@/lib/time';

describe('календарные дни', () => {
  it('ключ дня — локальная дата', () => {
    expect(dayKey(new Date(2026, 0, 5, 0, 1).getTime())).toBe('2026-01-05');
  });
  it('сдвиг через границу месяца и года', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('разница в днях', () => {
    expect(diffDays('2026-10-25', '2026-11-04')).toBe(10);
  });
  it('неделя начинается с понедельника', () => {
    expect(weekStart('2026-11-04')).toBe('2026-11-02');
    expect(weekStart('2026-11-08')).toBe('2026-11-02');
  });
});
