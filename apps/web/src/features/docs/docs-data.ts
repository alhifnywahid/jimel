/**
 * docs-data.ts - content source for the JIMEL Worker API docs.
 *
 * Split from the component so the documentation (endpoints, examples) is easy to
 * maintain in one place, and the component just renders it (Clean Code: data
 * separated from presentation).
 */

export type HttpMethod = "GET" | "POST" | "DELETE" | "WS";

export interface ParamDoc {
  name: string;
  required: boolean;
  desc: string;
}

export interface EndpointDoc {
  id: string;
  method: HttpMethod;
  path: string;
  title: string;
  summary: string;
  params?: ParamDoc[];
  /** Example curl command (or WS note). */
  request: string;
  /** Example successful JSON response. */
  response: string;
  notes?: string[];
}

/** The envelope contract used by ALL REST endpoints. */
export const ENVELOPE_NOTE = `Every REST response is wrapped in a uniform "envelope":

  Success : { "success": true,  "data": <result> }
  Failure : { "success": false, "error": "<message>" }

Check "success" before reading "data". All timestamps = epoch SECONDS
(not milliseconds), and fields on the email object use snake_case.`;

export const ENDPOINTS: EndpointDoc[] = [
  {
    id: "domains",
    method: "GET",
    path: "/api/domains",
    title: "Get the domain list",
    summary:
      "The active domains whose catch-all is already pointed at this Worker. First domain = default. Use this to fill the domain picker before creating an address.",
    request: `curl -s https://YOUR_WORKER_URL/api/domains`,
    response: `{
  "success": true,
  "data": ["jimel.email", "mail2.io"]
}`,
  },
  {
    id: "generate",
    method: "POST",
    path: "/api/address/generate",
    title: "Create or open an address",
    summary:
      "Claim an inbox address, or open it if it already exists - the call is idempotent, so several browsers or devices can use the same inbox. Send a prefix of your choice, or a random prefix you generate yourself. domain is optional - if empty the default domain is used. The address is valid until expiresAt.",
    params: [
      {
        name: "prefix",
        required: true,
        desc: "The part before @. 1-64 alphanumeric characters (a-z, 0-9).",
      },
      {
        name: "domain",
        required: false,
        desc: "One of /api/domains. Empty = the default domain (the first one).",
      },
      {
        name: "exclusive",
        required: false,
        desc: "true = demand an address that is not claimed yet; replies 409 if it exists. Use it for throwaway addresses so a collision does not open somebody else's inbox.",
      },
    ],
    request: `curl -s -X POST https://YOUR_WORKER_URL/api/address/generate \\
  -H "Content-Type: application/json" \\
  -d '{ "prefix": "shopping01", "domain": "jimel.email" }'`,
    response: `{
  "success": true,
  "data": {
    "id": "shopping01@jimel.email",
    "address": "shopping01@jimel.email",
    "domain": "jimel.email",
    "createdAt": 1786649171,
    "expiresAt": 1786652771,
    "created": true
  }
}`,
    notes: [
      "created: true = the address was just created. false = it already existed and was opened; you get its ORIGINAL createdAt/expiresAt, because opening an inbox does not extend its lifetime.",
      "Calling it again with the same prefix is safe and returns the same inbox - that is how you reopen an address on another device.",
      "409 only when you send exclusive: true and the address already exists - re-roll the prefix and try again.",
      "400 if the prefix is invalid or the domain is unknown.",
      "For a RANDOM address: generate a random string yourself (e.g. 12 letters/digits) as the prefix, there is no dedicated endpoint.",
    ],
  },
  {
    id: "inbox",
    method: "GET",
    path: "/api/inbox/{address}",
    title: "Get the email list (inbox)",
    summary:
      "Headers of all emails on one address, newest first. The body is NOT included here (lightweight) - fetch it per email via the detail endpoint.",
    params: [
      {
        name: "address",
        required: true,
        desc: "The full address, e.g. shopping01@jimel.email (in the URL path).",
      },
    ],
    request: `curl -s https://YOUR_WORKER_URL/api/inbox/shopping01@jimel.email`,
    response: `{
  "success": true,
  "data": {
    "address": "shopping01@jimel.email",
    "expiresAt": 1786652771,
    "emails": [
      {
        "id": "0f54064f-bdb3-4c51-ba48-8667e6840329",
        "sender": "noreply@github.com",
        "sender_name": "GitHub",
        "subject": "[GitHub] Your launch code",
        "received_at": 1786649211,
        "is_read": false
      }
    ]
  }
}`,
    notes: ["404 if the address was never created - treat it as an empty inbox."],
  },
  {
    id: "email",
    method: "GET",
    path: "/api/email/{id}",
    title: "Get email detail",
    summary:
      "The full contents of one email including body_text and body_html. Calling this automatically marks the email as read (is_read = true).",
    params: [
      {
        name: "id",
        required: true,
        desc: "The email id from the inbox list (in the URL path).",
      },
    ],
    request: `curl -s https://YOUR_WORKER_URL/api/email/0f54064f-bdb3-4c51-ba48-8667e6840329`,
    response: `{
  "success": true,
  "data": {
    "id": "0f54064f-bdb3-4c51-ba48-8667e6840329",
    "address": "shopping01@jimel.email",
    "sender": "noreply@github.com",
    "sender_name": "GitHub",
    "subject": "[GitHub] Your launch code",
    "body_text": "Your code is 72150777",
    "body_html": "",
    "received_at": 1786649211,
    "is_read": true
  }
}`,
    notes: ["404 if the email does not exist / already expired and was deleted."],
  },
  {
    id: "delete",
    method: "DELETE",
    path: "/api/email/{id}",
    title: "Delete an email",
    summary:
      "Delete one email from the inbox. Idempotent: still replies deleted:true even when the email is already gone.",
    params: [
      {
        name: "id",
        required: true,
        desc: "The id of the email to delete (in the URL path).",
      },
    ],
    request: `curl -s -X DELETE https://YOUR_WORKER_URL/api/email/0f54064f-bdb3-4c51-ba48-8667e6840329`,
    response: `{
  "success": true,
  "data": { "deleted": true }
}`,
  },
  {
    id: "ws",
    method: "WS",
    path: "/ws/{address}",
    title: "Realtime notifications (WebSocket)",
    summary:
      "Open a WebSocket to receive new emails in realtime without polling. The server sends {type:'ready'} when it is ready, then {type:'email', email:{...header}} for each incoming email. Send 'ping' for keep-alive (answered with {type:'pong'}).",
    params: [
      {
        name: "address",
        required: true,
        desc: "The address to watch (in the URL path).",
      },
    ],
    request: `// Browser / Node (ws)
const ws = new WebSocket("wss://YOUR_WORKER_URL/ws/shopping01@jimel.email");
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === "email") console.log("New email:", msg.email.subject);
};`,
    response: `{ "type": "ready" }
{ "type": "email", "email": { "id": "...", "sender": "...", "subject": "...", "received_at": 1786649211, "is_read": false } }`,
    notes: ["If the WS fails/closes, just poll GET /api/inbox every few seconds as a fallback."],
  },
];

/** A ready-to-paste prompt so another AI can integrate this API directly. */
export const AI_PROMPT = `You are connected to a tempmail API (disposable email). Base URL: https://YOUR_WORKER_URL
Every response is an envelope: {"success":true,"data":...} or {"success":false,"error":"..."}.
Time = epoch seconds. No authentication.

Endpoints:
- GET  /api/domains                 -> string[] active domains (first = default)
- POST /api/address/generate        -> body {prefix, domain?, exclusive?}; replies {address, expiresAt, created, ...}
                                      Idempotent: an existing address is OPENED (created:false) with its original
                                      expiresAt, so the same inbox works from several clients. Send exclusive:true
                                      to demand an unclaimed address instead (409 if it exists) - use that for
                                      throwaway addresses with a random prefix, and re-roll on 409.
- GET  /api/inbox/{address}         -> {address, expiresAt, emails:[{id,sender,sender_name,subject,received_at,is_read}]}
- GET  /api/email/{id}              -> full email incl. body_text/body_html (marks it read)
- DELETE /api/email/{id}            -> {deleted:true}

Typical flow: get /api/domains -> create an address via /api/address/generate (random prefix if needed) ->
poll /api/inbox/{address} until the target email arrives -> get /api/email/{id} to read the code/contents.`;
