import { useState } from 'react';
import { nextColor, type SubjectColor } from '@/features/subjects/palette';
import {
  NAME_MAX,
  selectActive,
  subjectsRepo,
  useSubjects,
  validateName,
} from '@/features/subjects/store';
import { ColorPicker } from '@/features/subjects/ui/ColorPicker';
import type { SubjectRecord } from '@/lib/db';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { Field } from '@/ui/Field';

interface SubjectEditorProps {
  readonly open: boolean;
  readonly subject: SubjectRecord | null;
  readonly onClose: () => void;
  readonly onSaved?: (record: SubjectRecord | null) => void;
}

/** Окно создания/редактирования предмета. Монтируется заново при каждом открытии. */
export function SubjectEditor(props: SubjectEditorProps) {
  return props.open ? <EditorBody {...props} /> : null;
}

function EditorBody({ subject, onClose, onSaved }: SubjectEditorProps) {
  const all = useSubjects((s) => s.all);
  const active = useSubjects(selectActive);
  const taken = active.filter((x) => x.id !== subject?.id).map((x) => x.color);
  const [name, setName] = useState(subject?.name ?? '');
  const [color, setColor] = useState<SubjectColor>(subject?.color ?? nextColor(taken));
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const error = validateName(name, all, subject?.id);

  const save = async () => {
    setTouched(true);
    if (error) return;
    setBusy(true);
    try {
      if (subject) {
        await subjectsRepo.update(subject.id, { name, color });
        onSaved?.(null);
      } else {
        onSaved?.(await subjectsRepo.create(name, color));
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={subject ? 'Изменить предмет' : 'Новый предмет'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="solid" type="submit" form="subject-form" disabled={busy}>
            {subject ? 'Сохранить' : 'Добавить'}
          </Button>
        </>
      }
    >
      <form
        id="subject-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        style={{ display: 'grid', gap: 'var(--s-5)' }}
      >
        <Field
          label="Название"
          placeholder="Алгебра"
          value={name}
          maxLength={NAME_MAX}
          counter
          autoFocus
          error={touched ? error : null}
          onChange={(e) => {
            setName(e.target.value);
          }}
          onBlur={() => {
            if (name) setTouched(true);
          }}
        />
        <ColorPicker value={color} onChange={setColor} taken={taken} />
      </form>
    </Dialog>
  );
}
