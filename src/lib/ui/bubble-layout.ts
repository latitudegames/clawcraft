export type BubbleRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type BubbleLayoutInput = {
  id: string;
  anchorX: number;
  anchorY: number;
  width: number;
  height: number;
  priority?: number;
};

export type BubbleLayoutOutput = {
  id: string;
  left: number;
  top: number;
  rect: BubbleRect;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function rectForAnchor(args: { left: number; top: number; width: number; height: number }): BubbleRect {
  return {
    left: args.left - args.width / 2,
    top: args.top - args.height,
    right: args.left + args.width / 2,
    bottom: args.top
  };
}

function overlaps(a: BubbleRect, b: BubbleRect) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function layoutBubbles(args: {
  viewport: { width: number; height: number };
  bubbles: BubbleLayoutInput[];
  margin?: number;
  gap?: number;
  maxIterations?: number;
}): BubbleLayoutOutput[] {
  const margin = args.margin ?? 8;
  const gap = args.gap ?? 10;
  const maxIterations = args.maxIterations ?? 12;

  const bubbles = args.bubbles.map((bubble, index) => ({
    ...bubble,
    priority: bubble.priority ?? 0,
    index
  }));

  const sorted = [...bubbles].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (b.anchorY !== a.anchorY) return b.anchorY - a.anchorY;
    return a.index - b.index;
  });

  const placed: BubbleLayoutOutput[] = [];
  const byId = new Map<string, BubbleLayoutOutput>();

  for (const bubble of sorted) {
    const minX = margin + bubble.width / 2;
    const maxX = args.viewport.width - margin - bubble.width / 2;
    const minY = margin + bubble.height;
    const maxY = args.viewport.height - margin;

    const left = clamp(bubble.anchorX, minX, maxX);
    let top = clamp(bubble.anchorY, minY, maxY);

    let rect = rectForAnchor({ left, top, width: bubble.width, height: bubble.height });

    for (let i = 0; i < maxIterations; i++) {
      const collisions = placed.filter((p) => overlaps(rect, p.rect));
      if (collisions.length === 0) break;

      const nextTopRaw = Math.min(...collisions.map((c) => c.rect.top)) - gap;
      const nextTop = clamp(nextTopRaw, minY, maxY);
      if (nextTop === top) break;

      top = nextTop;
      rect = rectForAnchor({ left, top, width: bubble.width, height: bubble.height });
    }

    const out: BubbleLayoutOutput = { id: bubble.id, left, top, rect };
    placed.push(out);
    byId.set(bubble.id, out);
  }

  return args.bubbles.map((bubble) => {
    const out = byId.get(bubble.id);
    if (!out) throw new Error(`Missing bubble layout for ${bubble.id}`);
    return out;
  });
}
