export type PlayerLeaderboardRow = {
  rank: number;
  username: string;
  guild_tag: string | null;
  level: number;
  xp: number;
};

export type PlayerLeaderboardResponse = {
  leaderboard: PlayerLeaderboardRow[];
};

export type GuildLeaderboardRow = {
  rank: number;
  name: string;
  tag: string;
  total_gold: number;
};

export type GuildLeaderboardResponse = {
  leaderboard: GuildLeaderboardRow[];
};

