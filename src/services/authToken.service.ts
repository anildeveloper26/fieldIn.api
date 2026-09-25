import crypto from "crypto";
import { env } from "../config/env";
import { redisClient } from "../config/redis";
import { ApiError } from "../middleware/errorHandler";

const REFRESH_TOKEN_TTL_SECONDS = env.refreshTokenExpiresInDays * 24 * 60 * 60;

function refreshKey(token: string): string {
  return `refresh:${token}`;
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(40).toString("hex");
  await redisClient.set(refreshKey(token), userId, { EX: REFRESH_TOKEN_TTL_SECONDS });
  return token;
}

/** Verifies a refresh token and rotates it: the old token is invalidated
 * and a new one is issued for the same user, so a stolen/replayed refresh
 * token stops working the moment the legitimate client uses it. */
export async function rotateRefreshToken(oldToken: string): Promise<{ userId: string; token: string }> {
  const userId = await redisClient.get(refreshKey(oldToken));
  if (!userId) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }
  await redisClient.del(refreshKey(oldToken));
  const token = await issueRefreshToken(userId);
  return { userId, token };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await redisClient.del(refreshKey(token));
}
