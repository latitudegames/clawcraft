"use client";

import { Application, Assets, Container, Graphics, Sprite, Text, Texture, TextureStyle } from "pixi.js";
import type { PointerEvent, WheelEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useElementSize } from "@/lib/client/hooks/useElementSize";
import { groupBubbleCandidates, selectBubbleGroups } from "@/lib/ui/bubble-groups";
import { layoutBubbles } from "@/lib/ui/bubble-layout";
import { computeCenterTransform, computeFitTransform, type CameraTransform } from "@/lib/ui/camera";
import { computeClusterOffsets } from "@/lib/ui/cluster-layout";
import { bubbleLimitForScale, shouldShowAgentLabels, shouldShowLocationLabels } from "@/lib/ui/declutter";
import { computeRoadPolyline } from "@/lib/ui/roads";
import type { AgentSpriteKey } from "@/lib/ui/sprites";
import { AGENT_SPRITE_KEYS, agentSpriteKeyForUsername } from "@/lib/ui/sprites";
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
const AGENT_CLUSTER_RADIUS_WORLD = 10;

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
  mapGraphics: Graphics;
  poiSprites: Container;
  locationLabels: Container;
  agentSprites: Container;
  agentLabels: Container;
  agentTextures: Map<AgentSpriteKey, Texture>;
  poiTextures: Map<PoiIconKey, Texture>;
  spritesByUsername: Map<string, Sprite>;
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
  const [assetsVersion, setAssetsVersion] = useState(0);
  const didInitCamera = useRef(false);
  const focusedFor = useRef<string | null>(null);
  const pixi = useRef<PixiScene | null>(null);

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
      const mapGraphics = new Graphics();
      const poiSprites = new Container();
      const locationLabels = new Container();
      const agentSprites = new Container();
      const agentLabels = new Container();

      worldContainer.addChild(mapGraphics);
      worldContainer.addChild(poiSprites);
      worldContainer.addChild(locationLabels);
      worldContainer.addChild(agentSprites);
      worldContainer.addChild(agentLabels);

      app.stage.addChild(worldContainer);

      const agentTextures = new Map<AgentSpriteKey, Texture>();
      const poiTextures = new Map<PoiIconKey, Texture>();
      const spritesByUsername = new Map<string, Sprite>();

      agentSprites.sortableChildren = true;
      poiSprites.sortableChildren = true;

      pixi.current = {
        app,
        world: worldContainer,
        mapGraphics,
        poiSprites,
        locationLabels,
        agentSprites,
        agentLabels,
        agentTextures,
        poiTextures,
        spritesByUsername
      };

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
  }, [size.height, size.width]);

  useEffect(() => {
    const scene = pixi.current;
    if (!scene) return;
    scene.world.position.set(camera.x, camera.y);
    scene.world.scale.set(camera.scale);
  }, [camera.scale, camera.x, camera.y]);

  useEffect(() => {
    const scene = pixi.current;
    if (!scene) return;
    scene.locationLabels.visible = shouldShowLocationLabels(camera.scale);
    scene.agentLabels.visible = shouldShowAgentLabels(camera.scale);
  }, [camera.scale]);

  useEffect(() => {
    if (didInitCamera.current) return;
    if (!bounds) return;
    if (size.width <= 0 || size.height <= 0) return;

    const fit = computeFitTransform({
      viewport: { width: size.width, height: size.height },
      bounds,
      padding: 48
    });
    setCamera({ scale: clamp(fit.scale, 0.5, 6), x: fit.x, y: fit.y });
    didInitCamera.current = true;
  }, [bounds, size.height, size.width]);

  useEffect(() => {
    if (!focusUsername) {
      focusedFor.current = null;
      return;
    }
    if (focusedFor.current === focusUsername) return;
    if (size.width <= 0 || size.height <= 0) return;

    const agent = world.agents.find((a) => a.username === focusUsername);
    const agentOffset = agent ? agentOffsets.get(agent.username) : null;
    const agentX = typeof agent?.x === "number" ? (agent.x as number) + (agentOffset?.dx ?? 0) : null;
    const agentY = typeof agent?.y === "number" ? (agent.y as number) + (agentOffset?.dy ?? 0) : null;
    if (typeof agentX !== "number" || typeof agentY !== "number") return;

    setCamera((prev) =>
      computeCenterTransform({
        viewport: { width: size.width, height: size.height },
        world: { x: agentX, y: agentY },
        scale: prev.scale
      })
    );
    didInitCamera.current = true;
    focusedFor.current = focusUsername;
  }, [agentOffsets, focusUsername, size.height, size.width, world.agents]);

  useEffect(() => {
    const scene = pixi.current;
    if (!scene) return;

    scene.mapGraphics.clear();
    scene.poiSprites.removeChildren().forEach((c) => c.destroy());
    scene.locationLabels.removeChildren().forEach((c) => c.destroy());
    scene.agentLabels.removeChildren().forEach((c) => c.destroy());

    const locById = new Map(world.locations.map((l) => [l.id, l]));
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
        scene.mapGraphics.moveTo(start.x, start.y);
        for (let i = 1; i < points.length; i++) {
          const p = points[i];
          if (!p) continue;
          scene.mapGraphics.lineTo(p.x, p.y);
        }
      };

      // Dirt road with subtle border + highlight (Stardew-ish).
      drawPath();
      scene.mapGraphics.stroke({ width: 10, color: 0x4a3728, alpha: 0.18 });
      drawPath();
      scene.mapGraphics.stroke({ width: 8, color: 0xc9a567, alpha: 0.55 });
      drawPath();
      scene.mapGraphics.stroke({ width: 3, color: 0xe8d170, alpha: 0.35 });
    }

    for (const l of world.locations) {
      if (typeof l.x !== "number" || typeof l.y !== "number") continue;

      scene.mapGraphics.circle(l.x, l.y + 10, 12).fill({ color: 0x000000, alpha: 0.1 });

      const poiKey = slugifyPoiName(l.name) as PoiIconKey;
      const texture = scene.poiTextures.get(poiKey);

      if (texture) {
        const icon = new Sprite(texture);
        icon.anchor.set(0.5, 0.5);
        icon.scale.set(POI_ICON_SCALE);
        icon.position.set(l.x, l.y);
        icon.zIndex = l.y;
        scene.poiSprites.addChild(icon);
      } else {
        scene.mapGraphics.circle(l.x, l.y, 7).fill({ color: colorForLocationType(l.type), alpha: 0.95 });
        scene.mapGraphics.circle(l.x, l.y, 7).stroke({ width: 2, color: 0x4a3728, alpha: 0.35 });
      }

      const label = new Text({
        text: l.name,
        style: { fill: 0x4a3728, fontSize: 12, fontWeight: "600" }
      });
      label.position.set(l.x + (texture ? POI_ICON_SIZE_WORLD / 2 + 8 : 10), l.y - (texture ? POI_ICON_SIZE_WORLD / 2 + 2 : 10));
      scene.locationLabels.addChild(label);
    }

    for (const a of world.agents) {
      if (typeof a.x !== "number" || typeof a.y !== "number") continue;

      const offset = agentOffsets.get(a.username);
      const ax = (a.x as number) + (offset?.dx ?? 0);
      const ay = (a.y as number) + (offset?.dy ?? 0);

      const isFocused = Boolean(focusUsername && a.username === focusUsername);
      const radius = isFocused ? 6 : 4;

      scene.mapGraphics.circle(ax, ay, 8).fill({ color: 0x000000, alpha: 0.12 });

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
        }
        next.alpha = a.traveling ? 0.85 : 1;
        next.position.set(ax, ay);
        next.zIndex = ay;
      } else {
        scene.mapGraphics.circle(ax, ay, radius).fill({ color: a.traveling ? 0x87ceeb : 0xff6b6b, alpha: 0.95 });
      }

      if (isFocused) {
        scene.mapGraphics.circle(ax, ay, radius + 6).stroke({ width: 3, color: 0xffd859, alpha: 0.9 });
      }

      const label = new Text({
        text: a.guild_tag ? `${a.username} [${a.guild_tag}]` : a.username,
        style: { fill: 0x4a3728, fontSize: isFocused ? 12 : 11, fontWeight: isFocused ? "700" : "400" }
      });
      label.position.set(ax + 10, ay + 8);
      scene.agentLabels.addChild(label);
    }

    const seen = new Set(world.agents.map((a) => a.username));
    for (const [username, sprite] of scene.spritesByUsername.entries()) {
      if (seen.has(username)) continue;
      sprite.destroy({ children: true });
      scene.spritesByUsername.delete(username);
    }
  }, [agentOffsets, assetsVersion, focusUsername, world.agents, world.connections, world.locations]);

  const drag = useRef<
    null | { pointerId: number; startClientX: number; startClientY: number; baseX: number; baseY: number; moved: boolean }
  >(null);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      baseX: camera.x,
      baseY: camera.y,
      moved: false
    };
    didInitCamera.current = true;
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.current.startClientX;
    const dy = e.clientY - drag.current.startClientY;
    if (!drag.current.moved) {
      if (Math.hypot(dx, dy) <= 4) return;
      drag.current.moved = true;
    }
    setCamera((prev) => ({ ...prev, x: drag.current!.baseX + dx, y: drag.current!.baseY + dy }));
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== e.pointerId) return;
    drag.current = null;

    if (state.moved) return;
    if (e.button !== 0) return;
    if (!onSelectAgent) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const worldX = (cursorX - camera.x) / camera.scale;
    const worldY = (cursorY - camera.y) / camera.scale;

    const hitRadiusWorld = 24 / camera.scale;
    const hitRadius2 = hitRadiusWorld * hitRadiusWorld;

    let picked: { username: string; dist2: number } | null = null;
    for (const a of world.agents) {
      if (typeof a.x !== "number" || typeof a.y !== "number") continue;
      const offset = agentOffsets.get(a.username);
      const cx = (a.x as number) + (offset?.dx ?? 0);
      const cy = (a.y as number) + (offset?.dy ?? 0) - AGENT_SPRITE_SIZE_WORLD / 2;
      const dx = cx - worldX;
      const dy = cy - worldY;
      const dist2 = dx * dx + dy * dy;
      if (!picked || dist2 < picked.dist2) picked = { username: a.username, dist2 };
    }

    if (picked && picked.dist2 <= hitRadius2) {
      onSelectAgent(picked.username);
    }
  };

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    didInitCamera.current = true;

    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const zoomIntensity = 0.0015;
    const nextScale = clamp(camera.scale * (1 - e.deltaY * zoomIntensity), MIN_SCALE, MAX_SCALE);

    const worldX = (cursorX - camera.x) / camera.scale;
    const worldY = (cursorY - camera.y) / camera.scale;

    setCamera({
      scale: nextScale,
      x: cursorX - worldX * nextScale,
      y: cursorY - worldY * nextScale
    });
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

    const focusGroupId = focusedCandidate ? focusedCandidate.run_id ?? focusedCandidate.username : null;
    const groups = groupBubbleCandidates({
      candidates: allCandidates.map((a) => ({ username: a.username, run_id: a.run_id })),
      focusUsername
    });
    const selectedGroups = selectBubbleGroups({ groups, bubbleLimit, focusUsername });
    const candidateByUsername = new Map(allCandidates.map((a) => [a.username, a]));

    const bubbleInputs = selectedGroups
      .map((group) => {
        const a = candidateByUsername.get(group.representative);
        if (!a) return null;

        const offset = agentOffsets.get(a.username);
        const ax = (a.x as number) + (offset?.dx ?? 0);
        const ay = (a.y as number) + (offset?.dy ?? 0);

        const anchorX = ax * camera.scale + camera.x;
        const anchorY = (ay - AGENT_SPRITE_SIZE_WORLD) * camera.scale + camera.y;

        const labelBase = a.guild_tag ? `${a.username} [${a.guild_tag}]` : a.username;
        const label = group.members.length > 1 ? `${labelBase} +${group.members.length - 1}` : labelBase;
        const text = a.status?.text ?? "";
        const textShort = text.length > 120 ? `${text.slice(0, 120)}…` : text;

        const charsPerLine = 26;
        const lines = Math.max(1, Math.ceil(textShort.length / charsPerLine));
        const height = 16 + 18 + lines * 16 + 12;

        return {
          id: group.id,
          anchorX,
          anchorY,
          width: BUBBLE_MAX_WIDTH_PX,
          height,
          priority: group.id === focusGroupId ? 10 : 0,
          label,
          text: textShort
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
    }>;

    const layout = layoutBubbles({
      viewport: { width: size.width, height: size.height },
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
    }>;
  }, [agentOffsets, camera.scale, camera.x, camera.y, focusUsername, size.height, size.width, world.agents]);

  return (
    <div
      ref={ref}
      className="relative h-[560px] w-full overflow-hidden rounded-md border border-parchment-dark/70 bg-[#7EC850] shadow-inner"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <div ref={canvasHostRef} className="absolute inset-0" />

      <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-parchment-dark/70 bg-white/80 px-2 py-1 text-xs text-ink-brown shadow-sm">
        Drag to pan • Scroll/+/- to zoom{onSelectAgent ? " • Click an agent for details" : ""}
      </div>

      <div
        className="absolute bottom-3 left-3 flex items-end gap-2"
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="flex overflow-hidden rounded-md border border-black/10 bg-white/80 text-xs text-ink-brown shadow-sm backdrop-blur">
          <button
            type="button"
            className="px-3 py-2 hover:bg-white"
            aria-label="Zoom in"
            onClick={() => {
              didInitCamera.current = true;
              const cx = size.width / 2;
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
              didInitCamera.current = true;
              const cx = size.width / 2;
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
              didInitCamera.current = true;

              const fit = computeFitTransform({
                viewport: { width: size.width, height: size.height },
                bounds,
                padding: 48
              });
              setCamera({ scale: clamp(fit.scale, 0.5, 6), x: fit.x, y: fit.y });
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
              const agentOffset = agent ? agentOffsets.get(agent.username) : null;
              const agentX = typeof agent?.x === "number" ? (agent.x as number) + (agentOffset?.dx ?? 0) : null;
              const agentY = typeof agent?.y === "number" ? (agent.y as number) + (agentOffset?.dy ?? 0) : null;
              if (typeof agentX !== "number" || typeof agentY !== "number") return;
              if (size.width <= 0 || size.height <= 0) return;

              didInitCamera.current = true;
              setCamera((prev) =>
                computeCenterTransform({
                  viewport: { width: size.width, height: size.height },
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

      {bubbles.map((bubble) => (
        <div
          key={`bubble:${bubble.id}`}
          className="pointer-events-none absolute"
          style={{
            left: bubble.left,
            top: bubble.top,
            zIndex: bubble.zIndex,
            transform: "translate(-50%, -100%)",
            transition: "left 140ms ease, top 140ms ease"
          }}
        >
          <div className="relative max-w-[180px] rounded-xl border border-[#E0D5C5] bg-[#FFF9F0] px-3 py-2 text-xs text-ink-brown shadow-sm">
            <div className="mb-1 truncate text-[11px] font-semibold opacity-80">{bubble.label}</div>
            <div className="break-words">{bubble.text}</div>
            <div className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1 rotate-45 border border-[#E0D5C5] bg-[#FFF9F0]" />
          </div>
        </div>
      ))}
    </div>
  );
}
