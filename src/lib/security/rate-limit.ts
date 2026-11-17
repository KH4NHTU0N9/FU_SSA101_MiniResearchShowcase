export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
}

interface BucketEntry {
    timestamps: number[];
}

const stores = new Map<string, Map<string, BucketEntry>>();
const MAX_KEYS_PER_NAMESPACE = 10_000;

/**
 * Extracts a normalized client IP address from standard proxy headers.
 */
export function getClientIp(req: Request): string {
    const forwardedFor = req.headers.get("x-forwarded-for");
    if (forwardedFor) {
        const first = forwardedFor.split(",")[0]?.trim();
        if (first) return first;
    }
    const realIp = req.headers.get("x-real-ip")?.trim();
    if (realIp) return realIp;
    return "unknown";
}

/**
 * Enforces an in-memory sliding-window rate limit keyed by namespace and client identifier.
 */
export function checkRateLimit(
    namespace: string,
    identifier: string,
    config: RateLimitConfig,
    nowMs: number = Date.now()
): RateLimitResult {
    let store = stores.get(namespace);
    if (!store) {
        store = new Map();
        stores.set(namespace, store);
    }

    const windowStart = nowMs - config.windowMs;
    const existing = store.get(identifier);
    const recent = existing ? existing.timestamps.filter((ts) => ts > windowStart) : [];

    if (recent.length >= config.maxRequests) {
        const oldestRelevant = recent[0] ?? nowMs;
        const retryAfterMs = Math.max(1000, oldestRelevant + config.windowMs - nowMs);
        store.set(identifier, { timestamps: recent });
        return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
        };
    }

    recent.push(nowMs);
    if (!store.has(identifier) && store.size >= MAX_KEYS_PER_NAMESPACE) {
        const firstKey = store.keys().next().value;
        if (firstKey !== undefined) {
            store.delete(firstKey);
        }
    }
    store.set(identifier, { timestamps: recent });

    return {
        allowed: true,
        remaining: Math.max(0, config.maxRequests - recent.length),
        retryAfterSeconds: 0,
    };
}

/**
 * Clears rate limit buckets (intended for unit/integration test isolation).
 */
export function resetRateLimitStore(namespace?: string): void {
    if (namespace) {
        stores.delete(namespace);
    } else {
        stores.clear();
    }
}
