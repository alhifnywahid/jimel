/**
 * use-mail.ts - store inbox aktif (Zustand). Data ASLI dari Worker.
 *
 * Alur: loadInbox(address) ambil header → select(id) ambil isi penuh (lazy, dan
 * server menandai is_read) → remove(id) hapus di server. addHeader() dipanggil
 * saat email baru masuk (push WebSocket atau hasil polling) - anti-duplikat by id.
 *
 * Store menyimpan view-model Mail (lihat ./types), bukan DTO server.
 */

import type { EmailHeader } from "@jimel/shared";
import { create } from "zustand";
import { deleteEmail, fetchEmail, fetchInbox } from "@/lib/api";
import { headerToMail, type Mail, withBody } from "./types";

type MailState = {
  mails: Mail[];
  selected: Mail["id"] | null;
  /** true saat memuat daftar inbox (ganti alamat / refresh). */
  loading: boolean;
  /** id email yang isinya sedang diambil (untuk spinner di detail). */
  loadingBody: Mail["id"] | null;
  error: string | null;
  /** Alamat inbox yang sedang ditampilkan (untuk memetakan "kepada"). */
  address: string | null;

  loadInbox: (address: string) => Promise<void>;
  select: (id: Mail["id"] | null) => Promise<void>;
  remove: (id: Mail["id"]) => Promise<void>;
  /** Tambah header email baru (dari WS/polling) di paling atas. */
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
      // Abaikan hasil kalau alamat sudah berganti selama fetch (race).
      if (get().address !== address) return;
      const mails = inbox.emails.map((h) => headerToMail(h, address));
      set({ mails, loading: false, selected: null });
    } catch (error) {
      if (get().address !== address) return;
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Gagal memuat inbox.",
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
    // Body sudah ada → cukup tandai terbaca lokal, tak perlu fetch lagi.
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
        error: error instanceof Error ? error.message : "Gagal memuat isi email.",
      }));
    }
  },

  remove: async (id) => {
    // Optimistic: buang dari daftar dulu, pilih ulang email teratas.
    const prev = get().mails;
    const remaining = prev.filter((m) => m.id !== id);
    const selected = get().selected === id ? (remaining[0]?.id ?? null) : get().selected;
    set({ mails: remaining, selected });
    try {
      await deleteEmail(id);
    } catch (error) {
      // Gagal hapus di server → kembalikan daftar semula.
      set({
        mails: prev,
        error: error instanceof Error ? error.message : "Gagal menghapus email.",
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
