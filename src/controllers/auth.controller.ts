import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../config/db";
import { env } from "../config/env";
import { ApiError } from "../middleware/errorHandler";
import { resolveFileUrl } from "../services/storage.service";
import { issueRefreshToken, revokeRefreshToken, rotateRefreshToken } from "../services/authToken.service";
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from "../utils/validators";

function signAccessToken(user: { id: string; email: string }): string {
  return jwt.sign({ id: user.id, email: user.email }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions);
}

async function toPublicUser(row: any) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: await resolveFileUrl(row.avatar_url),
    coinsBalance: row.coins_balance,
    trustScore: Number(row.trust_score),
    punctualityRate: Number(row.punctuality_rate),
    sportPreferences: row.sport_preferences,
  };
}

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, "Invalid registration details");
  }
  const { name, email, password } = parsed.data;

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rowCount && existing.rowCount > 0) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, avatar_url, coins_balance, trust_score, punctuality_rate, sport_preferences`,
    [name, email, passwordHash]
  );

  const user = result.rows[0];
  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id);
  res.status(201).json({ accessToken, refreshToken, user: await toPublicUser(user) });
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, "Invalid login details");
  }
  const { email, password } = parsed.data;

  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  const user = result.rows[0];
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    throw new ApiError(401, "Invalid email or password");
  }

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id);
  res.json({ accessToken, refreshToken, user: await toPublicUser(user) });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, "Refresh token is required");
  }

  const { userId, token } = await rotateRefreshToken(parsed.data.refreshToken);

  const result = await pool.query("SELECT id, email FROM users WHERE id = $1", [userId]);
  const user = result.rows[0];
  if (!user) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const accessToken = signAccessToken(user);
  res.json({ accessToken, refreshToken: token });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const parsed = logoutSchema.safeParse(req.body);
  if (parsed.success) {
    await revokeRefreshToken(parsed.data.refreshToken);
  }
  res.status(204).send();
}
