"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Application, Assets, Container, Graphics, Sprite, Text, Texture, TextureStyle, TilingSprite } from "pixi.js";
import type { PointerEvent, WheelEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useElementSize } from "@/lib/client/hooks/useElementSize";
import { groupBubbleCandidates, selectBubbleGroups } from "@/lib/ui/bubble-groups";
import { layoutBubbles } from "@/lib/ui/bubble-layout";
import { computeCenterTransform, computeFitTransform, type CameraTransform } from "@/lib/ui/camera";
import { computeClusterOffsets } from "@/lib/ui/cluster-layout";
import { bubbleLimitForScale, shouldShowLocationLabels } from "@/lib/ui/declutter";
import { computePartyFanOutOffsets } from "@/lib/ui/party-fanout";
import { computeRoadPolyline } from "@/lib/ui/roads";
import type { AgentSpriteKey } from "@/lib/ui/sprites";
import { AGENT_SPRITE_KEYS, agentSpriteKeyForUsername } from "@/lib/ui/sprites";
import { createRng } from "@/lib/utils/rng";
import type { WorldStateResponse } from "@/types/world-state";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const MIN_SCALE = 0.35;
const MAX_SCALE = 8;
const AGENT_SPRITE_SCALE = 0.3;
const AGENT_SPRITE_SIZE_WORLD = 64 * AGENT_SPRITE_SCALE;
const POI_ICON_SCALE = 0.25;
const POI_ICON_SIZE_WORLD = 128 * POI_ICON_SCALE;
const BUBBLE_MAX_WIDTH_PX = 180;
const PARTY_BUBBLE_MAX_WIDTH_PX = 240;
const AGENT_CLUSTER_RADIUS_WORLD = 10;
const PARTY_HOVER_FAN_OUT_RADIUS_WORLD = 12;
const POI_HIT_RADIUS_PX = 24;
const LOCATION_GROUPING_MAX_SCALE = 1.35;
const LOCATION_GROUPING_RADIUS_WORLD = 72;

const BIOME_TILE_SIZE = 64;
const TERRAIN_PADDING_WORLD = 900;

function cssVar(name: string): string | null {
  if (typeof window === "undefined") return null;
  const value = getComputedStyle(document.body).getPropertyValue(name).trim();
  return value ? value : null;
}

function makeBiomeTileCanvas(tag: string): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = BIOME_TILE_SIZE;
  canvas.height = BIOME_TILE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Deterministic pixel noise per biome tag so the look is stable between renders.
  const rng = createRng(`clawcraft:biome-tile:${tag}`);

  const fill = (color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, BIOME_TILE_SIZE, BIOME_TILE_SIZE);
  };

  const dot = (x: number, y: number, color: string, w = 1, h = 1) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  const sprinkle = (count: number, colors: string[], maxSize = 2) => {
    for (let i = 0; i < count; i++) {
      const x = rng.int(0, BIOME_TILE_SIZE - 1);
      const y = rng.int(0, BIOME_TILE_SIZE - 1);
      const w = rng.int(1, maxSize);
      const h = rng.int(1, maxSize);
      dot(x, y, rng.pick(colors), w, h);
    }
  };

  // Palette from the design spec (keep warm + saturated).
  const grassLight = "#7EC850";
  const grassDark = "#5B8C3E";
  const waterShallow = "#6CCFF6";
  const waterDeep = "#3A8DBF";
  const sand = "#E8D170";
  const dirt = "#C9A567";
  const stone = "#8B9BB4";
  const snow = "#F0F4F8";

  switch (tag) {
    case "forest": {
      fill(grassDark);
      sprinkle(260, ["#4C7A34", "#5B8C3E", "#6AA54A"], 2);
      sprinkle(24, ["#2E4A23"], 3);
      break;
    }
    case "cave":
    case "mountain": {
      fill(stone);
      sprinkle(240, ["#7A8AA2", "#8B9BB4", "#97A7C0"], 2);
      sprinkle(18, ["#5B6C84"], 3);
      break;
    }
    case "ruins": {
      fill(stone);
      sprinkle(220, ["#7A8AA2", "#8B9BB4", "#97A7C0"], 2);
      // Mossy hints.
      sprinkle(26, ["#5B8C3E", "#6AA54A"], 2);
      break;
    }
    case "snow": {
      fill(snow);
      sprinkle(220, ["#E6EEF6", "#F0F4F8", "#DDE6F0"], 2);
      sprinkle(14, ["#8B9BB4"], 2);
      break;
    }
    case "water": {
      fill(waterShallow);
      // Simple wave bands.
      for (let y = 0; y < BIOME_TILE_SIZE; y += 6) {
        const offset = rng.int(0, 2);
        for (let x = offset; x < BIOME_TILE_SIZE; x += 12) {
          dot(x, y, waterDeep, 7, 2);
        }
      }
      sprinkle(18, ["#AEEBFF"], 2);
      break;
    }
    case "desert": {
      fill(sand);
      sprinkle(220, ["#D8BF5E", "#E8D170", "#F1DE8A"], 2);
      sprinkle(10, [dirt], 2);
      break;
    }
    case "plains":
    default: {
      fill(grassLight);
      sprinkle(240, ["#6FB842", "#7EC850", "#8DDC5D"], 2);
      // Tiny warm flower pixels (very subtle).
      sprinkle(10, ["#FFD859", "#FF6B6B", "#87CEEB"], 1);
      break;
    }
  }

  return canvas;
}

const DECOR_CANVAS_SIZE = 32;

function makeBiomeDecorationCanvas(tag: string): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = DECOR_CANVAS_SIZE;
  canvas.height = DECOR_CANVAS_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const rng = createRng(`clawcraft:biome-decor:${tag}`);
  const dot = (x: number, y: number, color: string, w = 1, h = 1) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  const circle = (cx: number, cy: number, r: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };

  const grassDark = "#5B8C3E";
  const grassLight = "#7EC850";
  const stone = "#8B9BB4";
  const waterDeep = "#3A8DBF";
  const waterShallow = "#6CCFF6";
  const sand = "#E8D170";
  const snow = "#F0F4F8";

  ctx.clearRect(0, 0, DECOR_CANVAS_SIZE, DECOR_CANVAS_SIZE);

  switch (tag) {
    case "forest": {
      // Simple tree cluster.
      for (let i = 0; i < 4; i++) {
        const cx = rng.int(8, 24);
        const cy = rng.int(10, 22);
        circle(cx, cy, rng.int(5, 7), rng.pick([grassDark, "#4C7A34", "#6AA54A"]));
        // trunk
        dot(cx - 1, cy + 5, "#4A3728", 2, 3);
      }
      break;
    }
    case "plains": {
      // Tiny flower tufts.
      for (let i = 0; i < 14; i++) {
        const x = rng.int(4, 27);
        const y = rng.int(6, 27);
        dot(x, y, rng.pick(["#FFD859", "#FF6B6B", "#87CEEB"]), 1, 1);
        if (rng.int(0, 3) === 0) dot(x + 1, y, grassLight, 1, 1);
      }
      break;
    }
    case "ruins": {
      // Broken stone + moss.
      for (let i = 0; i < 3; i++) {
        const x = rng.int(6, 18);
        const y = rng.int(8, 18);
        dot(x, y, rng.pick([stone, "#7A8AA2", "#97A7C0"]), 10, 6);
        dot(x + 2, y + 2, "#5B8C3E", 4, 2);
      }
      break;
    }
    case "cave":
    case "mountain": {
      // Rock cluster.
      for (let i = 0; i < 4; i++) {
        const x = rng.int(6, 20);
        const y = rng.int(10, 22);
        dot(x, y, rng.pick([stone, "#7A8AA2", "#97A7C0"]), rng.int(6, 10), rng.int(3, 6));
      }
      break;
    }
    case "water": {
      // Lily pads / ripples.
      for (let i = 0; i < 4; i++) {
        const cx = rng.int(8, 24);
        const cy = rng.int(8, 24);
        circle(cx, cy, rng.int(4, 6), rng.pick([waterDeep, waterShallow]));
        dot(cx, cy, "#AEEBFF", 1, 1);
      }
      break;
    }
    case "desert": {
      // Cactus-ish blobs.
      for (let i = 0; i < 3; i++) {
        const x = rng.int(8, 22);
        const y = rng.int(10, 22);
        dot(x, y, "#5BBA6F", 3, 8);
        dot(x - 2, y + 2, "#5BBA6F", 2, 3);
        dot(x + 3, y + 2, "#5BBA6F", 2, 3);
      }
      dot(6, 24, sand, 20, 4);
      break;
    }
    case "snow": {
      // Snow tufts + pine hints.
      for (let i = 0; i < 4; i++) {
        const x = rng.int(6, 22);
        const y = rng.int(12, 24);
        dot(x, y, snow, rng.int(6, 12), rng.int(2, 4));
        dot(x + 2, y - 2, "#5B8C3E", 3, 3);
      }
      break;
    }
    default: {
      // Fallback: a couple of grass specks.
      for (let i = 0; i < 10; i++) {
        dot(rng.int(4, 27), rng.int(6, 27), rng.pick([grassLight, grassDark]), 1, 2);
      }
      break;
    }
  }

  return canvas;
}

