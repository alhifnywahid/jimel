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
import { useCallback, useRef, useState } from "react";
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
  const mails = useMailStore((s) => s.mails);

  // Position of the open email in the list, so Prev/Next can walk the inbox.
  const index = mail ? mails.findIndex((m) => m.id === mail.id) : -1;
  const prevMail = index > 0 ? mails[index - 1] : undefined;
  const nextMail = index >= 0 && index < mails.length - 1 ? mails[index + 1] : undefined;

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
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Previous message"
                disabled={!prevMail}
                onClick={() => prevMail && void select(prevMail.id)}
              >
                <ChevronLeft />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Next message"
                disabled={!nextMail}
                onClick={() => nextMail && void select(nextMail.id)}
              >
                <ChevronRight />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1">
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Delete email">
                    <Trash2 className="text-destructive" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogMedia>
                  <Trash2 className="text-destructive" />
                </AlertDialogMedia>
                <AlertDialogTitle>Delete this email?</AlertDialogTitle>
                <AlertDialogDescription>
                  "{mail.subject}" will be permanently removed from this inbox. This cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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

          {mail.bodyHtml !== undefined ? (
            <HtmlBody html={mail.bodyHtml} />
          ) : mail.body !== undefined ? (
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

/**
 * Render the provider's original HTML email faithfully, isolated in a sandboxed
 * iframe. The sandbox allows same-origin (so we can measure the content height and
 * remove the inner scrollbar) but NOT allow-scripts, so email markup still cannot
 * run any JavaScript. The iframe grows to fit its content, images included.
 */
function HtmlBody({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(240);

  const measure = useCallback(() => {
    const doc = ref.current?.contentDocument;
    if (!doc?.body) return;
    // Real content height; +2 avoids a 1px rounding scrollbar.
    const h = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight);
    if (h > 0) setHeight(h + 2);
  }, []);

  // Re-measure after load, after late-loading images, and on any reflow.
  const handleLoad = useCallback(() => {
    measure();
    const doc = ref.current?.contentDocument;
    if (!doc) return;
    for (const img of Array.from(doc.images)) {
      if (!img.complete) img.addEventListener("load", measure, { once: true });
    }
    // A few delayed passes catch fonts/images that settle after first paint.
    window.setTimeout(measure, 150);
    window.setTimeout(measure, 600);
  }, [measure]);

  // A minimal wrapper: force readable defaults and let images scale.
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8">
<base target="_blank">
<style>
  html,body{margin:0;padding:0;background:#fff;color:#111;
    font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    word-break:break-word;overflow-wrap:break-word;-webkit-text-size-adjust:100%;}
  body{padding:4px 2px;overflow:hidden;}
  img,video{max-width:100%!important;height:auto;}
  table{max-width:100%!important;}
  a{color:#2563eb;}
</style></head><body>${html}</body></html>`;

  return (
    <iframe
      ref={ref}
      title="Email content"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={srcDoc}
      onLoad={handleLoad}
      scrolling="no"
      className="w-full rounded-md border bg-white"
      style={{ height }}
    />
  );
}
