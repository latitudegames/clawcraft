"use client";

import { useQuery } from "@tanstack/react-query";

import { getAgentPublic } from "../agent";

export function useAgentPublic(username: string | null) {
  return useQuery({
    queryKey: ["agent", username],
    queryFn: () => getAgentPublic(username as string),
    enabled: Boolean(username),
    staleTime: 5_000,
    retry: 2
  });
}

