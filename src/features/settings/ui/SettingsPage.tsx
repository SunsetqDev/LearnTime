import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ui } from '@/app/uiStore';
import { wipeAll } from '@/features/settings/backup';
import {
  DEFAULT_SETTINGS,
  LIMITS,
  useSettings,
  type GoalKind,
  type ThemePref,
} from '@/features/settings/store';
import { BackupControls } from '@/features/settings/ui/BackupControls';
import { createInitialState } from '@/features/timer/model/machine';
import { TIMER_KEY, useTimer } from '@/features/timer/store';
import { playSignal, VOICES, type VoiceId } from '@/lib/audio/synth';
import { notifyPermission, requestNotifyPermission, type NotifyPermission } from '@/lib/notify';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/Dialog';
import { PageHeader } from '@/ui/PageHeader';
import { Segmented } from '@/ui/Segmented';
import { Slider } from '@/ui/Slider';
import { Stepper } from '@/ui/Stepper';
import { Switch } from '@/ui/Switch';
import { toast } from '@/ui/toast';
import s from '@/features/settings/ui/SettingsPage.module.css';

function Section({
  id,
  index,
  title,
  children,
}: {
  readonly id?: string;
  readonly index: string;
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section className={s.section} id={id} aria-labelledby={`${index}-title`}>
      <header className={s.sectionHead}>
        <span className={s.index}>{index}</span>
        <h2 id={`${index}-title`} className={s.title}>
          {title}
        </h2>
      </header>
      <div className={s.rows}>{children}</div>
    </section>
  );
}

const PERMISSION_TEXT: Record<NotifyPermission, string> = {
  granted: 'Разрешены в браузере',
  default: 'Браузер спросит разрешение',
  denied: 'Запрещены в настройках браузера — включите их там для этого сайта',
  unsupported: 'Этот браузер не поддерживает уведомления',
};

