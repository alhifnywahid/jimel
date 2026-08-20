/**
 * use-address.ts - active inbox address store (Zustand).
 *
 * One active address (sudevmail pattern): generating a new one replaces the old.
 * The address is persisted to localStorage so it survives a reload. Domains come
 * from the server (GET /api/domains) once at boot; the first domain is the default.
 */

import { toast } from "sonner";
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
  /** true while a generate is in flight (the button is disabled in the UI). */
  generating: boolean;
  error: string | null;

  loadDomains: () => Promise<void>;
  /**
   * Claim an address, or open it if it already exists. A prefix typed by the user
   * OPENS the existing inbox (so the same address works across browsers/devices);
   * a random prefix demands an unused one and re-rolls on collision.
   */
  generate: (prefix?: string, domain?: string) => Promise<void>;
};

function readStored(): StoredAddress | null {
  const raw = getLocalStorageValue(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredAddress;
    // An expired address is useless (its emails were already purged server-side).
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
      // If no domain is selected yet, use the default (the first domain).
      if (!get().domain && domains[0]) set({ domain: domains[0] });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load domains.";
      set({ error: message });
      toast.error(message);
    }
  },

  generate: async (prefix, domain) => {
    if (get().generating) return;
    set({ generating: true, error: null });

    const chosenDomain = domain ?? get().domain ?? undefined;
    // A prefix the user typed is a request for THAT inbox: let the server open it if
    // it exists. A random prefix is meant to be a fresh throwaway, so ask for it
    // exclusively and re-roll on 409 rather than landing in a stranger's inbox.
    const userChosePrefix = Boolean(prefix?.trim());
    let attemptPrefix = prefix?.trim() || randomPrefix();

    try {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const result = await generateAddress(attemptPrefix, chosenDomain, !userChosePrefix);
          const next: StoredAddress = {
            address: result.address,
            domain: result.domain,
            expiresAt: result.expiresAt,
          };
          persist(next);
          set({ ...next, generating: false, error: null });
          if (!result.created) toast.info(`Opened the existing inbox ${result.address}`);
          return;
        } catch (error) {
          // 409 can only happen for a random prefix now -> collision, try another.
          if (error instanceof ApiError && error.status === 409) {
            attemptPrefix = randomPrefix();
            continue;
          }
          throw error;
        }
      }
      throw new Error("Could not find a free address. Please try again.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create an address.";
      set({ generating: false, error: message });
      toast.error(message);
    }
  },
}));
