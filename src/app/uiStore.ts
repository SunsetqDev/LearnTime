import { create } from 'zustand';

/** Состояние интерфейса, не связанное с данными: режим полного фокуса и справка по клавишам. */
interface UiState {
  readonly focusMode: boolean;
  readonly help: boolean;
}

export const useUi = create<UiState>()(() => ({ focusMode: false, help: false }));

export const ui = {
  setFocus: (focusMode: boolean) => {
    useUi.setState({ focusMode });
  },
  toggleFocus: () => {
    useUi.setState((s) => ({ focusMode: !s.focusMode }));
  },
  setHelp: (help: boolean) => {
    useUi.setState({ help });
  },
};
