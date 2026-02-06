"use client";

import { create } from "zustand";

export type SpectatorToastTone = "info" | "success" | "error";

export type SpectatorToast = {
  id: string;
  message: string;
  tone: SpectatorToastTone;
  createdAt: number;
  ttlMs: number;
};

type SpectatorUiState = {
  mobileLeaderboardOpen: boolean;
  setMobileLeaderboardOpen: (open: boolean) => void;
  toasts: SpectatorToast[];
  pushToast: (input: { message: string; tone?: SpectatorToastTone; ttlMs?: number }) => string;
  dismissToast: (id: string) => void;
};

let toastCounter = 0;

export const useSpectatorUiStore = create<SpectatorUiState>((set) => ({
  mobileLeaderboardOpen: false,
  setMobileLeaderboardOpen: (open) => set({ mobileLeaderboardOpen: open }),
  toasts: [],
  pushToast: ({ message, tone = "info", ttlMs = 3000 }) => {
    const id = `toast-${Date.now()}-${toastCounter++}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, tone, createdAt: Date.now(), ttlMs }]
    }));
    return id;
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id)
    }))
}));

