import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

/**
 * Abuse guard for the token-spending endpoint. Upstash sliding window when
 * Redis env is present (accepts both the Vercel KV integration names and the
 * native Upstash names); otherwise a per-instance in-memory window for local
 * dev. The in-memory fallback is NOT a production guard (serverless instances
 * don't share it); production must ship with Redis env configured.
 */

const LIMIT = 5;
const WINDOW_SECONDS = 60;

function redisFromEnv(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = redisFromEnv();
const limiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(LIMIT, `${WINDOW_SECONDS} s`),
      prefix: "whisperways",
    })
  : null;

const memoryHits = new Map<string, number[]>();

function memoryAllow(key: string): boolean {
  const now = Date.now();
  const cutoff = now - WINDOW_SECONDS * 1000;
  const hits = (memoryHits.get(key) ?? []).filter((t) => t > cutoff);
  hits.push(now);
  memoryHits.set(key, hits);
  return hits.length <= LIMIT;
}

function clientKey(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous"
  );
}

/** Returns a 429 response when over limit, null when allowed. */
export async function checkRateLimit(
  req: NextRequest,
): Promise<NextResponse | null> {
  const key = clientKey(req);
  const allowed = limiter
    ? (await limiter.limit(key)).success
    : memoryAllow(key);
  if (allowed) return null;
  return NextResponse.json(
    { error: "rate limit exceeded, try again in a minute" },
    { status: 429 },
  );
}
