export type Rng = {
  next: () => number; // [0, 1)
  int: (min: number, max: number) => number; // inclusive
  float: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
  shuffle: <T>(items: readonly T[]) => T[];
};

function hashToUint32(seed: string): number {
  // FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: string | number): Rng {
  const seedString = typeof seed === "number" ? String(seed) : seed;
  const nextRaw = mulberry32(hashToUint32(seedString));

  const int = (min: number, max: number) => {
    if (!Number.isFinite(min) || !Number.isFinite(max)) throw new Error("min/max must be finite numbers");
    if (max < min) throw new Error("max must be >= min");
    const span = max - min + 1;
    return min + Math.floor(nextRaw() * span);
  };

  const float = (min: number, max: number) => {
    if (!Number.isFinite(min) || !Number.isFinite(max)) throw new Error("min/max must be finite numbers");
    if (max < min) throw new Error("max must be >= min");
    return min + nextRaw() * (max - min);
  };

  const pick = <T,>(items: readonly T[]) => {
    if (items.length === 0) throw new Error("Cannot pick from empty array");
    return items[int(0, items.length - 1)];
  };

  const shuffle = <T,>(items: readonly T[]) => {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  return { next: nextRaw, int, float, pick, shuffle };
}

