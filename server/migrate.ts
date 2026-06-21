import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

async function runMigrations() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set, skipping migrations");
    return;
  }
  const connection = await mysql.createConnection(url);
  const db = drizzle(connection);
  await migrate(db, { migrationsFolder: "./drizzle" });
  await connection.end();
  console.log("[migrate] All migrations applied");
}

runMigrations().catch((err) => {
  console.error("[migrate] Migration failed:", err);
  process.exit(1);
});
