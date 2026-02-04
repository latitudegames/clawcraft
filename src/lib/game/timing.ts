function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function scaleDurationMs(durationMs: number, timeScale: number): number {
  if (!Number.isFinite(durationMs) || durationMs < 0) throw new Error("durationMs must be a finite number >= 0");
  if (!Number.isFinite(timeScale) || timeScale <= 0) throw new Error("timeScale must be a finite number > 0");
  if (durationMs === 0) return 0;

  const scaled = durationMs / timeScale;
  if (scaled < 1) return 1;
  return Math.floor(scaled);
}

export function questStepAt(args: { startedAtMs: number; nowMs: number; stepIntervalMs: number; totalSteps: number }): number {
  const { startedAtMs, nowMs, stepIntervalMs, totalSteps } = args;
  if (!Number.isFinite(startedAtMs)) throw new Error("startedAtMs must be finite");
  if (!Number.isFinite(nowMs)) throw new Error("nowMs must be finite");
  if (!Number.isFinite(stepIntervalMs) || stepIntervalMs <= 0) throw new Error("stepIntervalMs must be > 0");
  if (!Number.isInteger(totalSteps) || totalSteps < 1) throw new Error("totalSteps must be an integer >= 1");

  if (nowMs <= startedAtMs) return 1;
  const elapsedMs = nowMs - startedAtMs;
  const step = Math.floor(elapsedMs / stepIntervalMs) + 1;
  return clampInt(step, 1, totalSteps);
}

