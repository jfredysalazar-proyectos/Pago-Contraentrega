import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);

const settingsData = [
  { key: "store_name", value: "Pago Contra Entrega", description: "Nombre visible de la tienda" },
  { key: "whatsapp_number", value: "", description: "Número de WhatsApp con código de país (ej: 573001234567)" },
  { key: "whatsapp_message_template", value: "Hola! Me interesa el producto: {product_name} - Precio: {price}. ¿Está disponible?", description: "Plantilla de mensaje de WhatsApp" },
  { key: "whatsapp_access_token", value: "", description: "Token de acceso de WhatsApp Business API" },
  { key: "whatsapp_phone_number_id", value: "", description: "ID del número de teléfono de WhatsApp Business" },
  { key: "whatsapp_verify_token", value: "pagocontraentrega_webhook_2024", description: "Token de verificación del webhook" },
  { key: "dropi_token", value: "", description: "Token de autenticación de Dropi API" },
  { key: "dropi_store_id", value: "", description: "ID de tu tienda en Dropi" },
  { key: "google_ads_id", value: "", description: "ID de Google Ads (ej: AW-123456789)" },
  { key: "google_merchant_id", value: "", description: "ID de Google Merchant Center" },
  { key: "sync_interval_minutes", value: "60", description: "Intervalo de sincronización en minutos" },
];

for (const s of settingsData) {
  try {
    await conn.execute(
      "INSERT IGNORE INTO settings (`key`, `value`, `description`) VALUES (?, ?, ?)",
      [s.key, s.value, s.description]
    );
    console.log(`✓ ${s.key}`);
  } catch (e) {
    console.log(`⚠ ${s.key}: ${e.message}`);
  }
}

console.log("✅ Settings seeded");
await conn.end();
