import assert from "node:assert/strict";
import test from "node:test";

import { createAsyncTtlCache } from "./async-ttl-cache";

test("createAsyncTtlCache caches a value within TTL", async () => {
  let nowMs = 1_000;
  const cache = createAsyncTtlCache<number>({ ttlMs: 50, now: () => nowMs });

  let calls = 0;
  const loader = async () => {
    calls += 1;
    return calls;
  };

  assert.equal(await cache.get(loader), 1);
  nowMs += 10;
  assert.equal(await cache.get(loader), 1);
  assert.equal(calls, 1);
});

test("createAsyncTtlCache expires entries after TTL", async () => {
  let nowMs = 10_000;
  const cache = createAsyncTtlCache<number>({ ttlMs: 50, now: () => nowMs });

  let calls = 0;
  const loader = async () => {
    calls += 1;
    return calls;
  };

  assert.equal(await cache.get(loader), 1);
  nowMs += 60;
  assert.equal(await cache.get(loader), 2);
  assert.equal(calls, 2);
});

test("createAsyncTtlCache dedupes concurrent cache misses", async () => {
  let nowMs = 500;
  const cache = createAsyncTtlCache<number>({ ttlMs: 50, now: () => nowMs });

  let resolve!: (value: number) => void;
  let calls = 0;
  const loader = async () => {
    calls += 1;
    return await new Promise<number>((r) => {
      resolve = r;
    });
  };

  const p1 = cache.get(loader);
  const p2 = cache.get(loader);
  assert.equal(calls, 1);

  resolve(123);
  assert.equal(await p1, 123);
  assert.equal(await p2, 123);

  nowMs += 10;
  assert.equal(await cache.get(loader), 123);
  assert.equal(calls, 1);
});

test("createAsyncTtlCache does not cache failures", async () => {
  const nowMs = 1_000;
  const cache = createAsyncTtlCache<number>({ ttlMs: 50, now: () => nowMs });

  let calls = 0;
  const loader = async () => {
    calls += 1;
    if (calls === 1) throw new Error("boom");
    return 42;
  };

  await assert.rejects(() => cache.get(loader), /boom/);
  assert.equal(await cache.get(loader), 42);
  assert.equal(calls, 2);
});
