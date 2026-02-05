"use client";

import { Application, Container, Graphics, Text } from "pixi.js";
import type { PointerEvent, WheelEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useElementSize } from "@/lib/client/hooks/useElementSize";
import { computeFitTransform, type CameraTransform } from "@/lib/ui/camera";
import type { WorldStateResponse } from "@/types/world-state";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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

type PixiScene = {
  app: Application;
  world: Container;
  mapGraphics: Graphics;
  locationLabels: Container;
  agentLabels: Container;
};

export function WorldMap({ world, focusUsername }: { world: WorldStateResponse; focusUsername?: string | null }) {
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

  const [camera, setCamera] = useState<CameraTransform>({ scale: 1, x: 0, y: 0 });
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
      const locationLabels = new Container();
      const agentLabels = new Container();

      worldContainer.addChild(mapGraphics);
      worldContainer.addChild(locationLabels);
      worldContainer.addChild(agentLabels);

      app.stage.addChild(worldContainer);

      pixi.current = { app, world: worldContainer, mapGraphics, locationLabels, agentLabels };
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
    const agentX = agent?.x;
    const agentY = agent?.y;
    if (typeof agentX !== "number" || typeof agentY !== "number") return;

    const cx = size.width / 2;
    const cy = size.height / 2;

    setCamera((prev) => ({
      ...prev,
      x: cx - agentX * prev.scale,
      y: cy - agentY * prev.scale
    }));
    didInitCamera.current = true;
    focusedFor.current = focusUsername;
  }, [focusUsername, size.height, size.width, world.agents]);

  useEffect(() => {
    const scene = pixi.current;
    if (!scene) return;

    scene.mapGraphics.clear();
    scene.locationLabels.removeChildren().forEach((c) => c.destroy());
    scene.agentLabels.removeChildren().forEach((c) => c.destroy());

    for (const l of world.locations) {
      if (typeof l.x !== "number" || typeof l.y !== "number") continue;

      scene.mapGraphics.circle(l.x, l.y, 7).fill({ color: colorForLocationType(l.type), alpha: 0.95 });
      scene.mapGraphics.circle(l.x, l.y, 7).stroke({ width: 2, color: 0x4a3728, alpha: 0.35 });

      const label = new Text({
        text: l.name,
        style: { fill: 0x4a3728, fontSize: 12, fontWeight: "600" }
      });
      label.position.set(l.x + 10, l.y - 10);
      scene.locationLabels.addChild(label);
    }

    for (const a of world.agents) {
      if (typeof a.x !== "number" || typeof a.y !== "number") continue;

      const isFocused = Boolean(focusUsername && a.username === focusUsername);
      const radius = isFocused ? 6 : 4;

      scene.mapGraphics.circle(a.x, a.y, radius).fill({ color: a.traveling ? 0x87ceeb : 0xff6b6b, alpha: 0.95 });
      if (isFocused) {
        scene.mapGraphics.circle(a.x, a.y, radius + 4).stroke({ width: 3, color: 0xffd859, alpha: 0.9 });
      }

      const label = new Text({
        text: a.guild_tag ? `${a.username} [${a.guild_tag}]` : a.username,
        style: { fill: 0x4a3728, fontSize: isFocused ? 12 : 11, fontWeight: isFocused ? "700" : "400" }
      });
      label.position.set(a.x + 8, a.y + 6);
      scene.agentLabels.addChild(label);
    }
  }, [focusUsername, world.agents, world.locations]);

  const drag = useRef<null | { pointerId: number; startClientX: number; startClientY: number; baseX: number; baseY: number }>(null);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { pointerId: e.pointerId, startClientX: e.clientX, startClientY: e.clientY, baseX: camera.x, baseY: camera.y };
    didInitCamera.current = true;
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.current.startClientX;
    const dy = e.clientY - drag.current.startClientY;
    setCamera((prev) => ({ ...prev, x: drag.current!.baseX + dx, y: drag.current!.baseY + dy }));
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === e.pointerId) drag.current = null;
  };

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    didInitCamera.current = true;

    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const zoomIntensity = 0.0015;
    const nextScale = clamp(camera.scale * (1 - e.deltaY * zoomIntensity), 0.35, 8);

    const worldX = (cursorX - camera.x) / camera.scale;
    const worldY = (cursorY - camera.y) / camera.scale;

    setCamera({
      scale: nextScale,
      x: cursorX - worldX * nextScale,
      y: cursorY - worldY * nextScale
    });
  };

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
        Drag to pan • Scroll to zoom
      </div>

      {world.agents
        .filter((a) => a.status && typeof a.x === "number" && typeof a.y === "number")
        .slice(0, 30)
        .map((a) => {
          const screenX = (a.x as number) * camera.scale + camera.x;
          const screenY = (a.y as number) * camera.scale + camera.y;

          const left = clamp(screenX, 8, Math.max(8, size.width - 8));
          const top = clamp(screenY - 34, 8, Math.max(8, size.height - 8));
          const label = a.guild_tag ? `${a.username} [${a.guild_tag}]` : a.username;
          const text = a.status?.text ?? "";
          const textShort = text.length > 120 ? `${text.slice(0, 120)}…` : text;

          return (
            <div
              key={`bubble:${a.username}`}
              className="pointer-events-none absolute"
              style={{ left, top, transform: "translate(-50%, -100%)" }}
            >
              <div className="relative max-w-[180px] rounded-xl border border-[#E0D5C5] bg-[#FFF9F0] px-3 py-2 text-xs text-ink-brown shadow-sm">
                <div className="mb-1 truncate text-[11px] font-semibold opacity-80">{label}</div>
                <div className="break-words">{textShort}</div>
                <div className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1 rotate-45 border border-[#E0D5C5] bg-[#FFF9F0]" />
              </div>
            </div>
          );
        })}
    </div>
  );
}
