import { questStepAt } from "./timing";

export function questProgressAt(args: {
  startedAtMs: number;
  nowMs: number;
  stepIntervalMs: number;
  totalSteps: number;
  statuses?: Array<{ step: number; text: string }> | null;
}): { currentStep: number; totalSteps: number; statusText: string | null } {
  const currentStep = questStepAt({
    startedAtMs: args.startedAtMs,
    nowMs: args.nowMs,
    stepIntervalMs: args.stepIntervalMs,
    totalSteps: args.totalSteps
  });

  const statuses = args.statuses ?? [];
  let best: { step: number; text: string } | null = null;
  for (const status of statuses) {
    if (status.step === currentStep) {
      best = { step: status.step, text: status.text };
      break;
    }
    if (status.step <= currentStep && (!best || status.step > best.step)) {
      best = { step: status.step, text: status.text };
    }
  }

  return { currentStep, totalSteps: args.totalSteps, statusText: best ? best.text : null };
}
