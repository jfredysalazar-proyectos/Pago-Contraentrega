import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const connection = await mysql.createConnection(url);

const tables = [
  "whatsapp_messages",
  "whatsapp_conversations",
  "sync_logs",
  "settings",
  "orders",
  "products",
  "users",
];

console.log("Dropping existing tables...");
for (const table of tables) {
  try {
    await connection.execute(`DROP TABLE IF EXISTS \`${table}\``);
    console.log(`  ✓ Dropped: ${table}`);
  } catch (e) {
    console.log(`  ✗ Error dropping ${table}: ${e.message}`);
  }
}

await connection.end();
console.log("Done. Now run pnpm db:push to recreate tables.");
