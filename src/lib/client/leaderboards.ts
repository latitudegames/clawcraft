import { fetchJson } from "./api";
import type { GuildLeaderboardResponse, PlayerLeaderboardResponse } from "../../types/leaderboards";

export function getPlayerLeaderboard(limit = 50): Promise<PlayerLeaderboardResponse> {
  return fetchJson<PlayerLeaderboardResponse>(`/api/leaderboard?limit=${encodeURIComponent(String(limit))}`, { cache: "no-store" });
}

export function getGuildLeaderboard(limit = 50): Promise<GuildLeaderboardResponse> {
  return fetchJson<GuildLeaderboardResponse>(`/api/leaderboard/guilds?limit=${encodeURIComponent(String(limit))}`, { cache: "no-store" });
}

