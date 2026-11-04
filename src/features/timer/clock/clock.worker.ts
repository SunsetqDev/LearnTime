/// <reference lib="webworker" />
import { isClockCommand, type ClockMessage } from '@/features/timer/clock/protocol';
import { createScheduler } from '@/features/timer/clock/scheduler';

declare const self: DedicatedWorkerGlobalScope;

const post = (message: ClockMessage) => {
  self.postMessage(message);
};

const scheduler = createScheduler(
  {
    now: () => Date.now(),
    setTimeout: (fn, ms) => self.setTimeout(fn, ms),
    clearTimeout: (handle) => {
      self.clearTimeout(handle as number);
    },
  },
  {
    onTick: (now) => {
      post({ type: 'tick', now });
    },
    onDeadline: (at, now) => {
      post({ type: 'deadline', at, now });
    },
  },
);

self.addEventListener('message', (event: MessageEvent<unknown>) => {
  const command = event.data;
  if (!isClockCommand(command)) return;
  if (command.type === 'arm') scheduler.arm(command.endAt);
  else scheduler.disarm();
});
