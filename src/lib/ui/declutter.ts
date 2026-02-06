export function shouldShowLocationLabels(scale: number): boolean {
  return scale >= 0.95;
}

export function shouldShowAgentLabels(scale: number): boolean {
  return scale >= 1.6;
}

export function bubbleLimitForScale(scale: number, hasFocus: boolean): number {
  if (scale >= 1.6) return hasFocus ? 8 : 5;
  if (scale >= 1.2) return hasFocus ? 5 : 3;
  if (scale >= 0.9) return hasFocus ? 3 : 2;
  if (scale >= 0.7) return hasFocus ? 2 : 1;
  return hasFocus ? 1 : 0;
}

export function agentLabelLimitForScale(scale: number, hasFocus: boolean): number {
  if (scale >= 2.4) return hasFocus ? 18 : 14;
  if (scale >= 1.8) return hasFocus ? 10 : 6;
  if (scale >= 1.6) return hasFocus ? 6 : 3;
  return hasFocus ? 1 : 0;
}
