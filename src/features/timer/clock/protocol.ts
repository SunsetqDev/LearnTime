/** Сообщения между основным потоком и clock.worker. */
export type ClockCommand =
  { readonly type: 'arm'; readonly endAt: number } | { readonly type: 'disarm' };

export type ClockMessage =
  | { readonly type: 'tick'; readonly now: number }
  | { readonly type: 'deadline'; readonly at: number; readonly now: number };

export function isClockMessage(value: unknown): value is ClockMessage {
  if (typeof value !== 'object' || value === null || !('type' in value)) return false;
  const { type } = value;
  return type === 'tick' || type === 'deadline';
}

export function isClockCommand(value: unknown): value is ClockCommand {
  if (typeof value !== 'object' || value === null || !('type' in value)) return false;
  const { type } = value;
  return type === 'arm' || type === 'disarm';
}
