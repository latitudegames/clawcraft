export type Point = { x: number; y: number };

import { createRng } from "../utils/rng";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function computeRoadPolyline(args: { from: Point; to: Point; seed: string }): Point[] {
  const dx = args.to.x - args.from.x;
  const dy = args.to.y - args.from.y;
  const len = Math.hypot(dx, dy);
  if (len <= 1e-6) return [args.from, args.to];

  const mx = (args.from.x + args.to.x) / 2;
  const my = (args.from.y + args.to.y) / 2;

  const nx = -dy / len;
  const ny = dx / len;

  const rng = createRng(args.seed);
  const sign = rng.next() < 0.5 ? -1 : 1;

  const base = clamp(len * 0.12, 6, 22);
  const magnitude = base * rng.float(0.85, 1.15);

  return [
    args.from,
    {
      x: mx + nx * sign * magnitude,
      y: my + ny * sign * magnitude
    },
    args.to
  ];
}
