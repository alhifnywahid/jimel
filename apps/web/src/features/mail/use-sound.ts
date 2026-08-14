/**
 * use-sound.ts - React store mirroring the sound preferences (enabled + choice).
 *
 * notify-sound.ts owns playback and reads localStorage directly (for non-React
 * callers). This store keeps the UI in sync so the header bell and the
 * Preferences picker always reflect - and update - the same values.
 */

import { create } from "zustand";
import {
  DEFAULT_SOUND,
  getSoundChoice,
  getSoundEnabled,
  previewSound,
  type SoundId,
  setSoundChoice,
  setSoundEnabled,
} from "./notify-sound";

type SoundState = {
  enabled: boolean;
  choice: SoundId;
  setEnabled: (on: boolean) => void;
  setChoice: (id: SoundId) => void;
};

export const useSoundStore = create<SoundState>((set) => ({
  enabled: getSoundEnabled(),
  choice: (getSoundChoice?.() ?? DEFAULT_SOUND) as SoundId,

  setEnabled: (on) => {
    setSoundEnabled(on);
    set({ enabled: on });
    if (on) previewSound(getSoundChoice()); // preview when enabling
  },

  setChoice: (id) => {
    setSoundChoice(id);
    set({ choice: id });
    previewSound(id); // always preview the newly picked sound
  },
}));
