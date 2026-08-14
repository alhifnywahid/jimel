/**
 * notify-sound.ts - a short chime when a new email arrives.
 *
 * Zero assets: the chime is synthesized with the Web Audio API, so nothing is
 * bundled or fetched. Whether it plays is a user toggle stored in localStorage
 * (default on). Browsers block audio until the user has interacted with the page;
 * by the time an email arrives the user has already clicked around (generated an
 * address, toggled the bell), so the AudioContext resumes fine.
 */

const STORAGE_KEY = "jimel:sound";

/** Sound on unless the user explicitly turned it off. */
export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    /* private mode / storage disabled - the toggle just won't persist */
  }
}

let ctx: AudioContext | null = null;

/** Play a soft two-note chime. No-op if disabled, blocked, or unsupported. */
export function playNewMailChime(): void {
  if (!isSoundEnabled()) return;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    // Two ascending notes (E6 -> A6) so it reads as a friendly "ding-ding".
    playNote(ctx, 1318.51, now, 0.14);
    playNote(ctx, 1760.0, now + 0.13, 0.2);
  } catch {
    /* audio blocked or unsupported - silently skip */
  }
}

function playNote(audio: AudioContext, freq: number, start: number, dur: number): void {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  // Quick attack, gentle exponential decay: a soft bell, not a harsh beep.
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}
