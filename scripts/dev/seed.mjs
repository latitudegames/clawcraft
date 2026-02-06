import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const prisma = new PrismaClient();

async function loadWorldData() {
  const seedWorld = (process.env.SEED_WORLD ?? "large").toLowerCase();
  const allowed = new Set(["small", "large"]);
  const variant = allowed.has(seedWorld) ? seedWorld : "large";

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const worldPath = path.resolve(__dirname, "../../data/world", `world-v1-${variant}.json`);

  const raw = await fs.readFile(worldPath, "utf8");
  const json = JSON.parse(raw);
  const locations = Array.isArray(json?.locations) ? json.locations : [];
  const connections = Array.isArray(json?.connections) ? json.connections : [];

  if (locations.length === 0) throw new Error(`No locations found in world data: ${worldPath}`);
  return { variant, worldPath, locations, connections };
}

const ITEMS = [
  {
    id: "item_iron_helm",
    name: "Iron Helm",
    description: "A sturdy helm with a few dents from past brawls.",
    rarity: "common",
    slot: "head",
    skillBonuses: { melee: 1 }
  },
  {
    id: "item_goblin_dagger",
    name: "Goblin Dagger",
    description: "Small, sharp, and questionably clean.",
    rarity: "uncommon",
    slot: "right_hand",
    skillBonuses: { melee: 1, stealth: 1 }
  },
  {
    id: "item_shadow_cloak",
    name: "Shadow Cloak",
    description: "A cloak that drinks in lantern light.",
    rarity: "rare",
    slot: "chest",
    skillBonuses: { stealth: 3, deception: 3 }
  },
  {
    id: "item_boots_silence",
    name: "Boots of Silence",
    description: "Soft soles that refuse to squeak.",
    rarity: "rare",
    slot: "boots",
    skillBonuses: { stealth: 2, lockpicking: 1 }
  }
];

async function upsertLocations() {
  const world = await loadWorldData();
  console.log(`Seeding locations (${world.variant})…`);
  console.log(`World file: ${world.worldPath}`);
  for (const loc of world.locations) {
    await prisma.location.upsert({
      where: { name: loc.name },
      create: loc,
      update: loc
    });
  }

  return world;
}

async function upsertConnections(world) {
  console.log("Seeding connections…");
  const locations = await prisma.location.findMany({
    where: { name: { in: world.locations.map((l) => l.name) } }
  });
  const byName = new Map(locations.map((l) => [l.name, l]));

  for (const edge of world.connections) {
    const fromName = edge.from;
    const toName = edge.to;
    const distance = edge.distance;

    const from = byName.get(fromName);
    const to = byName.get(toName);
    if (!from || !to) throw new Error(`Missing location for connection ${fromName} -> ${toName}`);

    await prisma.locationConnection.upsert({
      where: { fromId_toId: { fromId: from.id, toId: to.id } },
      create: { fromId: from.id, toId: to.id, distance },
      update: { distance }
    });
    await prisma.locationConnection.upsert({
      where: { fromId_toId: { fromId: to.id, toId: from.id } },
      create: { fromId: to.id, toId: from.id, distance },
      update: { distance }
    });
  }
}

async function upsertItems() {
  console.log("Seeding items…");
  for (const item of ITEMS) {
    await prisma.item.upsert({
      where: { id: item.id },
      create: item,
      update: item
    });
  }
}

async function main() {
  const world = await upsertLocations();
  await upsertConnections(world);
  await upsertItems();
  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
