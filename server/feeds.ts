import { Router } from "express";
import { getDb } from "./db";
import { products, settings } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

const feedRouter = Router();

async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

// ─── Google Merchant Center Feed (XML) ───────────────────────────────────────
feedRouter.get("/feed/google-merchant.xml", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).send("Database unavailable");

    const storeName = await getSetting("store_name") ?? "Pago Contra Entrega";
    const storeUrl = `https://${req.hostname}`;

    const activeProducts = await db
      .select()
      .from(products)
      .where(eq(products.isActive, true))
      .limit(1000);

    const items = activeProducts.map((p) => {
      const price = parseFloat(String(p.price));
      const images = (p.images as string[] | null) ?? [];
      const mainImg = p.mainImage ?? images[0] ?? "";
      const inStock = p.stock === null || p.stock === undefined || p.stock > 0;
      const condition = p.condition ?? "new";

      return `
    <item>
      <g:id>${p.dropiId}</g:id>
      <g:title><![CDATA[${p.name}]]></g:title>
      <g:description><![CDATA[${(p.shortDescription ?? p.description ?? p.name).substring(0, 5000)}]]></g:description>
      <g:link>${storeUrl}/producto/${p.slug}</g:link>
      <g:image_link>${mainImg}</g:image_link>
      ${images.slice(1, 10).map((img) => `<g:additional_image_link>${img}</g:additional_image_link>`).join("\n      ")}
      <g:condition>${condition}</g:condition>
      <g:availability>${inStock ? "in_stock" : "out_of_stock"}</g:availability>
      <g:price>${price.toFixed(2)} COP</g:price>
      ${p.comparePrice ? `<g:sale_price>${parseFloat(String(p.comparePrice)).toFixed(2)} COP</g:sale_price>` : ""}
      <g:brand><![CDATA[${p.brand ?? storeName}]]></g:brand>
      ${p.gtin ? `<g:gtin>${p.gtin}</g:gtin>` : ""}
      ${p.mpn ? `<g:mpn>${p.mpn}</g:mpn>` : ""}
      ${p.sku ? `<g:mpn>${p.sku}</g:mpn>` : ""}
      ${p.googleCategory ? `<g:google_product_category><![CDATA[${p.googleCategory}]]></g:google_product_category>` : ""}
      ${p.category ? `<g:product_type><![CDATA[${p.category}]]></g:product_type>` : ""}
      <g:shipping>
        <g:country>CO</g:country>
        <g:service>Envío Estándar</g:service>
        <g:price>0 COP</g:price>
      </g:shipping>
      <g:custom_label_0>pago_contra_entrega</g:custom_label_0>
    </item>`;
    }).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${storeName}</title>
    <link>${storeUrl}</link>
    <description>Catálogo de productos con pago contra entrega en Colombia</description>
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
    const storeUrl = `https://${req.hostname}`;

    const activeProducts = await db
      .select()
      .from(products)
      .where(eq(products.isActive, true))
      .limit(1000);

    const items = activeProducts.map((p) => {
      const price = parseFloat(String(p.price));
      const images = (p.images as string[] | null) ?? [];
      const inStock = p.stock === null || p.stock === undefined || p.stock > 0;

      return {
        id: p.dropiId,
        title: p.name,
        description: (p.shortDescription ?? p.description ?? p.name).substring(0, 5000),
        link: `${storeUrl}/producto/${p.slug}`,
        image_link: p.mainImage ?? images[0] ?? "",
        additional_image_link: images.slice(1, 10),
        condition: p.condition ?? "new",
        availability: inStock ? "in_stock" : "out_of_stock",
        price: `${price.toFixed(2)} COP`,
        sale_price: p.comparePrice ? `${parseFloat(String(p.comparePrice)).toFixed(2)} COP` : undefined,
        brand: p.brand ?? storeName,
        gtin: p.gtin ?? undefined,
        mpn: p.mpn ?? p.sku ?? undefined,
        google_product_category: p.googleCategory ?? undefined,
        product_type: p.category ?? undefined,
        shipping: [{ country: "CO", service: "Envío Estándar", price: "0 COP" }],
        custom_label_0: "pago_contra_entrega",
      };
    });

    res.setHeader("Cache-Control", "public, max-age=3600");
    res.json({ items });
  } catch (error) {
    console.error("[Feed] Error generating JSON feed:", error);
    res.status(500).json({ error: "Error generating feed" });
  }
});

// ─── Sitemap XML ─────────────────────────────────────────────────────────────
feedRouter.get("/sitemap.xml", async (req, res) => {
  try {
    const db = await getDb();
    const storeUrl = `https://${req.hostname}`;
    const now = new Date().toISOString().split("T")[0];

    const staticUrls = [
      { loc: storeUrl, priority: "1.0", changefreq: "daily" },
      { loc: `${storeUrl}/productos`, priority: "0.9", changefreq: "daily" },
      { loc: `${storeUrl}/rastrear`, priority: "0.5", changefreq: "monthly" },
    ];

    let productUrls: string[] = [];
    if (db) {
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
    }

    const staticXml = staticUrls.map((u) => `
  <url>
    <loc>${u.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticXml}
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
  const storeUrl = `https://${req.hostname}`;
  res.setHeader("Content-Type", "text/plain");
  res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${storeUrl}/sitemap.xml

# Google Shopping
User-agent: Googlebot
Allow: /
Allow: /producto/
Allow: /productos

# Feed
Allow: /api/feed/
`);
});

export default feedRouter;
