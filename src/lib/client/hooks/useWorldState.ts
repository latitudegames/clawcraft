"use client";

import { useQuery } from "@tanstack/react-query";

import { getWorldState, type WorldStateQuery } from "../world-state";

const DEV_POLL_MS = 2_000;
const PROD_POLL_MS = 5 * 60 * 1_000;
const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const DEMO_POLL_MS = (() => {
  const raw = process.env.NEXT_PUBLIC_DEMO_POLL_MS;
  if (!raw) return DEV_POLL_MS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return DEV_POLL_MS;
  return Math.max(500, Math.min(60_000, n));
})();

const POLL_MS = process.env.NODE_ENV !== "production" ? DEV_POLL_MS : IS_DEMO ? DEMO_POLL_MS : PROD_POLL_MS;

export function useWorldState(query?: WorldStateQuery) {
  return useQuery({
    queryKey: [
      "world-state",
      query?.synth_agents ?? null,
      query?.synth_status ?? null,
      query?.synth_party ?? null,
      query?.synth_only ?? null,
      query?.synth_seed ?? null
    ],
    queryFn: () => getWorldState(query),
    staleTime: POLL_MS,
    refetchInterval: POLL_MS,
    retry: 2
  });
}
