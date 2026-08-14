/**
 * use-inbox-sync.ts - jaga inbox tetap mutakhir untuk alamat aktif.
 *
 * Dua lapis, sesuai desain Worker:
 *  1) WebSocket /ws/{address} - push realtime saat email masuk (utama).
 *  2) Polling REST /inbox tiap beberapa detik - fallback kalau WS gagal/tertutup,
 *     dan sebagai jaring pengaman kalau ada push yang terlewat.
 *
 * Hook ini murni efek samping (tidak me-render apa-apa): memanggil loadInbox saat
 * alamat berganti, lalu addHeader tiap email baru tiba.
 */

import type { WsMessage } from "@jimel/shared";
import { useEffect } from "react";
import { fetchInbox } from "@/lib/api";
import { useMailStore } from "./use-mail";

const POLL_INTERVAL_MS = 8000;
const WS_PING_INTERVAL_MS = 30000;

/** Bangun URL WebSocket absolut dari path relatif (ikut host + skema saat ini). */
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

    // Muat awal.
    void loadInbox(address);

    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(async () => {
        try {
          const inbox = await fetchInbox(address);
          if (disposed) return;
          for (const header of inbox.emails) addHeader(header);
        } catch {
          /* sekali gagal poll tidak fatal; percobaan berikutnya jalan lagi */
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
        // "ready" = WS hidup → matikan polling, cukup andalkan push.
        if (msg.type === "ready") {
          stopPolling();
        } else if (msg.type === "email") {
          addHeader(msg.email);
        }
      };

      // Keep-alive: server balas "pong" (lihat InboxRoom.webSocketMessage).
      pingTimer = setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) socket.send("ping");
      }, WS_PING_INTERVAL_MS);

      // WS gagal / tertutup → jatuh ke polling.
      socket.onerror = () => startPolling();
      socket.onclose = () => startPolling();
    } catch {
      // Browser gagal buka WS sama sekali → langsung polling.
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
          /* sudah tertutup */
        }
      }
    };
  }, [address, loadInbox, addHeader]);
}
