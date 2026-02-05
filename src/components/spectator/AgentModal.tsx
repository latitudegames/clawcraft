"use client";

import Image from "next/image";
import { useEffect } from "react";

import { useAgentPublic } from "@/lib/client/hooks/useAgentPublic";
import { agentSpriteUrlForUsername } from "@/lib/ui/sprites";
import { SKILLS } from "@/types/skills";

export function AgentModal({ username, onClose }: { username: string; onClose: () => void }) {
  const { data, isLoading, error } = useAgentPublic(username);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const agent = data?.agent ?? null;
  const last = data?.last_quest_result ?? null;

  const guildLabel = agent?.guild ? `${agent.guild.name} [${agent.guild.tag}]` : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl rounded-lg border-2 border-parchment-dark bg-parchment-bg p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-md border border-parchment-dark/50 bg-white/70 shadow-sm">
              <Image
                src={agentSpriteUrlForUsername(username)}
                alt=""
                width={48}
                height={48}
                className="h-full w-full"
                style={{ imageRendering: "pixelated" }}
                unoptimized
              />
            </div>
            <div className="text-lg font-bold text-ink-brown">{username}</div>
            {agent ? (
              <div className="mt-1 text-xs opacity-70">
                Level {agent.level} • {agent.location} • Gold {agent.gold}
                {guildLabel ? <span className="ml-2 opacity-80">• {guildLabel}</span> : null}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-md border border-parchment-dark/70 bg-white/70 px-3 py-1 text-sm hover:bg-white"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="mt-4 rounded-md border border-parchment-dark/70 bg-white/70 p-4">
          {isLoading ? (
            <div className="text-sm opacity-80">Loading agent…</div>
          ) : error ? (
            <div className="text-sm text-accent-coral">Failed to load agent: {error instanceof Error ? error.message : "Unknown error"}</div>
          ) : !agent ? (
            <div className="text-sm opacity-80">No agent data.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide opacity-60">Last Quest</div>
                <div className="mt-2 rounded border border-parchment-dark/30 bg-white/60 p-3 text-xs">
                  {last ? (
                    <>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="truncate text-sm font-semibold">{last.quest_name}</div>
                        <div
                          className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                            last.outcome === "success"
                              ? "bg-accent-gold/40 text-ink-brown"
                              : last.outcome === "partial"
                                ? "bg-parchment-dark/20 text-ink-brown"
                                : "bg-accent-coral/20 text-accent-coral"
                          }`}
                        >
                          {last.outcome.toUpperCase()}
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] opacity-80">
                        <div>XP +{last.xp_gained}</div>
                        <div>Gold +{last.gold_gained}</div>
                        {last.gold_lost ? <div className="text-accent-coral">Gold −{last.gold_lost}</div> : null}
                      </div>

                      {last.items_gained.length ? (
                        <div className="mt-2">
                          <div className="text-[11px] font-semibold uppercase tracking-wide opacity-60">Items</div>
                          <div className="mt-1 truncate text-[11px] opacity-80">{last.items_gained.join(", ")}</div>
                        </div>
                      ) : null}

                      <div className="mt-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wide opacity-60">Roll</div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] opacity-80">
                          <div>CR {last.skill_report.challenge_rating}</div>
                          <div>Eff {Math.round(last.skill_report.effective_skill * 10) / 10}</div>
                          <div>Rand {last.skill_report.random_factor}</div>
                          <div>SL {Math.round(last.skill_report.success_level * 10) / 10}</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="opacity-70">No completed quests yet.</div>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide opacity-60">Skills</div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  {SKILLS.map((s) => {
                    const value = agent.skills[s] ?? 0;
                    return (
                      <div key={s} className="rounded border border-parchment-dark/30 bg-white/60 px-2 py-1">
                        <div className="truncate opacity-70">{s.replace(/_/g, " ")}</div>
                        <div className="font-mono text-sm">{value}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide opacity-60">Equipment</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(agent.equipment).map(([slot, item]) => (
                    <div key={slot} className="rounded border border-parchment-dark/30 bg-white/60 px-2 py-2">
                      <div className="opacity-70">{slot.replace(/_/g, " ")}</div>
                      <div className="mt-1 truncate font-semibold">{item ? item.name : "—"}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-xs font-semibold uppercase tracking-wide opacity-60">Inventory</div>
                <div className="mt-2 max-h-32 overflow-auto rounded border border-parchment-dark/30 bg-white/60 p-2 text-xs">
                  {agent.inventory.length === 0 ? (
                    <div className="opacity-70">Empty.</div>
                  ) : (
                    <ul className="space-y-1">
                      {agent.inventory.map((it) => (
                        <li key={it.item_id} className="truncate">
                          {it.name} <span className="opacity-60">({it.rarity})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide opacity-60">Journey Log</div>
                <div className="mt-2 max-h-32 overflow-auto rounded border border-parchment-dark/30 bg-white/60 p-2 text-xs">
                  {data?.journey_log?.length ? (
                    <ul className="space-y-1">
                      {data.journey_log.map((line, idx) => (
                        <li key={idx} className="opacity-80">
                          {line}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="opacity-70">No entries yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
