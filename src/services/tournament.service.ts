import { pool } from "../config/db";
import { ApiError } from "../middleware/errorHandler";

export async function listTournaments() {
  const result = await pool.query(
    `SELECT t.id, t.title, t.sport_type, t.venue_id, v.name AS venue_name, t.start_date,
            t.entry_fee, t.max_teams, t.registered_teams, t.prize_pool, t.status, t.created_at
     FROM tournaments t
     LEFT JOIN venues v ON v.id = t.venue_id
     ORDER BY t.start_date ASC`
  );
  return result.rows.map(mapTournamentRow);
}

export async function registerTeam(tournamentId: string, userId: string, teamName: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const tournamentResult = await client.query(
      `SELECT id, max_teams, registered_teams FROM tournaments WHERE id = $1 FOR UPDATE`,
      [tournamentId]
    );
    const tournament = tournamentResult.rows[0];
    if (!tournament) {
      throw new ApiError(404, "Tournament not found");
    }
    if (tournament.registered_teams >= tournament.max_teams) {
      throw new ApiError(409, "This tournament is already full");
    }

    const existing = await client.query(
      `SELECT id FROM tournament_registrations WHERE tournament_id = $1 AND user_id = $2`,
      [tournamentId, userId]
    );
    if ((existing.rowCount ?? 0) > 0) {
      throw new ApiError(409, "You have already registered a team for this tournament");
    }

    await client.query(
      `INSERT INTO tournament_registrations (tournament_id, user_id, team_name) VALUES ($1, $2, $3)`,
      [tournamentId, userId, teamName]
    );

    await client.query(`UPDATE tournaments SET registered_teams = registered_teams + 1 WHERE id = $1`, [
      tournamentId,
    ]);

    const updated = await client.query(
      `SELECT t.id, t.title, t.sport_type, t.venue_id, v.name AS venue_name, t.start_date,
              t.entry_fee, t.max_teams, t.registered_teams, t.prize_pool, t.status, t.created_at
       FROM tournaments t
       LEFT JOIN venues v ON v.id = t.venue_id
       WHERE t.id = $1`,
      [tournamentId]
    );

    await client.query("COMMIT");
    return mapTournamentRow(updated.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

function mapTournamentRow(row: any) {
  return {
    id: row.id,
    title: row.title,
    sportType: row.sport_type,
    venueId: row.venue_id,
    venueName: row.venue_name ?? null,
    startDate: row.start_date,
    entryFee: Number(row.entry_fee),
    maxTeams: row.max_teams,
    registeredTeams: row.registered_teams,
    prizePool: row.prize_pool !== null ? Number(row.prize_pool) : 0,
    status: row.status,
    createdAt: row.created_at,
  };
}
