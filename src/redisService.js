import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

let _client = null;

export function getRedisClient() {
  if (!_client) {
    _client = new Redis(REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
    _client.on("error", (err) => console.error("[Redis]", err.message));
  }
  return _client;
}

export async function getCache(key) {
  try {
    const val = await getRedisClient().get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export async function setCache(key, value, ttlSeconds = 60) {
  try {
    await getRedisClient().set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // cache write failure is non-fatal
  }
}

export async function delCache(...keys) {
  try {
    await getRedisClient().del(...keys);
  } catch {
    // ignore
  }
}

export async function closeRedis() {
  if (_client) {
    await _client.quit();
    _client = null;
  }
}
