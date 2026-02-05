import { createRng } from "@/lib/utils/rng";

export const AGENT_SPRITE_KEYS = ["fox-rogue", "cat-mage", "hamster-knight"] as const;
export type AgentSpriteKey = (typeof AGENT_SPRITE_KEYS)[number];

export function agentSpriteKeyForUsername(username: string): AgentSpriteKey {
  const idx = createRng(username).int(0, AGENT_SPRITE_KEYS.length - 1);
  return AGENT_SPRITE_KEYS[idx];
}

export function agentSpriteUrlForUsername(username: string): string {
  const key = agentSpriteKeyForUsername(username);
  return `/assets/agents/${key}.png`;
}

