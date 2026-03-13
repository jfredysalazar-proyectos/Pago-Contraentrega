import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const connection = await mysql.createConnection(url);

const tables = [
  {
    name: "users",
    sql: `CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`openId\` varchar(64) NOT NULL,
      \`name\` text,
      \`email\` varchar(320),
      \`loginMethod\` varchar(64),
      \`role\` enum('user','admin') NOT NULL DEFAULT 'user',
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      \`lastSignedIn\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`users_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`users_openId_unique\` UNIQUE(\`openId\`)
    )`,
  },
  {
    name: "products",
    sql: `CREATE TABLE IF NOT EXISTS \`products\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`dropiId\` varchar(128) NOT NULL,
      \`slug\` varchar(256) NOT NULL,
      \`name\` varchar(512) NOT NULL,
      \`description\` text,
      \`shortDescription\` text,
      \`price\` decimal(12,2) NOT NULL,
      \`comparePrice\` decimal(12,2),
      \`sku\` varchar(128),
      \`brand\` varchar(256),
      \`category\` varchar(256),
      \`subcategory\` varchar(256),
      \`images\` json,
      \`mainImage\` text,
      \`stock\` int DEFAULT 0,
      \`weight\` decimal(8,2),
      \`dimensions\` json,
      \`tags\` json,
      \`attributes\` json,
      \`isActive\` boolean NOT NULL DEFAULT true,
      \`isFeatured\` boolean NOT NULL DEFAULT false,
      \`metaTitle\` varchar(256),
      \`metaDescription\` text,
      \`googleCategory\` varchar(512),
      \`gtin\` varchar(64),
      \`mpn\` varchar(128),
      \`condition\` enum('new','used','refurbished') DEFAULT 'new',
      \`lastSyncedAt\` timestamp NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`products_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`products_dropiId_unique\` UNIQUE(\`dropiId\`),
      CONSTRAINT \`products_slug_unique\` UNIQUE(\`slug\`)
    )`,
  },
  {
    name: "orders",
    sql: `CREATE TABLE IF NOT EXISTS \`orders\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`orderNumber\` varchar(64) NOT NULL,
      \`dropiOrderId\` varchar(128),
      \`productId\` int,
      \`productName\` varchar(512) NOT NULL,
      \`productPrice\` decimal(12,2) NOT NULL,
      \`quantity\` int NOT NULL DEFAULT 1,
      \`customerName\` varchar(256),
      \`customerPhone\` varchar(32),
      \`customerEmail\` varchar(320),
      \`shippingAddress\` text,
      \`shippingCity\` varchar(128),
      \`shippingDepartment\` varchar(128),
      \`shippingPostalCode\` varchar(16),
      \`status\` enum('pending','confirmed','processing','shipped','delivered','cancelled','returned') NOT NULL DEFAULT 'pending',
      \`trackingNumber\` varchar(128),
      \`trackingUrl\` text,
      \`carrier\` varchar(128),
      \`source\` enum('whatsapp','web','admin') DEFAULT 'whatsapp',
      \`whatsappConversationId\` int,
      \`notes\` text,
      \`confirmedAt\` timestamp NULL,
      \`shippedAt\` timestamp NULL,
      \`deliveredAt\` timestamp NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`orders_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`orders_orderNumber_unique\` UNIQUE(\`orderNumber\`)
    )`,
  },
  {
    name: "whatsapp_conversations",
    sql: `CREATE TABLE IF NOT EXISTS \`whatsapp_conversations\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`phoneNumber\` varchar(32) NOT NULL,
      \`customerName\` varchar(256),
      \`state\` enum('greeting','product_inquiry','collecting_name','collecting_address','collecting_city','collecting_phone','confirming_order','order_placed','tracking','closed') NOT NULL DEFAULT 'greeting',
      \`context\` json,
      \`productId\` int,
      \`productName\` varchar(512),
      \`orderId\` int,
      \`lastMessageAt\` timestamp NULL DEFAULT (now()),
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`whatsapp_conversations_id\` PRIMARY KEY(\`id\`)
    )`,
  },
  {
    name: "whatsapp_messages",
    sql: `CREATE TABLE IF NOT EXISTS \`whatsapp_messages\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`conversationId\` int NOT NULL,
      \`role\` enum('user','assistant') NOT NULL,
      \`content\` text NOT NULL,
      \`messageId\` varchar(128),
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`whatsapp_messages_id\` PRIMARY KEY(\`id\`)
    )`,
  },
  {
    name: "sync_logs",
    sql: `CREATE TABLE IF NOT EXISTS \`sync_logs\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`type\` enum('full','incremental','manual') NOT NULL,
      \`status\` enum('running','success','error') NOT NULL,
      \`productsFound\` int DEFAULT 0,
      \`productsCreated\` int DEFAULT 0,
      \`productsUpdated\` int DEFAULT 0,
      \`productsDeactivated\` int DEFAULT 0,
      \`errorMessage\` text,
      \`duration\` int,
      \`startedAt\` timestamp NOT NULL DEFAULT (now()),
      \`finishedAt\` timestamp NULL,
      CONSTRAINT \`sync_logs_id\` PRIMARY KEY(\`id\`)
    )`,
  },
  {
    name: "settings",
    sql: `CREATE TABLE IF NOT EXISTS \`settings\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`key\` varchar(128) NOT NULL,
      \`value\` text,
      \`description\` text,
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`settings_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`settings_key_unique\` UNIQUE(\`key\`)
    )`,
  },
];

console.log("Creating tables...");
for (const { name, sql } of tables) {
  try {
    await connection.execute(sql);
    console.log(`  ✓ Created: ${name}`);
  } catch (e) {
    console.log(`  ✗ Error creating ${name}: ${e.message}`);
  }
}

// Insert default settings
const defaultSettings = [
  { key: "whatsapp_number", value: "", description: "Número de WhatsApp Business (con código de país, ej: 573001234567)" },
  { key: "whatsapp_message_template", value: "Hola! Me interesa el producto: {product_name} - Precio: ${price} COP. ¿Está disponible?", description: "Plantilla de mensaje predefinido para WhatsApp" },
  { key: "dropi_token", value: "", description: "Token de autenticación de Dropi API" },
  { key: "dropi_store_id", value: "", description: "ID de la tienda en Dropi" },
  { key: "google_ads_id", value: "", description: "ID de Google Ads para tracking de conversiones" },
  { key: "google_merchant_id", value: "", description: "ID de Google Merchant Center" },
  { key: "sync_interval_minutes", value: "60", description: "Intervalo de sincronización automática con Dropi (minutos)" },
  { key: "store_name", value: "Pago Contra Entrega", description: "Nombre de la tienda" },
  { key: "store_currency", value: "COP", description: "Moneda de la tienda" },
  { key: "store_country", value: "CO", description: "País de la tienda" },
];

console.log("\nInserting default settings...");
for (const s of defaultSettings) {
  try {
    await connection.execute(
      "INSERT IGNORE INTO `settings` (`key`, `value`, `description`) VALUES (?, ?, ?)",
      [s.key, s.value, s.description]
    );
    console.log(`  ✓ Setting: ${s.key}`);
  } catch (e) {
    console.log(`  ✗ Error inserting setting ${s.key}: ${e.message}`);
  }
}

await connection.end();
console.log("\n✅ Database setup complete!");
