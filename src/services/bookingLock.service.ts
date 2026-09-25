import { redisClient } from "../config/redis";

const LOCK_TTL_SECONDS = 600; // 10 minutes, per the brief's slot-hold requirement

function lockKey(venueId: string, slotDate: string, slotStart: string): string {
  return `lock:venue:${venueId}:${slotDate}:${slotStart}`;
}

/** Returns true if the lock was acquired, false if the slot is already held. */
export async function acquireSlotLock(
  venueId: string,
  slotDate: string,
  slotStart: string,
  holderId: string
): Promise<boolean> {
  const result = await redisClient.set(lockKey(venueId, slotDate, slotStart), holderId, {
    NX: true,
    EX: LOCK_TTL_SECONDS,
  });
  return result === "OK";
}

export async function releaseSlotLock(
  venueId: string,
  slotDate: string,
  slotStart: string
): Promise<void> {
  await redisClient.del(lockKey(venueId, slotDate, slotStart));
}
