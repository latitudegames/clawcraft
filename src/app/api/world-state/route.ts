import { NextResponse } from "next/server";

import { DEV_CONFIG } from "@/config/dev-mode";
import { prisma } from "@/lib/db/prisma";
import { scaleDurationMs, questStepInfoAt } from "@/lib/game/timing";
import { withSyntheticAgents } from "@/lib/game/synthetic-world-state";
import { resolveQuestRun } from "@/lib/server/resolve-quest-run";
import { createAsyncTtlCache } from "@/lib/utils/async-ttl-cache";
import type { WorldStateResponse } from "@/types/world-state";

export const runtime = "nodejs";

const COOLDOWN_MS = 12 * 60 * 60 * 1000;
const STATUS_INTERVAL_MS = 30 * 60 * 1000;
const STATUS_STEPS = 20;
const WORLD_STATE_CACHE_TTL_MS = 1_000;
const SYNTH_AGENT_MAX = 5_000;

const worldStateCache = createAsyncTtlCache<WorldStateResponse>({ ttlMs: WORLD_STATE_CACHE_TTL_MS });
const worldSkeletonCache = createAsyncTtlCache<WorldStateResponse>({ ttlMs: WORLD_STATE_CACHE_TTL_MS });

function cooldownMs() {
  return DEV_CONFIG.DEV_MODE ? scaleDurationMs(COOLDOWN_MS, DEV_CONFIG.TIME_SCALE) : COOLDOWN_MS;
}

function statusIntervalMs() {
  return DEV_CONFIG.DEV_MODE ? scaleDurationMs(STATUS_INTERVAL_MS, DEV_CONFIG.TIME_SCALE) : STATUS_INTERVAL_MS;
}

