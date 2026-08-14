import { Inbox } from "lucide-react";
import { CommunityNav } from "@/components/layout/community-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_CONFIG } from "@/config/app-config";
import { cn } from "@/lib/utils";

import { AddressPanel } from "./address-panel";
import { useMailStore } from "./use-mail";

export function MailSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const mails = useMailStore((s) => s.mails);
  const selected = useMailStore((s) => s.selected);
  const select = useMailStore((s) => s.select);
  const loading = useMailStore((s) => s.loading);

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Inbox />
              <span className="font-semibold text-base">{APP_CONFIG.name}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {/* Panel alamat aktif - disembunyikan saat sidebar dilipat ke ikon. */}
        <div className="group-data-[collapsible=icon]:hidden">
          <AddressPanel />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:pointer-events-none">
            Inbox
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {loading ? (
                <InboxSkeleton />
              ) : mails.length === 0 ? (
                <EmptyInbox />
              ) : (
                mails.map((mail) => (
                  <SidebarMenuItem key={mail.id}>
                    <SidebarMenuButton
                      tooltip={`${mail.from.name} - ${mail.subject}`}
                      isActive={selected === mail.id}
                      onClick={() => select(mail.id)}
                      className="h-auto py-2"
                    >
                      <span className="flex size-4 shrink-0 items-center justify-center rounded-xs font-medium text-[10px] outline group-data-[collapsible=icon]:size-4">
                        {mail.from.name.slice(0, 1)}
                      </span>
                      <span className="grid min-w-0 flex-1 gap-0.5">
                        <span className={cn("truncate text-sm", !mail.isRead && "font-semibold")}>
                          {mail.from.name}
                        </span>
                        <span className="truncate text-muted-foreground text-xs">
                          {mail.subject}
                        </span>
                      </span>
                    </SidebarMenuButton>
                    {!mail.isRead && (
                      <SidebarMenuBadge className="top-2 text-blue-600">●</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <CommunityNav />
      </SidebarFooter>
    </Sidebar>
  );
}

/** Placeholder daftar saat inbox sedang dimuat. */
function InboxSkeleton() {
  return (
    <div className="flex flex-col gap-1 px-2 py-1 group-data-[collapsible=icon]:hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: placeholder statis, tak ada id
        <div key={i} className="flex flex-col gap-1.5 py-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
    </div>
  );
}

/** Keadaan kosong: alamat aktif belum menerima email apa pun. */
function EmptyInbox() {
  return (
    <div className="px-2 py-6 text-center text-muted-foreground text-xs group-data-[collapsible=icon]:hidden">
      Belum ada email. Email yang masuk ke alamat ini akan muncul di sini.
    </div>
  );
}
