import { Pool, PoolConfig } from "pg";
import { env } from "./env";

// Hosted Postgres (e.g. Aiven) signs its certificate with a private CA, which
// pg rejects under `sslmode=require` unless that CA is trusted. When
// DATABASE_CA_CERT (the PEM, "\n"-escaped is fine) is set, the URL's ssl params
// are stripped - they would otherwise override this config - and TLS is
// verified against that CA. Without it, the URL is used exactly as given.
export function buildPoolConfig(databaseUrl: string): PoolConfig {
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n").trim();
  if (!ca) {
    return { connectionString: databaseUrl };
  }

  const url = new URL(databaseUrl);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("sslrootcert");

  return {
    connectionString: url.toString(),
    ssl: { ca, rejectUnauthorized: true },
  };
}

export const pool = new Pool(buildPoolConfig(env.databaseUrl));

pool.on("error", (err) => {
  console.error("Unexpected Postgres pool error", err);
});