function fitViewportCamera(args: {
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  viewport: { width: number; height: number };
  rightInset: number;
  padding: number;
}) {
  const inset = Math.max(0, args.rightInset);
  const effectiveViewport = {
    width: Math.max(1, args.viewport.width - inset),
    height: args.viewport.height
  };

  const fit = computeFitTransform({
    bounds: args.bounds,
    viewport: effectiveViewport,
    padding: args.padding
  });
  const scale = clamp(fit.scale, 0.5, 6);
  if (scale === fit.scale) return fit;

  const cx = (args.bounds.minX + args.bounds.maxX) / 2;
  const cy = (args.bounds.minY + args.bounds.maxY) / 2;
  return computeCenterTransform({
    viewport: effectiveViewport,
    world: { x: cx, y: cy },
    scale
  });
}

function colorForLocationType(type: string): number {
  switch (type) {
    case "major_city":
      return 0xffd859;
    case "town":
      return 0xf5e6c8;
    case "dungeon":
      return 0x8b9bb4;
    case "wild":
      return 0x5b8c3e;
    case "landmark":
      return 0x87ceeb;
    default:
      return 0xd4c4a8;
  }
}

function colorForBiomeTag(tag: string | null | undefined): number {
  switch (tag) {
    case "plains":
      return 0x7ec850;
    case "forest":
      return 0x5b8c3e;
    case "cave":
      return 0x8b9bb4;
    case "ruins":
      return 0x8b9bb4;
    case "mountain":
      return 0x8b9bb4;
    case "snow":
      return 0xf0f4f8;
    case "water":
      return 0x6ccff6;
    case "desert":
      return 0xe8d170;
    default:
      return 0x7ec850;
  }
}

const POI_ICON_KEYS = ["kings-landing", "whispering-woods", "goblin-cave", "ancient-library", "dragon-peak"] as const;
type PoiIconKey = (typeof POI_ICON_KEYS)[number];

function slugifyPoiName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

type PixiScene = {
  app: Application;
  world: Container;
  terrainTiles: Container;
  baseTerrain: TilingSprite | null;
  biomeTextures: Map<string, Texture>;
  decorationTextures: Map<string, Texture>;
  decorationsByLocationId: Map<
    string,
    {
      sprites: Sprite[];
      radius: number;
      biomeTag: string | null;
    }
  >;
  terrainPatchesByLocationId: Map<
    string,
    {
      sprite: TilingSprite;
      mask: Graphics;
      radius: number;
      biomeTag: string | null;
    }
  >;
  terrainGraphics: Graphics;
  pathGraphics: Graphics;
  poiMarkerGraphics: Graphics;
  agentMarkerGraphics: Graphics;
  poiSprites: Container;
  locationLabels: Container;
  agentSprites: Container;
  agentLabels: Container;
  agentTextures: Map<AgentSpriteKey, Texture>;
  poiTextures: Map<PoiIconKey, Texture>;
  spritesByUsername: Map<string, Sprite>;
  poiSpritesByLocationId: Map<string, Sprite>;
  locationLabelsById: Map<string, Text>;
};

type WheelZoomTween = {
  raf: number | null;
  startMs: number;
  durationMs: number;
  fromScale: number;
  toScale: number;
  cursorX: number;
  cursorY: number;
  worldX: number;
  worldY: number;
};

type PanInertia = {
  raf: number | null;
  lastMs: number;
  vx: number;
  vy: number;
};

