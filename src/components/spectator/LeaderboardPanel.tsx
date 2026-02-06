"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useId, useMemo, useRef, useState } from "react";

import { useGuildLeaderboard, usePlayerLeaderboard } from "@/lib/client/hooks/useLeaderboards";

type Tab = "players" | "guilds";

export function LeaderboardPanel(props: { onSelectPlayer?: (username: string) => void; selectedPlayer?: string | null }) {
  const [tab, setTab] = useState<Tab>("players");
  const [search, setSearch] = useState("");
  const ids = useId();
  const searchId = `${ids}-leaderboard-search`;
  const playersTabId = `${ids}-leaderboard-tab-players`;
  const guildsTabId = `${ids}-leaderboard-tab-guilds`;
  const playersPanelId = `${ids}-leaderboard-panel-players`;
  const guildsPanelId = `${ids}-leaderboard-panel-guilds`;
  const playersTabRef = useRef<HTMLButtonElement | null>(null);
  const guildsTabRef = useRef<HTMLButtonElement | null>(null);

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
    <div className="flex h-full flex-col text-ink-brown">
      <div className="mb-2 flex items-center justify-between gap-3 border-b border-parchment-dark/65 pb-2">
        <div className="cc-font-heading text-base">Leaderboard</div>
        <div className="cc-font-rank text-[11px] text-ink-muted">Live</div>
      </div>

      <div>
        <label htmlFor={searchId} className="sr-only">
          {tab === "players" ? "Search players" : "Search guilds"}
        </label>
        <input
          id={searchId}
          aria-label={tab === "players" ? "Search players" : "Search guilds"}
          className="w-full rounded-md border border-parchment-dark/70 bg-white/75 px-3 py-2 text-sm outline-none focus:border-accent-sky"
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

      <div className="mt-3 flex items-end gap-5 border-b border-parchment-dark/55 px-1" role="tablist" aria-label="Leaderboard tabs">
        <button
          ref={playersTabRef}
          role="tab"
          id={playersTabId}
          aria-selected={tab === "players"}
          aria-controls={playersPanelId}
          className={`relative pb-2 text-sm font-semibold transition-colors ${
            tab === "players" ? "text-ink-brown" : "text-ink-muted hover:text-ink-brown"
          }`}
          onClick={() => setTab("players")}
          onKeyDown={(e) => {
            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
            e.preventDefault();
            setTab("guilds");
            requestAnimationFrame(() => guildsTabRef.current?.focus());
          }}
          type="button"
        >
          Players
          {tab === "players" ? (
            <motion.span
              layoutId="leaderboard-tab-active-indicator"
              className="absolute bottom-0 left-0 h-0.5 w-full rounded bg-accent-gold"
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          ) : null}
        </button>
        <button
          ref={guildsTabRef}
          role="tab"
          id={guildsTabId}
          aria-selected={tab === "guilds"}
          aria-controls={guildsPanelId}
          className={`relative pb-2 text-sm font-semibold transition-colors ${
            tab === "guilds" ? "text-ink-brown" : "text-ink-muted hover:text-ink-brown"
          }`}
          onClick={() => setTab("guilds")}
          onKeyDown={(e) => {
            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
            e.preventDefault();
            setTab("players");
            requestAnimationFrame(() => playersTabRef.current?.focus());
          }}
          type="button"
        >
          Guilds
          {tab === "guilds" ? (
            <motion.span
              layoutId="leaderboard-tab-active-indicator"
              className="absolute bottom-0 left-0 h-0.5 w-full rounded bg-accent-gold"
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          ) : null}
        </button>
      </div>

      <div className="relative mt-2 flex-1 overflow-hidden rounded-md border border-parchment-dark/70 bg-parchment-bg/55">
        {isLoading ? (
          <div className="p-4 text-sm opacity-80">Loading…</div>
        ) : error ? (
          <div className="p-4 text-sm text-accent-coral">
            Failed to load: {error instanceof Error ? error.message : "Unknown error"}
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              role="tabpanel"
              id={tab === "players" ? playersPanelId : guildsPanelId}
              aria-labelledby={tab === "players" ? playersTabId : guildsTabId}
              tabIndex={0}
              className="h-full overflow-auto focus:outline-none"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <div className="w-full text-xs">
                <div className="sticky top-0 grid grid-cols-[40px_1fr_80px] bg-parchment-bg/90 px-3 py-2 text-left text-ink-muted">
                  <div className="cc-font-rank">#</div>
                  <div>{tab === "players" ? "Player" : "Guild"}</div>
                  <div className="text-right">{tab === "players" ? "Level" : "Gold"}</div>
                </div>

                {hasNoResults ? (
                  <div className="px-3 py-6 text-center text-xs text-ink-muted">No results.</div>
                ) : tab === "players" ? (
                  <div className="divide-y divide-parchment-dark/30">
                    {filteredPlayers.map((r) => {
                      const isSelected = Boolean(props.selectedPlayer && props.selectedPlayer === r.username);
                      const isInteractive = Boolean(props.onSelectPlayer);
                      return (
                        <button
                          key={r.username}
                          type="button"
                          data-leaderboard-row="player"
                          data-username={r.username}
                          className={`grid w-full grid-cols-[40px_1fr_80px] items-center px-3 py-2 text-left transition-colors duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent-sky ${
                            isSelected ? "bg-accent-gold/25" : ""
                          } ${isInteractive ? "cursor-pointer hover:bg-accent-gold/12" : "cursor-default opacity-80"}`}
                          onClick={isInteractive ? () => props.onSelectPlayer?.(r.username) : undefined}
                          aria-current={isSelected ? "true" : undefined}
                          disabled={!isInteractive}
                        >
                          <div className="cc-font-rank text-ink-muted">{r.rank}</div>
                          <div className="min-w-0 truncate">
                            {r.username}
                            {r.guild_tag ? (
                              <span className="ml-2 text-[10px] font-semibold text-ink-muted tracking-[0.05em]">
                                [{r.guild_tag}]
                              </span>
                            ) : null}
                          </div>
                          <div className="cc-font-rank text-right">{r.level}</div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="divide-y divide-parchment-dark/30">
                    {filteredGuilds.map((g) => (
                      <div key={g.tag} className="grid grid-cols-[40px_1fr_80px] items-center px-3 py-2">
                        <div className="cc-font-rank text-ink-muted">{g.rank}</div>
                        <div className="min-w-0 truncate">
                          {g.name} <span className="text-[11px] text-ink-muted">[{g.tag}]</span>
                        </div>
                        <div className="cc-font-rank text-right">{g.total_gold}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <div className="mt-2 text-[11px] text-ink-muted">Map and leaderboard update continuously.</div>
    </div>
  );
}
