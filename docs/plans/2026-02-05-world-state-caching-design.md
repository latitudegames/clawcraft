# World-State Caching (Design)

Goal: reduce DB load from spectator polling of `GET /api/world-state` without sacrificing “near real-time” map updates.

## Constraints
- Route is public and identical for all spectators (no per-user personalization).
- Must remain safe under concurrency (many clients polling at once).
- Keep behavior changes low-risk; do not introduce CDN/browser caching surprises.
- Current handler can opportunistically resolve due quest runs; caching should not delay this by more than a tiny window.

## Options considered
1. **HTTP/CDN caching (`Cache-Control`, ETag)**  
   Pros: can reduce origin load drastically.  
   Cons: can interfere with “always fresh” clients (`cache: "no-store"`), complicates side effects (quest resolution), and depends on deploy/CDN behavior.
2. **Next.js data cache (`unstable_cache`)**  
   Pros: framework-native.  
   Cons: not a great fit for route handlers and still requires careful invalidation.
3. **In-memory async TTL cache (module-scoped)** ✅  
   Pros: simple, local, predictable; caps expensive computation to ~1/TTL per warm instance; can dedupe in-flight requests.  
   Cons: per-instance only (serverless cold starts don’t share cache), best-effort.

## Chosen design
- Add a tiny `createAsyncTtlCache` helper:
  - caches the last successful value for `ttlMs`
  - dedupes concurrent cache-miss calls by sharing the same in-flight promise
  - does **not** cache failures
- Wrap the world-state computation with a `ttlMs: 1000` cache so that polling spikes don’t stampede the DB.

## Testing
- Unit tests for cache hit, expiry, in-flight dedupe, and “errors don’t poison the cache”.

