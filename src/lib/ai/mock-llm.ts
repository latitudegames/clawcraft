import { createRng } from "../utils/rng";
import { SKILLS, type Skill, type SkillMultipliers } from "../../types/skills";
import type { QuestDefinition, QuestOutcome, QuestStatusUpdate } from "../../types/quests";

export type MockQuest = QuestDefinition;
export type MockStatusUpdate = QuestStatusUpdate;

const QUEST_NAME_PREFIXES = [
  "Clear",
  "Escort",
  "Investigate",
  "Recover",
  "Defend",
  "Rescue",
  "Deliver",
  "Hunt"
] as const;

const QUEST_NAME_TARGETS = [
  "the Goblin Cave",
  "the Whispering Woods",
  "the Ruined Watchtower",
  "the Lost Caravan",
  "the Bandit Camp",
  "the Ancient Library",
  "the Sunken Shrine",
  "the Dragon Peak"
] as const;

function formatQuestId(seed: string) {
  const rng = createRng(seed);
  const bytes = Array.from({ length: 16 }, () => rng.int(0, 255));
  const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `quest_${hex.slice(0, 12)}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function buildSkillMultipliers(seed: string): SkillMultipliers {
  const rng = createRng(seed);
  const shuffled = rng.shuffle(SKILLS);

  const highCount = rng.int(2, 3);
  const neutralCount = rng.int(5, 7);

  const highs = shuffled.slice(0, highCount);
  const neutrals = shuffled.slice(highCount, highCount + neutralCount);
  const lows = shuffled.slice(highCount + neutralCount);

  const multipliers = {} as SkillMultipliers;
  for (const s of highs) multipliers[s] = Number(rng.float(1.3, 1.8).toFixed(1));
  for (const s of neutrals) multipliers[s] = Number(rng.float(0.7, 1.0).toFixed(1));
  for (const s of lows) multipliers[s] = Number(rng.float(0.0, 0.5).toFixed(1));

  // Ensure a couple skills can be "perfect" (1.8-2.0) sometimes.
  if (rng.int(0, 3) === 0) {
    const perfect = rng.pick(highs);
    multipliers[perfect] = Number(rng.float(1.8, 2.0).toFixed(1));
  }

  return multipliers;
}

function defaultRewards(challengeRating: number, partySize: number) {
  // Roughly in the same ballpark as the design doc examples; tune later.
  const baseXp = Math.round(clamp(50 + challengeRating * 2.5, 60, 800));
  const baseGold = Math.round(clamp(30 + challengeRating * 2.0, 30, 720));

  // Party quests feel bigger.
  const partyBoost = 1 + Math.max(0, partySize - 1) * 0.15;

  const successXp = Math.round(baseXp * partyBoost);
  const successGold = Math.round(baseGold * partyBoost);
  return {
    success: { xp: successXp, gold: successGold },
    partial: { xp: Math.round(successXp * 0.5), gold: Math.round(successGold * 0.4) }
  };
}

export function mockGenerateQuest(input: {
  origin: string;
  destinations: string[];
  nearbyPois?: string[];
  partySize?: number;
  challengeRating?: number;
  seed?: string | number;
}): QuestDefinition {
  const seed = String(input.seed ?? `${input.origin}:${input.destinations.join(",")}:${input.partySize ?? 1}`);
  const rng = createRng(seed);

  const partySize = input.partySize ?? (rng.int(0, 3) === 0 ? rng.int(2, 5) : 1);
  const destination = rng.pick(input.destinations);

  const failDestination =
    partySize === 1 && rng.int(0, 4) === 0
      ? rng.pick(input.destinations.filter((d) => d !== destination))
      : null;

  const challengeRating = input.challengeRating ?? rng.int(10, 180);
  const name = `${rng.pick(QUEST_NAME_PREFIXES)} ${rng.pick(QUEST_NAME_TARGETS)}`;

  const description = [
    `A call for help has reached ${input.origin}.`,
    partySize === 1
      ? `A lone adventurer is needed to handle the trouble near ${destination}.`
      : `A party of ${partySize} is assembling to face the danger near ${destination}.`,
    `Return with proof and the locals will reward you.`
  ].join(" ");

  const nearby = (input.nearbyPois ?? [input.origin, destination, failDestination].filter(Boolean)) as string[];
  const nearbyUnique = Array.from(new Set(nearby)).slice(0, 3);
  while (nearbyUnique.length < 2) nearbyUnique.push(input.origin);

  return {
    quest_id: formatQuestId(seed),
    name,
    description,
    origin: input.origin,
    destination,
    fail_destination: failDestination,
    nearby_pois_for_journey: nearbyUnique,
    challenge_rating: challengeRating,
    party_size: partySize,
    skill_multipliers: buildSkillMultipliers(seed),
    rewards: defaultRewards(challengeRating, partySize)
  };
}

export function mockGenerateStatusUpdates(input: {
  quest: MockQuest;
  agent: {
    username: string;
    skills_chosen: Skill[];
    custom_action: string;
  };
  outcome: QuestOutcome;
  party_members?: string[] | null;
  seed?: string | number;
}): QuestStatusUpdate[] {
  const seed = String(input.seed ?? `${input.quest.quest_id}:${input.agent.username}:${input.outcome}`);
  const rng = createRng(seed);

  const availableLocations = [
    input.quest.origin,
    input.quest.destination,
    ...(input.quest.fail_destination ? [input.quest.fail_destination] : []),
    ...input.quest.nearby_pois_for_journey
  ];
  const uniqueLocations = Array.from(new Set(availableLocations));

  const destination = input.outcome === "failure" && input.quest.fail_destination ? input.quest.fail_destination : input.quest.destination;

  const partyText =
    input.party_members && input.party_members.length > 1
      ? ` with ${rng.pick(input.party_members.filter((m) => m !== input.agent.username))}`
      : "";

  const skillHint = input.agent.skills_chosen.length
    ? ` (${input.agent.skills_chosen.join(", ")})`
    : "";

  const intro = [
    `Leaving ${input.quest.origin} at ${rng.pick(["dawn", "dusk", "midday", "nightfall"])}${partyText}.`,
    `Approach: ${input.agent.custom_action.slice(0, 120)}${input.agent.custom_action.length > 120 ? "…" : ""}`
  ];

  const setbacks =
    input.outcome === "success"
      ? ["A close call, but you keep moving.", "A clever trick avoids trouble."]
      : input.outcome === "partial"
        ? ["You lose time to a detour.", "A complication forces improvisation."]
        : ["Everything goes wrong at once.", "A sudden ambush breaks your momentum."];

  const endings =
    input.outcome === "success"
      ? [`Victory at ${destination}!`, "You return with proof and a story worth telling."]
      : input.outcome === "partial"
        ? [`You reach ${destination}, battered but standing.`, "The reward is smaller, but you live to quest again."]
        : [`You wash up at ${destination}.`, "No reward—just a hard lesson and a long walk back."];

  const updates: MockStatusUpdate[] = [];

  // Build a simple travel cadence: alternate between "at POI" and "traveling" updates.
  for (let step = 1; step <= 20; step++) {
    const traveling = step % 2 === 0;
    const isFirst = step === 1;
    const isLast = step === 20;

    const location = isFirst
      ? input.quest.origin
      : isLast
        ? destination
        : traveling
          ? rng.pick(uniqueLocations)
          : rng.pick(uniqueLocations);

    const travelingToward = traveling ? destination : undefined;

    let text: string;
    if (isFirst) {
      text = rng.pick(intro) + skillHint;
    } else if (isLast) {
      text = rng.pick(endings);
    } else {
      const beat =
        step % 5 === 0
          ? rng.pick(setbacks)
          : rng.pick([
              "The path is quiet, almost too quiet.",
              "You spot tracks and adjust your route.",
              "A local rumor points the way forward.",
              "You pause to regroup and check supplies.",
              "A strange sign marks the road ahead."
            ]);
      text = `${beat}${skillHint}`;
    }

    updates.push({
      step,
      text,
      location,
      traveling,
      ...(travelingToward ? { traveling_toward: travelingToward } : {})
    });
  }

  return updates;
}
