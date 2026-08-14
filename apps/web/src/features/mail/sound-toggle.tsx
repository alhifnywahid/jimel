/**
 * sound-toggle.tsx - a bell button in the header to mute/unmute the new-mail chime.
 *
 * The preference lives in localStorage (see notify-sound.ts); this is just the
 * control. Clicking it also plays the chime once when turning sound ON, so the
 * user hears what they enabled (and it satisfies the browser's user-gesture rule).
 */

import { Bell, BellOff } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isSoundEnabled, playNewMailChime, setSoundEnabled } from "./notify-sound";

export function SoundToggle() {
  const [enabled, setEnabled] = useState(isSoundEnabled);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    setSoundEnabled(next);
    if (next) playNewMailChime(); // preview the chime when enabling
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggle}
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
