/**
 * use-mail.ts - active inbox store (Zustand). REAL data from the Worker.
 *
 * Flow: loadInbox(address) fetches headers -> select(id) fetches the full body (lazy,
 * and the server marks is_read) -> remove(id) deletes on the server. addHeader() is
 * called when a new email arrives (WebSocket push or a polling result) - dedup by id.
 *
 * The store holds Mail view-models (see ./types), not server DTOs.
 */

import type { EmailHeader } from "@jimel/shared";
import { create } from "zustand";
import { deleteEmail, fetchEmail, fetchInbox } from "@/lib/api";
import { headerToMail, type Mail, withBody } from "./types";

type MailState = {
  mails: Mail[];
  selected: Mail["id"] | null;
  /** true while loading the inbox list (address switch / refresh). */
  loading: boolean;
  /** id of the email whose body is being fetched (for the detail spinner). */
  loadingBody: Mail["id"] | null;
  error: string | null;
  /** The inbox address currently shown (used to map the "to" field). */
  address: string | null;

  loadInbox: (address: string) => Promise<void>;
  select: (id: Mail["id"] | null) => Promise<void>;
  remove: (id: Mail["id"]) => Promise<void>;
  /** Add a new email header (from WS/polling) at the very top. */
  addHeader: (header: EmailHeader) => void;
  reset: () => void;
};

export const useMailStore = create<MailState>((set, get) => ({
  mails: [],
  selected: null,
  loading: false,
  loadingBody: null,
  error: null,
  address: null,

  loadInbox: async (address) => {
    set({ loading: true, error: null, address });
    try {
      const inbox = await fetchInbox(address);
      // Ignore the result if the address changed during the fetch (race).
      if (get().address !== address) return;
      const mails = inbox.emails.map((h) => headerToMail(h, address));
      set({ mails, loading: false, selected: null });
    } catch (error) {
      if (get().address !== address) return;
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load the inbox.",
      });
    }
  },

  select: async (id) => {
    if (id === null) {
      set({ selected: null });
      return;
    }
    set({ selected: id });

    const existing = get().mails.find((m) => m.id === id);
    // Body already loaded -> just mark it read locally, no need to fetch again.
    if (existing?.body !== undefined) {
      set((s) => ({ mails: s.mails.map((m) => (m.id === id ? { ...m, isRead: true } : m)) }));
      return;
    }

    set({ loadingBody: id });
    try {
      const full = await fetchEmail(id);
      set((s) => ({
        loadingBody: s.loadingBody === id ? null : s.loadingBody,
        mails: s.mails.map((m) => (m.id === id ? withBody(m, full) : m)),
      }));
    } catch (error) {
      set((s) => ({
        loadingBody: s.loadingBody === id ? null : s.loadingBody,
        error: error instanceof Error ? error.message : "Failed to load the email body.",
      }));
    }
  },

  remove: async (id) => {
    // Optimistic: drop it from the list first, reselect the top email.
    const prev = get().mails;
    const remaining = prev.filter((m) => m.id !== id);
    const selected = get().selected === id ? (remaining[0]?.id ?? null) : get().selected;
    set({ mails: remaining, selected });
    try {
      await deleteEmail(id);
    } catch (error) {
      // Delete failed on the server -> restore the original list.
      set({
        mails: prev,
        error: error instanceof Error ? error.message : "Failed to delete the email.",
      });
    }
  },

  addHeader: (header) => {
    const address = get().address;
    if (!address) return;
    set((s) => {
      if (s.mails.some((m) => m.id === header.id)) return s;
      return { mails: [headerToMail(header, address), ...s.mails] };
    });
  },

  reset: () => set({ mails: [], selected: null, loadingBody: null, error: null }),
}));
