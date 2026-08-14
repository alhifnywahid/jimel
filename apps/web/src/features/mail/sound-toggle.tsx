/**
 * sound-toggle.tsx - a bell button in the header to mute/unmute the new-mail chime.
 *
 * The preference lives in the sound store (persisted to localStorage). Enabling
 * plays the chosen chime once so the user hears what they turned on (and it
 * satisfies the browser's user-gesture requirement for audio).
 */

import { Bell, BellOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSoundStore } from "./use-sound";

export function SoundToggle() {
  const enabled = useSoundStore((s) => s.enabled);
  const setEnabled = useSoundStore((s) => s.setEnabled);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setEnabled(!enabled)}
          aria-label={enabled ? "Mute new-mail sound" : "Unmute new-mail sound"}
          aria-pressed={enabled}
        >
          {enabled ? <Bell /> : <BellOff className="text-muted-foreground" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{enabled ? "Sound on" : "Sound off"}</TooltipContent>
    </Tooltip>
  );
}
