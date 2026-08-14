/**
 * notify-sound.ts - the new-mail chime library.
 *
 * Zero assets: every sound is synthesized with the Web Audio API, so nothing is
 * bundled or fetched. Two independent preferences live in localStorage:
 *   - enabled (on/off), default ON
 *   - choice  (which sound), default "bubble"
 * The React store in ./use-sound mirrors these for the UI; this module is the
 * source of truth for the actual playback and reads localStorage directly so the
 * non-React callers (use-inbox-sync) always get the current values.
 *
 * Browsers block audio until the user has interacted with the page; by the time
 * an email arrives the user has usually clicked around already, so the
 * AudioContext resumes fine. If not, the first chime is silently skipped.
 */

type OscType = "sine" | "triangle" | "square";
type Note = { type: OscType; freq: number; start: number; dur: number; peak?: number };

export type SoundId = "bubble" | "ding-ding" | "single" | "chime" | "pop" | "marimba" | "tritone";

export interface SoundOption {
  id: SoundId;
  label: string;
  description: string;
  notes: Note[];
}

/** The full catalogue, shown in the preferences picker (order = display order). */
export const SOUND_OPTIONS: readonly SoundOption[] = [
  {
    id: "bubble",
    label: "Bubble",
    description: "Soft rising three-note, calm.",
    notes: [
      { type: "sine", freq: 783.99, start: 0, dur: 0.12, peak: 0.16 },
      { type: "sine", freq: 1046.5, start: 0.1, dur: 0.14, peak: 0.16 },
      { type: "sine", freq: 1318.51, start: 0.2, dur: 0.22, peak: 0.18 },
    ],
  },
  {
    id: "ding-ding",
    label: "Ding-ding",
    description: "Two ascending notes, gentle.",
    notes: [
      { type: "sine", freq: 1318.51, start: 0, dur: 0.14 },
      { type: "sine", freq: 1760, start: 0.13, dur: 0.2 },
    ],
  },
  {
    id: "single",
    label: "Single ding",
    description: "One short note, minimal.",
    notes: [{ type: "sine", freq: 1568, start: 0, dur: 0.22 }],
  },
  {
    id: "chime",
    label: "Soft chime",
    description: "Three notes like a doorbell.",
    notes: [
      { type: "sine", freq: 1046.5, start: 0, dur: 0.16 },
      { type: "sine", freq: 1318.51, start: 0.12, dur: 0.16 },
      { type: "sine", freq: 1567.98, start: 0.24, dur: 0.26 },
    ],
  },
  {
    id: "pop",
    label: "Pop",
    description: "Short blip like a chat notification.",
    notes: [
      { type: "triangle", freq: 880, start: 0, dur: 0.08, peak: 0.22 },
      { type: "triangle", freq: 1200, start: 0.05, dur: 0.1, peak: 0.2 },
    ],
  },
  {
    id: "marimba",
    label: "Marimba",
    description: "Warm wooden xylophone tone.",
    notes: [
      { type: "triangle", freq: 659.25, start: 0, dur: 0.28, peak: 0.22 },
      { type: "triangle", freq: 987.77, start: 0.09, dur: 0.32, peak: 0.16 },
    ],
  },
  {
    id: "tritone",
    label: "Tri-tone",
    description: "Three-note phone-style notification.",
    notes: [
      { type: "sine", freq: 1174.66, start: 0, dur: 0.13 },
      { type: "sine", freq: 1567.98, start: 0.12, dur: 0.13 },
      { type: "sine", freq: 1318.51, start: 0.24, dur: 0.22 },
    ],
  },
];

export const DEFAULT_SOUND: SoundId = "bubble";
const EN_KEY = "jimel:sound";
const ID_KEY = "jimel:sound-choice";

export function isKnownSound(id: string | null | undefined): id is SoundId {
  return !!id && SOUND_OPTIONS.some((s) => s.id === id);
}

/** Sound on unless the user explicitly turned it off. */
export function getSoundEnabled(): boolean {
  try {
    return localStorage.getItem(EN_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(EN_KEY, on ? "on" : "off");
  } catch {
    /* private mode - the toggle just won't persist */
  }
}

export function getSoundChoice(): SoundId {
  try {
    const v = localStorage.getItem(ID_KEY);
    return isKnownSound(v) ? v : DEFAULT_SOUND;
  } catch {
    return DEFAULT_SOUND;
  }
}

export function setSoundChoice(id: SoundId): void {
  try {
    localStorage.setItem(ID_KEY, id);
  } catch {
    /* private mode - the choice just won't persist */
  }
}

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function playNote(a: AudioContext, n: Note): void {
  const t = a.currentTime + n.start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = n.type;
  osc.frequency.value = n.freq;
  const peak = n.peak ?? 0.18;
  // Quick attack, gentle exponential decay: a soft bell, not a harsh beep.
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + n.dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + n.dur + 0.02);
}

/** Play a specific sound by id, ignoring the on/off toggle (used for previews). */
export function previewSound(id: SoundId): void {
  const option = SOUND_OPTIONS.find((s) => s.id === id);
  if (!option) return;
  try {
    const a = audioCtx();
    if (!a) return;
    for (const n of option.notes) playNote(a, n);
  } catch {
    /* audio blocked or unsupported - silently skip */
  }
}

/** Play the user's chosen chime for a newly arrived email. No-op if muted. */
export function playNewMailChime(): void {
  if (!getSoundEnabled()) return;
  previewSound(getSoundChoice());
}
