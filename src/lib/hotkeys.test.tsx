import { fireEvent, render } from '@testing-library/react';
import { useHotkeys, type Hotkey } from '@/lib/hotkeys';

function Harness({ bindings }: { readonly bindings: readonly Hotkey[] }) {
  useHotkeys(bindings);
  return <input aria-label="поле" />;
}

describe('горячие клавиши', () => {
  it('срабатывают по физической клавише — в русской раскладке тоже', () => {
    const handler = vi.fn();
    render(<Harness bindings={[{ keys: ['KeyR'], handler }]} />);
    fireEvent.keyDown(window, { code: 'KeyR', key: 'к' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('не мешают печатать в полях ввода', () => {
    const handler = vi.fn();
    const { getByLabelText } = render(<Harness bindings={[{ keys: ['Space'], handler }]} />);
    fireEvent.keyDown(getByLabelText('поле'), { code: 'Space', key: ' ' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('Esc с флагом always работает и в поле', () => {
    const handler = vi.fn();
    const { getByLabelText } = render(
      <Harness bindings={[{ keys: ['Escape'], handler, always: true }]} />,
    );
    fireEvent.keyDown(getByLabelText('поле'), { code: 'Escape', key: 'Escape' });
    expect(handler).toHaveBeenCalled();
  });

  it('игнорируют сочетания с Ctrl и автоповтор', () => {
    const handler = vi.fn();
    render(<Harness bindings={[{ keys: ['KeyS'], handler }]} />);
    fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true });
    fireEvent.keyDown(window, { code: 'KeyS', repeat: true });
    expect(handler).not.toHaveBeenCalled();
  });
});
