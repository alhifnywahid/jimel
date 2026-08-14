/**
 * inbox-room.ts - per-address Durable Object for realtime push.
 *
 * One DO = one inbox address. An open tab connects a WebSocket to
 * `/ws/{address}` -> the Worker routes it to the DO `idFromName(address)`.
 * When an email arrives, the `email()` handler calls this DO (`/notify`) and the
 * DO broadcasts the email header to every connected socket.
 *
 * Uses WebSocket Hibernation: `acceptWebSocket()` + the `webSocketMessage`/
 * `webSocketClose` handlers. An idle socket does not keep the DO alive (it is not
 * billed), yet still receives messages as soon as an email lands - which is why we
 * chose a DO over constant polling.
 */

import type { EmailHeader, WsMessage } from "@jimel/shared";

export class InboxRoom {
  private readonly ctx: DurableObjectState;

  constructor(ctx: DurableObjectState, _env: unknown) {
    this.ctx = ctx;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // Internal broadcast from the Worker: a new email arrived for this address.
    if (url.pathname === "/notify" && req.method === "POST") {
      const email = (await req.json()) as EmailHeader;
      this.broadcast({ type: "email", email });
      return new Response(null, { status: 204 });
    }

    // WebSocket upgrade from a tab that opened the inbox.
    if (url.pathname === "/connect") {
      if (req.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected websocket", { status: 426 });
      }
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];
      // Hibernation: the server-side socket is managed by the runtime, not a closure.
      this.ctx.acceptWebSocket(server);
      // Send "ready" immediately so the client knows the WS is live (it may only
      // stop the polling fallback after receiving this).
      server.send(JSON.stringify({ type: "ready" } satisfies WsMessage));
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Not found", { status: 404 });
  }

  /** The client only sends "ping" for keep-alive; reply "pong". */
  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    if (typeof message === "string" && message === "ping") {
      ws.send(JSON.stringify({ type: "pong" } satisfies WsMessage));
    }
  }

  webSocketClose(ws: WebSocket, code: number, _reason: string, _wasClean: boolean): void {
    // 1000/1001 = normal; the runtime already cleaned up the socket. Close
    // explicitly for other codes so nothing dangles.
    try {
      ws.close(code === 1006 ? 1000 : code);
    } catch {
      /* already closed */
    }
  }

  webSocketError(_ws: WebSocket, _error: unknown): void {
    /* the runtime cleans up; there is no per-socket state to tidy */
  }

  /** Send to every socket currently connected to this address. */
  private broadcast(msg: WsMessage): void {
    const payload = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
        /* dead socket; ignore */
      }
    }
  }
}
