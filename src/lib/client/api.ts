export class ApiError extends Error {
  public status: number;
  public code?: string;

  constructor(args: { message: string; status: number; code?: string }) {
    super(args.message);
    this.name = "ApiError";
    this.status = args.status;
    this.code = args.code;
  }
}

async function readJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { _non_json: text };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const json = await readJsonSafe(res);

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code: string | undefined;
    if (isRecord(json)) {
      if (typeof json.message === "string") message = json.message;
      if (typeof json.error === "string") code = json.error;
    }
    throw new ApiError({ message, status: res.status, code });
  }

  return json as T;
}
