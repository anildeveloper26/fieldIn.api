import type { Request, Response } from "express";
import { pool } from "../config/db";
import { ApiError } from "../middleware/errorHandler";
import { resolveFileUrl, uploadImage } from "../services/storage.service";

const PROFILE_COLUMNS =
  "id, name, email, avatar_url, coins_balance, trust_score, punctuality_rate, sport_preferences, created_at";

async function toProfile(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: await resolveFileUrl(user.avatar_url),
    coinsBalance: user.coins_balance,
    trustScore: Number(user.trust_score),
    punctualityRate: Number(user.punctuality_rate),
    sportPreferences: user.sport_preferences,
    createdAt: user.created_at,
  };
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  const result = await pool.query(`SELECT ${PROFILE_COLUMNS} FROM users WHERE id = $1`, [req.user!.id]);

  const user = result.rows[0];
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res.json(await toProfile(user));
}

export async function postAvatar(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw new ApiError(400, "Attach an image in the 'file' field");
  }

  const objectKey = await uploadImage("avatars", req.user!.id, req.file);
  const result = await pool.query(
    `UPDATE users SET avatar_url = $2 WHERE id = $1 RETURNING ${PROFILE_COLUMNS}`,
    [req.user!.id, objectKey]
  );
  const user = result.rows[0];
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res.json(await toProfile(user));
}
