import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) { console.error("No DATABASE_URL"); process.exit(1); }

const conn = await mysql.createConnection(url);

// Helper: check if column exists
async function columnExists(table, col) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, col]
  );
  return rows[0].cnt > 0;
}

// Helper: check if table exists
async function tableExists(table) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) as cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return rows[0].cnt > 0;
}

// Helper: add column if not exists
async function addColumnIfMissing(table, col, definition) {
  if (!(await columnExists(table, col))) {
    console.log(`  Adding column ${table}.${col}`);
    await conn.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${definition}`);
  }
}

console.log("=== Database Migration ===\n");

// ─── PRODUCTS TABLE ───────────────────────────────────────────────────────────
if (!(await tableExists("products"))) {
  console.log("Creating products table...");
  await conn.execute(`
    CREATE TABLE products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dropiId VARCHAR(128) NOT NULL UNIQUE,
      slug VARCHAR(256) NOT NULL UNIQUE,
      name VARCHAR(512) NOT NULL,
      description TEXT,
      shortDescription TEXT,
      price DECIMAL(12,2) NOT NULL,
      comparePrice DECIMAL(12,2),
      sku VARCHAR(128),
      brand VARCHAR(256),
      category VARCHAR(256),
      subcategory VARCHAR(256),
      images JSON,
      mainImage TEXT,
      stock INT,
      weight DECIMAL(8,2),
      dimensions JSON,
      tags JSON,
      attributes JSON,
      isActive BOOLEAN NOT NULL DEFAULT TRUE,
      isFeatured BOOLEAN NOT NULL DEFAULT FALSE,
      metaTitle VARCHAR(256),
      metaDescription TEXT,
      googleCategory VARCHAR(512),
      gtin VARCHAR(64),
      mpn VARCHAR(128),
      \`condition\` ENUM('new','used','refurbished') DEFAULT 'new',
      lastSyncedAt TIMESTAMP NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  console.log("  ✓ products created");
} else {
  console.log("products table exists, checking columns...");
  await addColumnIfMissing("products", "shortDescription", "TEXT");
  await addColumnIfMissing("products", "comparePrice", "DECIMAL(12,2)");
  await addColumnIfMissing("products", "subcategory", "VARCHAR(256)");
  await addColumnIfMissing("products", "weight", "DECIMAL(8,2)");
  await addColumnIfMissing("products", "dimensions", "JSON");
  await addColumnIfMissing("products", "tags", "JSON");
  await addColumnIfMissing("products", "attributes", "JSON");
  await addColumnIfMissing("products", "isFeatured", "BOOLEAN NOT NULL DEFAULT FALSE");
  await addColumnIfMissing("products", "metaTitle", "VARCHAR(256)");
  await addColumnIfMissing("products", "metaDescription", "TEXT");
  await addColumnIfMissing("products", "googleCategory", "VARCHAR(512)");
  await addColumnIfMissing("products", "gtin", "VARCHAR(64)");
  await addColumnIfMissing("products", "mpn", "VARCHAR(128)");
  await addColumnIfMissing("products", "condition", "ENUM('new','used','refurbished') DEFAULT 'new'");
  await addColumnIfMissing("products", "lastSyncedAt", "TIMESTAMP NULL");
  console.log("  ✓ products columns verified");
}

// ─── ORDERS TABLE ─────────────────────────────────────────────────────────────
if (!(await tableExists("orders"))) {
  console.log("Creating orders table...");
  await conn.execute(`
    CREATE TABLE orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      orderNumber VARCHAR(64) NOT NULL UNIQUE,
      dropiOrderId VARCHAR(128),
      productId INT,
      productName VARCHAR(512) NOT NULL,
      productPrice DECIMAL(12,2) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      customerName VARCHAR(256),
      customerPhone VARCHAR(32),
      customerEmail VARCHAR(320),
      shippingAddress TEXT,
      shippingCity VARCHAR(128),
      shippingDepartment VARCHAR(128),
      shippingPostalCode VARCHAR(16),
      status ENUM('pending','confirmed','processing','shipped','delivered','cancelled','returned') NOT NULL DEFAULT 'pending',
      trackingNumber VARCHAR(128),
      trackingUrl TEXT,
      carrier VARCHAR(128),
      source ENUM('whatsapp','web','admin') DEFAULT 'whatsapp',
      whatsappConversationId INT,
      notes TEXT,
      confirmedAt TIMESTAMP NULL,
      shippedAt TIMESTAMP NULL,
      deliveredAt TIMESTAMP NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  console.log("  ✓ orders created");
} else {
  console.log("orders table exists, checking columns...");
  await addColumnIfMissing("orders", "dropiOrderId", "VARCHAR(128)");
  await addColumnIfMissing("orders", "quantity", "INT NOT NULL DEFAULT 1");
  await addColumnIfMissing("orders", "customerEmail", "VARCHAR(320)");
  await addColumnIfMissing("orders", "shippingDepartment", "VARCHAR(128)");
  await addColumnIfMissing("orders", "shippingPostalCode", "VARCHAR(16)");
  await addColumnIfMissing("orders", "trackingUrl", "TEXT");
  await addColumnIfMissing("orders", "carrier", "VARCHAR(128)");
  await addColumnIfMissing("orders", "source", "ENUM('whatsapp','web','admin') DEFAULT 'whatsapp'");
  await addColumnIfMissing("orders", "whatsappConversationId", "INT");
  await addColumnIfMissing("orders", "notes", "TEXT");
  await addColumnIfMissing("orders", "confirmedAt", "TIMESTAMP NULL");
  await addColumnIfMissing("orders", "shippedAt", "TIMESTAMP NULL");
  await addColumnIfMissing("orders", "deliveredAt", "TIMESTAMP NULL");
  console.log("  ✓ orders columns verified");
}

// ─── WHATSAPP CONVERSATIONS ───────────────────────────────────────────────────
if (!(await tableExists("whatsapp_conversations"))) {
  console.log("Creating whatsapp_conversations table...");
  await conn.execute(`
    CREATE TABLE whatsapp_conversations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      phoneNumber VARCHAR(32) NOT NULL,
      customerName VARCHAR(256),
      state ENUM('greeting','product_inquiry','collecting_name','collecting_address','collecting_city','collecting_phone','confirming_order','order_placed','tracking','closed') NOT NULL DEFAULT 'greeting',
      context JSON,
      productId INT,
      productName VARCHAR(512),
      orderId INT,
      lastMessageAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  console.log("  ✓ whatsapp_conversations created");
} else {
  console.log("  ✓ whatsapp_conversations exists");
}

// ─── WHATSAPP MESSAGES ────────────────────────────────────────────────────────
if (!(await tableExists("whatsapp_messages"))) {
  console.log("Creating whatsapp_messages table...");
  await conn.execute(`
    CREATE TABLE whatsapp_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      conversationId INT NOT NULL,
      role ENUM('user','assistant') NOT NULL,
      content TEXT NOT NULL,
      messageId VARCHAR(128),
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("  ✓ whatsapp_messages created");
} else {
  console.log("  ✓ whatsapp_messages exists");
}

// ─── SYNC LOGS ────────────────────────────────────────────────────────────────
if (!(await tableExists("sync_logs"))) {
  console.log("Creating sync_logs table...");
  await conn.execute(`
    CREATE TABLE sync_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type ENUM('full','incremental','manual') NOT NULL,
      status ENUM('running','success','error') NOT NULL,
      productsFound INT DEFAULT 0,
      productsCreated INT DEFAULT 0,
      productsUpdated INT DEFAULT 0,
      productsDeactivated INT DEFAULT 0,
      errorMessage TEXT,
      duration INT,
      startedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      finishedAt TIMESTAMP NULL
    )
  `);
  console.log("  ✓ sync_logs created");
} else {
  console.log("  ✓ sync_logs exists");
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
if (!(await tableExists("settings"))) {
  console.log("Creating settings table...");
  await conn.execute(`
    CREATE TABLE settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      \`key\` VARCHAR(128) NOT NULL UNIQUE,
      value TEXT,
      description TEXT,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  console.log("  ✓ settings created");

  // Insert default settings
  const defaults = [
    ["whatsapp_number", "573001234567", "Número de WhatsApp con código de país"],
    ["whatsapp_message_template", "Hola! Me interesa el producto: {product_name} - Precio: {price}. ¿Está disponible?", "Plantilla de mensaje de WhatsApp"],
    ["store_name", "Pago Contra Entrega", "Nombre de la tienda"],
    ["sync_interval_minutes", "60", "Intervalo de sincronización en minutos"],
    ["dropi_token", "", "Token de autenticación de Dropi API"],
    ["dropi_store_id", "", "ID de la tienda en Dropi"],
    ["google_ads_id", "", "ID de Google Ads"],
    ["google_merchant_id", "", "ID de Google Merchant Center"],
  ];
  for (const [key, value, description] of defaults) {
    await conn.execute(`INSERT IGNORE INTO settings (\`key\`, value, description) VALUES (?, ?, ?)`, [key, value, description]);
  }
  console.log("  ✓ Default settings inserted");
} else {
  console.log("settings table exists, inserting missing defaults...");
  const defaults = [
    ["whatsapp_number", "573001234567", "Número de WhatsApp con código de país"],
    ["whatsapp_message_template", "Hola! Me interesa el producto: {product_name} - Precio: {price}. ¿Está disponible?", "Plantilla de mensaje de WhatsApp"],
    ["store_name", "Pago Contra Entrega", "Nombre de la tienda"],
    ["sync_interval_minutes", "60", "Intervalo de sincronización en minutos"],
    ["dropi_token", "", "Token de autenticación de Dropi API"],
    ["dropi_store_id", "", "ID de la tienda en Dropi"],
    ["google_ads_id", "", "ID de Google Ads"],
    ["google_merchant_id", "", "ID de Google Merchant Center"],
  ];
  for (const [key, value, description] of defaults) {
    await conn.execute(`INSERT IGNORE INTO settings (\`key\`, value, description) VALUES (?, ?, ?)`, [key, value, description]);
  }
  console.log("  ✓ settings verified");
}

await conn.end();
console.log("\n✅ Migration completed successfully!");
