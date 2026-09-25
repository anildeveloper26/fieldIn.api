import { pool } from "../config/db";
import { resolveFileUrl } from "./storage.service";

export interface VenueFilters {
  sport?: string;
  maxDistanceKm?: number;
  minPrice?: number;
  maxPrice?: number;
  lat?: number;
  lng?: number;
}

export async function listVenues(filters: VenueFilters) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  const hasLocation = filters.lat !== undefined && filters.lng !== undefined;

  let distanceSelect = "NULL::float AS distance_km";
  if (hasLocation) {
    values.push(filters.lng, filters.lat);
    const lngIdx = values.length - 1;
    const latIdx = values.length;
    distanceSelect = `ST_Distance(geo, ST_SetSRID(ST_MakePoint($${lngIdx}, $${latIdx}), 4326)::geography) / 1000 AS distance_km`;

    if (filters.maxDistanceKm !== undefined) {
      values.push(filters.maxDistanceKm * 1000);
      conditions.push(
        `ST_DWithin(geo, ST_SetSRID(ST_MakePoint($${lngIdx}, $${latIdx}), 4326)::geography, $${values.length})`
      );
    }
  }

  if (filters.sport) {
    values.push(filters.sport);
    conditions.push(`sport_type = $${values.length}`);
  }
  if (filters.minPrice !== undefined) {
    values.push(filters.minPrice);
    conditions.push(`hourly_rate >= $${values.length}`);
  }
  if (filters.maxPrice !== undefined) {
    values.push(filters.maxPrice);
    conditions.push(`hourly_rate <= $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderClause = hasLocation ? "ORDER BY distance_km ASC" : "ORDER BY created_at DESC";

  const query = `
    SELECT id, name, sport_type, address, lat, lng, hourly_rate, capacity,
           crowd_occupancy, weather_condition, has_live_cam, owner_id, created_at,
           ${distanceSelect}
    FROM venues
    ${whereClause}
    ${orderClause}
  `;

  const result = await pool.query(query, values);
  return result.rows.map(mapVenueRow);
}

export async function getVenueById(id: string) {
  const result = await pool.query(
    `SELECT id, name, sport_type, address, lat, lng, hourly_rate, capacity,
            crowd_occupancy, weather_condition, has_live_cam, owner_id, created_at
     FROM venues WHERE id = $1`,
    [id]
  );
  const row = result.rows[0];
  return row ? mapVenueRow(row) : null;
}

export async function listVenueImages(venueId: string) {
  const result = await pool.query(
    `SELECT id, object_key, created_at FROM venue_images
     WHERE venue_id = $1 ORDER BY created_at DESC LIMIT 12`,
    [venueId]
  );
  return Promise.all(
    result.rows.map(async (row) => ({
      id: row.id,
      url: await resolveFileUrl(row.object_key),
      createdAt: row.created_at,
    }))
  );
}

export async function addVenueImage(venueId: string, userId: string, objectKey: string) {
  const result = await pool.query(
    `INSERT INTO venue_images (venue_id, uploaded_by, object_key)
     VALUES ($1, $2, $3) RETURNING id, object_key, created_at`,
    [venueId, userId, objectKey]
  );
  const row = result.rows[0];
  return { id: row.id, url: await resolveFileUrl(row.object_key), createdAt: row.created_at };
}

function mapVenueRow(row: any) {
  return {
    id: row.id,
    name: row.name,
    sportType: row.sport_type,
    address: row.address,
    lat: Number(row.lat),
    lng: Number(row.lng),
    hourlyRate: Number(row.hourly_rate),
    capacity: row.capacity,
    crowdOccupancy: row.crowd_occupancy,
    weatherCondition: row.weather_condition,
    hasLiveCam: row.has_live_cam,
    ownerId: row.owner_id,
    distanceKm: row.distance_km !== undefined && row.distance_km !== null ? Number(row.distance_km) : null,
    createdAt: row.created_at,
  };
}