export default function SettingsPage() {
  const st = useSettings();
  const [permission, setPermission] = useState<NotifyPermission>(notifyPermission());
  const [confirmWipe, setConfirmWipe] = useState(false);
  const location = useLocation();

  // Переход по ссылке «/settings#goal» с главного экрана — прокручиваем к цели.
  useEffect(() => {
    if (location.hash)
      document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash]);

  const goalLimits = st.goal.kind === 'minutes' ? LIMITS.goalMinutes : LIMITS.goalSessions;

  return (
    <div className={s.page}>
      <PageHeader
        index="05"
        title="Настройки"
        lead="Всё хранится только на этом устройстве. Резервную копию можно сохранить файлом."
      />

      <div className={s.grid}>
        <Section index="01" title="Таймер">
          <Stepper
            label="Учёба"
            unit="мин"
            value={st.minutes.focus}
            min={LIMITS.focus.min}
            max={LIMITS.focus.max}
            onChange={(v) => {
              st.setMinutes('focus', v);
            }}
          />
          <Stepper
            label="Короткий перерыв"
            unit="мин"
            value={st.minutes.short}
            min={LIMITS.short.min}
            max={LIMITS.short.max}
            onChange={(v) => {
              st.setMinutes('short', v);
            }}
          />
          <Stepper
            label="Длинный перерыв"
            unit="мин"
            value={st.minutes.long}
            min={LIMITS.long.min}
            max={LIMITS.long.max}
            onChange={(v) => {
              st.setMinutes('long', v);
            }}
          />
          <Stepper
            label="Длинный перерыв после"
            hint="учебных сессий подряд"
            value={st.longEvery}
            min={LIMITS.longEvery.min}
            max={LIMITS.longEvery.max}
            onChange={(v) => {
              st.update({ longEvery: v });
            }}
          />
          <Switch
            label="Автостарт перерыва"
            hint="Перерыв начнётся сам после учёбы"
            checked={st.autoStartBreaks}
            onChange={(v) => {
              st.update({ autoStartBreaks: v });
            }}
          />
          <Switch
            label="Автостарт учёбы"
            hint="Учёба начнётся сама после перерыва"
            checked={st.autoStartFocus}
            onChange={(v) => {
              st.update({ autoStartFocus: v });
            }}
          />
          <p className={s.note}>
            Новые длительности применятся со следующей сессии — идущую не трогаем.
          </p>
        </Section>

        <Section id="goal" index="02" title="Цель дня">
          <div className={s.inline}>
            <span className={s.inlineLabel}>Считать</span>
            <Segmented<GoalKind>
              size="sm"
              label="Единица цели"
              value={st.goal.kind}
              onChange={(kind) => {
                st.update({
                  goal: { kind, value: kind === 'minutes' ? DEFAULT_SETTINGS.goal.value : 4 },
                });
              }}
              options={[
                { value: 'minutes', label: 'Минуты' },
                { value: 'sessions', label: 'Сессии' },
              ]}
            />
          </div>
          <Stepper
            label="Цель"
            unit={st.goal.kind === 'minutes' ? 'мин' : 'шт'}
            step={st.goal.kind === 'minutes' ? 15 : 1}
            value={st.goal.value}
            min={goalLimits.min}
            max={goalLimits.max}
            hint={
              st.goal.kind === 'minutes'
                ? 'Считается всё время учёбы, включая прерванные'
                : 'Считаются только завершённые'
            }
            onChange={(value) => {
              st.update({ goal: { ...st.goal, value } });
            }}
          />
        </Section>

        <Section index="03" title="Звук">
          <Switch
            label="Сигнал в конце сессии"
            checked={st.sound.enabled}
            onChange={(enabled) => {
              st.update({ sound: { ...st.sound, enabled } });
            }}
          />
          <div className={s.inline}>
            <span className={s.inlineLabel}>Сигнал</span>
            <Segmented<VoiceId>
              size="sm"
              label="Сигнал"
              value={st.sound.voice}
              onChange={(voice) => {
                st.update({ sound: { ...st.sound, voice } });
                playSignal(voice, st.sound.volume, false);
              }}
              options={(Object.keys(VOICES) as VoiceId[]).map((v) => ({
                value: v,
                label: VOICES[v],
              }))}
            />
          </div>
          <Slider
            label="Громкость"
            value={st.sound.volume}
            disabled={!st.sound.enabled}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(volume) => {
              st.update({ sound: { ...st.sound, volume } });
            }}
          />
          <div className={s.inlineEnd}>
            <Button
              size="sm"
              variant="line"
              icon="volume"
              disabled={!st.sound.enabled}
              onClick={() => {
                playSignal(st.sound.voice, st.sound.volume, false);
              }}
            >
              Прослушать
            </Button>
          </div>
        </Section>

        <Section index="04" title="Уведомления">
          <Switch
            label="Уведомлять о конце сессии"
            hint={PERMISSION_TEXT[permission]}
            checked={st.notifications && permission === 'granted'}
            disabled={permission === 'unsupported' || permission === 'denied'}
            onChange={(on) => {
              if (!on) {
                st.update({ notifications: false });
                return;
              }
              void requestNotifyPermission().then((p) => {
                setPermission(p);
                st.update({ notifications: p === 'granted' });
              });
            }}
          />
          <p className={s.note}>
            Время и режим всегда видны в заголовке вкладки — даже без уведомлений.
          </p>
        </Section>

        <Section index="05" title="Оформление">
          <div className={s.inline}>
            <span className={s.inlineLabel}>Тема</span>
            <Segmented<ThemePref>
              size="sm"
              label="Тема"
              value={st.theme}
              onChange={(theme) => {
                st.update({ theme });
              }}
              options={[
                { value: 'system', label: 'Как в системе' },
                { value: 'light', label: 'Светлая' },
                { value: 'dark', label: 'Тёмная' },
              ]}
            />
          </div>
          <div className={s.inline}>
            <span className={s.inlineLabel}>Горячие клавиши</span>
            <Button
              size="sm"
              variant="line"
              icon="keyboard"
              onClick={() => {
                ui.setHelp(true);
              }}
            >
              Показать
            </Button>
          </div>
          <div className={s.inline}>
            <span className={s.inlineLabel}>Подсказка для новичков</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                st.update({ onboardingDone: false });
                toast({ kind: 'info', title: 'Подсказка вернётся на экране таймера' });
              }}
            >
              Показать снова
            </Button>
          </div>
        </Section>

        <Section index="06" title="Данные">
          <div className={s.inline}>
            <span className={s.inlineLabel}>Резервная копия</span>
            <span className={s.buttons}>
              <BackupControls />
            </span>
          </div>
          <div className={s.danger}>
            <div>
              <p className={s.dangerTitle}>Удалить все данные</p>
              <p className={s.note}>
                Сессии, предметы, достижения и настройки. Сначала сохраните копию.
              </p>
            </div>
            <Button
              size="sm"
              variant="danger"
              icon="trash"
              onClick={() => {
                setConfirmWipe(true);
              }}
            >
              Удалить
            </Button>
          </div>
        </Section>
      </div>

      <ConfirmDialog
        open={confirmWipe}
        tone="danger"
        title="Удалить все данные?"
        description="История, предметы, достижения и настройки будут стёрты с этого устройства без возможности восстановления."
        confirmLabel="Удалить безвозвратно"
        onCancel={() => {
          setConfirmWipe(false);
        }}
        onConfirm={() => {
          setConfirmWipe(false);
          void wipeAll().then(() => {
            st.reset();
            localStorage.removeItem(TIMER_KEY);
            useTimer.setState({ machine: createInitialState() });
            toast({ kind: 'info', title: 'Данные удалены', text: 'Приложение как новое.' });
          });
        }}
      />
    </div>
  );
}
