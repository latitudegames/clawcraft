import { fetchJson } from "./api";
import type { WorldStateResponse } from "../../types/world-state";

export type WorldStateQuery = {
  synth_agents?: number;
  synth_status?: number;
  synth_party?: number;
  synth_only?: boolean;
  synth_seed?: string;
};

export function getWorldState(query?: WorldStateQuery): Promise<WorldStateResponse> {
  const params = new URLSearchParams();
  if (query?.synth_agents != null) params.set("synth_agents", String(query.synth_agents));
  if (query?.synth_status != null) params.set("synth_status", String(query.synth_status));
  if (query?.synth_party != null) params.set("synth_party", String(query.synth_party));
  if (query?.synth_only) params.set("synth_only", "1");
  if (query?.synth_seed) params.set("synth_seed", query.synth_seed);

  const qs = params.toString();
  const path = qs ? `/api/world-state?${qs}` : "/api/world-state";
  return fetchJson<WorldStateResponse>(path, { cache: "no-store" });
}
