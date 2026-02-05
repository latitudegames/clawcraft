export type WorldStateLocation = {
  id: string;
  name: string;
  type: string;
  x: number | null;
  y: number | null;
};

export type WorldStateAgentStatus = {
  step: number;
  text: string;
  location: string;
  traveling: boolean;
  traveling_toward: string | null;
};

export type WorldStateAgent = {
  username: string;
  guild_tag: string | null;
  level: number;
  location: string;
  x: number | null;
  y: number | null;
  traveling: boolean;
  status: WorldStateAgentStatus | null;
};

export type WorldStateResponse = {
  server_time: string;
  locations: WorldStateLocation[];
  agents: WorldStateAgent[];
};

