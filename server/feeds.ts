import { Router } from "express";
import { getDb } from "./db";
import { products, settings, categories } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

const feedRouter = Router();

async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

// Escapa caracteres especiales XML
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Limpia HTML para texto plano
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// ─── Google Merchant Center Feed (XML) ───────────────────────────────────────
// URL: /api/feed/google-merchant.xml
// Cumple con la especificación de Google Merchant Center:
// https://support.google.com/merchants/answer/7052112
feedRouter.get("/feed/google-merchant.xml", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).send("Database unavailable");

    const storeName = await getSetting("store_name") ?? "Pago Contra Entrega";
    // Usar dominio de producción siempre para el feed
    const storeUrl = "https://pago-contraentrega-production.up.railway.app";

    const activeProducts = await db
      .select()
      .from(products)
      .where(eq(products.isActive, true))
      .limit(1000);

    const items = activeProducts.map((p) => {
      const price = parseFloat(String(p.price));
      if (isNaN(price) || price <= 0) return ""; // Saltar productos sin precio

      const images = (p.images as string[] | null) ?? [];
      const mainImg = p.mainImage ?? images[0] ?? "";
      if (!mainImg) return ""; // Google requiere imagen

      const inStock = p.stock === null || p.stock === undefined || p.stock > 0;
      const condition = "new"; // Siempre nuevo para dropshipping

      // Descripción: usar shortDescription limpia de HTML, máx 5000 chars
      const rawDesc = p.shortDescription ?? p.description ?? p.name;
      const cleanDesc = stripHtml(rawDesc).substring(0, 5000);

      // Título: máx 150 chars, sin HTML
      const title = stripHtml(p.name).substring(0, 150);

      // Precio de venta (comparePrice es el precio tachado = precio original)
      // En Google: price = precio actual, sale_price = precio de oferta
      const salePrice = p.comparePrice ? parseFloat(String(p.comparePrice)) : null;

      // Identificador único: usar dropiId o slug
      const itemId = p.dropiId ?? p.slug;

      return `
    <item>
      <g:id>${escapeXml(String(itemId))}</g:id>
      <g:title><![CDATA[${title}]]></g:title>
      <g:description><![CDATA[${cleanDesc}]]></g:description>
      <g:link>${storeUrl}/producto/${p.slug}</g:link>
      <g:image_link>${escapeXml(mainImg)}</g:image_link>
      ${images.slice(1, 10).filter(Boolean).map((img) => `<g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`).join("\n      ")}
      <g:condition>${condition}</g:condition>
      <g:availability>${inStock ? "in_stock" : "out_of_stock"}</g:availability>
      <g:price>${price.toFixed(2)} COP</g:price>
      ${salePrice && salePrice < price ? `<g:sale_price>${salePrice.toFixed(2)} COP</g:sale_price>` : ""}
      <g:brand><![CDATA[${escapeXml(p.brand ?? storeName)}]]></g:brand>
      ${p.sku ? `<g:mpn>${escapeXml(p.sku)}</g:mpn>` : `<g:identifier_exists>no</g:identifier_exists>`}
      ${p.googleCategory ? `<g:google_product_category><![CDATA[${p.googleCategory}]]></g:google_product_category>` : ""}
      ${p.category ? `<g:product_type><![CDATA[${escapeXml(p.category)}]]></g:product_type>` : ""}
      <g:shipping>
        <g:country>CO</g:country>
        <g:service>Pago Contra Entrega</g:service>
        <g:price>0 COP</g:price>
      </g:shipping>
      <g:custom_label_0>pago_contra_entrega</g:custom_label_0>
      <g:custom_label_1>${p.category ?? "general"}</g:custom_label_1>
    </item>`;
    }).filter(Boolean).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title><![CDATA[${storeName}]]></title>
    <link>${storeUrl}</link>
    <description><![CDATA[Catálogo de productos con pago contra entrega en Colombia. Paga solo cuando recibas tu pedido.]]></description>
    ${items}
  </channel>
</rss>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (error) {
    console.error("[Feed] Error generating XML feed:", error);
    res.status(500).send("Error generating feed");
  }
});

