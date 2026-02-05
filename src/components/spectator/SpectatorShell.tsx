"use client";

import { useState } from "react";

import { useWorldState } from "@/lib/client/hooks/useWorldState";
import { AgentModal } from "./AgentModal";
import { LeaderboardPanel } from "./LeaderboardPanel";
import { WorldMap } from "./WorldMap";

export function SpectatorShell() {
  const { data, error, isLoading } = useWorldState();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-[1fr_360px]">
        <div className="rounded-lg border-2 border-parchment-dark bg-parchment-bg p-4 shadow-sm">
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="text-2xl font-bold text-ink-brown">Clawcraft</h1>
            <div className="text-xs opacity-70">{data?.server_time ? new Date(data.server_time).toLocaleString() : null}</div>
          </div>
          <div className="mt-4">
            {isLoading ? (
              <div className="rounded-md border border-parchment-dark/70 bg-white/70 p-4 text-sm opacity-80">Loading world…</div>
            ) : error ? (
              <div className="rounded-md border border-accent-coral/40 bg-white/70 p-4 text-sm text-accent-coral">
                Failed to load world-state: {error instanceof Error ? error.message : "Unknown error"}
              </div>
            ) : data ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 rounded-md border border-parchment-dark/70 bg-white/70 p-4 text-sm">
                  <div>
                    <div className="text-xs uppercase tracking-wide opacity-60">Locations</div>
                    <div className="text-lg font-semibold">{data.locations.length}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide opacity-60">Agents</div>
                    <div className="text-lg font-semibold">{data.agents.length}</div>
                  </div>
                </div>

                <WorldMap world={data} focusUsername={selectedAgent} onSelectAgent={(username) => setSelectedAgent(username)} />
              </div>
            ) : (
              <div className="rounded-md border border-parchment-dark/70 bg-white/70 p-4 text-sm opacity-80">No data.</div>
            )}
          </div>
        </div>

        <div className="rounded-lg border-2 border-parchment-dark bg-parchment-bg p-4 shadow-sm">
          <LeaderboardPanel selectedPlayer={selectedAgent} onSelectPlayer={(username) => setSelectedAgent(username)} />
        </div>
      </div>

      {selectedAgent ? <AgentModal username={selectedAgent} onClose={() => setSelectedAgent(null)} /> : null}
    </main>
  );
}
