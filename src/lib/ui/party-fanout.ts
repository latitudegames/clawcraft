export type PartyFanOutOptions = {
  radius?: number;
  startAngleRadians?: number;
};

export function computePartyFanOutOffsets(
  memberIds: string[],
  opts?: PartyFanOutOptions
): Map<string, { dx: number; dy: number }> {
  const sorted = [...memberIds].sort((a, b) => a.localeCompare(b));
  const radius = opts?.radius ?? 12;
  const startAngle = opts?.startAngleRadians ?? -Math.PI / 2;

  const offsets = new Map<string, { dx: number; dy: number }>();
  if (sorted.length <= 1) {
    const only = sorted[0];
    if (only) offsets.set(only, { dx: 0, dy: 0 });
    return offsets;
  }

  const n = sorted.length;
  for (let i = 0; i < n; i++) {
    const angle = startAngle + (i / n) * Math.PI * 2;
    offsets.set(sorted[i], {
      dx: Math.cos(angle) * radius,
      dy: Math.sin(angle) * radius
    });
  }

  return offsets;
}

