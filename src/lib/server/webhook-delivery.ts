import type { WebhookEvent } from "@/types/webhooks";

export type WebhookDelivery = {
  url: string;
  event: WebhookEvent;
};

export async function deliverWebhook(delivery: WebhookDelivery, opts?: { timeoutMs?: number }): Promise<void> {
  const timeoutMs = opts?.timeoutMs ?? 3_000;
  if (!delivery.url) return;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(delivery.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "clawcraft-webhook/0.1"
      },
      body: JSON.stringify(delivery.event),
      signal: controller.signal
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[webhook] ${delivery.url} -> ${res.status} ${res.statusText}${text ? `: ${text.slice(0, 200)}` : ""}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[webhook] ${delivery.url} delivery failed: ${msg}`);
  } finally {
    clearTimeout(t);
  }
}

export async function deliverWebhooks(deliveries: WebhookDelivery[], opts?: { timeoutMs?: number }): Promise<void> {
  if (!deliveries.length) return;
  await Promise.allSettled(deliveries.map((d) => deliverWebhook(d, opts)));
}

