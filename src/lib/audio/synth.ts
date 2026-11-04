/**
 * Сигналы окончания сессии, синтезированные через Web Audio API — без аудиофайлов.
 * У каждого «голоса» мягкое нарастание громкости (атака 15–40 мс), чтобы звук не щёлкал.
 */
export const VOICES = {
  tuning: 'Камертон',
  escapement: 'Спуск',
  bell: 'Колокол',
  chord: 'Аккорд',
} as const;

export type VoiceId = keyof typeof VOICES;

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return null;
  ctx ??= new window.AudioContext();
  return ctx;
}

/** Браузеры разрешают звук только после жеста пользователя — «будим» контекст заранее. */
export function unlockAudio(): void {
  const c = context();
  if (c?.state === 'suspended') void c.resume();
}

interface ToneOptions {
  readonly freq: number;
  readonly start: number;
  readonly duration: number;
  readonly gain: number;
  readonly type?: OscillatorType;
  readonly attack?: number;
}

function tone(c: AudioContext, out: AudioNode, o: ToneOptions): void {
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.value = o.freq;
  const attack = o.attack ?? 0.02;
  env.gain.setValueAtTime(0.0001, o.start);
  env.gain.exponentialRampToValueAtTime(o.gain, o.start + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, o.start + o.duration);
  osc.connect(env).connect(out);
  osc.start(o.start);
  osc.stop(o.start + o.duration + 0.05);
}

function fmBell(c: AudioContext, out: AudioNode, freq: number, start: number, gain: number): void {
  const carrier = c.createOscillator();
  const mod = c.createOscillator();
  const modGain = c.createGain();
  const env = c.createGain();
  carrier.frequency.value = freq;
  mod.frequency.value = freq * 1.4;
  modGain.gain.setValueAtTime(freq * 2.2, start);
  modGain.gain.exponentialRampToValueAtTime(1, start + 2.2);
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + 0.015);
  env.gain.exponentialRampToValueAtTime(0.0001, start + 2.6);
  mod.connect(modGain).connect(carrier.frequency);
  carrier.connect(env).connect(out);
  mod.start(start);
  carrier.start(start);
  mod.stop(start + 2.7);
  carrier.stop(start + 2.7);
}

function click(c: AudioContext, out: AudioNode, start: number, gain: number): void {
  const len = Math.floor(c.sampleRate * 0.03);
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2400;
  filter.Q.value = 6;
  const env = c.createGain();
  env.gain.value = gain;
  src.connect(filter).connect(env).connect(out);
  src.start(start);
}

const PLAYERS: Record<
  VoiceId,
  (c: AudioContext, out: AudioNode, t: number, breakNext: boolean) => void
> = {
  tuning: (c, out, t, breakNext) => {
    const base = breakNext ? 440 : 523.25;
    tone(c, out, { freq: base, start: t, duration: 1.8, gain: 0.5, attack: 0.04 });
    tone(c, out, { freq: base * 2, start: t, duration: 1.1, gain: 0.12, attack: 0.04 });
    tone(c, out, { freq: base * 3.01, start: t, duration: 0.6, gain: 0.05, attack: 0.04 });
  },
  escapement: (c, out, t) => {
    for (let i = 0; i < 6; i += 1) click(c, out, t + i * 0.16, i % 2 === 0 ? 0.9 : 0.55);
    tone(c, out, { freq: 880, start: t + 1.05, duration: 0.5, gain: 0.25, type: 'triangle' });
  },
  bell: (c, out, t, breakNext) => {
    fmBell(c, out, breakNext ? 392 : 587.33, t, 0.32);
    fmBell(c, out, breakNext ? 523.25 : 783.99, t + 0.45, 0.22);
  },
  chord: (c, out, t, breakNext) => {
    const notes = breakNext ? [349.23, 440, 523.25] : [392, 493.88, 587.33];
    notes.forEach((f, i) => {
      tone(c, out, {
        freq: f,
        start: t + i * 0.09,
        duration: 1.6,
        gain: 0.22,
        type: 'triangle',
        attack: 0.03,
      });
    });
  },
};

export function playSignal(voice: VoiceId, volume: number, breakNext: boolean): void {
  const c = context();
  if (!c) return;
  unlockAudio();
  const master = c.createGain();
  const v = Math.max(0, Math.min(1, volume));
  // Мягкое нарастание общей громкости поверх атак отдельных тонов.
  master.gain.setValueAtTime(0.0001, c.currentTime);
  master.gain.exponentialRampToValueAtTime(Math.max(0.0001, v * v), c.currentTime + 0.12);
  master.connect(c.destination);
  PLAYERS[voice](c, master, c.currentTime + 0.02, breakNext);
}
