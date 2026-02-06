"use client";

import { useQuery } from "@tanstack/react-query";

import { getWorldState } from "../world-state";

const IS_DEV = process.env.NODE_ENV !== "production";
const DEV_POLL_MS = 2_000;
const PROD_POLL_MS = 5 * 60 * 1_000;

export function useWorldState() {
  return useQuery({
    queryKey: ["world-state"],
    queryFn: getWorldState,
    staleTime: IS_DEV ? DEV_POLL_MS : PROD_POLL_MS,
    refetchInterval: IS_DEV ? DEV_POLL_MS : PROD_POLL_MS,
    retry: 2
  });
}
