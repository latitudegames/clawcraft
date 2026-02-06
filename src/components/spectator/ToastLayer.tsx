"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

import { useSpectatorUiStore } from "@/lib/client/state/spectator-ui-store";

const toneClasses = {
  info: "border-parchment-dark/60 bg-white/90 text-ink-brown",
  success: "border-accent-gold/60 bg-[#FFF9F0] text-ink-brown",
  error: "border-accent-coral/60 bg-white/95 text-accent-coral"
} as const;

export function ToastLayer() {
  const toasts = useSpectatorUiStore((state) => state.toasts);
  const dismissToast = useSpectatorUiStore((state) => state.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) return;
    const now = Date.now();
    const timers = toasts.map((toast) => {
      const elapsed = now - toast.createdAt;
      const remaining = Math.max(0, toast.ttlMs - elapsed);
      return window.setTimeout(() => dismissToast(toast.id), remaining);
    });

    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [dismissToast, toasts]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex flex-col items-center gap-2 p-3"
      role="status"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className={`pointer-events-auto rounded-md border px-3 py-2 text-sm shadow-sm ${toneClasses[toast.tone]}`}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="flex items-center gap-3">
              <span>{toast.message}</span>
              <button
                type="button"
                className="rounded border border-black/10 px-1.5 py-0.5 text-xs hover:bg-black/5"
                onClick={() => dismissToast(toast.id)}
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
