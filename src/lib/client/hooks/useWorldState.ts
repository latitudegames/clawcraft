"use client";

import { useQuery } from "@tanstack/react-query";

import { getWorldState, type WorldStateQuery } from "../world-state";

const IS_DEV = process.env.NODE_ENV !== "production";
const DEV_POLL_MS = 2_000;
const PROD_POLL_MS = 5 * 60 * 1_000;

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
    staleTime: IS_DEV ? DEV_POLL_MS : PROD_POLL_MS,
    refetchInterval: IS_DEV ? DEV_POLL_MS : PROD_POLL_MS,
    retry: 2
  });
}
