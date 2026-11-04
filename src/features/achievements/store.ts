import { create } from 'zustand';
import { ACHIEVEMENTS, evaluate } from '@/features/achievements/model/rules';
import { goalProgress } from '@/features/habits/model/habits';
import { useSessions } from '@/features/sessions/store';
import { useSettings } from '@/features/settings/store';
import { db, type AchievementRecord } from '@/lib/db';
import { bindLiveQuery } from '@/lib/liveStore';
import { dayKey } from '@/lib/time';
import { toast } from '@/ui/toast';

interface AchievementsState {
  readonly ready: boolean;
  readonly unlocked: ReadonlyMap<string, number>;
}

export const useAchievements = create<AchievementsState>()(() => ({
  ready: false,
  unlocked: new Map(),
}));

/**
 * Следит за сессиями: после каждой записи пересчитывает правила и сохраняет новые
 * открытия с датой. Уведомление показывается только для того, что открылось
 * в этом запуске, — старые награды при первом расчёте записываются молча.
 */
export function startAchievementsSync(): () => void {
  let primed = false;
  let goalDoneFor: string | null = null;

  const offLive = bindLiveQuery(
    () => db.achievements.toArray(),
    (rows: AchievementRecord[]) => {
      useAchievements.setState({
        ready: true,
        unlocked: new Map(rows.map((r) => [r.id, r.unlockedAt])),
      });
    },
  );

  const check = () => {
    const { ready, all } = useSessions.getState();
    if (!ready || !useAchievements.getState().ready) return;
    const today = dayKey(Date.now());
    const goal = useSettings.getState().goal;
    const states = evaluate({ sessions: all, today, goal });
    const known = useAchievements.getState().unlocked;
    const fresh = states.filter((a) => a.unlocked && !known.has(a.def.id));
    if (fresh.length > 0) {
      const now = Date.now();
      void db.achievements.bulkPut(fresh.map((a) => ({ id: a.def.id, unlockedAt: now })));
      if (primed) {
        for (const a of fresh)
          toast({ kind: 'achievement', title: a.def.title, text: a.def.condition });
      }
    }

    // Поздравление с целью дня — один раз в день, и только если она выполнена прямо сейчас.
    const progress = goalProgress(all, today, goal);
    if (primed && progress.done && goalDoneFor !== today) {
      toast({
        kind: 'goal',
        title: 'Цель дня выполнена',
        text: 'Серия продлена. Дальше — по самочувствию.',
      });
    }
    if (progress.done) goalDoneFor = today;
    primed = true;
  };

  const offSessions = useSessions.subscribe(check);
  const offAch = useAchievements.subscribe((s, prev) => {
    if (s.ready && !prev.ready) check();
  });
  check();

  return () => {
    offLive();
    offSessions();
    offAch();
  };
}

export const ACHIEVEMENT_COUNT = ACHIEVEMENTS.length;
