/**
 * use-inbox-sync.ts - keep the inbox current for the active address.
 *
 * Two layers, matching the Worker design:
 *  1) WebSocket /ws/{address} - realtime push when an email arrives (primary).
 *  2) REST polling /inbox every few seconds - fallback if the WS fails/closes,
 *     and a safety net in case a push is missed.
 *
 * This hook is pure side-effect (renders nothing): it calls loadInbox when the
 * address changes, then addHeader for each new email that arrives.
 */

import type { WsMessage } from "@jimel/shared";
import { useEffect } from "react";
import { fetchInbox } from "@/lib/api";
import { useMailStore } from "./use-mail";

const POLL_INTERVAL_MS = 8000;
const WS_PING_INTERVAL_MS = 30000;

/** Build an absolute WebSocket URL from a relative path (uses the current host + scheme). */
function wsUrl(address: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws/${encodeURIComponent(address)}`;
}

export function useInboxSync(address: string | null): void {
  const loadInbox = useMailStore((s) => s.loadInbox);
  const addHeader = useMailStore((s) => s.addHeader);

  useEffect(() => {
    if (!address) {
      useMailStore.getState().reset();
      return;
    }

    let disposed = false;
    let socket: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    // Initial load.
    void loadInbox(address);

    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(async () => {
        try {
          const inbox = await fetchInbox(address);
          if (disposed) return;
          for (const header of inbox.emails) addHeader(header);
        } catch {
          /* one failed poll is not fatal; the next attempt runs again */
        }
      }, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    try {
      socket = new WebSocket(wsUrl(address));

      socket.onmessage = (event) => {
        let msg: WsMessage;
        try {
          msg = JSON.parse(event.data) as WsMessage;
        } catch {
          return;
        }
        // "ready" = WS is live -> stop polling, rely on push alone.
        if (msg.type === "ready") {
          stopPolling();
        } else if (msg.type === "email") {
          addHeader(msg.email);
        }
      };

      // Keep-alive: the server replies "pong" (see InboxRoom.webSocketMessage).
      pingTimer = setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) socket.send("ping");
      }, WS_PING_INTERVAL_MS);

      // WS failed / closed -> fall back to polling.
      socket.onerror = () => startPolling();
      socket.onclose = () => startPolling();
    } catch {
      // The browser could not open a WS at all -> poll immediately.
      startPolling();
    }

    return () => {
      disposed = true;
      stopPolling();
      if (pingTimer) clearInterval(pingTimer);
      if (socket) {
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        try {
          socket.close();
        } catch {
          /* already closed */
        }
      }
    };
  }, [address, loadInbox, addHeader]);
}
