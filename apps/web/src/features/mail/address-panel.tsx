/**
 * address-panel.tsx - panel alamat aktif di header sidebar.
 *
 * Menampilkan alamat inbox yang sedang aktif (mono, bisa disalin), plus popover
 * "buat alamat baru": input prefix opsional (kosong = acak) + pemilih domain.
 * Semua state datang dari useAddressStore; komponen ini hanya view + aksi.
 */

import { Check, ChevronDown, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
      toast.success("Alamat disalin");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Gagal menyalin alamat");
    }
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-card px-2 py-1.5">
      <span className="min-w-0 flex-1 truncate font-mono text-xs" title={address ?? undefined}>
        {address ?? "Belum ada alamat"}
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Salin alamat"
            disabled={!address}
            onClick={handleCopy}
          >
            {copied ? <Check className="text-green-600" /> : <Copy />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Salin</TooltipContent>
      </Tooltip>

      <NewAddressPopover domains={domains} generating={generating} onGenerate={generate} />
    </div>
  );
}

interface NewAddressPopoverProps {
  domains: string[];
  generating: boolean;
  onGenerate: (prefix?: string, domain?: string) => Promise<void>;
}

function NewAddressPopover({ domains, generating, onGenerate }: NewAddressPopoverProps) {
  const storedDomain = useAddressStore((s) => s.domain);
  const [open, setOpen] = useState(false);
  const [prefix, setPrefix] = useState("");
  const [domain, setDomain] = useState<string | undefined>(undefined);

  const activeDomain = domain ?? storedDomain ?? domains[0];

  async function submit() {
    await onGenerate(prefix.trim() || undefined, activeDomain);
    // Kalau generate gagal, error tampil via toast di store; tetap tutup popover
    // hanya bila berhasil (store mengosongkan error saat sukses).
    if (!useAddressStore.getState().error) {
      setPrefix("");
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label="Buat alamat baru">
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
            placeholder="acak jika kosong"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setPrefix(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !generating) void submit();
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs">Domain</Label>
          <Select value={activeDomain} onValueChange={setDomain} disabled={domains.length === 0}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="Pilih domain" />
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

        <Button
          className="mt-1 w-full"
          size="sm"
          disabled={generating}
          onClick={() => void submit()}
        >
          {generating ? <Spinner /> : <RefreshCw />}
          Buat alamat
        </Button>
      </PopoverContent>
    </Popover>
  );
}
