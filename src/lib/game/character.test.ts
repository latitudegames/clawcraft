import assert from "node:assert/strict";
import test from "node:test";

import { parseSkillValues, validateCreateCharacterSkillAllocation } from "./character";

test("parseSkillValues builds a full SkillValues object", () => {
  const skills = parseSkillValues({ stealth: 10, lockpicking: 6, illusion: 4 });
  assert.equal(skills.stealth, 10);
  assert.equal(skills.lockpicking, 6);
  assert.equal(skills.illusion, 4);
  assert.equal(skills.melee, 0);
});

test("parseSkillValues rejects unknown skills", () => {
  let threw = false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parseSkillValues({ stealth: 10, not_a_skill: 10 } as any);
  } catch {
    threw = true;
  }
  assert.ok(threw);
});

test("validateCreateCharacterSkillAllocation enforces sum=20 and per-skill cap=10", () => {
  validateCreateCharacterSkillAllocation(parseSkillValues({ stealth: 10, lockpicking: 6, illusion: 4 }));

  for (const bad of [
    { stealth: 10, lockpicking: 10, illusion: 10 }, // sum too high
    { stealth: 11, lockpicking: 6, illusion: 3 }, // cap exceeded
    { stealth: -1, lockpicking: 10, illusion: 11 } // negative + cap exceeded
  ]) {
    let threw = false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validateCreateCharacterSkillAllocation(parseSkillValues(bad as any));
    } catch {
      threw = true;
    }
    assert.ok(threw);
  }
});