export function WorldMap({
  world,
  focusUsername,
  onSelectAgent
}: {
  world: WorldStateResponse;
  focusUsername?: string | null;
  onSelectAgent?: (username: string) => void;
}) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const canvasHostRef = useRef<HTMLDivElement | null>(null);

  const bounds = useMemo(() => {
    const pts = world.locations.filter((l) => typeof l.x === "number" && typeof l.y === "number");
    if (pts.length === 0) return null;
    const xs = pts.map((p) => p.x as number);
    const ys = pts.map((p) => p.y as number);
    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys)
    };
  }, [world.locations]);

  const agentOffsets = useMemo(() => {
    const points = world.agents
      .filter((a) => typeof a.x === "number" && typeof a.y === "number")
      .map((a) => ({ id: a.username, x: a.x as number, y: a.y as number }));
    return computeClusterOffsets(points, { radius: AGENT_CLUSTER_RADIUS_WORLD });
  }, [world.agents]);

  const [camera, setCamera] = useState<CameraTransform>({ scale: 1, x: 0, y: 0 });
  const cameraRef = useRef(camera);
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  const [assetsVersion, setAssetsVersion] = useState(0);
  const [sceneVersion, setSceneVersion] = useState(0);
  const didInitCamera = useRef(false);
  const wheelZoomTween = useRef<WheelZoomTween | null>(null);
  const panInertia = useRef<PanInertia | null>(null);
  const focusedFor = useRef<string | null>(null);
  const pixi = useRef<PixiScene | null>(null);
  const [hoverPoiId, setHoverPoiId] = useState<string | null>(null);
  const [pinnedPoiId, setPinnedPoiId] = useState<string | null>(null);
  const [hoverPartyRunId, setHoverPartyRunId] = useState<string | null>(null);
  const desktopRightInsetPx = size.width >= 1024 ? 320 : 0;
  const effectiveViewport = useMemo(
    () => ({ width: Math.max(1, size.width - desktopRightInsetPx), height: size.height }),
    [desktopRightInsetPx, size.height, size.width]
  );

  const cancelWheelZoomTween = () => {
    const tween = wheelZoomTween.current;
    if (tween?.raf != null) cancelAnimationFrame(tween.raf);
    wheelZoomTween.current = null;
  };

  const cancelPanInertia = () => {
    const state = panInertia.current;
    if (state?.raf != null) cancelAnimationFrame(state.raf);
    panInertia.current = null;
  };

  useEffect(() => {
    return () => {
      const tween = wheelZoomTween.current;
      if (tween?.raf != null) cancelAnimationFrame(tween.raf);

      const inertia = panInertia.current;
      if (inertia?.raf != null) cancelAnimationFrame(inertia.raf);
    };
  }, []);

  const partyMembersByRun = useMemo(() => {
    const byRun = new Map<string, string[]>();
    for (const agent of world.agents) {
      if (!agent.run_id) continue;
      const members = byRun.get(agent.run_id);
      if (members) members.push(agent.username);
      else byRun.set(agent.run_id, [agent.username]);
    }

    for (const [runId, members] of byRun.entries()) {
      if (members.length > 1) continue;
      byRun.delete(runId);
    }

    return byRun;
  }, [world.agents]);

  const partyFanOutOffsets = useMemo(() => {
    if (!hoverPartyRunId) return new Map<string, { dx: number; dy: number }>();
    const members = partyMembersByRun.get(hoverPartyRunId);
    if (!members || members.length <= 1) return new Map<string, { dx: number; dy: number }>();

    return computePartyFanOutOffsets(members, { radius: PARTY_HOVER_FAN_OUT_RADIUS_WORLD });
  }, [hoverPartyRunId, partyMembersByRun]);

  const displayOffsets = useMemo(() => {
    const merged = new Map<string, { dx: number; dy: number }>();
    for (const agent of world.agents) {
      const base = agentOffsets.get(agent.username) ?? { dx: 0, dy: 0 };
      const fan =
        hoverPartyRunId && agent.run_id === hoverPartyRunId ? partyFanOutOffsets.get(agent.username) ?? { dx: 0, dy: 0 } : null;
      merged.set(agent.username, {
        dx: base.dx + (fan?.dx ?? 0),
        dy: base.dy + (fan?.dy ?? 0)
      });
    }
    return merged;
  }, [agentOffsets, hoverPartyRunId, partyFanOutOffsets, world.agents]);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;
    if (pixi.current) return;

    const app = new Application();
    let cancelled = false;

    (async () => {
      TextureStyle.defaultOptions.scaleMode = "nearest";

      await app.init({
        width: Math.max(1, host.clientWidth),
        height: Math.max(1, host.clientHeight),
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
      });

      if (cancelled) return;

      host.appendChild(app.canvas);

      const worldContainer = new Container();
      const terrainTiles = new Container();
      const terrainGraphics = new Graphics();
      const pathGraphics = new Graphics();
      const poiMarkerGraphics = new Graphics();
      const poiSprites = new Container();
      const locationLabels = new Container();
      const agentMarkerGraphics = new Graphics();
      const agentSprites = new Container();
      const agentLabels = new Container();

      worldContainer.addChild(terrainTiles);
      worldContainer.addChild(terrainGraphics);
      worldContainer.addChild(pathGraphics);
      worldContainer.addChild(poiMarkerGraphics);
      worldContainer.addChild(poiSprites);
      worldContainer.addChild(locationLabels);
      worldContainer.addChild(agentMarkerGraphics);
      worldContainer.addChild(agentSprites);
      worldContainer.addChild(agentLabels);

      app.stage.addChild(worldContainer);

      const agentTextures = new Map<AgentSpriteKey, Texture>();
      const poiTextures = new Map<PoiIconKey, Texture>();
      const biomeTextures = new Map<string, Texture>();
      const decorationTextures = new Map<string, Texture>();
      const spritesByUsername = new Map<string, Sprite>();
      const poiSpritesByLocationId = new Map<string, Sprite>();
      const locationLabelsById = new Map<string, Text>();
      const decorationsByLocationId = new Map<
        string,
        {
          sprites: Sprite[];
          radius: number;
          biomeTag: string | null;
        }
      >();
      const terrainPatchesByLocationId = new Map<
        string,
        {
          sprite: TilingSprite;
          mask: Graphics;
          radius: number;
          biomeTag: string | null;
        }
      >();

      for (const tag of ["plains", "forest", "cave", "ruins", "mountain", "snow", "water", "desert"]) {
        const canvas = makeBiomeTileCanvas(tag);
        if (!canvas) continue;
        biomeTextures.set(tag, Texture.from(canvas));
      }

      for (const tag of ["plains", "forest", "cave", "ruins", "mountain", "snow", "water", "desert"]) {
        const canvas = makeBiomeDecorationCanvas(tag);
        if (!canvas) continue;
        decorationTextures.set(tag, Texture.from(canvas));
      }

      agentSprites.sortableChildren = true;
      poiSprites.sortableChildren = true;

      pixi.current = {
        app,
        world: worldContainer,
        terrainTiles,
        baseTerrain: null,
        biomeTextures,
        decorationTextures,
        decorationsByLocationId,
        terrainPatchesByLocationId,
        terrainGraphics,
        pathGraphics,
        poiMarkerGraphics,
        poiSprites,
        locationLabels,
        agentMarkerGraphics,
        agentSprites,
        agentLabels,
        agentTextures,
        poiTextures,
        spritesByUsername,
        poiSpritesByLocationId,
        locationLabelsById
      };
      // Ensure follow-up effects (resize/camera sync/draw) re-run after Pixi scene exists.
      setSceneVersion((v) => v + 1);

      void Promise.all([
        ...AGENT_SPRITE_KEYS.map(async (key) => {
          try {
            const texture = (await Assets.load(`/assets/agents/${key}.png`)) as Texture;
            if (cancelled) return;
            agentTextures.set(key, texture);
          } catch {
            // Best-effort; fall back to marker circles if assets fail to load.
          }
        }),
        ...POI_ICON_KEYS.map(async (key) => {
          try {
            const texture = (await Assets.load(`/assets/poi/${key}.png`)) as Texture;
            if (cancelled) return;
            poiTextures.set(key, texture);
          } catch {
            // Best-effort; keep using procedural markers when missing.
          }
        })
      ]).then(() => {
        if (cancelled) return;
        setAssetsVersion((v) => v + 1);
      });
    })();

    return () => {
      cancelled = true;
      if (pixi.current?.app === app) {
        try {
          app.destroy(true);
        } finally {
          pixi.current = null;
        }
      }
    };
  }, [ref]);

  useEffect(() => {
    const scene = pixi.current;
    if (!scene) return;
    if (size.width <= 0 || size.height <= 0) return;
    scene.app.renderer.resize(size.width, size.height);
  }, [sceneVersion, size.height, size.width]);

  useEffect(() => {
    const scene = pixi.current;
    if (!scene) return;
    scene.world.position.set(camera.x, camera.y);
    scene.world.scale.set(camera.scale);
  }, [sceneVersion, camera.scale, camera.x, camera.y]);

  useEffect(() => {
    const scene = pixi.current;
    if (!scene) return;
    scene.locationLabels.visible = shouldShowLocationLabels(camera.scale);
    // Agent names are already present in speech bubbles; keep labels limited to the focused agent
    // to reduce clutter and match the design spec.
    scene.agentLabels.visible = Boolean(focusUsername);
  }, [sceneVersion, camera.scale, focusUsername]);

  useEffect(() => {
    if (didInitCamera.current) return;
    if (!bounds) return;
    if (size.width <= 0 || size.height <= 0) return;

    const next = fitViewportCamera({
      viewport: { width: size.width, height: size.height },
      rightInset: desktopRightInsetPx,
      bounds,
      padding: 48
    });
    setCamera(next);
    didInitCamera.current = true;
  }, [bounds, desktopRightInsetPx, size.height, size.width]);

  useEffect(() => {
    if (!focusUsername) {
      focusedFor.current = null;
      return;
    }
    if (focusedFor.current === focusUsername) return;
    if (size.width <= 0 || size.height <= 0) return;

    const agent = world.agents.find((a) => a.username === focusUsername);
    const agentOffset = agent ? displayOffsets.get(agent.username) : null;
    const agentX = typeof agent?.x === "number" ? (agent.x as number) + (agentOffset?.dx ?? 0) : null;
    const agentY = typeof agent?.y === "number" ? (agent.y as number) + (agentOffset?.dy ?? 0) : null;
    if (typeof agentX !== "number" || typeof agentY !== "number") return;

    setCamera((prev) =>
      computeCenterTransform({
        viewport: effectiveViewport,
        world: { x: agentX, y: agentY },
        scale: prev.scale
      })
    );
    didInitCamera.current = true;
    focusedFor.current = focusUsername;
  }, [displayOffsets, effectiveViewport, focusUsername, size.height, size.width, world.agents]);

  useEffect(() => {
    const scene = pixi.current;
    if (!scene) return;

    scene.terrainGraphics.clear();
    scene.pathGraphics.clear();
    scene.poiMarkerGraphics.clear();

    const locById = new Map(world.locations.map((l) => [l.id, l]));

    const b = bounds ?? { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
    const terrainMinX = b.minX - TERRAIN_PADDING_WORLD;
    const terrainMinY = b.minY - TERRAIN_PADDING_WORLD;
    const terrainWidth = Math.max(1, b.maxX - b.minX + TERRAIN_PADDING_WORLD * 2);
    const terrainHeight = Math.max(1, b.maxY - b.minY + TERRAIN_PADDING_WORLD * 2);

    const grassTexture = scene.biomeTextures.get("plains") ?? Texture.WHITE;
    const base = scene.baseTerrain ?? new TilingSprite({ texture: grassTexture, width: terrainWidth, height: terrainHeight });
    if (!scene.baseTerrain) {
      base.alpha = 1;
      scene.terrainTiles.addChild(base);
      scene.baseTerrain = base;
    }
    base.texture = grassTexture;
    base.width = terrainWidth;
    base.height = terrainHeight;
    base.position.set(terrainMinX, terrainMinY);

    for (const edge of world.connections) {
      const from = locById.get(edge.from_id);
      const to = locById.get(edge.to_id);
      if (!from || !to) continue;
      if (typeof from.x !== "number" || typeof from.y !== "number" || typeof to.x !== "number" || typeof to.y !== "number") continue;

      const points = computeRoadPolyline({
        from: { x: from.x, y: from.y },
        to: { x: to.x, y: to.y },
        seed: `${from.id}:${to.id}`
      });

      const drawPath = () => {
        const start = points[0];
        if (!start) return;
        scene.pathGraphics.moveTo(start.x, start.y);
        for (let i = 1; i < points.length; i++) {
          const p = points[i];
          if (!p) continue;
          scene.pathGraphics.lineTo(p.x, p.y);
        }
      };

      // Dirt road with subtle border + highlight (Stardew-ish).
      drawPath();
      scene.pathGraphics.stroke({ width: 10, color: 0x4a3728, alpha: 0.18 });
      drawPath();
      scene.pathGraphics.stroke({ width: 8, color: 0xc9a567, alpha: 0.55 });
      drawPath();
      scene.pathGraphics.stroke({ width: 3, color: 0xe8d170, alpha: 0.35 });
    }

    const seenIds = new Set<string>();
    const pixelFont = cssVar("--font-pixel") ?? "monospace";

    for (const l of world.locations) {
      if (typeof l.x !== "number" || typeof l.y !== "number") continue;
      seenIds.add(l.id);

      // Terrain layer: biome patch around each POI using a tiled pixel texture (hybrid
      // stand-in for the full tilemap + overlay approach).
      const radius = l.type === "major_city" ? 170 : l.type === "town" ? 145 : 130;
      const biomeTag = l.biome_tag ?? "plains";
      const biomeTexture = scene.biomeTextures.get(biomeTag) ?? grassTexture;
      const patchX = l.x - radius;
      const patchY = l.y - radius;

      const existingPatch = scene.terrainPatchesByLocationId.get(l.id) ?? null;
      const patchSprite =
        existingPatch?.sprite ??
        new TilingSprite({
          texture: biomeTexture,
          width: radius * 2,
          height: radius * 2
        });
      const patchMask = existingPatch?.mask ?? new Graphics();

      if (!existingPatch) {
        patchSprite.alpha = 0.55;
        patchSprite.position.set(patchX, patchY);
        const patchRng = createRng(`clawcraft:terrain-patch:${l.id}`);
        patchSprite.tilePosition.set(patchRng.int(0, BIOME_TILE_SIZE - 1), patchRng.int(0, BIOME_TILE_SIZE - 1));

        patchMask.clear();
        patchMask.circle(radius, radius, radius).fill({ color: 0xffffff, alpha: 1 });
        patchMask.position.set(patchX, patchY);
        patchMask.renderable = false; // mask should not draw into the scene
        patchSprite.mask = patchMask;

        scene.terrainTiles.addChild(patchMask);
        scene.terrainTiles.addChild(patchSprite);
        scene.terrainPatchesByLocationId.set(l.id, { sprite: patchSprite, mask: patchMask, radius, biomeTag });
      } else {
        if (existingPatch.biomeTag !== biomeTag) {
          patchSprite.texture = biomeTexture;
          existingPatch.biomeTag = biomeTag;
        }

        if (existingPatch.radius !== radius) {
          patchSprite.width = radius * 2;
          patchSprite.height = radius * 2;

          patchMask.clear();
          patchMask.circle(radius, radius, radius).fill({ color: 0xffffff, alpha: 1 });
          existingPatch.radius = radius;
        }

        patchSprite.position.set(patchX, patchY);
        patchMask.position.set(patchX, patchY);
        patchMask.renderable = false;
      }

      // Faint warm ring and biome tint to keep patches from feeling too flat.
      scene.terrainGraphics.circle(l.x, l.y, Math.round(radius * 0.82)).stroke({ width: 10, color: 0x4a3728, alpha: 0.02 });
      scene.terrainGraphics.circle(l.x, l.y, Math.round(radius * 0.62)).stroke({ width: 6, color: 0xffffff, alpha: 0.03 });
      scene.terrainGraphics.circle(l.x, l.y, Math.round(radius * 0.92)).stroke({ width: 6, color: colorForBiomeTag(biomeTag), alpha: 0.02 });

      // Biome decorations (very lightweight stand-in for the future asset overlay pipeline).
      const decorTexture = scene.decorationTextures.get(biomeTag) ?? scene.decorationTextures.get("plains") ?? null;
      if (decorTexture) {
        const baseCount =
          biomeTag === "forest"
            ? 18
            : biomeTag === "plains"
              ? 12
              : biomeTag === "water"
                ? 8
                : biomeTag === "desert"
                  ? 10
                  : biomeTag === "snow"
                    ? 10
                    : 14;
        const typeMultiplier = l.type === "major_city" ? 0.35 : l.type === "town" ? 0.55 : l.type === "landmark" ? 0.7 : 0.85;
        const desiredCount = Math.max(0, Math.round(baseCount * typeMultiplier));

        const existingDecor = scene.decorationsByLocationId.get(l.id) ?? null;
        const needsRebuild =
          !existingDecor ||
          existingDecor.biomeTag !== biomeTag ||
          existingDecor.radius !== radius ||
          existingDecor.sprites.length !== desiredCount;

        if (needsRebuild) {
          for (const s of existingDecor?.sprites ?? []) {
            s.parent?.removeChild(s);
            s.destroy();
          }

          const sprites: Sprite[] = [];
          const decorRng = createRng(`clawcraft:decorations:${l.id}`);
          for (let i = 0; i < desiredCount; i++) {
            const sprite = new Sprite(decorTexture);
            sprite.anchor.set(0.5, 0.5);
            sprite.alpha = 0.9;

            const angle = decorRng.float(0, Math.PI * 2);
            const dist = decorRng.float(radius * 0.45, radius * 0.98);
            sprite.position.set(l.x + Math.cos(angle) * dist, l.y + Math.sin(angle) * dist);
            sprite.scale.set(decorRng.float(0.55, 0.9));

            scene.terrainTiles.addChild(sprite);
            sprites.push(sprite);
          }
          scene.decorationsByLocationId.set(l.id, { sprites, radius, biomeTag });
        }
      }

      scene.poiMarkerGraphics.circle(l.x, l.y + 10, 12).fill({ color: 0x000000, alpha: 0.1 });

      const poiKey = slugifyPoiName(l.name) as PoiIconKey;
      const texture = scene.poiTextures.get(poiKey);

      if (texture) {
        const existing = scene.poiSpritesByLocationId.get(l.id) ?? null;
        const icon = existing ?? new Sprite(texture);
        if (!existing) {
          icon.anchor.set(0.5, 0.5);
          icon.scale.set(POI_ICON_SCALE);
          scene.poiSprites.addChild(icon);
          scene.poiSpritesByLocationId.set(l.id, icon);
        } else if (icon.texture !== texture) {
          icon.texture = texture;
        }
        icon.position.set(l.x, l.y);
        icon.zIndex = l.y;
      } else {
        const existing = scene.poiSpritesByLocationId.get(l.id);
        if (existing) {
          existing.parent?.removeChild(existing);
          existing.destroy();
          scene.poiSpritesByLocationId.delete(l.id);
        }

        scene.poiMarkerGraphics.circle(l.x, l.y, 7).fill({ color: colorForLocationType(l.type), alpha: 0.95 });
        scene.poiMarkerGraphics.circle(l.x, l.y, 7).stroke({ width: 2, color: 0x4a3728, alpha: 0.35 });
      }

      const labelOffsetX = texture ? POI_ICON_SIZE_WORLD / 2 + 8 : 10;
      const labelOffsetY = texture ? POI_ICON_SIZE_WORLD / 2 + 2 : 10;

      const existingLabel = scene.locationLabelsById.get(l.id) ?? null;
      const label =
        existingLabel ??
        new Text({
          text: l.name,
          style: {
            fill: 0x4a3728,
            fontSize: 12,
            fontWeight: "400",
            fontFamily: pixelFont
          }
        });
      if (!existingLabel) {
        scene.locationLabels.addChild(label);
        scene.locationLabelsById.set(l.id, label);
      } else if (label.text !== l.name) {
        label.text = l.name;
      }
      label.position.set(l.x + labelOffsetX, l.y - labelOffsetY);
    }

    for (const [locationId, icon] of scene.poiSpritesByLocationId.entries()) {
      if (seenIds.has(locationId)) continue;
      icon.parent?.removeChild(icon);
      icon.destroy();
      scene.poiSpritesByLocationId.delete(locationId);
    }

    for (const [locationId, label] of scene.locationLabelsById.entries()) {
      if (seenIds.has(locationId)) continue;
      label.parent?.removeChild(label);
      label.destroy();
      scene.locationLabelsById.delete(locationId);
    }

    for (const [locationId, patch] of scene.terrainPatchesByLocationId.entries()) {
      if (seenIds.has(locationId)) continue;
      patch.sprite.parent?.removeChild(patch.sprite);
      patch.sprite.destroy();
      patch.mask.parent?.removeChild(patch.mask);
      patch.mask.destroy();
      scene.terrainPatchesByLocationId.delete(locationId);
    }

    for (const [locationId, entry] of scene.decorationsByLocationId.entries()) {
      if (seenIds.has(locationId)) continue;
      for (const s of entry.sprites) {
        s.parent?.removeChild(s);
        s.destroy();
      }
      scene.decorationsByLocationId.delete(locationId);
    }
  }, [sceneVersion, assetsVersion, bounds, world.connections, world.locations]);

  useEffect(() => {
    const scene = pixi.current;
    if (!scene) return;
    if (camera.scale <= 0) return;

    const invScale = 1 / camera.scale;
    const activePoiId = pinnedPoiId ?? hoverPoiId;
    let anyVisible = false;
    for (const l of world.locations) {
      if (typeof l.x !== "number" || typeof l.y !== "number") continue;
      const label = scene.locationLabelsById.get(l.id);
      if (!label) continue;

      const isActive = Boolean(activePoiId && activePoiId === l.id);
      const showAtScale =
        l.type === "major_city" || l.type === "landmark"
          ? 0.9
          : l.type === "town"
            ? 1.15
            : 1.45;
      const isVisible = isActive || camera.scale >= showAtScale;
      label.visible = isVisible;
      if (isVisible) anyVisible = true;

      const poiKey = slugifyPoiName(l.name) as PoiIconKey;
      const hasIcon = Boolean(scene.poiTextures.get(poiKey));
      const iconRadiusWorld = hasIcon ? POI_ICON_SIZE_WORLD / 2 : 7;

      // Keep text screen-sized while positioning it in world-space. The padding should be in
      // screen pixels so labels don't drift away when zooming in.
      const padXPx = hasIcon ? 8 : 10;
      const padYPx = hasIcon ? 4 : 10;
      label.scale.set(invScale);
      label.position.set(l.x + iconRadiusWorld + padXPx * invScale, l.y - iconRadiusWorld - padYPx * invScale);
    }

    // Avoid a full label pass if no labels are visible at the current zoom.
    scene.locationLabels.visible = anyVisible;
  }, [sceneVersion, assetsVersion, camera.scale, hoverPoiId, pinnedPoiId, world.locations]);

  useEffect(() => {
    const scene = pixi.current;
    if (!scene) return;

    scene.agentMarkerGraphics.clear();
    scene.agentLabels.removeChildren().forEach((c) => c.destroy());

    const uiFont = cssVar("--font-nunito") ?? "system-ui";
    const labelUsernames = new Set<string>();
    if (focusUsername) labelUsernames.add(focusUsername);

    for (const a of world.agents) {
      if (typeof a.x !== "number" || typeof a.y !== "number") continue;

      const offset = displayOffsets.get(a.username);
      const ax = (a.x as number) + (offset?.dx ?? 0);
      const ay = (a.y as number) + (offset?.dy ?? 0);

      const isFocused = Boolean(focusUsername && a.username === focusUsername);
      const radius = isFocused ? 6 : 4;

      scene.agentMarkerGraphics.circle(ax, ay, 8).fill({ color: 0x000000, alpha: 0.12 });

      const spriteKey = agentSpriteKeyForUsername(a.username);
      const texture = scene.agentTextures.get(spriteKey);
      const sprite = texture ? scene.spritesByUsername.get(a.username) ?? null : null;

      if (texture) {
        const next = sprite ?? new Sprite(texture);
        if (!sprite) {
          next.anchor.set(0.5, 1);
          next.scale.set(AGENT_SPRITE_SCALE);
          scene.agentSprites.addChild(next);
          scene.spritesByUsername.set(a.username, next);
        } else if (next.texture !== texture) {
          next.texture = texture;
        }
        next.alpha = a.traveling ? 0.85 : 1;
        next.position.set(ax, ay);
        next.zIndex = ay;
      } else {
        scene.agentMarkerGraphics.circle(ax, ay, radius).fill({ color: a.traveling ? 0x87ceeb : 0xff6b6b, alpha: 0.95 });
      }

      if (isFocused) {
        scene.agentMarkerGraphics.circle(ax, ay, radius + 6).stroke({ width: 3, color: 0xffd859, alpha: 0.9 });
      }

      if (labelUsernames.has(a.username)) {
        const invScale = camera.scale > 0 ? 1 / camera.scale : 1;
        const label = new Text({
          text: a.guild_tag ? `${a.username} [${a.guild_tag}]` : a.username,
          style: {
            fill: 0x4a3728,
            fontSize: isFocused ? 12 : 11,
            fontWeight: isFocused ? "700" : "400",
            fontFamily: uiFont
          }
        });
        label.scale.set(invScale);
        label.position.set(ax + 10 * invScale, ay - AGENT_SPRITE_SIZE_WORLD - 8 * invScale);
        scene.agentLabels.addChild(label);
      }
    }

    const seen = new Set(world.agents.map((a) => a.username));
    for (const [username, sprite] of scene.spritesByUsername.entries()) {
      if (seen.has(username)) continue;
      sprite.destroy({ children: true });
      scene.spritesByUsername.delete(username);
    }
  }, [sceneVersion, assetsVersion, camera.scale, displayOffsets, focusUsername, world.agents]);

  const drag = useRef<
    | null
    | {
        pointerId: number;
        startClientX: number;
        startClientY: number;
        baseX: number;
        baseY: number;
        moved: boolean;
        lastClientX: number;
        lastClientY: number;
        lastMs: number;
        vx: number;
        vy: number;
      }
  >(null);
  const pointers = useRef(new Map<number, { clientX: number; clientY: number }>());
  const pinch = useRef<
    | null
    | {
        a: number;
        b: number;
        startDistance: number;
        startScale: number;
        worldX: number;
        worldY: number;
      }
  >(null);
  const ignoreTapUntilMs = useRef(0);

  const nearestPoiAt = (worldX: number, worldY: number) => {
    const hitRadiusWorld = POI_HIT_RADIUS_PX / camera.scale;
    const hitRadius2 = hitRadiusWorld * hitRadiusWorld;

    let picked: { id: string; dist2: number } | null = null;
    for (const l of world.locations) {
      if (typeof l.x !== "number" || typeof l.y !== "number") continue;
      const dx = l.x - worldX;
      const dy = l.y - worldY;
      const dist2 = dx * dx + dy * dy;
      if (!picked || dist2 < picked.dist2) picked = { id: l.id, dist2 };
    }

    if (!picked || picked.dist2 > hitRadius2) return null;
    return picked.id;
  };

  const nearestAgentAt = (worldX: number, worldY: number) => {
    const hitRadiusWorld = 24 / camera.scale;
    const hitRadius2 = hitRadiusWorld * hitRadiusWorld;

    let picked: { username: string; runId: string | null; dist2: number } | null = null;
    for (const a of world.agents) {
      if (typeof a.x !== "number" || typeof a.y !== "number") continue;
      const offset = displayOffsets.get(a.username);
      const cx = (a.x as number) + (offset?.dx ?? 0);
      const cy = (a.y as number) + (offset?.dy ?? 0) - AGENT_SPRITE_SIZE_WORLD / 2;
      const dx = cx - worldX;
      const dy = cy - worldY;
      const dist2 = dx * dx + dy * dy;
      if (!picked || dist2 < picked.dist2) picked = { username: a.username, runId: a.run_id, dist2 };
    }

    if (!picked || picked.dist2 > hitRadius2) return null;
    return picked;
  };

  const updateHoverTargets = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    const worldX = (cursorX - camera.x) / camera.scale;
    const worldY = (cursorY - camera.y) / camera.scale;

    const agentHit = nearestAgentAt(worldX, worldY);
    const partyRunId = agentHit?.runId ?? null;
    const hasParty = partyRunId ? (partyMembersByRun.get(partyRunId)?.length ?? 0) > 1 : false;
    if (partyRunId && hasParty) {
      if (hoverPartyRunId !== partyRunId) setHoverPartyRunId(partyRunId);
      if (hoverPoiId !== null) setHoverPoiId(null);
      return;
    }

    if (hoverPartyRunId !== null) setHoverPartyRunId(null);
    const poiId = nearestPoiAt(worldX, worldY);
    setHoverPoiId(poiId);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    cancelWheelZoomTween();
    cancelPanInertia();
    pointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    // Two-pointer gestures take over from single-pointer drag (pinch-to-zoom + two-finger pan).
    if (pointers.current.size === 2) {
      const ids = Array.from(pointers.current.keys());
      const a = ids[0];
      const b = ids[1];
      if (typeof a !== "number" || typeof b !== "number") return;
      const pa = pointers.current.get(a);
      const pb = pointers.current.get(b);
      if (!pa || !pb) return;

      const startDistance = Math.max(1, Math.hypot(pa.clientX - pb.clientX, pa.clientY - pb.clientY));
      const rect = e.currentTarget.getBoundingClientRect();
      const midX = (pa.clientX + pb.clientX) / 2 - rect.left;
      const midY = (pa.clientY + pb.clientY) / 2 - rect.top;
      const worldX = (midX - camera.x) / camera.scale;
      const worldY = (midY - camera.y) / camera.scale;

      pinch.current = { a, b, startDistance, startScale: camera.scale, worldX, worldY };
      drag.current = null;
      didInitCamera.current = true;
      ignoreTapUntilMs.current = Date.now() + 400;
      if (hoverPoiId !== null) setHoverPoiId(null);
      if (hoverPartyRunId !== null) setHoverPartyRunId(null);
      return;
    }
    if (pointers.current.size > 2) return;

    const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    drag.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      baseX: camera.x,
      baseY: camera.y,
      moved: false,
      lastClientX: e.clientX,
      lastClientY: e.clientY,
      lastMs: nowMs,
      vx: 0,
      vy: 0
    };
    didInitCamera.current = true;
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    const pinchState = pinch.current;
    if (pinchState && (pinchState.a === e.pointerId || pinchState.b === e.pointerId)) {
      const pa = pointers.current.get(pinchState.a);
      const pb = pointers.current.get(pinchState.b);
      if (!pa || !pb) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const midX = (pa.clientX + pb.clientX) / 2 - rect.left;
      const midY = (pa.clientY + pb.clientY) / 2 - rect.top;
      const distance = Math.max(1, Math.hypot(pa.clientX - pb.clientX, pa.clientY - pb.clientY));
      const nextScale = clamp(pinchState.startScale * (distance / pinchState.startDistance), MIN_SCALE, MAX_SCALE);
      ignoreTapUntilMs.current = Date.now() + 400;
      didInitCamera.current = true;
      setCamera({
        scale: nextScale,
        x: midX - pinchState.worldX * nextScale,
        y: midY - pinchState.worldY * nextScale
      });
      if (hoverPoiId !== null) setHoverPoiId(null);
      if (hoverPartyRunId !== null) setHoverPartyRunId(null);
      return;
    }

    const dragState = drag.current;
    if (!dragState || dragState.pointerId !== e.pointerId) {
      updateHoverTargets(e);
      return;
    }

    const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    const dx = e.clientX - dragState.startClientX;
    const dy = e.clientY - dragState.startClientY;
    if (!dragState.moved) {
      if (Math.hypot(dx, dy) <= 4) return;
      dragState.moved = true;
      dragState.lastClientX = e.clientX;
      dragState.lastClientY = e.clientY;
      dragState.lastMs = nowMs;
      dragState.vx = 0;
      dragState.vy = 0;
    } else {
      const dt = Math.max(1, nowMs - dragState.lastMs);
      dragState.vx = (e.clientX - dragState.lastClientX) / dt;
      dragState.vy = (e.clientY - dragState.lastClientY) / dt;
      dragState.lastClientX = e.clientX;
      dragState.lastClientY = e.clientY;
      dragState.lastMs = nowMs;
    }
    setCamera((prev) => ({ ...prev, x: dragState.baseX + dx, y: dragState.baseY + dy }));

    if (dragState.moved) {
      if (hoverPoiId !== null) setHoverPoiId(null);
      if (hoverPartyRunId !== null) setHoverPartyRunId(null);
      return;
    }
    updateHoverTargets(e);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);

    const pinchState = pinch.current;
    if (pinchState && (pinchState.a === e.pointerId || pinchState.b === e.pointerId)) {
      // End the pinch gesture when either pointer is released. Avoid treating this as a tap.
      pinch.current = null;
      drag.current = null;
      ignoreTapUntilMs.current = Date.now() + 400;

      // If one pointer remains down, immediately transition back into a drag gesture so panning continues smoothly.
      if (pointers.current.size === 1) {
        const [onlyId] = pointers.current.keys();
        const pos = typeof onlyId === "number" ? pointers.current.get(onlyId) : null;
        if (typeof onlyId === "number" && pos) {
          const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
          drag.current = {
            pointerId: onlyId,
            startClientX: pos.clientX,
            startClientY: pos.clientY,
            baseX: camera.x,
            baseY: camera.y,
            moved: true,
            lastClientX: pos.clientX,
            lastClientY: pos.clientY,
            lastMs: nowMs,
            vx: 0,
            vy: 0
          };
        }
      }
      return;
    }
    if (Date.now() < ignoreTapUntilMs.current) return;

    const state = drag.current;
    if (!state || state.pointerId !== e.pointerId) return;
    drag.current = null;

    if (state.moved) {
      // Light pan inertia (spec: "Pan inertia") so release feels less abrupt.
      const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
      const ageMs = nowMs - state.lastMs;
      let vx = ageMs > 120 ? 0 : state.vx;
      let vy = ageMs > 120 ? 0 : state.vy;

      const maxSpeed = 2.5; // px/ms
      const speed = Math.hypot(vx, vy);
      if (speed > maxSpeed && speed > 0) {
        const f = maxSpeed / speed;
        vx *= f;
        vy *= f;
      }

      const minSpeed = 0.02; // px/ms
      if (Math.hypot(vx, vy) < minSpeed) return;

      cancelPanInertia();
      const inertia: PanInertia = { raf: null, lastMs: nowMs, vx, vy };

      const tick = (ts: number) => {
        const s = panInertia.current;
        if (!s) return;

        const dt = clamp(ts - s.lastMs, 0, 32);
        s.lastMs = ts;

        setCamera((prev) => ({ ...prev, x: prev.x + s.vx * dt, y: prev.y + s.vy * dt }));

        const decay = Math.pow(0.92, dt / 16.67);
        s.vx *= decay;
        s.vy *= decay;

        if (Math.hypot(s.vx, s.vy) < minSpeed) {
          panInertia.current = null;
          return;
        }

        s.raf = requestAnimationFrame(tick);
      };

      inertia.raf = requestAnimationFrame(tick);
      panInertia.current = inertia;
      return;
    }
    if (e.button !== 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const worldX = (cursorX - camera.x) / camera.scale;
    const worldY = (cursorY - camera.y) / camera.scale;

    const picked = nearestAgentAt(worldX, worldY);
    if (picked?.username && onSelectAgent) {
      onSelectAgent(picked.username);
      if (picked.runId && (partyMembersByRun.get(picked.runId)?.length ?? 0) > 1) {
        setHoverPartyRunId(picked.runId);
      }
      return;
    }

    const poiId = nearestPoiAt(worldX, worldY);
    if (poiId) {
      setPinnedPoiId((prev) => (prev === poiId ? null : poiId));
    } else if (pinnedPoiId) {
      setPinnedPoiId(null);
    }
  };

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    didInitCamera.current = true;
    cancelPanInertia();

    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const prev = cameraRef.current;
    const zoomIntensity = 0.0015;
    const nextScale = clamp(prev.scale * (1 - e.deltaY * zoomIntensity), MIN_SCALE, MAX_SCALE);
    if (nextScale === prev.scale) return;

    const worldX = (cursorX - prev.x) / prev.scale;
    const worldY = (cursorY - prev.y) / prev.scale;

    // Smooth wheel zoom to match the design spec: keep the world point under the cursor pinned
    // while easing the scale toward the target.
    cancelWheelZoomTween();

    const startMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    const tween: WheelZoomTween = {
      raf: null,
      startMs,
      durationMs: 300,
      fromScale: prev.scale,
      toScale: nextScale,
      cursorX,
      cursorY,
      worldX,
      worldY
    };

    const tick = (ts: number) => {
      const state = wheelZoomTween.current;
      if (!state) return;

      const t = clamp((ts - state.startMs) / state.durationMs, 0, 1);
      const k = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const scale = state.fromScale + (state.toScale - state.fromScale) * k;

      setCamera({
        scale,
        x: state.cursorX - state.worldX * scale,
        y: state.cursorY - state.worldY * scale
      });

      if (t < 1) {
        state.raf = requestAnimationFrame(tick);
      } else {
        wheelZoomTween.current = null;
      }
    };

    tween.raf = requestAnimationFrame(tick);
    wheelZoomTween.current = tween;
  };

  const bubbles = useMemo(() => {
    const allCandidates = world.agents
      .filter((a) => a.status && typeof a.x === "number" && typeof a.y === "number")
      .sort((a, b) => a.username.localeCompare(b.username));

    if (size.width <= 0 || size.height <= 0) return [];

    const focusedCandidate =
      focusUsername && allCandidates.length ? allCandidates.find((a) => a.username === focusUsername) ?? null : null;
    const bubbleLimit = bubbleLimitForScale(camera.scale, Boolean(focusedCandidate));
    if (bubbleLimit === 0) return [];

    const candidateByUsername = new Map(allCandidates.map((a) => [a.username, a]));
    const enableLocationGrouping = camera.scale < LOCATION_GROUPING_MAX_SCALE;
    const groupingRadius2 = LOCATION_GROUPING_RADIUS_WORLD * LOCATION_GROUPING_RADIUS_WORLD;
    const poiPoints = enableLocationGrouping
      ? world.locations.filter((l) => typeof l.x === "number" && typeof l.y === "number")
      : [];

    // When zoomed out, group solo non-traveling bubbles by nearest POI to reduce clutter at hotspots.
    const nearestPoiByUsername = new Map<string, { id: string; dist2: number }>();
    if (poiPoints.length > 0) {
      for (const a of allCandidates) {
        if (a.run_id) continue;
        if (a.traveling) continue;
        const offset = displayOffsets.get(a.username);
        const ax = (a.x as number) + (offset?.dx ?? 0);
        const ay = (a.y as number) + (offset?.dy ?? 0);

        let picked: { id: string; dist2: number } | null = null;
        for (const l of poiPoints) {
          const dx = (l.x as number) - ax;
          const dy = (l.y as number) - ay;
          const dist2 = dx * dx + dy * dy;
          if (!picked || dist2 < picked.dist2) picked = { id: l.id, dist2 };
        }

        if (picked) nearestPoiByUsername.set(a.username, picked);
      }
    }

    const poiCounts = new Map<string, number>();
    for (const picked of nearestPoiByUsername.values()) {
      if (picked.dist2 > groupingRadius2) continue;
      poiCounts.set(picked.id, (poiCounts.get(picked.id) ?? 0) + 1);
    }

    const groupCandidates = allCandidates.map((a) => {
      if (a.run_id) return { username: a.username, run_id: a.run_id };
      if (!enableLocationGrouping || a.traveling) return { username: a.username, run_id: null as string | null };

      const nearest = nearestPoiByUsername.get(a.username) ?? null;
      if (!nearest || nearest.dist2 > groupingRadius2) return { username: a.username, run_id: null as string | null };
      if ((poiCounts.get(nearest.id) ?? 0) <= 1) return { username: a.username, run_id: null as string | null };

      return { username: a.username, run_id: `poi:${nearest.id}` };
    });

    const groupCandidateByUsername = new Map(groupCandidates.map((c) => [c.username, c]));
    const focusGroupId = focusUsername ? groupCandidateByUsername.get(focusUsername)?.run_id ?? focusUsername : null;

    const groups = groupBubbleCandidates({
      candidates: groupCandidates,
      focusUsername
    });

    // Prefer bubbles near the viewport center for general readability.
    const centerWorldX = (effectiveViewport.width / 2 - camera.x) / camera.scale;
    const centerWorldY = (size.height / 2 - camera.y) / camera.scale;
    const groupDist2 = (group: (typeof groups)[number]) => {
      const a = candidateByUsername.get(group.representative);
      if (!a || typeof a.x !== "number" || typeof a.y !== "number") return Number.POSITIVE_INFINITY;
      const offset = displayOffsets.get(a.username);
      const ax = (a.x as number) + (offset?.dx ?? 0);
      const ay = (a.y as number) + (offset?.dy ?? 0);
      const dx = ax - centerWorldX;
      const dy = ay - centerWorldY;
      return dx * dx + dy * dy;
    };

    const sortedGroups = groups
      .slice()
      .sort((a, b) => groupDist2(a) - groupDist2(b) || a.sortKey.localeCompare(b.sortKey));

    const selectedGroups = selectBubbleGroups({ groups: sortedGroups, bubbleLimit, focusUsername });

    const bubbleInputs = selectedGroups
      .map((group) => {
        const a = candidateByUsername.get(group.representative);
        if (!a) return null;

        const offset = displayOffsets.get(a.username);
        const ax = (a.x as number) + (offset?.dx ?? 0);
        const ay = (a.y as number) + (offset?.dy ?? 0);

        const anchorX = ax * camera.scale + camera.x;
        const anchorY = (ay - AGENT_SPRITE_SIZE_WORLD) * camera.scale + camera.y;

        const labelBase = a.guild_tag ? `${a.username} [${a.guild_tag}]` : a.username;
        const label = labelBase;
        const text = a.status?.text ?? "";
        const textShort = text.length > 120 ? `${text.slice(0, 120)}…` : text;
        const maxWidth = group.members.length > 1 ? PARTY_BUBBLE_MAX_WIDTH_PX : BUBBLE_MAX_WIDTH_PX;

        let memberSummary: string | null = null;
        if (group.members.length > 1) {
          const members = group.members.slice().sort((lhs, rhs) => lhs.localeCompare(rhs));
          const preview = members.slice(0, 2).join(", ");
          const remaining = members.length - 2;
          memberSummary = remaining > 0 ? `with ${preview} +${remaining} others` : `with ${preview}`;
        }

        const charsPerLine = maxWidth > BUBBLE_MAX_WIDTH_PX ? 34 : 26;
        const lines = Math.max(1, Math.ceil(textShort.length / charsPerLine));
        const height = 16 + 18 + lines * 16 + (memberSummary ? 18 : 12);

        return {
          id: group.id,
          anchorX,
          anchorY,
          width: maxWidth,
          height,
          priority: group.id === focusGroupId ? 10 : 0,
          label,
          text: textShort,
          memberSummary,
          maxWidth
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      anchorX: number;
      anchorY: number;
      width: number;
      height: number;
      priority: number;
      label: string;
      text: string;
      memberSummary: string | null;
      maxWidth: number;
    }>;

    const layout = layoutBubbles({
      viewport: { width: effectiveViewport.width, height: size.height },
      bubbles: bubbleInputs.map(({ id, anchorX, anchorY, width, height, priority }) => ({
        id,
        anchorX,
        anchorY,
        width,
        height,
        priority
      }))
    });

    const byId = new Map(layout.map((b) => [b.id, b]));
    return bubbleInputs
      .map((b) => {
        const pos = byId.get(b.id);
        if (!pos) return null;
        return { ...b, left: pos.left, top: pos.top, zIndex: b.priority ? 40 : 10 };
      })
      .filter(Boolean) as Array<{
      id: string;
      left: number;
      top: number;
      zIndex: number;
      label: string;
      text: string;
      memberSummary: string | null;
      maxWidth: number;
    }>;
  }, [
    camera.scale,
    camera.x,
    camera.y,
    displayOffsets,
    effectiveViewport.width,
    focusUsername,
    size.height,
    size.width,
    world.agents,
    world.locations
  ]);

  const tooltipPoi = useMemo(() => {
    const activeId = pinnedPoiId ?? hoverPoiId;
    if (!activeId) return null;
    const poi = world.locations.find((l) => l.id === activeId);
    if (!poi) return null;
    if (typeof poi.x !== "number" || typeof poi.y !== "number") return null;
    return {
      ...poi,
      screenX: poi.x * camera.scale + camera.x,
      screenY: poi.y * camera.scale + camera.y
    };
  }, [camera.scale, camera.x, camera.y, hoverPoiId, pinnedPoiId, world.locations]);

  useEffect(() => {
    if (!pinnedPoiId) return;
    if (world.locations.some((l) => l.id === pinnedPoiId)) return;
    setPinnedPoiId(null);
  }, [pinnedPoiId, world.locations]);

  useEffect(() => {
    if (!hoverPartyRunId) return;
    if ((partyMembersByRun.get(hoverPartyRunId)?.length ?? 0) > 1) return;
    setHoverPartyRunId(null);
  }, [hoverPartyRunId, partyMembersByRun]);

  return (
    <div
      ref={ref}
      className="cc-terrain-grass relative h-full w-full select-none overflow-hidden touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onPointerLeave={() => {
        setHoverPoiId(null);
        setHoverPartyRunId(null);
      }}
    >
      <div ref={canvasHostRef} className="absolute inset-0" />

      <div className="cc-glass pointer-events-none absolute left-4 top-20 rounded-md px-2 py-1 text-xs text-ink-brown lg:top-4">
        Drag to pan • Scroll/+/- to zoom{onSelectAgent ? " • Click an agent for details" : ""}
      </div>

      <div
        className="absolute bottom-3 left-3 flex items-end gap-2"
        onPointerDown={(e) => {
          e.stopPropagation();
          cancelWheelZoomTween();
          cancelPanInertia();
        }}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="cc-glass flex overflow-hidden rounded-md text-xs text-ink-brown shadow-sm">
          <button
            type="button"
            className="px-3 py-2 hover:bg-white"
            aria-label="Zoom in"
            onClick={() => {
              cancelWheelZoomTween();
              cancelPanInertia();
              didInitCamera.current = true;
              const cx = effectiveViewport.width / 2;
              const cy = size.height / 2;

              setCamera((prev) => {
                const nextScale = clamp(prev.scale * 1.25, MIN_SCALE, MAX_SCALE);
                const worldX = (cx - prev.x) / prev.scale;
                const worldY = (cy - prev.y) / prev.scale;
                return { scale: nextScale, x: cx - worldX * nextScale, y: cy - worldY * nextScale };
              });
            }}
          >
            +
          </button>
          <button
            type="button"
            className="border-l border-black/10 px-3 py-2 hover:bg-white"
            aria-label="Zoom out"
            onClick={() => {
              cancelWheelZoomTween();
              cancelPanInertia();
              didInitCamera.current = true;
              const cx = effectiveViewport.width / 2;
              const cy = size.height / 2;

              setCamera((prev) => {
                const nextScale = clamp(prev.scale / 1.25, MIN_SCALE, MAX_SCALE);
                const worldX = (cx - prev.x) / prev.scale;
                const worldY = (cy - prev.y) / prev.scale;
                return { scale: nextScale, x: cx - worldX * nextScale, y: cy - worldY * nextScale };
              });
            }}
          >
            −
          </button>
          <button
            type="button"
            className="border-l border-black/10 px-3 py-2 hover:bg-white"
            aria-label="Reset view"
            onClick={() => {
              if (!bounds) return;
              if (size.width <= 0 || size.height <= 0) return;
              cancelWheelZoomTween();
              cancelPanInertia();
              didInitCamera.current = true;

              const next = fitViewportCamera({
                viewport: { width: size.width, height: size.height },
                rightInset: desktopRightInsetPx,
                bounds,
                padding: 48
              });
              setCamera(next);
            }}
          >
            Reset
          </button>
        </div>

        {focusUsername ? (
          <button
            type="button"
            className="rounded-md border border-black/10 bg-white/80 px-3 py-2 text-xs text-ink-brown shadow-sm backdrop-blur hover:bg-white"
            onClick={() => {
              const agent = world.agents.find((a) => a.username === focusUsername);
              const agentOffset = agent ? displayOffsets.get(agent.username) : null;
              const agentX = typeof agent?.x === "number" ? (agent.x as number) + (agentOffset?.dx ?? 0) : null;
              const agentY = typeof agent?.y === "number" ? (agent.y as number) + (agentOffset?.dy ?? 0) : null;
              if (typeof agentX !== "number" || typeof agentY !== "number") return;
              if (size.width <= 0 || size.height <= 0) return;

              cancelWheelZoomTween();
              cancelPanInertia();
              didInitCamera.current = true;
              setCamera((prev) =>
                computeCenterTransform({
                  viewport: effectiveViewport,
                  world: { x: agentX, y: agentY },
                  scale: prev.scale
                })
              );
            }}
          >
            Center
          </button>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {bubbles.map((bubble) => (
          <motion.div
            key={`bubble:${bubble.id}`}
            className="pointer-events-none absolute"
            style={{
              left: bubble.left,
              top: bubble.top,
              zIndex: bubble.zIndex,
              transform: "translate(-50%, -100%)",
              transition: "left 140ms ease, top 140ms ease"
            }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <div
              className="relative rounded-xl border border-[#E0D5C5] bg-[#FFF9F0] px-3 py-2 text-xs text-ink-brown shadow-sm"
              style={{ maxWidth: bubble.maxWidth }}
            >
              <div className="mb-1 truncate text-[11px] font-semibold opacity-80">{bubble.label}</div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${bubble.id}:${bubble.text}`}
                  initial={{ opacity: 0.35 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0.45 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  <div className="break-words">{bubble.text}</div>
                  {bubble.memberSummary ? <div className="mt-1 text-[11px] opacity-70">{bubble.memberSummary}</div> : null}
                </motion.div>
              </AnimatePresence>
              <div className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1 rotate-45 border border-[#E0D5C5] bg-[#FFF9F0]" />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {tooltipPoi ? (
          <motion.div
            key={tooltipPoi.id}
            className="pointer-events-none absolute z-20"
            style={{ left: tooltipPoi.screenX, top: tooltipPoi.screenY, transform: "translate(-50%, calc(-100% - 10px))" }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
          >
            <div className="rounded-md border border-parchment-dark/70 bg-[#FFF9F0] px-2 py-1 text-[11px] text-ink-brown shadow-sm">
              <div className="font-semibold">{tooltipPoi.name}</div>
              <div className="text-ink-muted">{tooltipPoi.type.replace(/_/g, " ")}</div>
              {tooltipPoi.biome_tag ? <div className="text-ink-muted">{tooltipPoi.biome_tag}</div> : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
