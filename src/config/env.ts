import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  redisUrl: required("REDIS_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
  refreshTokenExpiresInDays: Number(process.env.JWT_REFRESH_EXPIRES_IN_DAYS ?? 30),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
  // Cloudflare R2 (S3-compatible). Optional: when unset, upload endpoints
  // respond 503 instead of the server refusing to boot.
  r2: {
    endpoint: process.env.R2_ACCOUNT_ENDPOINT,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET,
    keyPrefix: process.env.R2_KEY_PREFIX ?? "fieldin",
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL,
  },
};
