import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { env } from "../src/config/env";
import { buildPoolConfig } from "../src/config/db";

async function run(): Promise<void> {
  const pool = new Pool(buildPoolConfig(env.databaseUrl));
  const schemaSql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  const seedSql = fs.readFileSync(path.join(__dirname, "seed.sql"), "utf-8");

  try {
    console.log("Resetting public schema...");
    await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");

    console.log("Applying schema.sql...");
    await pool.query(schemaSql);

    console.log("Applying seed.sql...");
    await pool.query(seedSql);

    console.log("Seed complete.");
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
