/**
 * inbox-room.ts - Durable Object per-alamat untuk realtime push.
 *
 * Satu DO = satu alamat inbox. Tab yang terbuka konek WebSocket ke
 * `/ws/{address}` → Worker mengarahkan ke DO `idFromName(address)`.
 * Saat email masuk, `email()` handler memanggil DO ini (`/notify`) dan DO
 * mem-broadcast header email ke semua socket yang sedang konek.
 *
 * Pakai WebSocket Hibernation: `acceptWebSocket()` + handler `webSocketMessage`/
 * `webSocketClose`. Socket yang idle tidak menahan DO tetap hidup (tidak
 * ditagih), tapi tetap menerima pesan begitu ada email - inilah alasan pilih DO
 * dibanding polling terus-menerus.
 */

import type { EmailHeader, WsMessage } from "@jimel/shared";

export class InboxRoom {
  private readonly ctx: DurableObjectState;

  constructor(ctx: DurableObjectState, _env: unknown) {
    this.ctx = ctx;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // Broadcast internal dari Worker: email baru masuk untuk alamat ini.
    if (url.pathname === "/notify" && req.method === "POST") {
      const email = (await req.json()) as EmailHeader;
      this.broadcast({ type: "email", email });
      return new Response(null, { status: 204 });
    }

    // Upgrade WebSocket dari tab yang membuka inbox.
    if (url.pathname === "/connect") {
      if (req.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected websocket", { status: 426 });
      }
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];
      // Hibernation: server-side socket dikelola runtime, bukan closure.
      this.ctx.acceptWebSocket(server);
      // Kirim "ready" segera supaya klien tahu WS hidup (baru boleh berhenti
      // fallback polling setelah terima ini).
      server.send(JSON.stringify({ type: "ready" } satisfies WsMessage));
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Not found", { status: 404 });
  }

  /** Klien hanya mengirim "ping" untuk keep-alive; balas "pong". */
  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    if (typeof message === "string" && message === "ping") {
      ws.send(JSON.stringify({ type: "pong" } satisfies WsMessage));
    }
  }

  webSocketClose(ws: WebSocket, code: number, _reason: string, _wasClean: boolean): void {
    // 1000/1001 = normal; runtime sudah membersihkan socket. Tutup eksplisit
    // untuk kode selain itu agar tidak menggantung.
    try {
      ws.close(code === 1006 ? 1000 : code);
    } catch {
      /* sudah tertutup */
    }
  }

  webSocketError(_ws: WebSocket, _error: unknown): void {
    /* runtime membersihkan; tidak ada state per-socket yang perlu dibereskan */
  }

  /** Kirim ke semua socket yang sedang konek ke alamat ini. */
  private broadcast(msg: WsMessage): void {
    const payload = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
        /* socket mati; abaikan */
      }
    }
  }
}
