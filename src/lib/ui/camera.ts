export type Viewport = {
  width: number;
  height: number;
};

export type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type CameraTransform = {
  scale: number;
  x: number;
  y: number;
};

function assertFinite(n: number, name: string) {
  if (!Number.isFinite(n)) throw new Error(`${name} must be finite`);
}

export function computeFitTransform(args: {
  viewport: Viewport;
  bounds: Bounds;
  padding: number;
}): CameraTransform {
  assertFinite(args.viewport.width, "viewport.width");
  assertFinite(args.viewport.height, "viewport.height");
  assertFinite(args.bounds.minX, "bounds.minX");
  assertFinite(args.bounds.minY, "bounds.minY");
  assertFinite(args.bounds.maxX, "bounds.maxX");
  assertFinite(args.bounds.maxY, "bounds.maxY");
  assertFinite(args.padding, "padding");

  if (args.viewport.width <= 0) throw new Error("viewport.width must be > 0");
  if (args.viewport.height <= 0) throw new Error("viewport.height must be > 0");

  const minX = Math.min(args.bounds.minX, args.bounds.maxX);
  const minY = Math.min(args.bounds.minY, args.bounds.maxY);
  const maxX = Math.max(args.bounds.minX, args.bounds.maxX);
  const maxY = Math.max(args.bounds.minY, args.bounds.maxY);

  const boundsWidth = maxX - minX;
  const boundsHeight = maxY - minY;

  if (boundsWidth === 0 && boundsHeight === 0) {
    return {
      scale: 1,
      x: args.viewport.width / 2 - minX,
      y: args.viewport.height / 2 - minY
    };
  }

  const padding = Math.max(0, args.padding);
  const innerWidth = Math.max(1, args.viewport.width - padding * 2);
  const innerHeight = Math.max(1, args.viewport.height - padding * 2);

  const scaleX = boundsWidth === 0 ? Infinity : innerWidth / boundsWidth;
  const scaleY = boundsHeight === 0 ? Infinity : innerHeight / boundsHeight;
  const scale = Math.min(scaleX, scaleY);

  const extraX = innerWidth - boundsWidth * scale;
  const extraY = innerHeight - boundsHeight * scale;

  const x = padding + extraX / 2 - minX * scale;
  const y = padding + extraY / 2 - minY * scale;

  return { scale, x, y };
}

