import { SKILLS, isSkill, type SkillValues } from "../../types/skills";

export function parseSkillValues(input: unknown): SkillValues {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("skills must be an object");

  const raw = input as Record<string, unknown>;
  const out = {} as SkillValues;
  for (const skill of SKILLS) out[skill] = 0;

  for (const [key, value] of Object.entries(raw)) {
    if (!isSkill(key)) throw new Error(`Unknown skill: ${key}`);
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      throw new Error(`Skill '${key}' must be an integer >= 0`);
    }
    out[key] = value;
  }

  return out;
}

export function validateCreateCharacterSkillAllocation(skills: SkillValues): void {
  let total = 0;
  for (const skill of SKILLS) {
    const value = skills[skill];
    if (!Number.isInteger(value) || value < 0) throw new Error(`Skill '${skill}' must be an integer >= 0`);
    if (value > 10) throw new Error(`Skill '${skill}' exceeds creation cap (10)`);
    total += value;
  }
  if (total !== 20) throw new Error("You must allocate exactly 20 total skill points at creation");
}
