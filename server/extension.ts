/**
 * Extension API Router
 *
 * Endpoint REST dedicado para recibir productos desde la extensión Chrome
 * MarketAutoPublisher y guardarlos directamente en la base de datos.
 *
 * Ruta base: /api/extension
 */

import { Router, Request, Response } from "express";
import { getDb } from "./db";
import { products, settings, categories } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const extensionRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function makeUniqueSlug(base: string, suffix: number = 0): string {
  return suffix === 0 ? base : `${base}-${suffix}`;
}

async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

/**
 * Asegura que una categoría exista en la tabla categories.
 * Si no existe, la crea automáticamente.
 * Retorna el nombre normalizado de la categoría.
 */
async function ensureCategory(categoryName: string): Promise<string> {
  if (!categoryName || !categoryName.trim()) return categoryName;

  const db = await getDb();
  if (!db) return categoryName;

  const name = categoryName.trim();
  const catSlug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  try {
    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, catSlug))
      .limit(1);

    if (existing.length === 0) {
      // Crear la categoría automáticamente
      await db.insert(categories).values({
        name,
        slug: catSlug,
        isActive: true,
        sortOrder: 0,
      });
      console.log(`[Extension API] Categoría creada automáticamente: "${name}" (slug: ${catSlug})`);
    }
  } catch (err: any) {
    // Si ya existe por race condition, ignorar
    if (!err.message?.includes("Duplicate")) {
      console.warn(`[Extension API] No se pudo crear categoría "${name}":`, err.message);
    }
  }

  return name;
}

// ─── CORS para la extensión Chrome ────────────────────────────────────────────

