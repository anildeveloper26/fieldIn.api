import { pool } from "../config/db";
import { ApiError } from "../middleware/errorHandler";

interface PostSquadInput {
  captainId: string;
  venueId: string;
  sportType: string;
  slotDate: string;
  slotStart: string;
  totalCost: number;
  slotsTotal: number;
}

interface PostSoloInput {
  userId: string;
  sportType: string;
  availableDate: string;
  availableTime: string;
  maxBudget?: number;
  notes?: string;
}

export async function listSquads() {
  const result = await pool.query(
    `SELECT sr.id, sr.captain_id, u.name AS captain_name, u.trust_score AS captain_trust_score,
            sr.venue_id, v.name AS venue_name, sr.sport_type, sr.slot_date, sr.slot_start,
            sr.total_cost, sr.per_head_cost, sr.slots_total, sr.slots_filled, sr.status, sr.created_at
     FROM squad_requests sr
     JOIN users u ON u.id = sr.captain_id
     LEFT JOIN venues v ON v.id = sr.venue_id
     WHERE sr.status IN ('open', 'full')
     ORDER BY sr.created_at DESC`
  );
  return result.rows.map(mapSquadRow);
}

export async function listSolo() {
  const result = await pool.query(
    `SELECT sa.id, sa.user_id, u.name AS user_name, u.trust_score, u.punctuality_rate, u.sport_preferences,
            sa.sport_type, sa.available_date, sa.available_time, sa.max_budget, sa.notes,
            sa.is_active, sa.created_at
     FROM solo_availability sa
     JOIN users u ON u.id = sa.user_id
     WHERE sa.is_active = true
     ORDER BY sa.created_at DESC`
  );
  return result.rows.map(mapSoloRow);
}

export async function postSquadRequest(input: PostSquadInput) {
  const perHeadCost = Math.round((input.totalCost / input.slotsTotal) * 100) / 100;

  const result = await pool.query(
    `INSERT INTO squad_requests (captain_id, venue_id, sport_type, slot_date, slot_start, total_cost, per_head_cost, slots_total, slots_filled, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, 'open')
     RETURNING id`,
    [
      input.captainId,
      input.venueId,
      input.sportType,
      input.slotDate,
      input.slotStart,
      input.totalCost,
      perHeadCost,
      input.slotsTotal,
    ]
  );

  return getSquadById(result.rows[0].id);
}

export async function postSoloAvailability(input: PostSoloInput) {
  const result = await pool.query(
    `INSERT INTO solo_availability (user_id, sport_type, available_date, available_time, max_budget, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [input.userId, input.sportType, input.availableDate, input.availableTime, input.maxBudget ?? null, input.notes ?? null]
  );

  const solo = await pool.query(
    `SELECT sa.id, sa.user_id, u.name AS user_name, u.trust_score, u.punctuality_rate, u.sport_preferences,
            sa.sport_type, sa.available_date, sa.available_time, sa.max_budget, sa.notes,
            sa.is_active, sa.created_at
     FROM solo_availability sa
     JOIN users u ON u.id = sa.user_id
     WHERE sa.id = $1`,
    [result.rows[0].id]
  );
  return mapSoloRow(solo.rows[0]);
}

export async function joinSquad(squadId: string, userId: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const squadResult = await client.query(
      `SELECT id, captain_id, slots_total, slots_filled, status FROM squad_requests WHERE id = $1 FOR UPDATE`,
      [squadId]
    );
    const squad = squadResult.rows[0];
    if (!squad) {
      throw new ApiError(404, "Squad request not found");
    }
    if (squad.captain_id === userId) {
      throw new ApiError(400, "You cannot join your own squad request");
    }
    if (squad.slots_filled >= squad.slots_total || squad.status === "full") {
      throw new ApiError(409, "This squad is already full");
    }

    const existing = await client.query(
      `SELECT id FROM squad_join_requests WHERE squad_id = $1 AND user_id = $2`,
      [squadId, userId]
    );
    if ((existing.rowCount ?? 0) > 0) {
      throw new ApiError(409, "You already requested to join this squad");
    }

    await client.query(
      `INSERT INTO squad_join_requests (squad_id, user_id, status) VALUES ($1, $2, 'accepted')`,
      [squadId, userId]
    );

    const newSlotsFilled = squad.slots_filled + 1;
    const newStatus = newSlotsFilled >= squad.slots_total ? "full" : "open";

    await client.query(
      `UPDATE squad_requests SET slots_filled = $1, status = $2 WHERE id = $3`,
      [newSlotsFilled, newStatus, squadId]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return getSquadById(squadId);
}

async function getSquadById(id: string) {
  const result = await pool.query(
    `SELECT sr.id, sr.captain_id, u.name AS captain_name, u.trust_score AS captain_trust_score,
            sr.venue_id, v.name AS venue_name, sr.sport_type, sr.slot_date, sr.slot_start,
            sr.total_cost, sr.per_head_cost, sr.slots_total, sr.slots_filled, sr.status, sr.created_at
     FROM squad_requests sr
     JOIN users u ON u.id = sr.captain_id
     LEFT JOIN venues v ON v.id = sr.venue_id
     WHERE sr.id = $1`,
    [id]
  );
  return mapSquadRow(result.rows[0]);
}

function mapSquadRow(row: any) {
  return {
    id: row.id,
    captainId: row.captain_id,
    captainName: row.captain_name,
    captainTrustScore: Number(row.captain_trust_score),
    venueId: row.venue_id,
    venueName: row.venue_name ?? null,
    sportType: row.sport_type,
    slotDate: row.slot_date,
    slotStart: row.slot_start,
    totalCost: Number(row.total_cost),
    perHeadCost: Number(row.per_head_cost),
    slotsTotal: row.slots_total,
    slotsFilled: row.slots_filled,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapSoloRow(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    sportPreferences: row.sport_preferences ?? [],
    trustScore: Number(row.trust_score),
    punctualityRate: Number(row.punctuality_rate),
    sportType: row.sport_type,
    availableDate: row.available_date,
    availableTime: row.available_time,
    maxBudget: row.max_budget !== null ? Number(row.max_budget) : null,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}
