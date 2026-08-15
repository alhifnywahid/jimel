/**
 * address-panel.tsx - active-address panel in the sidebar header.
 *
 * Shows the currently active inbox address (mono, copyable), plus a "create new
 * address" popover: optional prefix input (empty = random) + a domain picker.
 * All state comes from useAddressStore; this component is just view + actions.
 */

import { Check, ChevronDown, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAddressStore } from "./use-address";

export function AddressPanel() {
  const address = useAddressStore((s) => s.address);
  const domains = useAddressStore((s) => s.domains);
  const generating = useAddressStore((s) => s.generating);
  const generate = useAddressStore((s) => s.generate);

  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Failed to copy the address");
    }
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-card px-2 py-1.5">
      <span className="min-w-0 flex-1 truncate font-mono text-xs" title={address ?? undefined}>
        {address ?? "No address yet"}
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Copy address"
            disabled={!address}
            onClick={handleCopy}
          >
            {copied ? <Check className="text-green-600" /> : <Copy />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copy</TooltipContent>
      </Tooltip>

      <NewAddressPopover
        domains={domains}
        generating={generating}
        currentAddress={address}
        onGenerate={generate}
      />
    </div>
  );
}

interface NewAddressPopoverProps {
  domains: string[];
  generating: boolean;
  currentAddress: string | null;
  onGenerate: (prefix?: string, domain?: string) => Promise<void>;
}

function NewAddressPopover({
  domains,
  generating,
  currentAddress,
  onGenerate,
}: NewAddressPopoverProps) {
  const storedDomain = useAddressStore((s) => s.domain);
  const [open, setOpen] = useState(false);
  const [prefix, setPrefix] = useState("");
  const [domain, setDomain] = useState<string | undefined>(undefined);

  const activeDomain = domain ?? storedDomain ?? domains[0];

  async function submit() {
    await onGenerate(prefix.trim() || undefined, activeDomain);
    // If generate failed, the error shows via a toast in the store; only close the
    // popover on success (the store clears the error when it succeeds).
    if (!useAddressStore.getState().error) {
      setPrefix("");
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label="Create new address">
          <ChevronDown />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="flex flex-col gap-1">
          <Label htmlFor="new-prefix" className="text-xs">
            Prefix
          </Label>
          <Input
            id="new-prefix"
            value={prefix}
            placeholder="random if empty"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setPrefix(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs">Domain</Label>
          <Select value={activeDomain} onValueChange={setDomain} disabled={domains.length === 0}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="Pick a domain" />
            </SelectTrigger>
            <SelectContent>
              {domains.map((d) => (
                <SelectItem key={d} value={d}>
                  @{d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Creating a new address abandons the current inbox, so confirm first. */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="mt-1 w-full" size="sm" disabled={generating}>
              {generating ? <Spinner /> : <RefreshCw />}
              Create address
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia>
                <RefreshCw />
              </AlertDialogMedia>
              <AlertDialogTitle>Create a new address?</AlertDialogTitle>
              <AlertDialogDescription>
                {currentAddress
                  ? `Your current inbox (${currentAddress}) will no longer be shown here, and any email sent to it will not appear. This cannot be undone.`
                  : "A new disposable inbox address will be created."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => void submit()}>Create address</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PopoverContent>
    </Popover>
  );
}
