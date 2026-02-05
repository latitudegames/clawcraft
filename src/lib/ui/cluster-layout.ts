export type ClusterPoint = {
  id: string;
  x: number;
  y: number;
};

export type ClusterLayoutOptions = {
  radius?: number;
  quantizeFactor?: number;
};

function quantize(n: number, factor: number): number {
  return Math.round(n * factor) / factor;
}

export function computeClusterOffsets(
  points: ClusterPoint[],
  opts?: ClusterLayoutOptions
): Map<string, { dx: number; dy: number }> {
  const radius = opts?.radius ?? 10;
  const quantizeFactor = opts?.quantizeFactor ?? 10;

  const groups = new Map<string, ClusterPoint[]>();
  for (const p of points) {
    const key = `${quantize(p.x, quantizeFactor)}:${quantize(p.y, quantizeFactor)}`;
    const arr = groups.get(key);
    if (arr) arr.push(p);
    else groups.set(key, [p]);
  }

  const offsets = new Map<string, { dx: number; dy: number }>();
  for (const group of groups.values()) {
    if (group.length <= 1) {
      const only = group[0];
      if (only) offsets.set(only.id, { dx: 0, dy: 0 });
      continue;
    }

    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
    const n = sorted.length;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2;
      offsets.set(sorted[i].id, {
        dx: Math.cos(angle) * radius,
        dy: Math.sin(angle) * radius
      });
    }
  }

  return offsets;
}

