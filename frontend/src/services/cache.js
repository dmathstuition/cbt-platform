// Simple in-memory cache with TTL
const cache = new Map();

const DEFAULT_TTL = 60 * 1000; // 1 minute

export const cacheGet = (key) => {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.data;
};

export const cacheSet = (key, data, ttl = DEFAULT_TTL) => {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
};

export const cacheDelete = (key) => cache.delete(key);

export const cacheClear = (prefix) => {
  if (!prefix) { cache.clear(); return; }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
};

// Cached API call wrapper
export const cachedRequest = async (key, requestFn, ttl = DEFAULT_TTL) => {
  const cached = cacheGet(key);
  if (cached) return cached;
  const data = await requestFn();
  cacheSet(key, data, ttl);
  return data;
};

// Cache TTLs per data type
export const TTL = {
  STATS:      5  * 60 * 1000,  // 5 min — changes infrequently
  EXAMS:      2  * 60 * 1000,  // 2 min
  RESULTS:    3  * 60 * 1000,  // 3 min
  USERS:      5  * 60 * 1000,  // 5 min
  CLASSES:    10 * 60 * 1000,  // 10 min — rarely changes
  SUBJECTS:   10 * 60 * 1000,  // 10 min
  QUESTIONS:  2  * 60 * 1000,  // 2 min
  SHORT:      30 * 1000,       // 30 sec — fast-changing data
};