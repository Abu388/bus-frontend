interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs = 5 * 60 * 1000): void {
    // Evict oldest if cache grows too large
    if (this.cache.size > 200) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }
}

export const geoSearchCache = new MemoryCache<unknown>();
export const geoReverseCache = new MemoryCache<unknown>();
export const geoRouteCache = new MemoryCache<unknown>();
export const geoNearestCache = new MemoryCache<unknown>();

// Light rate limiter: 60 requests per minute per client IP/session
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

export function checkRateLimit(clientId: string, limit = 60, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(clientId);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(clientId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}
