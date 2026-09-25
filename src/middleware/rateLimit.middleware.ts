import type { NextFunction, Request, Response } from "express";
import { redisClient } from "../config/redis";

interface RateLimitOptions {
  /** Redis key namespace, so separate limiters don't share counters. */
  name: string;
  windowSeconds: number;
  max: number;
}

/** Fixed-window rate limiter backed by Redis (INCR + EXPIRE), keyed by client
 * IP. Counters live in Redis rather than process memory so the limit holds
 * across multiple backend instances. Fails open if Redis is unavailable - a
 * cache outage shouldn't take the whole API down with it. */
export function rateLimit({ name, windowSeconds, max }: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const window = Math.floor(Date.now() / 1000 / windowSeconds);
    const key = `ratelimit:${name}:${req.ip}:${window}`;

    try {
      const count = await redisClient.incr(key);
      if (count === 1) {
        await redisClient.expire(key, windowSeconds);
      }

      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, max - count));

      if (count > max) {
        res.setHeader("Retry-After", windowSeconds);
        res.status(429).json({ error: "Too many requests. Please slow down and try again shortly." });
        return;
      }
    } catch (err) {
      console.error("Rate limiter unavailable, allowing request", err);
    }

    next();
  };
}
