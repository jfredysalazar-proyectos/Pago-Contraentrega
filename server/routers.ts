import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { sdk } from "./_core/sdk";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb, getUserByUsername } from "./db";
import { products, orders, syncLogs, settings, whatsappConversations, whatsappMessages, users, categories, sitePages } from "../drizzle/schema";
import { eq, desc, like, and, or, sql, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { invokeLLM } from "./_core/llm";
import bcrypt from "bcryptjs";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

async function adminProcedureCheck(ctx: any) {
  if (!ctx.user || ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acceso denegado" });
  }
}

// ─── Products Router ─────────────────────────────────────────────────────────

const productsRouter = router({
  list: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(24),
      offset: z.number().min(0).default(0),
      category: z.string().optional(),
      search: z.string().optional(),
      featured: z.boolean().optional(),
      sortBy: z.enum(["price_asc", "price_desc", "newest", "name"]).default("newest"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { products: [], total: 0 };

      const conditions = [eq(products.isActive, true)];
      if (input.category) conditions.push(eq(products.category, input.category));
      if (input.featured) conditions.push(eq(products.isFeatured, true));
      if (input.search) {
        conditions.push(
          or(
            like(products.name, `%${input.search}%`),
            like(products.description, `%${input.search}%`),
            like(products.brand, `%${input.search}%`)
          )!
        );
      }

      const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

      let orderClause;
      switch (input.sortBy) {
        case "price_asc": orderClause = sql`${products.price} ASC`; break;
        case "price_desc": orderClause = sql`${products.price} DESC`; break;
        case "name": orderClause = sql`${products.name} ASC`; break;
        default: orderClause = sql`${products.createdAt} DESC`;
      }

      const [rows, countRows] = await Promise.all([
        db.select().from(products).where(whereClause).orderBy(orderClause).limit(input.limit).offset(input.offset),
        db.select({ count: sql<number>`COUNT(*)` }).from(products).where(whereClause),
      ]);

      return {
        products: rows,
        total: Number(countRows[0]?.count ?? 0),
      };
    }),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(products).where(eq(products.slug, input.slug)).limit(1);
      return rows[0] ?? null;
    }),

  categories: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select({ category: products.category, count: sql<number>`COUNT(*)` })
      .from(products)
      .where(and(eq(products.isActive, true), sql`${products.category} IS NOT NULL`))
      .groupBy(products.category)
      .orderBy(sql`COUNT(*) DESC`);
    return rows.filter((r) => r.category);
  }),

  // Admin: list all (including inactive)
  adminList: protectedProcedure
    .input(z.object({
      limit: z.number().default(50),
      offset: z.number().default(0),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      await adminProcedureCheck(ctx);
      const db = await getDb();
      if (!db) return { products: [], total: 0 };

      const conditions = input.search
        ? [or(like(products.name, `%${input.search}%`), like(products.dropiId, `%${input.search}%`))!]
        : [];

      const whereClause = conditions.length > 0 ? conditions[0] : undefined;

      const [rows, countRows] = await Promise.all([
        db.select().from(products).where(whereClause).orderBy(desc(products.updatedAt)).limit(input.limit).offset(input.offset),
        db.select({ count: sql<number>`COUNT(*)` }).from(products).where(whereClause),
      ]);

      return { products: rows, total: Number(countRows[0]?.count ?? 0) };
    }),

  // Admin: toggle active
  toggleActive: protectedProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await adminProcedureCheck(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(products).set({ isActive: input.isActive }).where(eq(products.id, input.id));
      return { success: true };
    }),

  // Admin: toggle featured
  toggleFeatured: protectedProcedure
    .input(z.object({ id: z.number(), isFeatured: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await adminProcedureCheck(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(products).set({ isFeatured: input.isFeatured }).where(eq(products.id, input.id));
      return { success: true };
    }),

  // Admin: update price
  updatePrice: protectedProcedure
    .input(z.object({ id: z.number(), price: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await adminProcedureCheck(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(products).set({ price: input.price }).where(eq(products.id, input.id));
      return { success: true };
    }),
});

// ─── Sync Router ─────────────────────────────────────────────────────────────

const syncRouter = router({
  trigger: protectedProcedure.mutation(async ({ ctx }) => {
    await adminProcedureCheck(ctx);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const dropiToken = await getSetting("dropi_token");
    const dropiStoreId = await getSetting("dropi_store_id");

    if (!dropiToken) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Token de Dropi no configurado. Ve a Configuración > Integraciones." });
    }

    // Create sync log
    const [logResult] = await db.insert(syncLogs).values({
      type: "manual",
      status: "running",
      startedAt: new Date(),
    });
    const logId = (logResult as any).insertId;

    // Run sync in background
    runDropiSync(dropiToken, dropiStoreId, logId).catch(console.error);

    return { success: true, logId };
  }),

  logs: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ ctx }) => {
      await adminProcedureCheck(ctx);
      const db = await getDb();
      if (!db) return [];
      return db.select().from(syncLogs).orderBy(desc(syncLogs.startedAt)).limit(10);
    }),

  status: protectedProcedure.query(async ({ ctx }) => {
    await adminProcedureCheck(ctx);
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(syncLogs).orderBy(desc(syncLogs.startedAt)).limit(1);
    return rows[0] ?? null;
  }),
});