async function computeWorldSkeleton(): Promise<WorldStateResponse> {
  const now = new Date();

  const locations = await prisma.location.findMany({
    select: { id: true, name: true, type: true, biomeTag: true, x: true, y: true }
  });

  const rawConnections = await prisma.locationConnection.findMany({
    select: { fromId: true, toId: true, distance: true }
  });
  const seenEdges = new Set<string>();
  const connections = [];
  for (const c of rawConnections) {
    const a = c.fromId;
    const b = c.toId;
    const fromId = a < b ? a : b;
    const toId = a < b ? b : a;
    const key = `${fromId}:${toId}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    connections.push({ from_id: fromId, to_id: toId, distance: c.distance });
  }

  return {
    server_time: now.toISOString(),
    locations: locations.map((l) => ({
      id: l.id,
      name: l.name,
      type: l.type,
      biome_tag: l.biomeTag ?? null,
      x: l.x,
      y: l.y
    })),
    connections,
    agents: []
  };
}

async function computeWorldState(): Promise<WorldStateResponse> {
  const now = new Date();

  const locations = await prisma.location.findMany({
    select: { id: true, name: true, type: true, biomeTag: true, x: true, y: true }
  });

  const rawConnections = await prisma.locationConnection.findMany({
    select: { fromId: true, toId: true, distance: true }
  });
  const seenEdges = new Set<string>();
  const connections = [];
  for (const c of rawConnections) {
    const a = c.fromId;
    const b = c.toId;
    const fromId = a < b ? a : b;
    const toId = a < b ? b : a;
    const key = `${fromId}:${toId}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    connections.push({ from_id: fromId, to_id: toId, distance: c.distance });
  }

  const agents = await prisma.agent.findMany({
    include: { guild: true, location: true }
  });

  const activeRuns = await prisma.questRun.findMany({
    where: { resolvedAt: null, participants: { some: { agentId: { in: agents.map((a) => a.id) } } } },
    include: {
      participants: { select: { agentId: true } },
      statusUpdates: { include: { location: true, travelingToward: true }, orderBy: { step: "asc" } }
    }
  });

  const runByAgentId = new Map<string, (typeof activeRuns)[number]>();
  for (const run of activeRuns) {
    const resolvesAt = new Date(run.startedAt.getTime() + cooldownMs());
    if (now >= resolvesAt) {
      await resolveQuestRun(run.id, now);
      continue;
    }
    for (const p of run.participants) runByAgentId.set(p.agentId, run);
  }

  return {
    server_time: now.toISOString(),
    locations: locations.map((l) => ({
      id: l.id,
      name: l.name,
      type: l.type,
      biome_tag: l.biomeTag ?? null,
      x: l.x,
      y: l.y
    })),
    connections,
    agents: agents.map((a) => {
      const run = runByAgentId.get(a.id);
      if (!run) {
        return {
          username: a.username,
          guild_tag: a.guild?.tag ?? null,
          run_id: null,
          level: a.level,
          location: a.location.name,
          x: a.location.x,
          y: a.location.y,
          traveling: false,
          status: null
        };
      }

      const info = questStepInfoAt({
        startedAtMs: run.startedAt.getTime(),
        nowMs: now.getTime(),
        stepIntervalMs: statusIntervalMs(),
        totalSteps: STATUS_STEPS
      });

      const current = run.statusUpdates[info.step - 1] ?? null;
      const prev = run.statusUpdates[Math.max(0, info.step - 2)] ?? current;

      const fromLoc = prev?.location ?? current?.location ?? a.location;
      const toLoc = current?.travelingToward ?? current?.location ?? a.location;

      const fromX = fromLoc?.x ?? 0;
      const fromY = fromLoc?.y ?? 0;
      const toX = toLoc?.x ?? fromX;
      const toY = toLoc?.y ?? fromY;

      const traveling = Boolean(current?.traveling && current?.travelingToward);
      const x = traveling ? fromX + (toX - fromX) * info.progress : current?.location?.x ?? fromX;
      const y = traveling ? fromY + (toY - fromY) * info.progress : current?.location?.y ?? fromY;

      const status = current
        ? {
            step: current.step,
            text: current.text,
            location: current.location.name,
            traveling: current.traveling,
            traveling_toward: current.travelingToward?.name ?? null
          }
        : null;

      return {
        username: a.username,
        guild_tag: a.guild?.tag ?? null,
        run_id: run.id,
        level: a.level,
        location: fromLoc?.name ?? a.location.name,
        x,
        y,
        traveling,
        status
      };
    })
  };
}

function parseIntParam(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function parseFloatParam(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (!raw) return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

function parseBoolParam(params: URLSearchParams, key: string): boolean {
  const raw = params.get(key);
  return raw === "1" || raw === "true" || raw === "yes";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const synthAgentsRaw = parseIntParam(searchParams, "synth_agents");
  const synthAgents = synthAgentsRaw !== null ? Math.max(0, Math.min(SYNTH_AGENT_MAX, synthAgentsRaw)) : null;
  const synthOnly = parseBoolParam(searchParams, "synth_only");

  // Synthetic agent mode is meant for local profiling. Avoid exposing it on "forced" demo environments.
  const allowSynth = DEV_CONFIG.DEV_MODE && !DEV_CONFIG.FORCED;

  const state = synthOnly && allowSynth && synthAgents && synthAgents > 0
    ? await worldSkeletonCache.get(computeWorldSkeleton)
    : await worldStateCache.get(computeWorldState);

  // Dev-only load testing mode: append synthetic agents for stress testing Pixi + bubble overlay behavior.
  // Production should ignore these query params.
  if (!allowSynth) return NextResponse.json(state);
  if (!synthAgents || synthAgents <= 0) return NextResponse.json(state);

  const seed = searchParams.get("synth_seed") ?? undefined;
  const synthStatus = parseFloatParam(searchParams, "synth_status") ?? undefined;
  const synthParty = parseFloatParam(searchParams, "synth_party") ?? undefined;

  const next = withSyntheticAgents(state, {
    count: synthAgents,
    seed,
    statusRate: synthStatus,
    partyRate: synthParty,
    only: synthOnly
  });

  return NextResponse.json(next);
}
