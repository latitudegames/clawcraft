"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import { useAgentPublic } from "@/lib/client/hooks/useAgentPublic";
import { agentSpriteUrlForUsername } from "@/lib/ui/sprites";
import type { Skill } from "@/types/skills";

type TabKey = "overview" | "skills" | "equipment" | "journey";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "skills", label: "Skills" },
  { key: "equipment", label: "Equipment" },
  { key: "journey", label: "Journey" }
];

const SKILL_GROUPS: Array<{ label: string; skills: Skill[] }> = [
  { label: "Combat", skills: ["melee", "ranged", "unarmed"] },
  { label: "Magic", skills: ["necromancy", "elemental", "enchantment", "healing", "illusion", "summoning"] },
  { label: "Subterfuge + Social", skills: ["stealth", "lockpicking", "poison", "persuasion", "deception", "seduction"] }
];

const EQUIPMENT_SLOTS = ["head", "chest", "legs", "boots", "right_hand", "left_hand"] as const;
type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];
const EQUIPMENT_SLOT_LABEL: Record<EquipmentSlot, string> = {
  head: "Head",
  chest: "Chest",
  legs: "Legs",
  boots: "Boots",
  right_hand: "R Hand",
  left_hand: "L Hand"
};

export function AgentModal({ username, onClose }: { username: string; onClose: () => void }) {
  const { data, isLoading, error } = useAgentPublic(username);
  const [tab, setTab] = useState<TabKey>("overview");
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const tabBaseId = useId();
  const tabIdFor = (key: TabKey) => `${tabBaseId}-tab-${key}`;
  const panelIdFor = (key: TabKey) => `${tabBaseId}-panel-${key}`;
  const tabButtonByKey = useRef(new Map<TabKey, HTMLButtonElement>());

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;

      const root = dialogRef.current;
      if (!root) return;

      const focusables = root.querySelectorAll<HTMLElement>(
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
  }, [onClose]);

  const agent = data?.agent ?? null;
  const current = data?.current_quest ?? null;
  const last = data?.last_quest_result ?? null;

  const guildLabel = agent?.guild ? `[${agent.guild.tag}]` : null;

  const tabContent = (() => {
    if (!agent) return null;

    if (tab === "overview") {
      return (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="rounded border border-parchment-dark/35 bg-white/70 px-2 py-2">
              <div className="text-[11px] uppercase tracking-wide text-ink-muted">Level</div>
              <div className="text-base font-semibold">{agent.level}</div>
            </div>
            <div className="rounded border border-parchment-dark/35 bg-white/70 px-2 py-2">
              <div className="text-[11px] uppercase tracking-wide text-ink-muted">XP</div>
              <div className="cc-font-rank text-base">{agent.xp}</div>
            </div>
            <div className="rounded border border-parchment-dark/35 bg-white/70 px-2 py-2">
              <div className="text-[11px] uppercase tracking-wide text-ink-muted">Gold</div>
              <div className="cc-font-rank text-base">{agent.gold}</div>
            </div>
            <div className="rounded border border-parchment-dark/35 bg-white/70 px-2 py-2">
              <div className="text-[11px] uppercase tracking-wide text-ink-muted">Location</div>
              <div className="truncate text-base font-semibold">{agent.location}</div>
            </div>
          </div>

          <div className="rounded border border-parchment-dark/35 bg-white/70 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Current Quest</div>
            {current ? (
              <>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <div className="truncate text-sm font-semibold">{current.quest_name}</div>
                  <div className="cc-font-rank text-[11px] text-ink-muted">
                    Step {current.current_step} of {current.total_steps}
                  </div>
                </div>
                <div className="mt-1 text-[11px] text-ink-muted">
                  {current.origin} → {current.destination}
                </div>
                <div className="mt-2">
                  <div className="mb-1 text-[11px] text-ink-muted">Progress</div>
                  <div className="h-2 overflow-hidden rounded bg-parchment-dark/35">
                    <div
                      className="h-full rounded bg-accent-gold/75 transition-all duration-300"
                      style={{ width: `${Math.max(0, Math.min(100, Math.round((current.current_step / current.total_steps) * 100)))}%` }}
                    />
                  </div>
                </div>
                {current.status_text ? <div className="mt-2 text-xs opacity-80">{current.status_text}</div> : null}
              </>
            ) : (
              <div className="mt-1 text-xs text-ink-muted">Not currently questing.</div>
            )}
          </div>

          <div className="rounded border border-parchment-dark/35 bg-white/70 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Last Quest</div>
            {last ? (
              <>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <div className="truncate text-sm font-semibold">{last.quest_name}</div>
                  <div
                    className={`rounded border border-ink-brown/10 px-2 py-0.5 text-[11px] font-semibold ${
                      last.outcome === "success"
                        ? "bg-accent-gold text-ink-brown"
                        : last.outcome === "partial"
                          ? "bg-parchment-dark text-ink-brown"
                          : "bg-accent-coral text-[#661010]"
                    }`}
                  >
                    {last.outcome.toUpperCase()}
                  </div>
                </div>
                <div className="cc-font-rank mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-80">
                  <div>XP +{last.xp_gained}</div>
                  <div>Gold +{last.gold_gained}</div>
                  {last.gold_lost ? <div className="text-accent-coral">Gold -{last.gold_lost}</div> : null}
                </div>
              </>
            ) : (
              <div className="mt-1 text-xs text-ink-muted">No completed quests yet.</div>
            )}
          </div>
        </div>
      );
    }

    if (tab === "skills") {
      return (
        <div>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Skills</div>
            <div className={`text-xs ${agent.unspent_skill_points > 0 ? "text-ink-brown" : "text-ink-muted"}`}>
              Unspent points:{" "}
              <span className={agent.unspent_skill_points > 0 ? "cc-font-rank font-semibold" : "cc-font-rank"}>
                {agent.unspent_skill_points}
              </span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {SKILL_GROUPS.map((group) => (
              <div key={group.label} className="rounded-md border border-parchment-dark/45 bg-white/60 p-2">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{group.label}</div>
                <div className="space-y-1 text-xs">
                  {group.skills.map((skill) => {
                    const value = agent.skills[skill] ?? 0;
                    return (
                      <div
                        key={skill}
                        className="flex items-center justify-between gap-2 rounded border border-parchment-dark/35 bg-white/70 px-2 py-1"
                      >
                        <div className="min-w-0 truncate text-ink-muted">{skill.replace(/_/g, " ")}</div>
                        <div className="cc-font-rank shrink-0 text-sm font-semibold">{value}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (tab === "equipment") {
      return (
        <div className="space-y-4 text-xs">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Equipment</div>
            <div className="grid grid-cols-3 gap-2">
              {EQUIPMENT_SLOTS.map((slot) => {
                const item = agent.equipment[slot] ?? null;
                return (
                  <div
                    key={slot}
                    className={`rounded border px-2 py-2 ${
                      item ? "border-parchment-dark/40 bg-white/75" : "border-dotted border-parchment-dark/60 bg-white/50"
                    }`}
                  >
                    <div className="text-ink-muted">{EQUIPMENT_SLOT_LABEL[slot]}</div>
                    <div className="mt-1 truncate font-semibold">{item ? item.name : "Empty"}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Inventory</div>
            <div className="max-h-40 overflow-auto rounded border border-parchment-dark/35 bg-white/70 p-2">
              {agent.inventory.length === 0 ? (
                <div className="text-ink-muted">Empty.</div>
              ) : (
                <ul className="space-y-1">
                  {agent.inventory.map((it) => (
                    <li key={it.item_id} className="truncate">
                      {it.name} <span className="text-ink-muted">({it.rarity})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Journey Log</div>
        <div className="max-h-[45vh] overflow-auto rounded border border-parchment-dark/35 bg-white/70 p-2 text-xs">
          {data?.journey_log?.length ? (
            <ul className="space-y-1">
              {data.journey_log.map((line, idx) => (
                <li key={idx} className="opacity-85">
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-ink-muted">No entries yet.</div>
          )}
        </div>
      </div>
    );
  })();

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        ref={dialogRef}
        tabIndex={-1}
        role="document"
        className="cc-parchment w-full max-h-[88vh] overflow-hidden rounded-t-2xl border-2 border-parchment-dark p-4 shadow-xl md:max-w-[420px] md:rounded-lg md:p-5"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-parchment-dark/50 bg-white/70 shadow-sm">
              <Image
                src={agentSpriteUrlForUsername(username)}
                alt=""
                width={64}
                height={64}
                className="h-full w-full"
                style={{ imageRendering: "pixelated" }}
                unoptimized
              />
            </div>
            <div className="min-w-0">
              <div id={titleId} className="truncate text-lg font-bold text-ink-brown">
                {username}
                {guildLabel ? (
                  <span className="ml-2 text-[12px] font-semibold text-ink-muted tracking-[0.05em]">{guildLabel}</span>
                ) : null}
              </div>
              {agent ? (
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs opacity-80">
                  <span>Level {agent.level}</span>
                  <span>XP {agent.xp}</span>
                  <span>Gold {agent.gold}</span>
                  <span>{agent.location}</span>
                </div>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="rounded-md border border-parchment-dark/70 bg-white/75 px-3 py-1 text-sm hover:bg-white"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex items-end gap-4 border-b border-parchment-dark/60 px-1" role="tablist" aria-label="Agent details tabs">
          {TABS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => setTab(entry.key)}
              ref={(node) => {
                if (!node) return;
                tabButtonByKey.current.set(entry.key, node);
              }}
              role="tab"
              id={tabIdFor(entry.key)}
              aria-selected={tab === entry.key}
              aria-controls={panelIdFor(entry.key)}
              className={`relative pb-2 text-sm font-semibold transition-colors ${
                tab === entry.key ? "text-ink-brown" : "text-ink-muted hover:text-ink-brown"
              }`}
              onKeyDown={(e) => {
                if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                e.preventDefault();
                const idx = TABS.findIndex((t) => t.key === tab);
                const delta = e.key === "ArrowRight" ? 1 : -1;
                const next = TABS[(idx + delta + TABS.length) % TABS.length];
                if (!next) return;
                setTab(next.key);
                requestAnimationFrame(() => tabButtonByKey.current.get(next.key)?.focus());
              }}
            >
              {entry.label}
              {tab === entry.key ? (
                <motion.span
                  layoutId="agent-card-tab-active-indicator"
                  className="absolute bottom-0 left-0 h-0.5 w-full rounded bg-accent-gold"
                  transition={{ duration: 0.2, ease: "easeOut" }}
                />
              ) : null}
            </button>
          ))}
        </div>

        <div className="mt-3 max-h-[calc(88vh-170px)] overflow-y-auto rounded-md border border-parchment-dark/65 bg-white/65 p-3">
          {isLoading ? (
            <div className="text-sm opacity-80">Loading agent…</div>
          ) : error ? (
            <div className="text-sm text-accent-coral">Failed to load agent: {error instanceof Error ? error.message : "Unknown error"}</div>
          ) : !agent ? (
            <div className="text-sm opacity-80">No agent data.</div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                role="tabpanel"
                id={panelIdFor(tab)}
                aria-labelledby={tabIdFor(tab)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                {tabContent}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