// ─── Orders Router ────────────────────────────────────────────────────────────

const ordersRouter = router({
  list: protectedProcedure
    .input(z.object({
      limit: z.number().default(20),
      offset: z.number().default(0),
      status: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      await adminProcedureCheck(ctx);
      const db = await getDb();
      if (!db) return { orders: [], total: 0 };

      const conditions = input.status ? [eq(orders.status, input.status as any)] : [];
      const whereClause = conditions.length > 0 ? conditions[0] : undefined;

      const [rows, countRows] = await Promise.all([
        db.select().from(orders).where(whereClause).orderBy(desc(orders.createdAt)).limit(input.limit).offset(input.offset),
        db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(whereClause),
      ]);

      return { orders: rows, total: Number(countRows[0]?.count ?? 0) };
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      await adminProcedureCheck(ctx);
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(orders).where(eq(orders.id, input.id)).limit(1);
      return rows[0] ?? null;
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"]),
      trackingNumber: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await adminProcedureCheck(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const updateData: any = { status: input.status };
      if (input.trackingNumber) updateData.trackingNumber = input.trackingNumber;
      if (input.status === "confirmed") updateData.confirmedAt = new Date();
      if (input.status === "shipped") updateData.shippedAt = new Date();
      if (input.status === "delivered") updateData.deliveredAt = new Date();

      await db.update(orders).set(updateData).where(eq(orders.id, input.id));
      return { success: true };
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    await adminProcedureCheck(ctx);
    const db = await getDb();
    if (!db) return { total: 0, pending: 0, shipped: 0, delivered: 0 };

    const rows = await db
      .select({ status: orders.status, count: sql<number>`COUNT(*)` })
      .from(orders)
      .groupBy(orders.status);

    const stats: Record<string, number> = {};
    rows.forEach((r) => { stats[r.status] = Number(r.count); });

    return {
      total: Object.values(stats).reduce((a, b) => a + b, 0),
      pending: stats.pending ?? 0,
      confirmed: stats.confirmed ?? 0,
      processing: stats.processing ?? 0,
      shipped: stats.shipped ?? 0,
      delivered: stats.delivered ?? 0,
      cancelled: stats.cancelled ?? 0,
    };
  }),
});

// ─── Settings Router ──────────────────────────────────────────────────────────

const settingsRouter = router({
  getPublic: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return {};
    const publicKeys = ["whatsapp_number", "whatsapp_message_template", "store_name", "google_ads_id"];
    const rows = await db.select().from(settings).where(inArray(settings.key, publicKeys));
    const result: Record<string, string> = {};
    rows.forEach((r) => { if (r.value) result[r.key] = r.value; });
    return result;
  }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    await adminProcedureCheck(ctx);
    const db = await getDb();
    if (!db) return [];
    return db.select().from(settings).orderBy(settings.key);
  }),

  update: protectedProcedure
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await adminProcedureCheck(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(settings).set({ value: input.value }).where(eq(settings.key, input.key));
      return { success: true };
    }),
});

// ─── WhatsApp Bot Router ──────────────────────────────────────────────────────

