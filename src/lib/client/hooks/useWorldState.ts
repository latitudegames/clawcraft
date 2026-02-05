"use client";

import { useQuery } from "@tanstack/react-query";

import { getWorldState } from "../world-state";

export function useWorldState() {
  return useQuery({
    queryKey: ["world-state"],
    queryFn: getWorldState,
    staleTime: 2_000,
    refetchInterval: 2_000,
    retry: 2
  });
}

