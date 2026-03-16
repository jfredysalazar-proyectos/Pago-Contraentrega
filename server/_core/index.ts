import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import feedRouter from "../feeds";
import whatsappRouter from "../whatsapp";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function runStartupMigration() {
  try {
    const db = await getDb();
    if (!db) return;

    // Add username and passwordHash columns if they don't exist
    await db.execute(sql`
      ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS username VARCHAR(64) UNIQUE,
        ADD COLUMN IF NOT EXISTS passwordHash VARCHAR(256)
    `);

    // Check if admin user already has a password set
    const existing = await db.execute(sql`
      SELECT id FROM users WHERE openId = 'admin-pago-contraentrega' AND passwordHash IS NOT NULL LIMIT 1
    `);

    const rows = existing as any;
    const hasAdmin = Array.isArray(rows) && rows.length > 0 && Array.isArray(rows[0]) && rows[0].length > 0;

    if (!hasAdmin) {
      const passwordHash = await bcrypt.hash('Admin2026@Pago!', 12);
      await db.execute(sql`
        INSERT INTO users (openId, username, name, role, passwordHash, lastSignedIn)
        VALUES ('admin-pago-contraentrega', 'admin', 'Administrador', 'admin', ${passwordHash}, NOW())
        ON DUPLICATE KEY UPDATE
          username = 'admin',
          passwordHash = ${passwordHash},
          role = 'admin',
          name = 'Administrador'
      `);
      console.log('[Migration] Admin user created/updated successfully');
    } else {
      console.log('[Migration] Admin user already has password, skipping');
    }
  } catch (err: any) {
    console.warn('[Migration] Startup migration warning:', err.message);
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Feeds & SEO routes (before tRPC)
  app.use("/api", feedRouter);
  app.use("/sitemap.xml", feedRouter);
  app.use("/robots.txt", feedRouter);
  // WhatsApp webhook & tracking
  app.use("/", whatsappRouter);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Run migration after server starts
    runStartupMigration();
  });
}

startServer().catch(console.error);