const whatsappRouter = router({
  // Public webhook for WhatsApp messages
  processMessage: publicProcedure
    .input(z.object({
      phoneNumber: z.string(),
      message: z.string(),
      productSlug: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get or create conversation
      let conversation = await db
        .select()
        .from(whatsappConversations)
        .where(eq(whatsappConversations.phoneNumber, input.phoneNumber))
        .limit(1)
        .then((r) => r[0]);

      if (!conversation) {
        const [result] = await db.insert(whatsappConversations).values({
          phoneNumber: input.phoneNumber,
          state: "greeting",
        });
        conversation = await db
          .select()
          .from(whatsappConversations)
          .where(eq(whatsappConversations.id, (result as any).insertId))
          .limit(1)
          .then((r) => r[0]!);
      }

      // Save user message
      await db.insert(whatsappMessages).values({
        conversationId: conversation.id,
        role: "user" as const,
        content: input.message,
      });

      // Get product context if provided
      let productContext = "";
      if (input.productSlug || conversation.productId) {
        const productId = conversation.productId;
        if (productId) {
          const prod = await db.select().from(products).where(eq(products.id, productId)).limit(1).then((r) => r[0]);
          if (prod) {
            productContext = `Producto de interés: ${prod.name}, Precio: $${prod.price} COP, Stock: ${prod.stock ?? "disponible"}`;
          }
        }
      }

      // Get conversation history
      const history = await db
        .select()
        .from(whatsappMessages)
        .where(eq(whatsappMessages.conversationId, conversation.id))
        .orderBy(desc(whatsappMessages.createdAt))
        .limit(10)
        .then((r) => r.reverse());

      const storeName = await getSetting("store_name") ?? "Pago Contra Entrega";

      // Build AI prompt
      const systemPrompt = `Eres el asistente de ventas de ${storeName}, una tienda de dropshipping colombiana con pago contra entrega.

Tu objetivo es:
1. Responder preguntas sobre productos
2. Confirmar pedidos recopilando: nombre completo, dirección, ciudad, departamento y teléfono
3. Crear el pedido cuando tengas todos los datos
4. Dar seguimiento a pedidos existentes

Estado actual de la conversación: ${conversation.state}
${productContext ? `\n${productContext}` : ""}

Reglas:
- Sé amable, profesional y conciso
- Responde en español colombiano
- Cuando tengas todos los datos del cliente, confirma el pedido
- El pago es SIEMPRE contra entrega, nunca pides pago anticipado
- Si el cliente pregunta por precio, menciona que el pago es al recibir`;

      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
        ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ];

      const aiResponse = await invokeLLM({ messages });
      const assistantMessage = aiResponse.choices[0]?.message?.content ?? "Hola! ¿En qué puedo ayudarte?";

      // Save assistant response
      const assistantContent: string = typeof assistantMessage === "string" ? assistantMessage : "Hola! ¿En qué puedo ayudarte?";
      await db.insert(whatsappMessages).values({
        conversationId: conversation.id,
        role: "assistant" as const,
        content: assistantContent,
      });

      // Update conversation timestamp
      await db.update(whatsappConversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(whatsappConversations.id, conversation.id));

      return { response: assistantMessage, conversationId: conversation.id };
    }),

  conversations: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ ctx }) => {
      await adminProcedureCheck(ctx);
      const db = await getDb();
      if (!db) return [];
      return db.select().from(whatsappConversations).orderBy(desc(whatsappConversations.lastMessageAt)).limit(20);
    }),
});

// ─── Dropi Sync Function ──────────────────────────────────────────────────────

