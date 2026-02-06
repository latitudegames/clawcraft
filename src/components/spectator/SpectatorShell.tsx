"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { useWorldState } from "@/lib/client/hooks/useWorldState";
import { useSpectatorUiStore } from "@/lib/client/state/spectator-ui-store";
import { setQueryParam } from "@/lib/ui/query-string";
import { AgentModal } from "./AgentModal";
import { LeaderboardPanel } from "./LeaderboardPanel";
import { ToastLayer } from "./ToastLayer";
import { WorldMap } from "./WorldMap";

export function SpectatorShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data, error, isLoading } = useWorldState();
  const selectedAgent = searchParams.get("agent");
  const mobileLeaderboardOpen = useSpectatorUiStore((state) => state.mobileLeaderboardOpen);
  const setMobileLeaderboardOpen = useSpectatorUiStore((state) => state.setMobileLeaderboardOpen);
  const pushToast = useSpectatorUiStore((state) => state.pushToast);
  const lastErrorRef = useRef<string | null>(null);
  const mobileDrawerRef = useRef<HTMLElement | null>(null);
  const mobileDrawerCloseRef = useRef<HTMLButtonElement | null>(null);

  const onSelectAgent = (username: string) => {
    const nextSearch = setQueryParam(searchParams.toString(), "agent", username);
    router.replace(`${pathname}${nextSearch}`, { scroll: false });
    setMobileLeaderboardOpen(false);
  };

  const onCloseAgent = () => {
    const nextSearch = setQueryParam(searchParams.toString(), "agent", null);
    router.replace(`${pathname}${nextSearch}`, { scroll: false });
  };

  useEffect(() => {
    if (!error) {
      lastErrorRef.current = null;
      return;
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    if (lastErrorRef.current === message) return;
    lastErrorRef.current = message;
    pushToast({
      tone: "error",
      ttlMs: 5000,
      message: `World sync failed: ${message}`
    });
  }, [error, pushToast]);

  useEffect(() => {
    if (!mobileLeaderboardOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    mobileDrawerCloseRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileLeaderboardOpen(false);
        return;
      }

      if (e.key !== "Tab") return;
      const drawer = mobileDrawerRef.current;
      if (!drawer) return;

      const focusables = drawer.querySelectorAll<HTMLElement>(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;

      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
        return;
      }
      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [mobileLeaderboardOpen, setMobileLeaderboardOpen]);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <div className="absolute inset-0 z-0">
        {data ? (
          <WorldMap world={data} focusUsername={selectedAgent} onSelectAgent={onSelectAgent} />
        ) : (
          <div className="cc-terrain-grass h-full w-full" />
        )}
      </div>

      <div className="cc-glass absolute left-4 top-4 z-20 rounded-lg px-3 py-2 text-xs text-ink-brown">
        <div className="cc-font-heading text-sm">Clawcraft</div>
        <div className="mt-1 flex items-center gap-3 opacity-80">
          <span>Locations: {data?.locations.length ?? "—"}</span>
          <span>Agents: {data?.agents.length ?? "—"}</span>
        </div>
        {data?.server_time ? <div className="mt-1 opacity-70">{new Date(data.server_time).toLocaleString()}</div> : null}
      </div>

      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 p-3 lg:hidden">
        <button
          type="button"
          className="cc-glass rounded-md px-3 py-2 text-xs font-semibold text-ink-brown"
          aria-expanded={mobileLeaderboardOpen}
          aria-controls="mobile-leaderboard-panel"
          onClick={() => setMobileLeaderboardOpen(true)}
        >
          Leaderboard
        </button>
        {selectedAgent ? (
          <button
            type="button"
            className="cc-glass rounded-md px-3 py-2 text-xs font-semibold text-ink-brown"
            onClick={onCloseAgent}
          >
            Close Agent
          </button>
        ) : null}
      </div>

      <aside className="cc-parchment absolute right-0 top-0 z-30 hidden h-full w-[320px] rounded-l-lg rounded-r-none border-r-0 p-3 lg:block">
        <LeaderboardPanel selectedPlayer={selectedAgent} onSelectPlayer={onSelectAgent} />
      </aside>

      <AnimatePresence>
        {mobileLeaderboardOpen ? (
          <>
            <motion.button
              aria-label="Close leaderboard"
              className="fixed inset-0 z-40 bg-black/30 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileLeaderboardOpen(false)}
            />
            <motion.aside
              id="mobile-leaderboard-panel"
              ref={mobileDrawerRef}
              className="cc-parchment fixed right-0 top-0 z-50 h-full w-[88vw] max-w-[340px] rounded-l-lg rounded-r-none border-r-0 p-3 lg:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              role="dialog"
              aria-modal="true"
              aria-label="Leaderboard"
            >
              <div className="mb-2 flex justify-end">
                <button
                  ref={mobileDrawerCloseRef}
                  type="button"
                  className="rounded-md border border-parchment-dark/70 bg-white/75 px-3 py-1 text-xs text-ink-brown"
                  onClick={() => setMobileLeaderboardOpen(false)}
                >
                  Close
                </button>
              </div>
              <LeaderboardPanel selectedPlayer={selectedAgent} onSelectPlayer={onSelectAgent} />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      {isLoading ? (
        <div className="cc-glass absolute bottom-4 left-4 z-20 rounded-md px-3 py-2 text-sm text-ink-brown">Loading world…</div>
      ) : null}

      {error ? (
        <div className="absolute bottom-4 left-4 z-20 max-w-[420px] rounded-md border border-accent-coral/40 bg-white/90 px-3 py-2 text-sm text-accent-coral">
          Failed to load world-state: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      ) : null}

      {!isLoading && !error && data?.agents.length === 0 ? (
        <div className="cc-glass absolute bottom-4 left-4 z-20 max-w-[440px] rounded-md px-3 py-2 text-xs text-ink-brown">
          No agents yet. Run <code className="rounded bg-black/5 px-1 py-0.5 font-mono">npm run dev:demo -- --party</code> to populate the world.
        </div>
      ) : null}

      {selectedAgent ? <AgentModal key={selectedAgent} username={selectedAgent} onClose={onCloseAgent} /> : null}
      <ToastLayer />
    </main>
  );
}