// ─── Google Merchant Center Feed (JSON) ──────────────────────────────────────
feedRouter.get("/feed/google-merchant.json", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });

    const storeName = await getSetting("store_name") ?? "Pago Contra Entrega";
    const storeUrl = "https://pago-contraentrega-production.up.railway.app";

    const activeProducts = await db
      .select()
      .from(products)
      .where(eq(products.isActive, true))
      .limit(1000);

    const items = activeProducts
      .filter((p) => {
        const price = parseFloat(String(p.price));
        const images = (p.images as string[] | null) ?? [];
        const mainImg = p.mainImage ?? images[0] ?? "";
        return !isNaN(price) && price > 0 && mainImg;
      })
      .map((p) => {
        const price = parseFloat(String(p.price));
        const images = (p.images as string[] | null) ?? [];
        const inStock = p.stock === null || p.stock === undefined || p.stock > 0;
        const rawDesc = p.shortDescription ?? p.description ?? p.name;
        const cleanDesc = stripHtml(rawDesc).substring(0, 5000);
        const salePrice = p.comparePrice ? parseFloat(String(p.comparePrice)) : null;

        return {
          id: p.dropiId ?? p.slug,
          title: stripHtml(p.name).substring(0, 150),
          description: cleanDesc,
          link: `${storeUrl}/producto/${p.slug}`,
          image_link: p.mainImage ?? images[0] ?? "",
          additional_image_link: images.slice(1, 10).filter(Boolean),
          condition: "new",
          availability: inStock ? "in_stock" : "out_of_stock",
          price: `${price.toFixed(2)} COP`,
          sale_price: salePrice && salePrice < price ? `${salePrice.toFixed(2)} COP` : undefined,
          brand: p.brand ?? storeName,
          mpn: p.sku ?? undefined,
          identifier_exists: p.sku ? "yes" : "no",
          google_product_category: p.googleCategory ?? undefined,
          product_type: p.category ?? undefined,
          shipping: [{ country: "CO", service: "Pago Contra Entrega", price: "0 COP" }],
          custom_label_0: "pago_contra_entrega",
          custom_label_1: p.category ?? "general",
        };
      });

    res.setHeader("Cache-Control", "public, max-age=3600");
    res.json({ items, total: items.length, generated: new Date().toISOString() });
  } catch (error) {
    console.error("[Feed] Error generating JSON feed:", error);
    res.status(500).json({ error: "Error generating feed" });
  }
});

// ─── Sitemap XML ─────────────────────────────────────────────────────────────
feedRouter.get("/sitemap.xml", async (req, res) => {
  try {
    const db = await getDb();
    const storeUrl = "https://pago-contraentrega-production.up.railway.app";
    const now = new Date().toISOString().split("T")[0];

    const staticUrls = [
      { loc: storeUrl, priority: "1.0", changefreq: "daily" },
      { loc: `${storeUrl}/productos`, priority: "0.9", changefreq: "daily" },
      { loc: `${storeUrl}/rastrear`, priority: "0.5", changefreq: "monthly" },
    ];

    let productUrls: string[] = [];
    let categoryUrls: string[] = [];

    if (db) {
      // Productos activos
      const activeProducts = await db
        .select({ slug: products.slug, updatedAt: products.updatedAt })
        .from(products)
        .where(eq(products.isActive, true))
        .limit(5000);

      productUrls = activeProducts.map((p) => `
  <url>
    <loc>${storeUrl}/producto/${p.slug}</loc>
    <lastmod>${p.updatedAt.toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);

      // Categorías
      const allCategories = await db
        .select({ slug: categories.slug })
        .from(categories)
        .where(eq(categories.isActive, true));

      categoryUrls = allCategories.map((c) => `
  <url>
    <loc>${storeUrl}/productos?categoria=${c.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
    }

    const staticXml = staticUrls.map((u) => `
  <url>
    <loc>${u.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${staticXml}
${categoryUrls.join("\n")}
${productUrls.join("\n")}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (error) {
    console.error("[Sitemap] Error:", error);
    res.status(500).send("Error generating sitemap");
  }
});

// ─── Robots.txt ──────────────────────────────────────────────────────────────
feedRouter.get("/robots.txt", (req, res) => {
  const storeUrl = "https://pago-contraentrega-production.up.railway.app";
  res.setHeader("Content-Type", "text/plain");
  res.send(`# Robots.txt - Pago Contra Entrega Colombia
User-agent: *
Allow: /
Allow: /producto/
Allow: /productos
Allow: /api/feed/
Disallow: /admin
Disallow: /admin/
Disallow: /api/trpc/
Disallow: /api/extension/

Sitemap: ${storeUrl}/sitemap.xml

# Google Shopping Feed
# Feed XML: ${storeUrl}/api/feed/google-merchant.xml
# Feed JSON: ${storeUrl}/api/feed/google-merchant.json
`);
});

export default feedRouter;