async function runDropiSync(token: string, storeId: string | null, logId: number) {
  const db = await getDb();
  if (!db) return;

  const startTime = Date.now();
  let productsFound = 0;
  let productsCreated = 0;
  let productsUpdated = 0;

  try {
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // Fetch products from Dropi API
    const response = await fetch("https://api.dropi.co/api/products/", { headers });

    if (!response.ok) {
      throw new Error(`Dropi API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const dropiProducts = Array.isArray(data) ? data : (data.results ?? data.products ?? []);
    productsFound = dropiProducts.length;

    for (const dp of dropiProducts) {
      const slug = slugify(dp.name ?? dp.title ?? `producto-${dp.id}`);
      const price = String(dp.price ?? dp.sale_price ?? dp.base_price ?? "0");
      const comparePrice = dp.compare_price ?? dp.original_price ?? null;

      const productData = {
        dropiId: String(dp.id),
        slug,
        name: dp.name ?? dp.title ?? "Producto",
        description: dp.description ?? null,
        shortDescription: dp.short_description ?? null,
        price,
        comparePrice: comparePrice ? String(comparePrice) : null,
        sku: dp.sku ?? null,
        brand: dp.brand ?? dp.supplier ?? null,
        category: dp.category ?? dp.category_name ?? null,
        mainImage: dp.image ?? dp.main_image ?? (dp.images?.[0]) ?? null,
        images: dp.images ?? null,
        stock: dp.stock ?? dp.quantity ?? null,
        isActive: true,
        lastSyncedAt: new Date(),
      };

      // Check if exists
      const existing = await db.select({ id: products.id }).from(products).where(eq(products.dropiId, String(dp.id))).limit(1);

      if (existing.length > 0) {
        await db.update(products).set(productData).where(eq(products.dropiId, String(dp.id)));
        productsUpdated++;
      } else {
        await db.insert(products).values(productData);
        productsCreated++;
      }
    }

    await db.update(syncLogs).set({
      status: "success",
      productsFound,
      productsCreated,
      productsUpdated,
      duration: Date.now() - startTime,
      finishedAt: new Date(),
    }).where(eq(syncLogs.id, logId));

  } catch (error: any) {
    await db.update(syncLogs).set({
      status: "error",
      errorMessage: error.message,
      duration: Date.now() - startTime,
      finishedAt: new Date(),
    }).where(eq(syncLogs.id, logId));
  }
}

// ─── Categories Router ─────────────────────────────────────────────────────────────

const categoriesRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.sortOrder, categories.name);
  }),

  adminList: protectedProcedure.query(async ({ ctx }) => {
    await adminProcedureCheck(ctx);
    const db = await getDb();
    if (!db) return [];
    return db.select().from(categories).orderBy(categories.sortOrder, categories.name);
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(256),
      description: z.string().optional(),
      image: z.string().optional(),
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      isActive: z.boolean().default(true),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      await adminProcedureCheck(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const slug = slugify(input.name);
      await db.insert(categories).values({ ...input, slug });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(256).optional(),
      description: z.string().optional(),
      image: z.string().optional(),
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await adminProcedureCheck(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      if (data.name) (data as any).slug = slugify(data.name);
      await db.update(categories).set(data).where(eq(categories.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await adminProcedureCheck(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(categories).where(eq(categories.id, input.id));
      return { success: true };
    }),
});

// ─── Site Pages Router ─────────────────────────────────────────────────────────────

const sitePagesRouter = router({
  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(sitePages).where(and(eq(sitePages.slug, input.slug), eq(sitePages.isActive, true))).limit(1);
      return rows[0] ?? null;
    }),

  adminList: protectedProcedure.query(async ({ ctx }) => {
    await adminProcedureCheck(ctx);
    const db = await getDb();
    if (!db) return [];
    return db.select().from(sitePages).orderBy(sitePages.slug);
  }),

  upsert: protectedProcedure
    .input(z.object({
      slug: z.string().min(1),
      title: z.string().min(1),
      content: z.string().optional(),
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      await adminProcedureCheck(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.select({ id: sitePages.id }).from(sitePages).where(eq(sitePages.slug, input.slug)).limit(1);
      if (existing.length > 0) {
        await db.update(sitePages).set(input).where(eq(sitePages.slug, input.slug));
      } else {
        await db.insert(sitePages).values(input);
      }
      return { success: true };
    }),
});

// ─── App Router ─────────────────────────────────────────────────────────────────

export const appRouter = router({ system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    adminLogin: publicProcedure
      .input(z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByUsername(input.username);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuario o contraseña incorrectos" });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuario o contraseña incorrectos" });
        }
        if (user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos de administrador" });
        }
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || user.username || "Admin",
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        // Update lastSignedIn
        const db = await getDb();
        if (db) {
          await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
        }
        return { success: true, user: { id: user.id, name: user.name, username: user.username, role: user.role } };
      }),
  }),
  products: productsRouter,
  sync: syncRouter,
  orders: ordersRouter,
  settings: settingsRouter,
  whatsapp: whatsappRouter,
  categories: categoriesRouter,
  sitePages: sitePagesRouter,
});

export type AppRouter = typeof appRouter;
