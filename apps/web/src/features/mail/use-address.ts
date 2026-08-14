/**
 * use-address.ts - store alamat inbox aktif (Zustand).
 *
 * Satu alamat aktif (pola sudevmail): generate baru mengganti yang lama. Alamat
 * dipersist di localStorage supaya bertahan saat reload. Domain diambil dari
 * server (GET /api/domains) sekali saat boot; domain pertama jadi default.
 */

import { create } from "zustand";

import { ApiError, fetchDomains, generateAddress, randomPrefix } from "@/lib/api";
import { getLocalStorageValue, setLocalStorageValue } from "@/lib/local-storage.client";

const STORAGE_KEY = "jimel.address";

type StoredAddress = {
  address: string;
  domain: string;
  expiresAt: number;
};

type AddressState = {
  address: string | null;
  domain: string | null;
  expiresAt: number;
  domains: string[];
  /** true selama generate berlangsung (tombol dinonaktifkan di UI). */
  generating: boolean;
  error: string | null;

  loadDomains: () => Promise<void>;
  /** Klaim alamat baru. prefix kosong → random. Re-roll otomatis kalau 409. */
  generate: (prefix?: string, domain?: string) => Promise<void>;
};

function readStored(): StoredAddress | null {
  const raw = getLocalStorageValue(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredAddress;
    // Alamat kadaluarsa tidak berguna (email-nya sudah dipurge server).
    if (!parsed.address || parsed.expiresAt * 1000 <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(value: StoredAddress): void {
  setLocalStorageValue(STORAGE_KEY, JSON.stringify(value));
}

const stored = readStored();

export const useAddressStore = create<AddressState>((set, get) => ({
  address: stored?.address ?? null,
  domain: stored?.domain ?? null,
  expiresAt: stored?.expiresAt ?? 0,
  domains: [],
  generating: false,
  error: null,

  loadDomains: async () => {
    try {
      const domains = await fetchDomains();
      set({ domains });
      // Kalau belum punya domain terpilih, pakai default (domain pertama).
      if (!get().domain && domains[0]) set({ domain: domains[0] });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Gagal memuat domain." });
    }
  },

  generate: async (prefix, domain) => {
    if (get().generating) return;
    set({ generating: true, error: null });

    const chosenDomain = domain ?? get().domain ?? undefined;
    // prefix kosong → random. Kalau user mengetik prefix dan kena 409, kita
    // hormati pilihannya (lempar error) daripada diam-diam mengganti prefix.
    const userChosePrefix = Boolean(prefix?.trim());
    let attemptPrefix = prefix?.trim() || randomPrefix();

    try {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const result = await generateAddress(attemptPrefix, chosenDomain);
          const next: StoredAddress = {
            address: result.address,
            domain: result.domain,
            expiresAt: result.expiresAt,
          };
          persist(next);
          set({ ...next, generating: false, error: null });
          return;
        } catch (error) {
          // 409 + prefix random = tabrakan → coba prefix random lain.
          if (error instanceof ApiError && error.status === 409 && !userChosePrefix) {
            attemptPrefix = randomPrefix();
            continue;
          }
          throw error;
        }
      }
      throw new Error("Tidak dapat menemukan alamat kosong. Coba lagi.");
    } catch (error) {
      set({
        generating: false,
        error: error instanceof Error ? error.message : "Gagal membuat alamat.",
      });
    }
  },
}));
