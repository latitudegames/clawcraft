import { createRng } from "../utils/rng";
import type { WorldStateAgent, WorldStateLocation, WorldStateResponse } from "../../types/world-state";

export type SyntheticWorldStateOptions = {
  count: number;
  seed?: string;
  statusRate?: number; // 0..1
  partyRate?: number; // 0..1
  only?: boolean; // when true, replaces real agents with synthetic ones
};

const MAX_SYNTHETIC_AGENTS = 10_000;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return clamp(n, 0, 1);
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return clamp(Math.floor(n), min, max);
}

function hasPoint(l: WorldStateLocation): l is WorldStateLocation & { x: number; y: number } {
  return typeof l.x === "number" && typeof l.y === "number";
}

function slugSeed(seed: string) {
  const s = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 8);
  return s || "seed";
}

function pickLocationWeighted(rng: ReturnType<typeof createRng>, locs: Array<WorldStateLocation & { x: number; y: number }>) {
  // Small weighting toward towns/cities so hotspots look realistic.
  const bag: Array<WorldStateLocation & { x: number; y: number }> = [];
  for (const l of locs) {
    const w = l.type === "major_city" ? 6 : l.type === "town" ? 4 : l.type === "landmark" ? 3 : l.type === "dungeon" ? 2 : 1;
    for (let i = 0; i < w; i++) bag.push(l);
  }
  return bag.length ? rng.pick(bag) : rng.pick(locs);
}

function jitter(rng: ReturnType<typeof createRng>, radius: number) {
  const angle = rng.float(0, Math.PI * 2);
  const dist = rng.float(0, radius);
  return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist };
}

const SKILLS = [
  "melee",
  "ranged",
  "unarmed",
  "necromancy",
  "elemental",
  "enchantment",
  "healing",
  "illusion",
  "summoning",
  "stealth",
  "lockpicking",
  "poison",
  "persuasion",
  "deception",
  "seduction"
] as const;

const SOLO_TEXT = [
  "Approach: Head out carefully, improvise as needed, and bring back loot.",
  "You pause to regroup and check supplies.",
  "A strange sign marks the road ahead.",
  "The path is quiet, almost too quiet.",
  "You spot tracks and adjust your route."
] as const;

const TRAVEL_TEXT = [
  "Leaving {from} at dawn.",
  "Leaving {from} at dusk.",
  "Following the road toward {to}.",
  "Making camp along the path to {to}.",
  "Picking up the pace on the trail to {to}."
] as const;

function makeStatusText(args: {
  rng: ReturnType<typeof createRng>;
  traveling: boolean;
  from: string;
  to: string;
}): string {
  const { rng, traveling, from, to } = args;
  const skills = rng
    .shuffle(SKILLS)
    .slice(0, 3)
    .sort((a, b) => a.localeCompare(b))
    .join(", ");

  const base = traveling ? rng.pick(TRAVEL_TEXT) : rng.pick(SOLO_TEXT);
  const expanded = base.replaceAll("{from}", from).replaceAll("{to}", to);
  const withSkills = `${expanded} (${skills})`;
  return withSkills.length > 120 ? `${expanded}` : withSkills;
}

function makeGuildTag(rng: ReturnType<typeof createRng>): string | null {
  if (rng.next() > 0.35) return null;
  return rng.pick(["FOX", "DRG", "MNC", "OWL", "BEE", "RAT", "CAT", "WLF"] as const);
}

function pickEdge(
  rng: ReturnType<typeof createRng>,
  state: WorldStateResponse,
  locById: Map<string, WorldStateLocation & { x: number; y: number }>
): { from: WorldStateLocation & { x: number; y: number }; to: WorldStateLocation & { x: number; y: number } } {
  if (state.connections.length) {
    for (let tries = 0; tries < 4; tries++) {
      const edge = rng.pick(state.connections);
      const from = locById.get(edge.from_id);
      const to = locById.get(edge.to_id);
      if (from && to) return { from, to };
    }
  }

  const locs = Array.from(locById.values());
  const from = rng.pick(locs);
  let to = rng.pick(locs);
  if (to.id === from.id && locs.length > 1) {
    to = locs[(locs.findIndex((l) => l.id === from.id) + 1) % locs.length] ?? to;
  }
  return { from, to };
}

