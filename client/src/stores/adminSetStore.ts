import { create } from "zustand";

interface AdminSetState {
    selectedSetId: string;
    setSelectedSetId: (id: string) => void;
}

export const useAdminSetStore = create<AdminSetState>((set) => ({
    selectedSetId: "",
    setSelectedSetId: (id) => set({ selectedSetId: id }),
}));