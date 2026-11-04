import { SHORTCUTS } from '@/app/shortcuts';
import { ui, useUi } from '@/app/uiStore';
import { Dialog } from '@/ui/Dialog';
import { Kbd } from '@/ui/Kbd';
import s from '@/app/KeyboardHelp.module.css';

export function KeyboardHelp() {
  const open = useUi((st) => st.help);
  return (
    <Dialog
      open={open}
      onClose={() => {
        ui.setHelp(false);
      }}
      title="Горячие клавиши"
      description="Работают на любой странице, кроме моментов, когда вы печатаете в поле."
    >
      <dl className={s.list}>
        {SHORTCUTS.map((sc) => (
          <div key={sc.action} className={s.row}>
            <dt className={s.keys}>
              {sc.keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </dt>
            <dd className={s.action}>{sc.action}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
