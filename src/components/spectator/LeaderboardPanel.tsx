"use client";

import { useMemo, useState } from "react";

import { useGuildLeaderboard, usePlayerLeaderboard } from "@/lib/client/hooks/useLeaderboards";

type Tab = "players" | "guilds";

export function LeaderboardPanel(props: { onSelectPlayer?: (username: string) => void; selectedPlayer?: string | null }) {
  const [tab, setTab] = useState<Tab>("players");
  const [search, setSearch] = useState("");

  const players = usePlayerLeaderboard(50);
  const guilds = useGuildLeaderboard(50);

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = players.data?.leaderboard ?? [];
    if (!q) return rows;
    return rows.filter((r) => r.username.toLowerCase().includes(q) || (r.guild_tag?.toLowerCase().includes(q) ?? false));
  }, [players.data, search]);

  const filteredGuilds = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = guilds.data?.leaderboard ?? [];
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.tag.toLowerCase().includes(q));
  }, [guilds.data, search]);

  const isLoading = tab === "players" ? players.isLoading : guilds.isLoading;
  const error = tab === "players" ? players.error : guilds.error;
  const hasNoResults = tab === "players" ? filteredPlayers.length === 0 : filteredGuilds.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Leaderboard</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className={`rounded px-2 py-1 transition ${tab === "players" ? "bg-accent-gold/40 text-ink-brown" : "opacity-70 hover:opacity-100"}`}
            onClick={() => setTab("players")}
            type="button"
          >
            Players
          </button>
          <button
            className={`rounded px-2 py-1 transition ${tab === "guilds" ? "bg-accent-gold/40 text-ink-brown" : "opacity-70 hover:opacity-100"}`}
            onClick={() => setTab("guilds")}
            type="button"
          >
            Guilds
          </button>
        </div>
      </div>

      <div className="mt-3">
        <input
          className="w-full rounded-md border border-parchment-dark/70 bg-white/70 px-3 py-2 text-sm outline-none focus:border-accent-sky"
          placeholder={tab === "players" ? "Search players…" : "Search guilds…"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            if (tab !== "players") return;
            if (!props.onSelectPlayer) return;
            const first = filteredPlayers[0];
            if (!first) return;
            props.onSelectPlayer(first.username);
          }}
        />
      </div>

      <div className="mt-3 flex-1 overflow-hidden rounded-md border border-parchment-dark/70 bg-white/70">
        {isLoading ? (
          <div className="p-4 text-sm opacity-80">Loading…</div>
        ) : error ? (
          <div className="p-4 text-sm text-accent-coral">
            Failed to load: {error instanceof Error ? error.message : "Unknown error"}
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <table className="w-full table-fixed text-xs">
              <thead className="sticky top-0 bg-white/90">
                <tr className="text-left opacity-70">
                  <th className="w-10 px-3 py-2">#</th>
                  <th className="px-3 py-2">{tab === "players" ? "Player" : "Guild"}</th>
                  <th className="w-20 px-3 py-2 text-right">{tab === "players" ? "Level" : "Gold"}</th>
                </tr>
              </thead>
              <tbody>
                {hasNoResults ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-xs opacity-60">
                      No results.
                    </td>
                  </tr>
                ) : (
                  <>
                    {tab === "players"
                      ? filteredPlayers.map((r) => {
                          const isSelected = Boolean(props.selectedPlayer && props.selectedPlayer === r.username);
                          return (
                            <tr
                              key={r.username}
                              className={`border-t border-parchment-dark/30 ${
                                isSelected ? "bg-accent-gold/20" : ""
                              } ${props.onSelectPlayer ? "cursor-pointer hover:bg-white/50" : ""}`}
                              onClick={props.onSelectPlayer ? () => props.onSelectPlayer?.(r.username) : undefined}
                            >
                              <td className="px-3 py-2 font-mono opacity-70">{r.rank}</td>
                              <td className="px-3 py-2">
                                <div className="truncate">
                                  {r.username}
                                  {r.guild_tag ? <span className="ml-2 opacity-60">[{r.guild_tag}]</span> : null}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right font-mono">{r.level}</td>
                            </tr>
                          );
                        })
                      : filteredGuilds.map((g) => (
                      <tr key={g.tag} className="border-t border-parchment-dark/30">
                        <td className="px-3 py-2 font-mono opacity-70">{g.rank}</td>
                        <td className="px-3 py-2">
                          <div className="truncate">
                            {g.name} <span className="opacity-60">[{g.tag}]</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{g.total_gold}</td>
                      </tr>
                      ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-2 text-[11px] opacity-60">Updates every ~10s.</div>
    </div>
  );
}
