import {
  boolean, decimal, int, json, mysqlEnum, mysqlTable,
  text, timestamp, varchar
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  username: varchar("username", { length: 64 }).unique(),
  passwordHash: varchar("passwordHash", { length: 256 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Products ─────────────────────────────────────────────────────────────────
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  dropiId: varchar("dropiId", { length: 128 }).notNull().unique(),
  slug: varchar("slug", { length: 256 }).notNull().unique(),
  name: varchar("name", { length: 512 }).notNull(),
  description: text("description"),
  shortDescription: text("shortDescription"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  comparePrice: decimal("comparePrice", { precision: 12, scale: 2 }),
  sku: varchar("sku", { length: 128 }),
  brand: varchar("brand", { length: 256 }),
  category: varchar("category", { length: 256 }),
  subcategory: varchar("subcategory", { length: 256 }),
  images: json("images").$type<string[]>(),
  mainImage: text("mainImage"),
  stock: int("stock"),
  weight: decimal("weight", { precision: 8, scale: 2 }),
  dimensions: json("dimensions").$type<{ length?: number; width?: number; height?: number }>(),
  tags: json("tags").$type<string[]>(),
  attributes: json("attributes").$type<Record<string, string>>(),
  isActive: boolean("isActive").notNull().default(true),
  isFeatured: boolean("isFeatured").notNull().default(false),
  metaTitle: varchar("metaTitle", { length: 256 }),
  metaDescription: text("metaDescription"),
  googleCategory: varchar("googleCategory", { length: 512 }),
  gtin: varchar("gtin", { length: 64 }),
  mpn: varchar("mpn", { length: 128 }),
  condition: mysqlEnum("condition", ["new", "used", "refurbished"]).default("new"),
  lastSyncedAt: timestamp("lastSyncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ─── Orders ───────────────────────────────────────────────────────────────────
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 64 }).notNull().unique(),
  dropiOrderId: varchar("dropiOrderId", { length: 128 }),
  productId: int("productId"),
  productName: varchar("productName", { length: 512 }).notNull(),
  productPrice: decimal("productPrice", { precision: 12, scale: 2 }).notNull(),
  quantity: int("quantity").notNull().default(1),
  customerName: varchar("customerName", { length: 256 }),
  customerPhone: varchar("customerPhone", { length: 32 }),
  customerEmail: varchar("customerEmail", { length: 320 }),
  shippingAddress: text("shippingAddress"),
  shippingCity: varchar("shippingCity", { length: 128 }),
  shippingDepartment: varchar("shippingDepartment", { length: 128 }),
  shippingPostalCode: varchar("shippingPostalCode", { length: 16 }),
  status: mysqlEnum("status", ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"]).notNull().default("pending"),
  trackingNumber: varchar("trackingNumber", { length: 128 }),
  trackingUrl: text("trackingUrl"),
  carrier: varchar("carrier", { length: 128 }),
  source: mysqlEnum("source", ["whatsapp", "web", "admin"]).default("whatsapp"),
  whatsappConversationId: int("whatsappConversationId"),
  notes: text("notes"),
  confirmedAt: timestamp("confirmedAt"),
  shippedAt: timestamp("shippedAt"),
  deliveredAt: timestamp("deliveredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ─── WhatsApp Conversations ───────────────────────────────────────────────────
export const whatsappConversations = mysqlTable("whatsapp_conversations", {
  id: int("id").autoincrement().primaryKey(),
  phoneNumber: varchar("phoneNumber", { length: 32 }).notNull(),
  customerName: varchar("customerName", { length: 256 }),
  state: mysqlEnum("state", [
    "greeting", "product_inquiry", "collecting_name", "collecting_address",
    "collecting_city", "collecting_phone", "confirming_order", "order_placed",
    "tracking", "closed"
  ]).notNull().default("greeting"),
  context: json("context").$type<Record<string, any>>(),
  productId: int("productId"),
  productName: varchar("productName", { length: 512 }),
  orderId: int("orderId"),
  lastMessageAt: timestamp("lastMessageAt").defaultNow(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WhatsappConversation = typeof whatsappConversations.$inferSelect;

// ─── WhatsApp Messages ────────────────────────────────────────────────────────
export const whatsappMessages = mysqlTable("whatsapp_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  messageId: varchar("messageId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;

// ─── Sync Logs ────────────────────────────────────────────────────────────────
export const syncLogs = mysqlTable("sync_logs", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["full", "incremental", "manual"]).notNull(),
  status: mysqlEnum("status", ["running", "success", "error"]).notNull(),
  productsFound: int("productsFound").default(0),
  productsCreated: int("productsCreated").default(0),
  productsUpdated: int("productsUpdated").default(0),
  productsDeactivated: int("productsDeactivated").default(0),
  errorMessage: text("errorMessage"),
  duration: int("duration"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  finishedAt: timestamp("finishedAt"),
});
export type SyncLog = typeof syncLogs.$inferSelect;

// ─── Categories ─────────────────────────────────────────────────────────────
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  image: text("image"),
  metaTitle: varchar("metaTitle", { length: 256 }),
  metaDescription: text("metaDescription"),
  isActive: boolean("isActive").notNull().default(true),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

// ─── Site Pages (Legal & Static) ─────────────────────────────────────────────
export const sitePages = mysqlTable("site_pages", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  title: varchar("title", { length: 256 }).notNull(),
  content: text("content"),
  metaTitle: varchar("metaTitle", { length: 256 }),
  metaDescription: text("metaDescription"),
  isActive: boolean("isActive").notNull().default(true),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SitePage = typeof sitePages.$inferSelect;
export type InsertSitePage = typeof sitePages.$inferInsert;

// ─── Settings ─────────────────────────────────────────────────────────────────
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: text("value"),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Setting = typeof settings.$inferSelect;