extensionRouter.use((req: Request, res: Response, next: Function) => {
  // Permitir solicitudes desde la extensión Chrome (chrome-extension://) y desde el propio dominio
  const origin = req.headers.origin || "";
  const isExtension = origin.startsWith("chrome-extension://") || origin === "";
  const isSameOrigin = origin.includes("pago-contraentrega");

  if (isExtension || isSameOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Extension-Token");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }

  next();
});

// ─── Validación de token de extensión ─────────────────────────────────────────

async function validateExtensionToken(req: Request): Promise<boolean> {
  // Método 1: Token de extensión en el header X-Extension-Token
  const headerToken = req.headers["x-extension-token"] as string;
  if (headerToken) {
    const storedToken = await getSetting("extension_api_token");
    if (storedToken && headerToken === storedToken) {
      return true;
    }
  }

  // Método 2: Si no hay token configurado, permitir (modo desarrollo/configuración inicial)
  const storedToken = await getSetting("extension_api_token");
  if (!storedToken) {
    return true; // Sin token configurado, permitir acceso (el admin debe configurarlo)
  }

  return false;
}

// ─── GET /api/extension/status ────────────────────────────────────────────────
// Verificar que el endpoint está activo y retornar info de configuración

extensionRouter.get("/status", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) {
      res.status(503).json({ success: false, error: "Base de datos no disponible" });
      return;
    }

    const tokenConfigured = !!(await getSetting("extension_api_token"));
    const storeName = await getSetting("store_name") ?? "Pago Contra Entrega";

    res.json({
      success: true,
      status: "online",
      storeName,
      tokenConfigured,
      message: tokenConfigured
        ? "Extensión conectada correctamente. Token configurado."
        : "Extensión conectada. Configura un token en el panel de administración para mayor seguridad.",
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── POST /api/extension/import-product ───────────────────────────────────────
// Importar un producto desde la extensión Chrome

extensionRouter.post("/import-product", async (req: Request, res: Response) => {
  try {
    // Validar token de extensión
    const isValid = await validateExtensionToken(req);
    if (!isValid) {
      res.status(401).json({
        success: false,
        error: "Token de extensión inválido. Configura el token en la extensión y en el panel de administración.",
      });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(503).json({ success: false, error: "Base de datos no disponible" });
      return;
    }

    // Extraer y validar campos del payload
    const {
      dropiId,
      name,
      description,
      shortDescription,
      metaTitle,
      metaDescription,
      price,
      comparePrice,
      images,
      category,
      tags,
      sku,
      stock,
      providerPrice,
      suggestedPrice,
      slug: incomingSlug,
      aiGenerated,
    } = req.body;

    // Validaciones básicas
    if (!dropiId) {
      res.status(400).json({ success: false, error: "El campo 'dropiId' es requerido." });
      return;
    }
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ success: false, error: "El campo 'name' (título) es requerido." });
      return;
    }

    // Calcular precio final
    // Prioridad: price > suggestedPrice > providerPrice + margen
    let finalPrice: string;
    if (price && Number(price) > 0) {
      finalPrice = String(Math.round(Number(price)));
    } else if (suggestedPrice && Number(suggestedPrice) > 0) {
      finalPrice = String(Math.round(Number(suggestedPrice)));
    } else if (providerPrice && Number(providerPrice) > 0) {
      // Margen por defecto: precio proveedor + 30.000 COP
      finalPrice = String(Math.round(Number(providerPrice) + 30000));
    } else {
      res.status(400).json({ success: false, error: "Se requiere al menos un precio (price, suggestedPrice o providerPrice)." });
      return;
    }

    // Calcular comparePrice (precio tachado)
    let finalComparePrice: string | null = null;
    if (comparePrice && Number(comparePrice) > 0) {
      finalComparePrice = String(Math.round(Number(comparePrice)));
    }

    // Generar slug único
    const baseSlug = incomingSlug || slugify(name.trim());
    let finalSlug = baseSlug;
    let slugSuffix = 0;

    // Verificar si el slug ya existe (para otro producto diferente)
    while (true) {
      const existing = await db
        .select({ id: products.id, dropiId: products.dropiId })
        .from(products)
        .where(eq(products.slug, finalSlug))
        .limit(1);

      if (existing.length === 0) break; // Slug disponible
      if (existing[0].dropiId === String(dropiId)) break; // Es el mismo producto, OK

      // Slug ocupado por otro producto, incrementar sufijo
      slugSuffix++;
      finalSlug = makeUniqueSlug(baseSlug, slugSuffix);
    }

    // Preparar imágenes
    const imageArray: string[] = Array.isArray(images)
      ? images.filter((img: any) => typeof img === "string" && img.startsWith("http"))
      : [];

    const mainImage = imageArray[0] ?? null;

    // Preparar tags
    const tagsArray: string[] = Array.isArray(tags)
      ? tags.filter((t: any) => typeof t === "string")
      : [];

    // Asegurar que la categoría exista en la BD (creación automática)
    const finalCategory = category ? await ensureCategory(String(category)) : null;

    // Datos del producto a guardar
    const productData = {
      dropiId: String(dropiId),
      slug: finalSlug,
      name: name.trim(),
      description: description ? String(description) : null,
      shortDescription: shortDescription ? String(shortDescription) : null,
      metaTitle: metaTitle ? String(metaTitle) : null,
      metaDescription: metaDescription ? String(metaDescription) : null,
      price: finalPrice,
      comparePrice: finalComparePrice,
      sku: sku ? String(sku) : null,
      category: finalCategory,
      mainImage,
      images: imageArray.length > 0 ? imageArray : null,
      stock: stock ? Number(stock) : null,
      tags: tagsArray.length > 0 ? tagsArray : null,
      isActive: true,
      lastSyncedAt: new Date(),
    };

    // Verificar si el producto ya existe (por dropiId)
    const existingByDropiId = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.dropiId, String(dropiId)))
      .limit(1);

    let productId: number;
    let action: "created" | "updated";

    if (existingByDropiId.length > 0) {
      // Actualizar producto existente
      await db
        .update(products)
        .set(productData)
        .where(eq(products.dropiId, String(dropiId)));

      productId = existingByDropiId[0].id;
      action = "updated";
    } else {
      // Crear nuevo producto
      const [result] = await db.insert(products).values(productData);
      productId = (result as any).insertId;
      action = "created";
    }

    const productUrl = `https://pago-contraentrega-production.up.railway.app/producto/${finalSlug}`;

    const aiMsg = aiGenerated ? " ✨ Descripción SEO generada con IA" : "";
    res.json({
      success: true,
      action,
      productId,
      slug: finalSlug,
      productUrl,
      aiGenerated: !!aiGenerated,
      message: action === "created"
        ? `Producto "${name.trim()}" importado exitosamente.${aiMsg}`
        : `Producto "${name.trim()}" actualizado exitosamente.${aiMsg}`,
    });
  } catch (error: any) {
    console.error("[Extension API] Error importando producto:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error interno del servidor",
    });
  }
});

