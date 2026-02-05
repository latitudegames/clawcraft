import { fetchJson } from "./api";
import type { AgentPublicResponse } from "../../types/agent-public";

export function getAgentPublic(username: string): Promise<AgentPublicResponse> {
  return fetchJson<AgentPublicResponse>(`/api/agent/${encodeURIComponent(username)}`, { cache: "no-store" });
}

