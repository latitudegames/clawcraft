export function planMockQuestGeneration(args: {
  existingPartySizes: number[];
  targetCount: number;
}): { generateCount: number; forceFirstSolo: boolean } {
  const targetCount = Number.isFinite(args.targetCount) ? Math.max(1, Math.floor(args.targetCount)) : 1;
  const existingPartySizes = Array.isArray(args.existingPartySizes) ? args.existingPartySizes : [];

  const hasSolo = existingPartySizes.some((n) => n === 1);
  const existingCount = existingPartySizes.length;

  let generateCount = Math.max(0, targetCount - existingCount);
  let forceFirstSolo = false;

  if (!hasSolo) {
    if (generateCount === 0) generateCount = 1;
    forceFirstSolo = true;
  }

  return { generateCount, forceFirstSolo };
}

