import { format } from "date-fns/format";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import type { Mail } from "./types";
import { useMailStore } from "./use-mail";

interface MailDisplayProps {
  mail: Mail | null;
  onClose?: () => void;
}

export function MailView({ mail, onClose }: MailDisplayProps) {
  const select = useMailStore((s) => s.select);
  const remove = useMailStore((s) => s.remove);
  const loadingBody = useMailStore((s) => s.loadingBody);

  function handleClose() {
    select(null);
    onClose?.();
  }

  function handleDelete() {
    if (!mail) return;
    remove(mail.id);
    toast.success("Email deleted");
    onClose?.();
  }

  if (!mail) {
    return (
      <div className="grid h-full place-items-center">
        <Empty className="border-none">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox />
            </EmptyMedia>
            <EmptyTitle>No email selected</EmptyTitle>
            <EmptyDescription>
              Pick an email from the list to view its contents here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Close message"
                onClick={handleClose}
              >
                <X />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Close</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="mx-1 h-4 data-vertical:self-center" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Previous message">
                <ChevronLeft />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Next message">
                <ChevronRight />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Move to trash"
                onClick={handleDelete}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Separator />

      {/* Email body - centered, comfortable reading width */}
      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto">
        <article className="mx-auto w-full max-w-2xl px-1 py-6">
          <h1 className="text-balance font-heading font-semibold text-xl leading-snug">
            {mail.subject}
          </h1>

          <div className="mt-4 flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarFallback className="bg-primary/10 font-medium text-primary text-sm">
                {mail.from.name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-sm">{mail.from.name}</span>
                <time className="shrink-0 text-muted-foreground text-xs">
                  {format(new Date(mail.receivedAt), "d MMM yyyy, HH:mm")}
                </time>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                <span className="truncate">to {mail.to.map((r) => r.name).join(", ")}</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="size-4 rounded-sm text-muted-foreground hover:text-foreground"
                      aria-label="View sender details"
                    >
                      <ChevronDown />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-96 p-0 text-xs">
                    <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1.5 p-3">
                      <DetailRow label="from" value={`${mail.from.name} <${mail.from.email}>`} />
                      {mail.replyTo ? <DetailRow label="reply to" value={mail.replyTo} /> : null}
                      <DetailRow label="to" value={mail.to.map((r) => r.email).join(", ")} />
                      <DetailRow
                        label="date"
                        value={format(new Date(mail.receivedAt), "d MMM yyyy, HH.mm")}
                      />
                      <DetailRow label="subject" value={mail.subject} />
                      {mail.mailedBy ? <DetailRow label="mailed by" value={mail.mailedBy} /> : null}
                      {mail.signedBy ? <DetailRow label="signed by" value={mail.signedBy} /> : null}
                      <dt className="text-muted-foreground">security</dt>
                      <dd className="flex items-center gap-1 text-foreground">
                        <ShieldCheck className="size-3.5 text-green-600" />
                        Standard encryption (TLS)
                      </dd>
                    </dl>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {mail.body !== undefined ? (
            <div className="whitespace-pre-wrap text-[0.9375rem] text-foreground/90 leading-7">
              {mail.body}
            </div>
          ) : loadingBody === mail.id ? (
            <div className="flex items-center gap-2 py-6 text-muted-foreground text-sm">
              <Spinner />
              Loading the email…
            </div>
          ) : (
            <div className="py-6 text-muted-foreground text-sm">Email body unavailable.</div>
          )}
        </article>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="wrap-break-word text-foreground">{value}</dd>
    </>
  );
}
