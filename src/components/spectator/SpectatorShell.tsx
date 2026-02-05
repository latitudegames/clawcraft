"use client";

import { useWorldState } from "@/lib/client/hooks/useWorldState";

export function SpectatorShell() {
  const { data, error, isLoading } = useWorldState();

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-[1fr_360px]">
        <div className="rounded-lg border-2 border-parchment-dark bg-parchment-bg p-4 shadow-sm">
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="text-2xl font-bold text-ink-brown">Clawcraft</h1>
            <div className="text-xs opacity-70">{data?.server_time ? new Date(data.server_time).toLocaleString() : null}</div>
          </div>
          <div className="mt-4 rounded-md border border-parchment-dark/70 bg-white/70 p-4">
            {isLoading ? (
              <div className="text-sm opacity-80">Loading world…</div>
            ) : error ? (
              <div className="text-sm text-accent-coral">
                Failed to load world-state: {error instanceof Error ? error.message : "Unknown error"}
              </div>
            ) : data ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wide opacity-60">Locations</div>
                  <div className="text-lg font-semibold">{data.locations.length}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide opacity-60">Agents</div>
                  <div className="text-lg font-semibold">{data.agents.length}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm opacity-80">No data.</div>
            )}
          </div>

          <div className="mt-4 text-xs opacity-70">Next: render Pixi map + POIs + agents.</div>
        </div>

        <div className="rounded-lg border-2 border-parchment-dark bg-parchment-bg p-4 shadow-sm">
          <div className="text-sm font-semibold">Leaderboard (coming next)</div>
          <div className="mt-2 text-xs opacity-70">We’ll populate this from `/api/leaderboard` + `/api/leaderboard/guilds`.</div>
        </div>
      </div>
    </main>
  );
}

