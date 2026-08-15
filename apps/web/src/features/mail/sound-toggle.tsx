/**
 * sound-toggle.tsx - the notification-sound control in the header.
 *
 * The bell icon opens its own sheet (like the theme switcher) containing:
 *   - status: sound On / Off
 *   - the sound picker: which chime to play on new mail
 * Picking a sound previews it immediately. Preferences live in the sound store
 * (persisted to localStorage). The trigger uses the same button style as the
 * other header icons so it blends in.
 */

import { Bell, BellOff } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";
import { SOUND_OPTIONS, type SoundId } from "./notify-sound";
import { useSoundStore } from "./use-sound";

export function SoundToggle() {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const enabled = useSoundStore((s) => s.enabled);
  const choice = useSoundStore((s) => s.choice);
  const setEnabled = useSoundStore((s) => s.setEnabled);
  const setChoice = useSoundStore((s) => s.setChoice);

  const activeSound = SOUND_OPTIONS.find((s) => s.id === choice);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          aria-label={`Notification sound: ${enabled ? "on" : "off"}. Open sound settings`}
        >
          {enabled ? <Bell /> : <BellOff />}
        </Button>
      </SheetTrigger>
      <SheetContent side={isMobile ? "bottom" : "right"}>
        <SheetHeader>
          <SheetTitle>Notification sound</SheetTitle>
          <SheetDescription>Turn the new-mail sound on or off and pick a chime.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pb-4 **:data-[slot=toggle-group]:w-full **:data-[slot=toggle-group-item]:flex-1 **:data-[slot=toggle-group-item]:text-xs">
          <div className="space-y-1">
            <Label className="font-medium text-xs">Status</Label>
            <ToggleGroup
              size="sm"
              spacing={0}
              variant="outline"
              type="single"
              value={enabled ? "on" : "off"}
              onValueChange={(v: string) => v && setEnabled(v === "on")}
            >
              <ToggleGroupItem value="on" aria-label="Sound on">
                On
              </ToggleGroupItem>
              <ToggleGroupItem value="off" aria-label="Sound off">
                Off
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-1">
            <Label className="font-medium text-xs">Sound</Label>
            <Select value={choice} onValueChange={(v: SoundId) => setChoice(v)} disabled={!enabled}>
              <SelectTrigger size="sm" className="w-full text-xs">
                <SelectValue placeholder="Select sound" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {SOUND_OPTIONS.map((s) => (
                    <SelectItem key={s.id} className="text-xs" value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {activeSound ? (
              <p className="pt-0.5 text-muted-foreground text-xs">{activeSound.description}</p>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
