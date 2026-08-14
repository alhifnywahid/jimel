import { Search } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useMailStore } from "@/features/mail/use-mail";

/**
 * Search dialog copied from the dashboard header (⌘J), but it searches emails
 * (from / subject) in the JIMEL inbox instead of the navigation menu.
 */
export function SearchDialog() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const mails = useMailStore((s) => s.mails);
  const select = useMailStore((s) => s.select);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) setQuery("");
  };

  return (
    <>
      <Button
        onClick={() => handleOpenChange(true)}
        variant="link"
        className="px-0! font-normal text-muted-foreground hover:no-underline"
      >
        <Search data-icon="inline-start" />
        Search
        <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-medium text-[10px]">
          <span className="text-xs">⌘</span>J
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={handleOpenChange}>
        <Command>
          <CommandInput
            placeholder="Search email by sender or subject…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Inbox">
              {mails.map((mail) => (
                <CommandItem
                  key={mail.id}
                  value={`${mail.from.name} ${mail.from.email} ${mail.subject}`}
                  onSelect={() => {
                    select(mail.id);
                    handleOpenChange(false);
                  }}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-sm">{mail.subject}</span>
                    <span className="truncate text-muted-foreground text-xs">{mail.from.name}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
