import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { eq } from "drizzle-orm";
import mysql from "mysql2/promise";
import { nanoid } from "nanoid";
import { users } from "../drizzle/schema";

const ADMIN_EMAIL = "mshin5.1020@gmail.com";

async function runMigrations() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set, skipping migrations");
    return;
  }
  const connection = await mysql.createConnection(url);
  const db = drizzle(connection);

  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[migrate] All migrations applied");

  const existing = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).limit(1);
  if (existing.length === 0) {
    await db.insert(users).values({
      openId: nanoid(),
      email: ADMIN_EMAIL,
      name: "Admin",
      role: "admin",
    });
    console.log("[migrate] Admin user created:", ADMIN_EMAIL);
  }

  await connection.end();
}

runMigrations().catch((err) => {
  console.error("[migrate] Migration failed (server will still start):", err);
});
