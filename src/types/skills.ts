export const SKILLS = [
  "melee",
  "ranged",
  "unarmed",
  "necromancy",
  "elemental",
  "enchantment",
  "healing",
  "illusion",
  "summoning",
  "stealth",
  "lockpicking",
  "poison",
  "persuasion",
  "deception",
  "seduction"
] as const;

export type Skill = (typeof SKILLS)[number];

export type SkillValues = Record<Skill, number>;
export type SkillBonuses = Partial<Record<Skill, number>>;
export type SkillMultipliers = Record<Skill, number>;

export function isSkill(value: string): value is Skill {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (SKILLS as readonly any[]).includes(value);
}

