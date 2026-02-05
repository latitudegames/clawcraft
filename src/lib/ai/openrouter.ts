export type OpenRouterChatRole = "system" | "user" | "assistant";

export type OpenRouterChatMessage = {
  role: OpenRouterChatRole;
  content: string;
};

export class OpenRouterError extends Error {
  status?: number;
  requestId?: string | null;
  body?: unknown;

  constructor(message: string, opts?: { status?: number; requestId?: string | null; body?: unknown }) {
    super(message);
    this.name = "OpenRouterError";
    this.status = opts?.status;
    this.requestId = opts?.requestId;
    this.body = opts?.body;
  }
}

export type OpenRouterChatCompletionOptions = {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  temperature?: number;
  maxTokens?: number;
  seed?: number;
  referer?: string;
  title?: string;
};

export function getOpenRouterConfigFromEnv(): Required<Pick<OpenRouterChatCompletionOptions, "model" | "baseUrl" | "timeoutMs">> &
  Pick<OpenRouterChatCompletionOptions, "apiKey" | "referer" | "title"> {
  const baseUrl = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
  const model = process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-v3.2";
  const timeoutMsRaw = process.env.OPENROUTER_TIMEOUT_MS;
  const timeoutMsParsed = timeoutMsRaw ? Number.parseInt(timeoutMsRaw, 10) : 25_000;

  return {
    apiKey: process.env.OPENROUTER_API_KEY,
    model,
    baseUrl,
    timeoutMs: Number.isFinite(timeoutMsParsed) ? Math.max(1_000, Math.min(120_000, timeoutMsParsed)) : 25_000,
    referer: process.env.OPENROUTER_HTTP_REFERER,
    title: process.env.OPENROUTER_APP_TITLE
  };
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  const firstNewline = trimmed.indexOf("\n");
  if (firstNewline === -1) return trimmed;
  const withoutFirstLine = trimmed.slice(firstNewline + 1);
  const endFence = withoutFirstLine.lastIndexOf("```");
  if (endFence === -1) return withoutFirstLine.trim();
  return withoutFirstLine.slice(0, endFence).trim();
}

export function extractFirstJsonObject(text: string): unknown {
  const direct = text.trim();
  try {
    return JSON.parse(direct);
  } catch {
    // fall through
  }

  const unfenced = stripCodeFences(direct);
  try {
    return JSON.parse(unfenced);
  } catch {
    // fall through
  }

  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new OpenRouterError("Model response did not contain a JSON object.");
  }

  const slice = unfenced.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch (err) {
    throw new OpenRouterError(`Failed to parse JSON from model response: ${err instanceof Error ? err.message : String(err)}`);
  }
}

type OpenRouterChatCompletionResponse = {
  choices?: Array<{
    message?: { content?: string };
  }>;
};

async function readJsonBestEffort(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { _non_json: text };
  }
}

export async function openRouterChatCompletion(
  messages: OpenRouterChatMessage[],
  options?: OpenRouterChatCompletionOptions
): Promise<string> {
  const cfg = getOpenRouterConfigFromEnv();
  const apiKey = options?.apiKey ?? cfg.apiKey;
  if (!apiKey) throw new OpenRouterError("Missing OPENROUTER_API_KEY.");

  const model = options?.model ?? cfg.model;
  const baseUrl = options?.baseUrl ?? cfg.baseUrl;
  const timeoutMs = options?.timeoutMs ?? cfg.timeoutMs;

  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

  const body = {
    model,
    messages,
    temperature: options?.temperature ?? 0.4,
    max_tokens: options?.maxTokens ?? 700,
    seed: options?.seed,
    response_format: { type: "json_object" }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      ...(options?.referer || cfg.referer ? { "http-referer": options?.referer ?? cfg.referer! } : {}),
      ...(options?.title || cfg.title ? { "x-title": options?.title ?? cfg.title! } : {})
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!res.ok) {
    const requestId = res.headers.get("x-request-id");
    const payload = await readJsonBestEffort(res);
    const message =
      typeof (payload as { error?: { message?: string } } | null)?.error?.message === "string"
        ? (payload as { error: { message: string } }).error.message
        : `OpenRouter request failed (HTTP ${res.status}).`;
    throw new OpenRouterError(message, { status: res.status, requestId, body: payload });
  }

  const json = (await res.json()) as OpenRouterChatCompletionResponse;
  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new OpenRouterError("OpenRouter response missing message content.");
  }

  return content;
}

export async function openRouterChatCompletionJson<T>(
  messages: OpenRouterChatMessage[],
  options?: OpenRouterChatCompletionOptions
): Promise<T> {
  const content = await openRouterChatCompletion(messages, options);
  return extractFirstJsonObject(content) as T;
}

