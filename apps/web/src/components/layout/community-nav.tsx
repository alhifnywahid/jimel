import { ExternalLink, MessagesSquare } from "lucide-react";
import { siTelegram, siWhatsapp } from "simple-icons";

import { SimpleIcon } from "@/components/simple-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

/**
 * community-nav.tsx - sidebar footer slot (replaces the profile).
 *
 * A "Community" button that reveals a list of community links when clicked.
 * REPLACE the URLs below with your real links (look for the REPLACE-URL marker).
 */
const COMMUNITY_LINKS = [
  // REPLACE-URL: Telegram channel (one-way announcements)
  { label: "Telegram Channel", href: "#", icon: siTelegram },
  // REPLACE-URL: Telegram discussion group
  { label: "Telegram Group", href: "#", icon: siTelegram },
  // REPLACE-URL: WhatsApp channel/number
  { label: "WhatsApp", href: "#", icon: siWhatsapp },
  // REPLACE-URL: WhatsApp group
  { label: "WhatsApp Group", href: "#", icon: siWhatsapp },
] as const;

export function CommunityNav() {
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessagesSquare className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Community</span>
                <span className="truncate text-muted-foreground text-xs">Join & discuss</span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              JIMEL Community
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {COMMUNITY_LINKS.map((link) => (
              <DropdownMenuItem key={link.label} asChild>
                <a href={link.href} target="_blank" rel="noreferrer" className="gap-2">
                  <SimpleIcon icon={link.icon} aria-hidden className="size-4 fill-current" />
                  <span className="flex-1">{link.label}</span>
                  <ExternalLink className="size-3.5 text-muted-foreground" />
                </a>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
