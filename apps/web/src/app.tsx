import { useSyncExternalStore } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DocsPage } from "@/features/docs/docs-page";
import { MailShell } from "@/features/mail/mail-shell";
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";

/**
 * Router minimal berbasis History API - JIMEL cuma punya 2 halaman (inbox &
 * /docs), jadi tak perlu react-router. subscribe ke "popstate" + patch
 * pushState via helper navigate() di lib/navigation.
 */
function usePathname(): string {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("popstate", cb);
      window.addEventListener("jimel:navigate", cb);
      return () => {
        window.removeEventListener("popstate", cb);
        window.removeEventListener("jimel:navigate", cb);
      };
    },
    () => window.location.pathname,
  );
}

export function App() {
  const pathname = usePathname();
  const isDocs = pathname.startsWith("/docs");

  return (
    <PreferencesStoreProvider initialValues={PREFERENCE_DEFAULTS}>
      <TooltipProvider>
        {isDocs ? <DocsPage /> : <MailShell />}
        <Toaster />
      </TooltipProvider>
    </PreferencesStoreProvider>
  );
}
