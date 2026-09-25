import { pool } from "../config/db";
import { ApiError } from "../middleware/errorHandler";
import { acquireSlotLock, releaseSlotLock } from "./bookingLock.service";

interface CreateBookingInput {
  userId: string;
  venueId: string;
  slotDate: string;
  slotStart: string;
  slotEnd: string;
  playerCount: number;
}

export async function createBooking(input: CreateBookingInput) {
  const venueResult = await pool.query("SELECT hourly_rate FROM venues WHERE id = $1", [
    input.venueId,
  ]);
  const venue = venueResult.rows[0];
  if (!venue) {
    throw new ApiError(404, "Venue not found");
  }

  const locked = await acquireSlotLock(input.venueId, input.slotDate, input.slotStart, input.userId);
  if (!locked) {
    throw new ApiError(409, "This slot is currently being held by another booking. Try again shortly.");
  }

  try {
    const hourlyRate = Number(venue.hourly_rate);
    const totalAmount = hourlyRate;
    const perHeadAmount = Math.round((totalAmount / input.playerCount) * 100) / 100;

    const result = await pool.query(
      `INSERT INTO bookings (venue_id, user_id, slot_date, slot_start, slot_end, total_amount, per_head_amount, player_count, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed')
       RETURNING id, venue_id, user_id, slot_date, slot_start, slot_end, total_amount, per_head_amount, player_count, status, created_at`,
      [
        input.venueId,
        input.userId,
        input.slotDate,
        input.slotStart,
        input.slotEnd,
        totalAmount,
        perHeadAmount,
        input.playerCount,
      ]
    );

    return mapBookingRow(result.rows[0]);
  } catch (err) {
    // Booking failed after the lock was acquired (e.g. DB constraint) - release
    // immediately rather than waiting out the 10-minute TTL.
    await releaseSlotLock(input.venueId, input.slotDate, input.slotStart);
    // The Redis lock only holds for 10 minutes, but a confirmed row is permanent -
    // once the lock expires, a second attempt to book the same already-booked slot
    // reaches this INSERT and trips the DB's unique constraint instead of the lock.
    if (isUniqueSlotViolation(err)) {
      throw new ApiError(409, "This slot is already booked. Please choose a different time.");
    }
    throw err;
  }
}

function isUniqueSlotViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505" &&
    "constraint" in err &&
    (err as { constraint?: string }).constraint === "uniq_confirmed_slot"
  );
}

function mapBookingRow(row: any) {
  return {
    id: row.id,
    venueId: row.venue_id,
    userId: row.user_id,
    slotDate: row.slot_date,
    slotStart: row.slot_start,
    slotEnd: row.slot_end,
    totalAmount: Number(row.total_amount),
    perHeadAmount: Number(row.per_head_amount),
    playerCount: row.player_count,
    status: row.status,
    createdAt: row.created_at,
  };
}
