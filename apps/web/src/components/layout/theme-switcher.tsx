import { Monitor, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";

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
import { THEME_PRESET_OPTIONS, type ThemeMode, type ThemePreset } from "@/lib/preferences/theme";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const { values, resolvedThemeMode, setPreference } = usePreferencesStore(
    useShallow((state) => ({
      values: state.values,
      resolvedThemeMode: state.resolvedThemeMode,
      setPreference: state.setPreference,
    })),
  );

  const { theme_mode: themeMode, theme_preset: themePreset } = values;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="icon" aria-label={`Current theme: ${themeMode}. Open theme settings`}>
          <Monitor className="hidden [html[data-theme-mode=system]_&]:block" />
          <Sun className="hidden dark:block [html[data-theme-mode=system]_&]:hidden" />
          <Moon className="block dark:hidden [html[data-theme-mode=system]_&]:hidden" />
        </Button>
      </SheetTrigger>
      <SheetContent side={isMobile ? "bottom" : "right"}>
        <SheetHeader>
          <SheetTitle>Theme</SheetTitle>
          <SheetDescription>Atur mode dan warna tema.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pb-4 **:data-[slot=toggle-group]:w-full **:data-[slot=toggle-group-item]:flex-1 **:data-[slot=toggle-group-item]:text-xs">
          <div className="space-y-1">
            <Label className="font-medium text-xs">Theme Mode</Label>
            <ToggleGroup
              size="sm"
              spacing={0}
              variant="outline"
              type="single"
              value={themeMode}
              onValueChange={(v: ThemeMode | "") => v && setPreference("theme_mode", v)}
            >
              <ToggleGroupItem value="light" aria-label="Toggle light">
                Light
              </ToggleGroupItem>
              <ToggleGroupItem value="dark" aria-label="Toggle dark">
                Dark
              </ToggleGroupItem>
              <ToggleGroupItem value="system" aria-label="Toggle system">
                System
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-1">
            <Label className="font-medium text-xs">Theme Preset</Label>
            <Select
              value={themePreset}
              onValueChange={(v: ThemePreset) => setPreference("theme_preset", v)}
            >
              <SelectTrigger size="sm" className="w-full text-xs">
                <SelectValue placeholder="Preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {THEME_PRESET_OPTIONS.map((preset) => (
                    <SelectItem key={preset.value} className="text-xs" value={preset.value}>
                      <span
                        className="size-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            resolvedThemeMode === "dark"
                              ? preset.primary.dark
                              : preset.primary.light,
                        }}
                      />
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
