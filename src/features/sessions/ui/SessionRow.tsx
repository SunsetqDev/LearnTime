import { colorVar, NO_SUBJECT_COLOR } from '@/features/subjects/palette';
import type { SessionRecord, SubjectRecord } from '@/lib/db';
import { duration, timeOfDay } from '@/lib/format';
import s from '@/features/sessions/ui/SessionRow.module.css';

interface SessionRowProps {
  readonly session: SessionRecord;
  readonly subject: SubjectRecord | undefined;
  readonly compact?: boolean;
}

export function SessionRow({ session, subject, compact = false }: SessionRowProps) {
  const interrupted = session.status === 'interrupted';
  return (
    <div className={[s.row, compact ? s.compact : ''].join(' ')}>
      <span className={s.time}>
        {timeOfDay(session.startedAt)}
        {compact ? null : <span className={s.to}>–{timeOfDay(session.endedAt)}</span>}
      </span>
      <span
        className={s.bar}
        style={{ background: subject ? colorVar(subject.color) : NO_SUBJECT_COLOR }}
        aria-hidden="true"
      />
      <span className={s.what}>
        <span className={s.subject}>{subject?.name ?? 'Без предмета'}</span>
        {session.task ? <span className={s.task}>{session.task}</span> : null}
      </span>
      <span className={s.meta}>
        <span className="num">{duration(session.actualMs)}</span>
        {interrupted ? <span className={s.tag}>прервана</span> : null}
      </span>
    </div>
  );
}