// ─── POST /api/extension/import-batch ─────────────────────────────────────────
// Importar múltiples productos en lote desde la extensión

extensionRouter.post("/import-batch", async (req: Request, res: Response) => {
  try {
    const isValid = await validateExtensionToken(req);
    if (!isValid) {
      res.status(401).json({ success: false, error: "Token de extensión inválido." });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(503).json({ success: false, error: "Base de datos no disponible" });
      return;
    }

    const { products: productList } = req.body;

    if (!Array.isArray(productList) || productList.length === 0) {
      res.status(400).json({ success: false, error: "Se requiere un array 'products' con al menos un producto." });
      return;
    }

    if (productList.length > 50) {
      res.status(400).json({ success: false, error: "Máximo 50 productos por lote." });
      return;
    }

    const results: Array<{ dropiId: string; success: boolean; action?: string; error?: string; productUrl?: string }> = [];

    for (const item of productList) {
      try {
        const { dropiId, name, description, price, suggestedPrice, providerPrice, images, category, tags, sku, stock } = item;

        if (!dropiId || !name) {
          results.push({ dropiId: String(dropiId || "unknown"), success: false, error: "Faltan campos requeridos (dropiId, name)" });
          continue;
        }

        let finalPrice: string;
        if (price && Number(price) > 0) {
          finalPrice = String(Math.round(Number(price)));
        } else if (suggestedPrice && Number(suggestedPrice) > 0) {
          finalPrice = String(Math.round(Number(suggestedPrice)));
        } else if (providerPrice && Number(providerPrice) > 0) {
          finalPrice = String(Math.round(Number(providerPrice) + 30000));
        } else {
          results.push({ dropiId: String(dropiId), success: false, error: "Sin precio válido" });
          continue;
        }

        const baseSlug = slugify(String(name).trim());
        let finalSlug = baseSlug;
        let slugSuffix = 0;

        while (true) {
          const existing = await db
            .select({ id: products.id, dropiId: products.dropiId })
            .from(products)
            .where(eq(products.slug, finalSlug))
            .limit(1);

          if (existing.length === 0) break;
          if (existing[0].dropiId === String(dropiId)) break;
          slugSuffix++;
          finalSlug = makeUniqueSlug(baseSlug, slugSuffix);
        }

        const imageArray: string[] = Array.isArray(images)
          ? images.filter((img: any) => typeof img === "string" && img.startsWith("http"))
          : [];

        const productData = {
          dropiId: String(dropiId),
          slug: finalSlug,
          name: String(name).trim(),
          description: description ? String(description) : null,
          price: finalPrice,
          sku: sku ? String(sku) : null,
          category: category ? String(category) : null,
          mainImage: imageArray[0] ?? null,
          images: imageArray.length > 0 ? imageArray : null,
          stock: stock ? Number(stock) : null,
          tags: Array.isArray(tags) ? tags.filter((t: any) => typeof t === "string") : null,
          isActive: true,
          lastSyncedAt: new Date(),
        };

        const existingByDropiId = await db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.dropiId, String(dropiId)))
          .limit(1);

        let action: "created" | "updated";
        if (existingByDropiId.length > 0) {
          await db.update(products).set(productData).where(eq(products.dropiId, String(dropiId)));
          action = "updated";
        } else {
          await db.insert(products).values(productData);
          action = "created";
        }

        results.push({
          dropiId: String(dropiId),
          success: true,
          action,
          productUrl: `https://pago-contraentrega-production.up.railway.app/producto/${finalSlug}`,
        });
      } catch (err: any) {
        results.push({ dropiId: String(item?.dropiId || "unknown"), success: false, error: err.message });
      }
    }

    const created = results.filter((r) => r.action === "created").length;
    const updated = results.filter((r) => r.action === "updated").length;
    const failed = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      summary: { total: productList.length, created, updated, failed },
      results,
    });
  } catch (error: any) {
    console.error("[Extension API] Error en importación por lote:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default extensionRouter;
