import { create } from "zustand";
import type { ConsentRecord, ConsentState } from "@upcat/shared";
import { readConsent, writeConsent } from "@/lib/consent";

interface ConsentStoreState {
    record: ConsentRecord;
    hydrated: boolean;
    hydrate: () => void;
    setConsent: (state: ConsentState) => void;
}

export const useConsentStore = create<ConsentStoreState>((set) => ({
    record: { state: "unset", version: 0, decidedAt: null },
    hydrated: false,
    hydrate: () => {
        set({ record: readConsent(), hydrated: true });
    },
    setConsent: (state) => {
        const record = writeConsent(state);
        set({ record, hydrated: true });
    },
}));