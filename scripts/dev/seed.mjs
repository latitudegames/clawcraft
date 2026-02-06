import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LOCATIONS = [
  {
    name: "King's Landing",
    description: "A bustling capital where new adventurers gather.",
    type: "major_city",
    biomeTag: "plains",
    population: 250,
    x: 400,
    y: 400
  },
  {
    name: "Whispering Woods",
    description: "A dense forest of half-heard rumors and hidden paths.",
    type: "wild",
    biomeTag: "forest",
    population: 15,
    x: 160,
    y: 560
  },
  {
    name: "Goblin Cave",
    description: "A cramped tunnel network crawling with opportunistic goblins.",
    type: "dungeon",
    biomeTag: "cave",
    population: 0,
    x: 640,
    y: 560
  },
  {
    name: "Ancient Library",
    description: "Ruins of a once-great archive, its stacks reclaimed by moss.",
    type: "landmark",
    biomeTag: "ruins",
    population: 0,
    x: 240,
    y: 160
  },
  {
    name: "Dragon Peak",
    description: "A jagged summit where the air tastes like lightning.",
    type: "landmark",
    biomeTag: "mountain",
    population: 0,
    x: 880,
    y: 160
  }
];

const CONNECTIONS = [
  ["King's Landing", "Whispering Woods", 3],
  ["King's Landing", "Goblin Cave", 2],
  ["King's Landing", "Ancient Library", 4],
  ["Whispering Woods", "Ancient Library", 2],
  ["Goblin Cave", "Dragon Peak", 6]
];

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
  console.log("Seeding locations…");
  for (const loc of LOCATIONS) {
    await prisma.location.upsert({
      where: { name: loc.name },
      create: loc,
      update: loc
    });
  }
}

async function upsertConnections() {
  console.log("Seeding connections…");
  const locations = await prisma.location.findMany({
    where: { name: { in: LOCATIONS.map((l) => l.name) } }
  });
  const byName = new Map(locations.map((l) => [l.name, l]));

  for (const [fromName, toName, distance] of CONNECTIONS) {
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
  await upsertLocations();
  await upsertConnections();
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
