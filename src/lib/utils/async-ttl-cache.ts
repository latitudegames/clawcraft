type AsyncTtlCacheOptions = {
  ttlMs: number;
  now?: () => number;
};

export type AsyncTtlCache<T> = {
  get: (loader: () => Promise<T>) => Promise<T>;
  clear: () => void;
};

export function createAsyncTtlCache<T>(opts: AsyncTtlCacheOptions): AsyncTtlCache<T> {
  const now = opts.now ?? Date.now;

  let hasValue = false;
  let value: T;
  let expiresAtMs = 0;
  let inFlight: Promise<T> | null = null;

  async function get(loader: () => Promise<T>): Promise<T> {
    const nowMs = now();
    if (hasValue && nowMs < expiresAtMs) return value;
    if (inFlight) return inFlight;

    inFlight = loader()
      .then((next) => {
        value = next;
        hasValue = true;
        expiresAtMs = now() + opts.ttlMs;
        return next;
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  }

  function clear() {
    hasValue = false;
    expiresAtMs = 0;
  }

  return { get, clear };
}

