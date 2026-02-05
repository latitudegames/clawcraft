export function shouldShowLocationLabels(scale: number): boolean {
  return scale >= 0.85;
}

export function shouldShowAgentLabels(scale: number): boolean {
  return scale >= 1.1;
}

export function bubbleLimitForScale(scale: number, hasFocus: boolean): number {
  if (scale >= 1.1) return 30;
  if (scale >= 0.85) return 15;
  if (scale >= 0.7) return 8;
  return hasFocus ? 1 : 0;
}

