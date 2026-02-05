"use client";

import { useQuery } from "@tanstack/react-query";

import { getGuildLeaderboard, getPlayerLeaderboard } from "../leaderboards";

export function usePlayerLeaderboard(limit = 50) {
  return useQuery({
    queryKey: ["leaderboard", "players", limit],
    queryFn: () => getPlayerLeaderboard(limit),
    staleTime: 10_000,
    refetchInterval: 10_000,
    retry: 2
  });
}

export function useGuildLeaderboard(limit = 50) {
  return useQuery({
    queryKey: ["leaderboard", "guilds", limit],
    queryFn: () => getGuildLeaderboard(limit),
    staleTime: 10_000,
    refetchInterval: 10_000,
    retry: 2
  });
}