/**
 * Dev-only helper for load testing the spectator map:
 * - Generates *synthetic* agents (optionally with statuses + party run IDs)
 * - Deterministic for a given seed
 * - Does not mutate the input world-state (safe with TTL caches)
 *
 * Not part of V1 gameplay behavior. Production should ignore the synthetic query params.
 */
export function withSyntheticAgents(base: WorldStateResponse, opts: SyntheticWorldStateOptions): WorldStateResponse {
  const count = clampInt(opts.count, 0, MAX_SYNTHETIC_AGENTS);
  if (count === 0) return base;

  const statusRate = clamp01(opts.statusRate ?? 0.18);
  const partyRate = clamp01(opts.partyRate ?? 0.12);
  const seed = opts.seed ?? base.server_time;

  const rng = createRng(`clawcraft:synth-world:${seed}`);
  const seedSlug = slugSeed(seed);

  const locs = base.locations.filter(hasPoint);
  if (locs.length === 0) {
    // Still return deterministic placeholders.
    const agents: WorldStateAgent[] = Array.from({ length: count }, (_, i) => ({
      username: `synth_${seedSlug}_${String(i + 1).padStart(5, "0")}`,
      guild_tag: null,
      run_id: null,
      level: 1,
      location: "Unknown",
      x: 0,
      y: 0,
      traveling: false,
      status: null
    }));
    return { ...base, agents: opts.only ? agents : base.agents.concat(agents) };
  }

  const locById = new Map(locs.map((l) => [l.id, l]));
  const synthetic: WorldStateAgent[] = [];

  const desiredPartyAgents = clampInt(Math.round(count * partyRate), 0, count);
  let partyRemaining = desiredPartyAgents;
  let synthIndex = 0;
  let partyIndex = 0;

  const makeAgent = (args: {
    runId: string | null;
    anchor: { x: number; y: number };
    from: WorldStateLocation & { x: number; y: number };
    to: WorldStateLocation & { x: number; y: number };
    traveling: boolean;
  }): WorldStateAgent => {
    const username = `synth_${seedSlug}_${String(++synthIndex).padStart(5, "0")}`;
    const level = rng.int(1, 30);
    const guildTag = makeGuildTag(rng);

    const j = jitter(rng, 14);
    const x = args.anchor.x + j.dx;
    const y = args.anchor.y + j.dy;

    const hasStatus = rng.next() < statusRate;
    const step = rng.int(1, 20);
    const status = hasStatus
      ? {
          step,
          text: makeStatusText({ rng, traveling: args.traveling, from: args.from.name, to: args.to.name }),
          location: args.from.name,
          traveling: args.traveling,
          traveling_toward: args.traveling ? args.to.name : null
        }
      : null;

    return {
      username,
      guild_tag: guildTag,
      run_id: args.runId,
      level,
      location: args.from.name,
      x,
      y,
      traveling: args.traveling,
      status
    };
  };

  // Parties first so we can reliably generate multi-agent run_id clusters.
  while (partyRemaining >= 2) {
    const size = Math.min(rng.int(2, 5), partyRemaining);
    partyRemaining -= size;

    const runId = `synth_run_${seedSlug}_${String(++partyIndex).padStart(3, "0")}`;
    const traveling = rng.next() < 0.5;
    const edge = pickEdge(rng, base, locById);
    const from = edge.from;
    const to = edge.to;

    const progress = rng.float(0, 1);
    const anchor = traveling
      ? { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress }
      : { x: pickLocationWeighted(rng, locs).x, y: pickLocationWeighted(rng, locs).y };

    for (let i = 0; i < size; i++) {
      synthetic.push(makeAgent({ runId, anchor, from, to, traveling }));
    }
  }

  // Remaining agents are solo.
  for (let i = synthetic.length; i < count; i++) {
    const traveling = rng.next() < 0.35;
    const edge = pickEdge(rng, base, locById);
    const from = edge.from;
    const to = edge.to;
    if (traveling) {
      const progress = rng.float(0, 1);
      const anchor = { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress };
      synthetic.push(makeAgent({ runId: null, anchor, from, to, traveling: true }));
    } else {
      const loc = pickLocationWeighted(rng, locs);
      const j = jitter(rng, 22);
      const anchor = { x: loc.x + j.dx, y: loc.y + j.dy };
      synthetic.push(makeAgent({ runId: null, anchor, from: loc, to: loc, traveling: false }));
    }
  }

  const baseAgents = opts.only ? [] : base.agents;
  return {
    ...base,
    agents: baseAgents.concat(synthetic)
  };
}

