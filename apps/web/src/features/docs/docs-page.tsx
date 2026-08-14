/**
 * docs-page.tsx - the JIMEL Worker API documentation page.
 *
 * A read-only page for developers/AI: the envelope contract, every endpoint with
 * a curl example + response, and a ready-to-paste prompt. Data lives in ./docs-data.
 */

import { ArrowLeft, Check, Copy } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { APP_CONFIG } from "@/config/app-config";
import { navigate } from "@/lib/navigation";
import { cn } from "@/lib/utils";

import {
  AI_PROMPT,
  ENDPOINTS,
  ENVELOPE_NOTE,
  type EndpointDoc,
  type HttpMethod,
} from "./docs-data";

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  POST: "bg-green-500/10 text-green-600 dark:text-green-400",
  DELETE: "bg-red-500/10 text-red-600 dark:text-red-400",
  WS: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

/** Small copy button that shows a checkmark briefly after copying. */
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable - ignore */
    }
  }
  return (
    <Button variant="ghost" size="xs" onClick={copy} className="gap-1">
      {copied ? <Check className="text-green-600" /> : <Copy />}
      {label ?? (copied ? "Copied" : "Copy")}
    </Button>
  );
}

/** A monospace code block with a copy button in the corner. */
function CodeBlock({ code }: { code: string }) {
  return (
    <div className="group relative">
      <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
        <CopyButton text={code} />
      </div>
      <pre className="scrollbar-none overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

function EndpointCard({ ep }: { ep: EndpointDoc }) {
  return (
    <section id={ep.id} className="scroll-mt-20 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={cn("font-mono text-[0.7rem]", METHOD_COLORS[ep.method])}>
          {ep.method}
        </Badge>
        <code className="font-mono text-sm">{ep.path}</code>
      </div>
      <h3 className="mt-3 font-heading font-semibold text-lg">{ep.title}</h3>
      <p className="mt-1 text-muted-foreground text-sm leading-relaxed">{ep.summary}</p>

      {ep.params?.length ? (
        <div className="mt-4">
          <p className="mb-2 font-medium text-xs uppercase tracking-wide">Parameters</p>
          <ul className="flex flex-col gap-1.5">
            {ep.params.map((p) => (
              <li key={p.name} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <code className="font-mono text-foreground">{p.name}</code>
                <span
                  className={cn(
                    "text-[0.7rem]",
                    p.required ? "text-red-600 dark:text-red-400" : "text-muted-foreground",
                  )}
                >
                  {p.required ? "required" : "optional"}
                </span>
                <span className="w-full text-muted-foreground text-xs sm:w-auto sm:flex-1">
                  {p.desc}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        <div>
          <p className="mb-1.5 font-medium text-xs uppercase tracking-wide">Example request</p>
          <CodeBlock code={ep.request} />
        </div>
        <div>
          <p className="mb-1.5 font-medium text-xs uppercase tracking-wide">Example response</p>
          <CodeBlock code={ep.response} />
        </div>
      </div>

      {ep.notes?.length ? (
        <ul className="mt-4 flex flex-col gap-1 border-t pt-3 text-muted-foreground text-xs">
          {ep.notes.map((n) => (
            <li key={n} className="flex gap-2">
              <span aria-hidden>•</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function DocsPage() {
  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate("/");
            }}
            className="inline-flex items-center gap-1.5 text-sm hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to inbox
          </a>
          <span className="font-heading font-semibold">{APP_CONFIG.name} API</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="font-heading font-bold text-3xl tracking-tight">API documentation</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground leading-relaxed">
          REST + WebSocket for disposable email. No authentication, no API key - just call the
          endpoints below. Replace{" "}
          <code className="font-mono text-foreground text-sm">YOUR_WORKER_URL</code> with your
          Worker domain.
        </p>

        {/* Envelope */}
        <section className="mt-8 rounded-xl border bg-card p-5">
          <h2 className="font-heading font-semibold text-lg">Response format</h2>
          <CodeBlockNote text={ENVELOPE_NOTE} />
        </section>

        {/* Quick endpoint list */}
        <nav className="mt-8 flex flex-wrap gap-2">
          {ENDPOINTS.map((ep) => (
            <a
              key={ep.id}
              href={`#${ep.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors hover:bg-muted"
            >
              <Badge className={cn("font-mono text-[0.65rem]", METHOD_COLORS[ep.method])}>
                {ep.method}
              </Badge>
              <code className="font-mono">{ep.path}</code>
            </a>
          ))}
        </nav>

        <Separator className="my-8" />

        <div className="flex flex-col gap-6">
          {ENDPOINTS.map((ep) => (
            <EndpointCard key={ep.id} ep={ep} />
          ))}
        </div>

        {/* AI prompt */}
        <section className="mt-10 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-heading font-semibold text-lg">Quick integration via AI</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Paste this prompt into an AI so it immediately understands how to use the JIMEL API.
              </p>
            </div>
            <CopyButton text={AI_PROMPT} label="Copy prompt" />
          </div>
          <div className="mt-3">
            <CodeBlock code={AI_PROMPT} />
          </div>
        </section>
      </main>
    </div>
  );
}

/** Multi-line note text (not code) - used for the envelope explanation. */
function CodeBlockNote({ text }: { text: string }) {
  return (
    <pre className="mt-3 whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed">
      {text}
    </pre>
  );
}
