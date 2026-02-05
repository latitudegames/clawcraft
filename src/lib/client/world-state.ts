import { fetchJson } from "./api";
import type { WorldStateResponse } from "../../types/world-state";

export function getWorldState(): Promise<WorldStateResponse> {
  return fetchJson<WorldStateResponse>("/api/world-state", { cache: "no-store" });
}

