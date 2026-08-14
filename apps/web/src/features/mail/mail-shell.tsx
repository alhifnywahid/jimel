import { FileText } from "lucide-react";
import type * as React from "react";
import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";

import { AccountSwitcher } from "@/components/layout/account-switcher";
import { GitHubRepositoriesMenu } from "@/components/layout/github-repositories-menu";
import { LayoutControls } from "@/components/layout/layout-controls";
import { SearchDialog } from "@/components/layout/search-dialog";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { users } from "@/data/users";
import { navigate } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { MailSidebar } from "./mail-sidebar";
import { MailView } from "./mail-view";
import { SoundToggle } from "./sound-toggle";
import { useAddressStore } from "./use-address";
import { useInboxSync } from "./use-inbox-sync";
import { useMailStore } from "./use-mail";

export function MailShell() {
  const { sidebarVariant, sidebarCollapsible } = usePreferencesStore(
    useShallow((s) => ({
      sidebarVariant: s.values.sidebar_variant,
      sidebarCollapsible: s.values.sidebar_collapsible,
    })),
  );

  const address = useAddressStore((s) => s.address);
  const loadDomains = useAddressStore((s) => s.loadDomains);
  const generate = useAddressStore((s) => s.generate);

  // Boot: load the domain list; if there is no saved address yet, claim a new one.
  useEffect(() => {
    void loadDomains().then(() => {
      if (!useAddressStore.getState().address) void generate();
    });
  }, [loadDomains, generate]);

  // Keep the inbox in sync (initial fetch + WebSocket/polling) following the active address.
  useInboxSync(address);

  const selectedId = useMailStore((s) => s.selected);
  const mails = useMailStore((s) => s.mails);
  const selectedMail = mails.find((item) => item.id === selectedId) ?? null;

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 68)",
        } as React.CSSProperties
      }
    >
      <MailSidebar variant={sidebarVariant} collapsible={sidebarCollapsible} />
      <SidebarInset
        className={cn(
          "[html[data-content-layout=centered]_&>*]:mx-auto",
          "[html[data-content-layout=centered]_&>*]:w-full",
          "[html[data-content-layout=centered]_&>*]:max-w-screen-2xl",
          "peer-data-[variant=inset]:border",
          "[--dashboard-header-height:--spacing(12)]",
          "min-w-0 overflow-x-clip",
        )}
      >
        {/* Header copied verbatim from the dashboard - nothing removed. */}
        <header
          className={cn(
            "flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
            "[html[data-navbar-style=sticky]_&]:sticky [html[data-navbar-style=sticky]_&]:top-0 [html[data-navbar-style=sticky]_&]:z-50 [html[data-navbar-style=sticky]_&]:overflow-hidden [html[data-navbar-style=sticky]_&]:rounded-t-[inherit] [html[data-navbar-style=sticky]_&]:bg-background/50 [html[data-navbar-style=sticky]_&]:backdrop-blur-md",
          )}
        >
          <div className="flex w-full items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-1 lg:gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
              />
              <SearchDialog />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/docs")}
                className="text-muted-foreground"
              >
                <FileText />
                <span className="hidden sm:inline">Docs</span>
              </Button>
              <LayoutControls />
              <ThemeSwitcher />
              <SoundToggle />
              <GitHubRepositoriesMenu />
              <AccountSwitcher users={users} />
            </div>
          </div>
        </header>
        {/* Dashboard content area = the selected email body. */}
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">
          <MailView mail={selectedMail} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
