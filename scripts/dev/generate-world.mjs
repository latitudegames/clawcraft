import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

function hashToUint32(seed) {
  // FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function createRng(seed) {
  const seedString = typeof seed === "number" ? String(seed) : seed;
  const nextRaw = mulberry32(hashToUint32(seedString));

  const int = (min, max) => {
    const span = max - min + 1;
    return min + Math.floor(nextRaw() * span);
  };

  const float = (min, max) => min + nextRaw() * (max - min);

  const pick = (items) => {
    if (!items.length) throw new Error("Cannot pick from empty array");
    return items[int(0, items.length - 1)];
  };

  const shuffle = (items) => {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  return { next: nextRaw, int, float, pick, shuffle };
}

function biomePhrase(tag) {
  switch (tag) {
    case "plains":
      return "sunlit meadows and warm farm roads";
    case "forest":
      return "shadowed pines and soft moss underfoot";
    case "desert":
      return "saffron dunes and mirage-bright horizons";
    case "snow":
      return "frosted passes and aurora-lit nights";
    case "mountain":
      return "jagged cliffs and stormy ridgelines";
    case "ruins":
      return "mossy stonework and half-forgotten halls";
    case "water":
      return "salt air, tidal coves, and distant bells";
    case "cave":
      return "echoing tunnels and glittering seams of ore";
    default:
      return "familiar roads and uncharted paths";
  }
}

function descriptionFor({ name, type, biomeTag }) {
  const vibe = biomePhrase(biomeTag);
  switch (type) {
    case "major_city":
      return `${name} is a bustling hub of trade and rumors, set amid ${vibe}.`;
    case "town":
      return `${name} is a cozy stop for travelers, known for friendly faces and ${vibe}.`;
    case "wild":
      return `${name} is untamed country where courage matters and ${vibe}.`;
    case "dungeon":
      return `${name} is a dangerous place whispered about in taverns, carved into ${vibe}.`;
    case "landmark":
      return `${name} is a famed landmark that draws adventurers, tied to ${vibe}.`;
    default:
      return `${name} is a notable place shaped by ${vibe}.`;
  }
}

function distCost(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const d = Math.hypot(dx, dy);
  // Keep distances in a familiar "2-8-ish" range most of the time.
  return Math.max(1, Math.min(12, Math.round(d / 120)));
}

function pointInRegion(rng, region) {
  const angle = rng.float(0, Math.PI * 2);
  const dist = Math.sqrt(rng.next()) * region.radius;
  const x = Math.round(region.center.x + Math.cos(angle) * dist);
  const y = Math.round(region.center.y + Math.sin(angle) * dist);
  return { x, y };
}

function uniqueName(base, used) {
  let name = base;
  let i = 2;
  while (used.has(name)) {
    name = `${base} ${i}`;
    i++;
  }
  used.add(name);
  return name;
}

function title(s) {
  return s
    .split(/\s+/g)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

const WORDS = {
  plains: {
    townPrefix: ["Sun", "Meadow", "Oak", "River", "Honey", "Golden", "Lark", "Cider", "Wheat", "Copper", "Briar"],
    townSuffix: ["Field", "Crossing", "Ridge", "Brook", "Market", "Haven", "Vale", "Gate", "Hearth", "Spring"],
    wildAdj: ["Golden", "Misty", "Breezy", "Thorny", "Shimmering", "Quiet", "Wide"],
    wildNoun: ["Meadow", "Steppe", "Glade", "Thicket", "Pasture", "Hollow", "Wilds"],
    dungeonAdj: ["Bandit", "Cursed", "Old", "Wailing", "Shadow", "Hollow", "Forgotten"],
    dungeonNoun: ["Hideout", "Crypt", "Catacombs", "Pit", "Tunnels", "Cellar", "Warren"],
    landmarkPrefix: ["Royal", "Sunlit", "Old", "Moonlit", "Gilded"],
    landmarkNoun: ["Observatory", "Shrine", "Monastery", "Watchtower", "Stone Circle"]
  },
  forest: {
    townPrefix: ["Pine", "Willow", "Moss", "Fern", "Briar", "Shade", "Whisper", "Acorn", "Fox", "Hollow"],
    townSuffix: ["Glen", "Hollow", "Grove", "Run", "Bridge", "Hearth", "Crossing", "Watch", "Vale", "Mill"],
    wildAdj: ["Whispering", "Shadowed", "Briar", "Mossy", "Fae", "Glimmering", "Quiet"],
    wildNoun: ["Woods", "Thicket", "Grove", "Glade", "Marsh", "Hollow", "Copse"],
    dungeonAdj: ["Spider", "Goblin", "Witch", "Root", "Hollow", "Moon", "Creeping"],
    dungeonNoun: ["Nest", "Cave", "Burrow", "Den", "Grotto", "Halls", "Hollow"],
    landmarkPrefix: ["Elder", "Moon", "Verdant", "Whispering", "Stag"],
    landmarkNoun: ["Shrine", "Tree", "Stone", "Gate", "Bridge"]
  },
  desert: {
    townPrefix: ["Saffron", "Amber", "Dune", "Mirage", "Salt", "Sun", "Cinder", "Caravan", "Spice", "Oasis"],
    townSuffix: ["Oasis", "Bazaar", "Wells", "Gate", "Camp", "Post", "Market", "Crossing", "Spire"],
    wildAdj: ["Burning", "Silent", "Glass", "Windworn", "Saffron", "Mirage", "Endless"],
    wildNoun: ["Dunes", "Wastes", "Flats", "Badlands", "Sands", "Steppe", "Saltpan"],
    dungeonAdj: ["Sunken", "Scorpion", "Cursed", "Sand", "Hollow", "Lost", "Ash"],
    dungeonNoun: ["Temple", "Tomb", "Vault", "Caverns", "Pit", "Ruins", "Crypt"],
    landmarkPrefix: ["Sun", "Mirage", "Saffron", "Wind", "Salt"],
    landmarkNoun: ["Spire", "Obelisk", "Lighthouse", "Monument", "Shrine"]
  },
  snow: {
    townPrefix: ["Frost", "Snow", "Aurora", "Ice", "Winter", "Glacier", "White", "Pale", "Silver"],
    townSuffix: ["Gate", "Haven", "Hold", "Pass", "Lodge", "Cairn", "Reach", "Watch", "Crossing"],
    wildAdj: ["Frozen", "Howling", "Aurora", "Icy", "White", "Windcut", "Silent"],
    wildNoun: ["Tundra", "Fields", "Pass", "Wastes", "Pines", "Fells", "Ridge"],
    dungeonAdj: ["Ice", "Frost", "Wyrm", "Buried", "Hollow", "Cursed", "Glacier"],
    dungeonNoun: ["Cavern", "Crypt", "Catacombs", "Crevasse", "Vault", "Depths", "Mine"],
    landmarkPrefix: ["Aurora", "Frost", "Ice", "Winter", "Star"],
    landmarkNoun: ["Sanctuary", "Spire", "Shrine", "Beacon", "Monastery"]
  },
  mountain: {
    townPrefix: ["High", "Stone", "Iron", "Cloud", "Storm", "Eagle", "Dragon", "Cedar", "Granite"],
    townSuffix: ["Spire", "Hold", "Forge", "Crest", "Pass", "Gate", "Lookout", "Crossing", "Quarry"],
    wildAdj: ["Windy", "Storm", "High", "Rocky", "Cloud", "Eagle", "Razor"],
    wildNoun: ["Cliffs", "Ridge", "Highlands", "Crags", "Slopes", "Pass", "Heights"],
    dungeonAdj: ["Deep", "Echo", "Crystal", "Wyrm", "Gloom", "Shadow", "Iron"],
    dungeonNoun: ["Mine", "Cave", "Depths", "Warren", "Grotto", "Chasm", "Halls"],
    landmarkPrefix: ["Dragon", "Demon King's", "Storm", "Sky", "High"],
    landmarkNoun: ["Peak", "Castle", "Bridge", "Spire", "Sanctum"]
  },
  ruins: {
    townPrefix: ["Old", "Ash", "Broken", "Shattered", "Moss", "Crumble", "Silent", "Dust"],
    townSuffix: ["Court", "Gate", "Archive", "Hall", "Ward", "Rest", "Crossing", "Keep"],
    wildAdj: ["Mossy", "Silent", "Broken", "Shattered", "Hushed", "Ashen", "Lost"],
    wildNoun: ["Ruins", "Courts", "Halls", "Stones", "Paths", "Gardens", "Steps"],
    dungeonAdj: ["Ancient", "Crumbling", "Cursed", "Hollow", "Shattered", "Forgotten", "Dust"],
    dungeonNoun: ["Catacombs", "Library", "Vault", "Crypt", "Passages", "Cells", "Chambers"],
    landmarkPrefix: ["Ancient", "Old", "Shattered", "Moss", "Silent"],
    landmarkNoun: ["Library", "Aqueduct", "Archive", "Tower", "Sanctuary"]
  },
  water: {
    townPrefix: ["Azure", "Coral", "Sea", "Wave", "Pearl", "Salt", "Harbor", "Tide", "Drift", "Reef"],
    townSuffix: ["Harbor", "Cove", "Lagoon", "Dock", "Reef", "Isle", "Quay", "Lighthouse", "Market"],
    wildAdj: ["Tidal", "Salt", "Sea", "Storm", "Pearl", "Foamy", "Drift"],
    wildNoun: ["Coast", "Shoals", "Reef", "Isles", "Coves", "Marsh", "Shallows"],
    dungeonAdj: ["Sunken", "Barnacle", "Salt", "Drowned", "Coral", "Deep", "Storm"],
    dungeonNoun: ["Temple", "Grotto", "Wreck", "Vault", "Caverns", "Crypt", "Trench"],
    landmarkPrefix: ["Pearl", "Azure", "Sea", "Storm", "Tide"],
    landmarkNoun: ["Lighthouse", "Beacon", "Shrine", "Bridge", "Spire"]
  }
};

const REGIONS = [
  { key: "plains", label: "Crown Plains", biome: "plains", center: { x: 1200, y: 900 }, radius: 420, majorName: "King's Landing", counts: { town: 7, wild: 3, dungeon: 3, landmark: 2 } },
  { key: "forest", label: "Whisperwood", biome: "forest", center: { x: 520, y: 1020 }, radius: 420, majorName: "Woodcrest", counts: { town: 6, wild: 4, dungeon: 4, landmark: 2 } },
  { key: "desert", label: "Saffron Dunes", biome: "desert", center: { x: 1180, y: 1560 }, radius: 420, majorName: "Sandport", counts: { town: 5, wild: 3, dungeon: 3, landmark: 2 } },
  { key: "snow", label: "Frostveil Expanse", biome: "snow", center: { x: 1220, y: 260 }, radius: 420, majorName: "Frostgate", counts: { town: 5, wild: 3, dungeon: 3, landmark: 2 } },
  { key: "mountain", label: "Dragonspine Range", biome: "mountain", center: { x: 1950, y: 560 }, radius: 460, majorName: "Highspire", counts: { town: 5, wild: 2, dungeon: 5, landmark: 3 } },
  { key: "ruins", label: "Shatterfall Ruins", biome: "ruins", center: { x: 700, y: 460 }, radius: 420, majorName: "Mossgate", counts: { town: 3, wild: 2, dungeon: 4, landmark: 3 } },
  { key: "water", label: "Azure Coast", biome: "water", center: { x: 2020, y: 1360 }, radius: 420, majorName: "Seastone Harbor", counts: { town: 4, wild: 2, dungeon: 3, landmark: 2 } }
];

function generateWorldLarge({ seed }) {
  const rng = createRng(seed);
  const usedNames = new Set();

  const locations = [];
  const byRegion = new Map();

  const add = (loc) => {
    const name = uniqueName(loc.name, usedNames);
    const record = {
      name,
      description: loc.description ?? descriptionFor({ name, type: loc.type, biomeTag: loc.biomeTag }),
      type: loc.type,
      biomeTag: loc.biomeTag ?? null,
      population: loc.population ?? 0,
      x: loc.x,
      y: loc.y
    };
    locations.push(record);
    const arr = byRegion.get(loc.regionKey) ?? [];
    arr.push(record);
    byRegion.set(loc.regionKey, arr);
    return record;
  };

  // Canonical POIs from the V1 docs (keep these stable).
  // Place them inside their themed regions so the map has recognizable anchors.
  add({
    regionKey: "plains",
    name: "King's Landing",
    type: "major_city",
    biomeTag: "plains",
    population: 240,
    x: 1200,
    y: 900
  });
  add({
    regionKey: "forest",
    name: "Whispering Woods",
    type: "wild",
    biomeTag: "forest",
    population: 12,
    x: 780,
    y: 1100
  });
  add({
    regionKey: "mountain",
    name: "Goblin Cave",
    type: "dungeon",
    biomeTag: "cave",
    population: 0,
    x: 1500,
    y: 1020
  });
  add({
    regionKey: "ruins",
    name: "Ancient Library",
    type: "landmark",
    biomeTag: "ruins",
    population: 0,
    x: 840,
    y: 320
  });
  add({
    regionKey: "mountain",
    name: "Dragon Peak",
    type: "landmark",
    biomeTag: "mountain",
    population: 0,
    x: 2140,
    y: 260
  });

  // Extra iconic landmarks called out in the game/design docs.
  add({
    regionKey: "mountain",
    name: "Demon King's Castle",
    type: "landmark",
    biomeTag: "mountain",
    population: 0,
    x: 2280,
    y: 520,
    description: "A black-stone fortress that looms over the range. No one agrees on whether it is abandoned."
  });
  add({
    regionKey: "water",
    name: "Sunken Temple",
    type: "dungeon",
    biomeTag: "water",
    population: 0,
    x: 2140,
    y: 1540
  });

  // Generate the rest of the world by region (stable layout + stable flavor).
  for (const region of REGIONS) {
    const theme = WORDS[region.key];

    const ensureMajorExists = locations.some((l) => l.name === region.majorName);
    if (!ensureMajorExists) {
      const p = pointInRegion(rng, region);
      add({
        regionKey: region.key,
        name: region.majorName,
        type: "major_city",
        biomeTag: region.biome,
        population: rng.int(160, 280),
        x: p.x,
        y: p.y
      });
    }

    const counts = region.counts;
    const existing = (byRegion.get(region.key) ?? []).slice();

    const typeCounts = {
      town: existing.filter((l) => l.type === "town").length,
      wild: existing.filter((l) => l.type === "wild").length,
      dungeon: existing.filter((l) => l.type === "dungeon").length,
      landmark: existing.filter((l) => l.type === "landmark").length
    };

    const remaining = {
      town: Math.max(0, counts.town - typeCounts.town),
      wild: Math.max(0, counts.wild - typeCounts.wild),
      dungeon: Math.max(0, counts.dungeon - typeCounts.dungeon),
      landmark: Math.max(0, counts.landmark - typeCounts.landmark)
    };

    for (let i = 0; i < remaining.town; i++) {
      const name = `${rng.pick(theme.townPrefix)} ${rng.pick(theme.townSuffix)}`;
      const p = pointInRegion(rng, region);
      add({
        regionKey: region.key,
        name: title(name),
        type: "town",
        biomeTag: region.biome,
        population: rng.int(20, 110),
        x: p.x,
        y: p.y
      });
    }

    for (let i = 0; i < remaining.wild; i++) {
      const name = `${rng.pick(theme.wildAdj)} ${rng.pick(theme.wildNoun)}`;
      const p = pointInRegion(rng, region);
      add({
        regionKey: region.key,
        name: title(name),
        type: "wild",
        biomeTag: region.biome,
        population: rng.int(5, 22),
        x: p.x,
        y: p.y
      });
    }

    for (let i = 0; i < remaining.dungeon; i++) {
      const name = `${rng.pick(theme.dungeonAdj)} ${rng.pick(theme.dungeonNoun)}`;
      const p = pointInRegion(rng, region);
      // Keep dungeons "cave-ish" when the region is mountain/forest.
      const biomeTag = region.biome === "mountain" || region.biome === "forest" ? rng.pick(["cave", region.biome]) : region.biome;
      add({
        regionKey: region.key,
        name: title(name),
        type: "dungeon",
        biomeTag,
        population: 0,
        x: p.x,
        y: p.y
      });
    }

    for (let i = 0; i < remaining.landmark; i++) {
      const name = `${rng.pick(theme.landmarkPrefix)} ${rng.pick(theme.landmarkNoun)}`;
      const p = pointInRegion(rng, region);
      add({
        regionKey: region.key,
        name: title(name),
        type: "landmark",
        biomeTag: region.biome,
        population: 0,
        x: p.x,
        y: p.y
      });
    }
  }

  // Connections: moderate density, mostly within regions, plus a few cross-region highways.
  const connections = [];
  const seen = new Set();

  const addEdge = (from, to) => {
    if (from.name === to.name) return;
    const a = from.name < to.name ? from.name : to.name;
    const b = from.name < to.name ? to.name : from.name;
    const key = `${a}::${b}`;
    if (seen.has(key)) return;
    seen.add(key);
    connections.push({ from: a, to: b, distance: distCost(from, to) });
  };

  for (const region of REGIONS) {
    const locals = byRegion.get(region.key) ?? [];
    for (const loc of locals) {
      const sorted = locals
        .filter((other) => other !== loc)
        .map((other) => ({ other, d: Math.hypot(loc.x - other.x, loc.y - other.y) }))
        .sort((a, b) => a.d - b.d);
      const desired = loc.type === "major_city" ? 4 : loc.type === "town" ? 3 : 2;
      for (const row of sorted.slice(0, desired)) addEdge(loc, row.other);
    }
  }

  const hubs = REGIONS.map((r) => {
    const locals = byRegion.get(r.key) ?? [];
    const major = locals.find((l) => l.type === "major_city") ?? locals[0];
    return { region: r, hub: major };
  }).filter((row) => row.hub);

  // Ring the hubs to guarantee global connectivity.
  for (let i = 0; i < hubs.length; i++) {
    const a = hubs[i];
    const b = hubs[(i + 1) % hubs.length];
    addEdge(a.hub, b.hub);
  }

  // Add a few extra highways from King's Landing to keep the world feeling "kingdom centered".
  const kingsLanding = locations.find((l) => l.name === "King's Landing") ?? null;
  if (kingsLanding) {
    for (const row of hubs) {
      if (row.hub.name === kingsLanding.name) continue;
      addEdge(kingsLanding, row.hub);
    }
  }

  // Ensure Ancient Library and Dragon Peak have some meaningful routes.
  const anchorNames = ["Ancient Library", "Dragon Peak", "Demon King's Castle"];
  for (const anchorName of anchorNames) {
    const anchor = locations.find((l) => l.name === anchorName);
    if (!anchor) continue;
    const nearest = locations
      .filter((l) => l !== anchor)
      .map((l) => ({ l, d: Math.hypot(anchor.x - l.x, anchor.y - l.y) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 4);
    for (const row of nearest) addEdge(anchor, row.l);
  }

  return { locations, connections };
}

async function main() {
  const seed = process.env.WORLD_SEED ?? "clawcraft:world:v1";
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const outDir = path.resolve(__dirname, "../../data/world");
  const outLarge = path.resolve(outDir, "world-v1-large.json");
  const outSmall = path.resolve(outDir, "world-v1-small.json");

  await fs.mkdir(outDir, { recursive: true });

  const large = generateWorldLarge({ seed });
  await fs.writeFile(outLarge, JSON.stringify(large, null, 2) + "\n", "utf8");

  const small = {
    locations: [
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
    ],
    connections: [
      { from: "King's Landing", to: "Whispering Woods", distance: 3 },
      { from: "King's Landing", to: "Goblin Cave", distance: 2 },
      { from: "King's Landing", to: "Ancient Library", distance: 4 },
      { from: "Whispering Woods", to: "Ancient Library", distance: 2 },
      { from: "Goblin Cave", to: "Dragon Peak", distance: 6 }
    ]
  };
  await fs.writeFile(outSmall, JSON.stringify(small, null, 2) + "\n", "utf8");

  console.log("World data generated:");
  console.log(`- ${outLarge}`);
  console.log(`- ${outSmall}`);
  console.log("");
  console.log(`Locations (large): ${large.locations.length}`);
  console.log(`Connections (large): ${large.connections.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

