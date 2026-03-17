/**
 * Extension API Router
 *
 * Endpoint REST dedicado para recibir productos desde la extensión Chrome
 * MarketAutoPublisher y guardarlos directamente en la base de datos.
 *
 * Cuando el campo `generateSEO: true` viene en el payload, el servidor
 * genera automáticamente título SEO, descripción HTML larga, shortDescription,
 * metaTitle, metaDescription y tags usando el LLM del backend (sin necesidad
 * de API Key del usuario).
 *
 * Ruta base: /api/extension
 */

import { Router, Request, Response } from "express";
import { getDb, getUserByUsername } from "./db";
import { products, settings, categories, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
/**
 * Llama a Groq usando la API Key guardada en la BD del sitio.
 * Si no hay clave de Groq en BD, intenta con variables de entorno como fallback.
 */
async function callGroqLLM(
  messages: Array<{role: string; content: string}>,
  groqApiKey: string,
  maxTokens = 4096
): Promise<string | null> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API Error ${response.status}: ${errText}`);
  }

  const data = await response.json() as any;
  return data?.choices?.[0]?.message?.content ?? null;
}

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
      await db.insert(categories).values({
        name,
        slug: catSlug,
        isActive: true,
        sortOrder: 0,
      });
      console.log(`[Extension API] Categoría creada automáticamente: "${name}" (slug: ${catSlug})`);
    }
  } catch (err: any) {
    if (!err.message?.includes("Duplicate")) {
      console.warn(`[Extension API] No se pudo crear categoría "${name}":`, err.message);
    }
  }

  return name;
}

// ─── Generación de contenido SEO con LLM ──────────────────────────────────────

interface SeoContent {
  web_title: string;
  web_short_description: string;
  web_description: string;
  web_meta_title: string;
  web_meta_description: string;
  web_price: number;
  web_category: string;
  web_tags: string[];
}

async function generateSeoContent(
  title: string,
  description: string,
  category: string,
  providerPrice: number,
  suggestedPrice: number,
  groqApiKey: string
): Promise<SeoContent | null> {
  const basePrice = providerPrice || suggestedPrice || 0;
  const suggestedWebPrice = Math.round(basePrice * 1.30 + 15000);
  const rawDescription = (description || "").substring(0, 1200);

  const systemPrompt = `Eres un experto en SEO, Google Shopping y e-commerce colombiano especializado en tiendas de pago contra entrega.
Tu objetivo es crear contenido ALTAMENTE OPTIMIZADO para:
1. Posicionamiento orgánico en Google (SEO on-page)
2. Google Shopping (Product Listing Ads)
3. Rich Results / Resultados Enriquecidos de Google
4. Conversión de ventas en Colombia

Reglas OBLIGATORIAS:
- Responde ÚNICAMENTE con JSON válido. NO uses markdown. NO agregues texto fuera del JSON.
- web_description DEBE ser HTML semántico completo con h2, h3, p, ul, li, strong, em. MÍNIMO 600 palabras.
- Usa palabras clave naturales relacionadas con el producto y Colombia.
- NO inventes especificaciones técnicas que no estén en la descripción original.
- Los tags deben ser términos de búsqueda reales que la gente usa en Google Colombia.
- web_meta_title: máx 60 caracteres, incluye la palabra clave principal.
- web_meta_description: máx 155 caracteres, incluye llamada a la acción y "Colombia".
- web_short_description: máx 160 caracteres, orientado a conversión.`;  

  const userPrompt = `Crea contenido SEO completo para este producto de tienda online colombiana con pago contra entrega:

PRODUCTO:
- Nombre: "${title}"
- Precio proveedor: ${basePrice} COP
- Precio sugerido de venta: ${suggestedWebPrice} COP
- Categoría: "${category || "General"}"
- Descripción original de Dropi: "${rawDescription}"

GENERA exactamente este JSON (todos los campos son OBLIGATORIOS):

{
  "web_title": "[Nombre del producto + Colombia, máx 70 chars. Ej: 'Mini Compresor Portátil para Auto Colombia']",
  "web_short_description": "[160 chars máx. Beneficio principal + palabras clave + '✅ Pago al recibir | 🚚 Envío a todo Colombia'. Ej: 'Compresor portátil para inflar neumáticos y balones. Compacto, ligero y eficiente. ✅ Pago al recibir | 🚚 Envío a todo Colombia']",
  "web_description": "[HTML COMPLETO mínimo 600 palabras con esta estructura EXACTA:\n<h2>Descripción del [NOMBRE PRODUCTO]</h2>\n<p>[Párrafo introductorio de 4-5 oraciones con palabras clave del producto, beneficios principales y mención de Colombia. Incluye el nombre del producto varias veces de forma natural.]</p>\n<p>[Segundo párrafo explicando casos de uso, para quién es ideal, qué problema resuelve.]</p>\n<p>[Tercer párrafo sobre calidad, materiales o tecnología del producto.]</p>\n<h3>Características Principales</h3>\n<ul>\n<li><strong>[Característica 1]:</strong> [Descripción detallada]</li>\n<li><strong>[Característica 2]:</strong> [Descripción detallada]</li>\n<li><strong>[Característica 3]:</strong> [Descripción detallada]</li>\n<li><strong>[Característica 4]:</strong> [Descripción detallada]</li>\n<li><strong>[Característica 5]:</strong> [Descripción detallada]</li>\n<li><strong>[Característica 6]:</strong> [Descripción detallada]</li>\n</ul>\n<h3>Beneficios de Comprar en Pago Contra Entrega</h3>\n<p>[Párrafo sobre la ventaja del pago contra entrega en Colombia: seguridad, confianza, sin tarjeta de crédito, paga cuando recibes.]</p>\n<h3>¿Para Quién es Ideal Este Producto?</h3>\n<p>[Párrafo describiendo el perfil del comprador ideal y situaciones de uso en Colombia.]</p>\n<h3>Envío y Forma de Pago</h3>\n<p>Realizamos envíos a todo Colombia: Bogotá, Medellín, Cali, Barranquilla, Cartagena y todas las ciudades y municipios del país. El producto llega en <strong>3 a 7 días hábiles</strong> directamente a la puerta de tu casa. <strong>Pagas únicamente cuando recibes tu pedido</strong>, en efectivo al mensajero. Sin tarjeta de crédito, sin pagos anticipados, sin riesgos.</p>\n<h3>Preguntas Frecuentes</h3>\n<p><strong>¿Cuánto tarda el envío?</strong> Entre 3 y 7 días hábiles a cualquier ciudad de Colombia.</p>\n<p><strong>¿Cómo pago?</strong> Pagas en efectivo al mensajero cuando recibas tu pedido en la puerta de tu casa.</p>\n<p><strong>¿El producto tiene garantía?</strong> Sí, todos nuestros productos tienen garantía de satisfacción.</p>\n<p><strong>¿Puedo devolver el producto?</strong> Si el producto llega defectuoso o no es lo que pediste, gestionamos el cambio o devolución.</p>\n<p><strong>¿Hacen envíos a municipios pequeños?</strong> Sí, llegamos a más de 1.000 municipios en todo Colombia.</p>\n<p><em>Compra ahora con total confianza. 🛡️ Garantía incluida. Pago seguro contra entrega.</em></p>]",
  "web_meta_title": "[Máx 60 chars. Incluye palabra clave principal + Colombia. Ej: 'Compresor Portátil Auto Colombia | Pago Contraentrega']",
  "web_meta_description": "[Máx 155 chars. Incluye beneficio principal + CTA + Colombia. Ej: 'Compresor portátil para auto e inflar neumáticos. Envío a todo Colombia. ✅ Paga solo cuando lo recibas. Compra segura.']",
  "web_price": ${suggestedWebPrice},
  "web_category": "${category || "General"}",
  "web_tags": ["[término búsqueda 1]", "[término búsqueda 2]", "[término búsqueda 3]", "[término búsqueda 4]", "[término búsqueda 5]", "[término búsqueda 6]", "[término búsqueda 7]", "[término búsqueda 8]", "[término búsqueda 9]", "[término búsqueda 10]"]
}

IMPORTANTE: Los tags deben ser términos de búsqueda reales en Google Colombia relacionados con el producto. Ej para compresor: ["compresor portatil para carro", "inflador de llantas", "bomba de aire portatil", "compresor de aire colombia", "inflador electrico", "compresor mini auto", "pago contra entrega colombia", "inflador de neumaticos", "compresor de llantas", "bomba de aire para bicicleta"]`;

  try {
    console.log(`[Extension API] Generando SEO con LLM para: "${title}"`);

    const content = await callGroqLLM([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], groqApiKey, 4096);

    if (!content) {
      console.warn("[Extension API] LLM retornó respuesta vacía");
      return null;
    }

    let parsed: SeoContent;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      const clean = content.replace(/```json/g, "").replace(/```/g, "").trim();
      try {
        parsed = JSON.parse(clean);
      } catch (e2) {
        console.error("[Extension API] No se pudo parsear JSON del LLM:", content.substring(0, 300));
        return null;
      }
    }

    // Asegurar precio como número
    if (parsed.web_price !== undefined) {
      const priceStr = String(parsed.web_price).replace(/[^0-9]/g, "");
      parsed.web_price = parseInt(priceStr) || suggestedWebPrice;
    }

    console.log(`[Extension API] ✅ SEO generado: título="${parsed.web_title}", desc=${parsed.web_description?.length || 0} chars, tags=${parsed.web_tags?.length || 0}`);
    return parsed;

  } catch (error: any) {
    console.error("[Extension API] Error generando SEO con LLM:", error.message);
    return null;
  }
}

// ─── CORS para la extensión Chrome ────────────────────────────────────────────

extensionRouter.use((req: Request, res: Response, next: Function) => {
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
  const headerToken = req.headers["x-extension-token"] as string;
  if (headerToken) {
    const storedToken = await getSetting("extension_api_token");
    if (storedToken && headerToken === storedToken) {
      return true;
    }
  }

  const storedToken = await getSetting("extension_api_token");
  if (!storedToken) {
    return true; // Sin token configurado, permitir (modo inicial)
  }

  return false;
}

// ─── GET /api/extension/status ────────────────────────────────────────────────

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
      seoEnabled: true,
      message: tokenConfigured
        ? "Extensión conectada correctamente. Token configurado. ✨ SEO con IA disponible."
        : "Extensión conectada. Configura un token en el panel de administración para mayor seguridad.",
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── POST /api/extension/import-product ───────────────────────────────────────
// Importar un producto desde la extensión Chrome.
// Si `generateSEO: true` viene en el payload, el servidor genera el contenido SEO.

extensionRouter.post("/import-product", async (req: Request, res: Response) => {
  try {
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
      generateSEO,   // ← nuevo campo: si true, el servidor genera el SEO
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

    // Calcular precio base
    let finalPrice: string;
    if (price && Number(price) > 0) {
      finalPrice = String(Math.round(Number(price)));
    } else if (suggestedPrice && Number(suggestedPrice) > 0) {
      finalPrice = String(Math.round(Number(suggestedPrice)));
    } else if (providerPrice && Number(providerPrice) > 0) {
      finalPrice = String(Math.round(Number(providerPrice) + 30000));
    } else {
      res.status(400).json({ success: false, error: "Se requiere al menos un precio (price, suggestedPrice o providerPrice)." });
      return;
    }

    let finalComparePrice: string | null = null;
    if (comparePrice && Number(comparePrice) > 0) {
      finalComparePrice = String(Math.round(Number(comparePrice)));
    }

    // ─── Generación SEO en el servidor ────────────────────────────────────────
    let finalName = name.trim();
    let finalDescription = description ? String(description) : null;
    let finalShortDescription = shortDescription ? String(shortDescription) : null;
    let finalMetaTitle = metaTitle ? String(metaTitle) : null;
    let finalMetaDescription = metaDescription ? String(metaDescription) : null;
    let finalCategory = category ? String(category) : null;
    let finalTags: string[] = Array.isArray(tags) ? tags.filter((t: any) => typeof t === "string") : [];
    let seoGenerated = false;

    if (generateSEO) {
      // Leer la API Key de Groq guardada en la BD
      const groqApiKey = await getSetting("groq_api_key");

      if (!groqApiKey) {
        console.warn("[Extension API] generateSEO=true pero no hay groq_api_key configurada en la BD. Guarda tu API Key de Groq en el panel admin → Extensión Chrome.");
      } else {
        const seoContent = await generateSeoContent(
          name.trim(),
          description || "",
          category || "General",
          Number(providerPrice) || 0,
          Number(suggestedPrice) || 0,
          groqApiKey
        );

        if (seoContent) {
          if (seoContent.web_title?.trim()) finalName = seoContent.web_title.trim();
          if (seoContent.web_description?.trim()) finalDescription = seoContent.web_description.trim();
          if (seoContent.web_short_description?.trim()) finalShortDescription = seoContent.web_short_description.trim();
          if (seoContent.web_meta_title?.trim()) finalMetaTitle = seoContent.web_meta_title.trim();
          if (seoContent.web_meta_description?.trim()) finalMetaDescription = seoContent.web_meta_description.trim();
          if (seoContent.web_price > 0) finalPrice = String(seoContent.web_price);
          if (seoContent.web_category?.trim()) finalCategory = seoContent.web_category.trim();
          if (Array.isArray(seoContent.web_tags) && seoContent.web_tags.length > 0) finalTags = seoContent.web_tags;
          seoGenerated = true;
        }
      }
    }

    // Asegurar categoría en BD
    if (finalCategory) {
      finalCategory = await ensureCategory(finalCategory);
    }

    // Generar slug único
    const baseSlug = incomingSlug || slugify(name.trim());
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

    // Preparar imágenes
    const imageArray: string[] = Array.isArray(images)
      ? images.filter((img: any) => typeof img === "string" && img.startsWith("http"))
      : [];

    const mainImage = imageArray[0] ?? null;

    // Datos del producto a guardar
    const productData = {
      dropiId: String(dropiId),
      slug: finalSlug,
      name: finalName,
      description: finalDescription,
      shortDescription: finalShortDescription,
      metaTitle: finalMetaTitle,
      metaDescription: finalMetaDescription,
      price: finalPrice,
      comparePrice: finalComparePrice,
      sku: sku ? String(sku) : null,
      category: finalCategory,
      mainImage,
      images: imageArray.length > 0 ? imageArray : null,
      stock: stock ? Number(stock) : null,
      tags: finalTags.length > 0 ? finalTags : null,
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
      await db
        .update(products)
        .set(productData)
        .where(eq(products.dropiId, String(dropiId)));

      productId = existingByDropiId[0].id;
      action = "updated";
    } else {
      const [result] = await db.insert(products).values(productData);
      productId = (result as any).insertId;
      action = "created";
    }

    const productUrl = `https://pago-contraentrega-production.up.railway.app/producto/${finalSlug}`;
    const aiMsg = seoGenerated ? " ✨ Descripción SEO generada con IA" : "";

    res.json({
      success: true,
      action,
      productId,
      slug: finalSlug,
      productUrl,
      aiGenerated: seoGenerated || !!aiGenerated,
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

    const { products: productList, generateSEO } = req.body;

    if (!Array.isArray(productList) || productList.length === 0) {
      res.status(400).json({ success: false, error: "Se requiere un array 'products' con al menos un producto." });
      return;
    }

    if (productList.length > 50) {
      res.status(400).json({ success: false, error: "Máximo 50 productos por lote." });
      return;
    }

    const results: Array<{ dropiId: string; success: boolean; action?: string; error?: string; productUrl?: string; aiGenerated?: boolean }> = [];

    // Leer la API Key de Groq una sola vez para todo el lote
    const groqApiKey = generateSEO ? (await getSetting("groq_api_key")) : null;
    if (generateSEO && !groqApiKey) {
      console.warn("[Extension API] import-batch con generateSEO=true pero no hay groq_api_key en BD.");
    }

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

        let finalName = String(name).trim();
        let finalDescription = description ? String(description) : null;
        let finalShortDescription: string | null = null;
        let finalMetaTitle: string | null = null;
        let finalMetaDescription: string | null = null;
        let finalCategory = category ? String(category) : null;
        let finalTags: string[] = Array.isArray(tags) ? tags.filter((t: any) => typeof t === "string") : [];
        let seoGenerated = false;

        // Generar SEO si se solicitó y hay API Key de Groq disponible
        if (generateSEO && groqApiKey) {
          const seoContent = await generateSeoContent(
            finalName,
            description || "",
            category || "General",
            Number(providerPrice) || 0,
            Number(suggestedPrice) || 0,
            groqApiKey
          );

          if (seoContent) {
            if (seoContent.web_title?.trim()) finalName = seoContent.web_title.trim();
            if (seoContent.web_description?.trim()) finalDescription = seoContent.web_description.trim();
            if (seoContent.web_short_description?.trim()) finalShortDescription = seoContent.web_short_description.trim();
            if (seoContent.web_meta_title?.trim()) finalMetaTitle = seoContent.web_meta_title.trim();
            if (seoContent.web_meta_description?.trim()) finalMetaDescription = seoContent.web_meta_description.trim();
            if (seoContent.web_price > 0) finalPrice = String(seoContent.web_price);
            if (seoContent.web_category?.trim()) finalCategory = seoContent.web_category.trim();
            if (Array.isArray(seoContent.web_tags) && seoContent.web_tags.length > 0) finalTags = seoContent.web_tags;
            seoGenerated = true;
          }

          // Pausa entre productos para no saturar Groq
          await new Promise(r => setTimeout(r, 1500));
        }

        if (finalCategory) {
          finalCategory = await ensureCategory(finalCategory);
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
          name: finalName,
          description: finalDescription,
          shortDescription: finalShortDescription,
          metaTitle: finalMetaTitle,
          metaDescription: finalMetaDescription,
          price: finalPrice,
          sku: sku ? String(sku) : null,
          category: finalCategory,
          mainImage: imageArray[0] ?? null,
          images: imageArray.length > 0 ? imageArray : null,
          stock: stock ? Number(stock) : null,
          tags: finalTags.length > 0 ? finalTags : null,
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
          aiGenerated: seoGenerated,
          productUrl: `https://pago-contraentrega-production.up.railway.app/producto/${finalSlug}`,
        });
      } catch (err: any) {
        results.push({ dropiId: String(item?.dropiId || "unknown"), success: false, error: err.message });
      }
    }

    const created = results.filter((r) => r.action === "created").length;
    const updated = results.filter((r) => r.action === "updated").length;
    const failed = results.filter((r) => !r.success).length;
    const seoCount = results.filter((r) => r.aiGenerated).length;

    res.json({
      success: true,
      summary: { total: productList.length, created, updated, failed, seoGenerated: seoCount },
      results,
    });
  } catch (error: any) {
    console.error("[Extension API] Error en importación por lote:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── POST /api/extension/set-groq-key ────────────────────────────────────────
// Guarda la API Key de Groq en la BD. Protegido con el token de extensión
// o con credenciales de admin (header X-Admin-Password).

extensionRouter.post("/set-groq-key", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) {
      res.status(503).json({ success: false, error: "Base de datos no disponible" });
      return;
    }

    // Verificar autenticación: token de extensión O contraseña de admin
    const adminPassword = req.headers["x-admin-password"] as string;
    const isValidToken = await validateExtensionToken(req);

    // Verificar contraseña de admin directamente
    let isValidAdmin = false;
    if (adminPassword) {
      const adminUser = await db
        .select()
        .from(users)
        .where(eq(users.username, "admin"))
        .limit(1);
      if (adminUser[0]) {
        isValidAdmin = await bcrypt.compare(adminPassword, adminUser[0].passwordHash);
      }
    }

    if (!isValidToken && !isValidAdmin) {
      res.status(401).json({ success: false, error: "No autorizado" });
      return;
    }

    const { groqApiKey } = req.body;
    if (!groqApiKey || typeof groqApiKey !== "string" || !groqApiKey.startsWith("gsk_")) {
      res.status(400).json({ success: false, error: "API Key inválida. Debe empezar con gsk_" });
      return;
    }

    // Guardar en la BD
    const existing = await db.select().from(settings).where(eq(settings.key, "groq_api_key")).limit(1);
    if (existing.length > 0) {
      await db.update(settings).set({ value: groqApiKey }).where(eq(settings.key, "groq_api_key"));
    } else {
      await db.insert(settings).values({ key: "groq_api_key", value: groqApiKey });
    }

    console.log("[Extension API] ✅ API Key de Groq guardada en BD");
    res.json({ success: true, message: "API Key de Groq guardada correctamente" });

  } catch (error: any) {
    console.error("[Extension API] Error guardando API Key de Groq:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default extensionRouter;
