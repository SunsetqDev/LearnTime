import { useRef, useState } from 'react';
import {
  createBackup,
  downloadBackup,
  importBackup,
  parseBackup,
  type Backup,
  type ImportMode,
} from '@/features/settings/backup';
import { duration, plural } from '@/lib/format';
import { humanDate, dayKey } from '@/lib/time';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { Segmented } from '@/ui/Segmented';
import s from '@/features/settings/ui/BackupControls.module.css';

/** Кнопки «Экспорт» и «Импорт» с предпросмотром содержимого файла перед записью в базу. */
export function BackupControls({ size = 'sm' }: { readonly size?: 'sm' | 'md' }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setDone(null);
    const result = parseBackup(await file.text());
    if (result.ok) setPending(result.backup);
    else setError(result.error);
    if (input.current) input.current.value = '';
  };

  const close = () => {
    setPending(null);
    setError(null);
    setDone(null);
  };

  const total = pending?.sessions.reduce((sum, x) => sum + x.actualMs, 0) ?? 0;

  return (
    <>
      <Button
        size={size}
        variant="line"
        icon="download"
        onClick={() => {
          void createBackup().then(downloadBackup);
        }}
      >
        Экспорт
      </Button>
      <Button
        size={size}
        variant="ghost"
        icon="upload"
        onClick={() => {
          input.current?.click();
        }}
      >
        Импорт
      </Button>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
        }}
      />

      <Dialog
        open={pending !== null || error !== null}
        onClose={close}
        title={error ? 'Не удалось прочитать файл' : done ? 'Готово' : 'Импорт резервной копии'}
        size="md"
        footer={
          error || done ? (
            <Button variant="solid" onClick={close}>
              Понятно
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={close}>
                Отмена
              </Button>
              <Button
                variant={mode === 'replace' ? 'danger' : 'solid'}
                disabled={busy}
                onClick={() => {
                  if (!pending) return;
                  setBusy(true);
                  void importBackup(pending, mode)
                    .then((r) => {
                      setDone(
                        `Добавлено ${r.sessionsAdded} ${plural(r.sessionsAdded, ['сессия', 'сессии', 'сессий'])} и ${r.subjectsAdded} ${plural(r.subjectsAdded, ['предмет', 'предмета', 'предметов'])}.`,
                      );
                    })
                    .catch(() => {
                      setError('Во время записи что-то пошло не так. Данные не изменились.');
                    })
                    .finally(() => {
                      setBusy(false);
                    });
                }}
              >
                {mode === 'replace' ? 'Заменить данные' : 'Объединить'}
              </Button>
            </>
          )
        }
      >
        {error ? <p className={s.error}>{error}</p> : null}
        {done ? <p>{done}</p> : null}
        {pending && !done && !error ? (
          <div className={s.preview}>
            <dl className={s.facts}>
              <div>
                <dt className="caps">Создана</dt>
                <dd>{humanDate(dayKey(pending.exportedAt))}</dd>
              </div>
              <div>
                <dt className="caps">Сессий</dt>
                <dd className="num">{pending.sessions.length}</dd>
              </div>
              <div>
                <dt className="caps">Предметов</dt>
                <dd className="num">{pending.subjects.length}</dd>
              </div>
              <div>
                <dt className="caps">Время</dt>
                <dd className="num">{duration(total)}</dd>
              </div>
            </dl>
            <Segmented
              label="Способ импорта"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'merge', label: 'Объединить' },
                { value: 'replace', label: 'Заменить всё' },
              ]}
            />
            <p className={s.hint}>
              {mode === 'merge'
                ? 'Новые записи добавятся к текущим, совпадающие пропустятся.'
                : 'Текущие сессии, предметы и достижения будут удалены и заменены данными из файла.'}
            </p>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
