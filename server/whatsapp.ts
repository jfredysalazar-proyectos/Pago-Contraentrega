/**
 * WhatsApp Business API Webhook Handler
 * Handles incoming messages, processes them with AI, and creates orders in Dropi.
 *
 * Flow:
 * 1. Receive webhook from WhatsApp Cloud API
 * 2. Extract message and phone number
 * 3. Get/create conversation context
 * 4. Process with AI (Abacus.ai via invokeLLM)
 * 5. If order data complete → create order in Dropi
 * 6. Send response back to WhatsApp
 */

import { Router } from "express";
import { getDb } from "./db";
import {
  whatsappConversations,
  whatsappMessages,
  orders,
  products,
  settings,
} from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { nanoid } from "nanoid";

const whatsappRouter = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

async function sendWhatsAppMessage(to: string, message: string, token: string): Promise<boolean> {
  try {
    const phoneNumberId = await getSetting("whatsapp_phone_number_id");
    if (!phoneNumberId) {
      console.warn("[WhatsApp] No phone_number_id configured");
      return false;
    }

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { body: message },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("[WhatsApp] Send error:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[WhatsApp] Send exception:", error);
    return false;
  }
}

async function createDropiOrder(orderData: {
  productId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  city: string;
  department: string;
  quantity: number;
}): Promise<string | null> {
  try {
    const dropiToken = await getSetting("dropi_token");
    const dropiStoreId = await getSetting("dropi_store_id");

    if (!dropiToken) {
      console.warn("[Dropi] No token configured");
      return null;
    }

    const response = await fetch("https://api.dropi.co/api/orders/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${dropiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        store_id: dropiStoreId,
        product_id: orderData.productId,
        quantity: orderData.quantity,
        customer: {
          name: orderData.customerName,
          phone: orderData.customerPhone,
          address: orderData.address,
          city: orderData.city,
          department: orderData.department,
        },
        payment_method: "cash_on_delivery",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Dropi] Order creation error:", error);
      return null;
    }

    const data = await response.json();
    return data.id ? String(data.id) : null;
  } catch (error) {
    console.error("[Dropi] Order creation exception:", error);
    return null;
  }
}

async function getDropiTracking(dropiOrderId: string): Promise<{
  status: string;
  trackingNumber?: string;
  carrier?: string;
  trackingUrl?: string;
} | null> {
  try {
    const dropiToken = await getSetting("dropi_token");
    if (!dropiToken) return null;

    const response = await fetch(`https://api.dropi.co/api/orders/${dropiOrderId}/`, {
      headers: { "Authorization": `Bearer ${dropiToken}` },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      status: data.status ?? "unknown",
      trackingNumber: data.tracking_number ?? data.guia,
      carrier: data.carrier ?? data.transportadora,
      trackingUrl: data.tracking_url,
    };
  } catch {
    return null;
  }
}

// ─── AI Conversation Processor ───────────────────────────────────────────────

interface ConversationContext {
  productName?: string;
  productId?: string;
  productPrice?: string;
  customerName?: string;
  customerPhone?: string;
  address?: string;
  city?: string;
  department?: string;
  quantity?: number;
  orderId?: string;
}

async function processWithAI(
  phoneNumber: string,
  incomingMessage: string,
  conversationId: number,
  context: ConversationContext,
  state: string,
  storeName: string
): Promise<{ response: string; newState: string; updatedContext: ConversationContext }> {
  const db = await getDb();
  if (!db) {
    return { response: "Lo siento, tenemos problemas técnicos. Por favor intenta más tarde.", newState: state, updatedContext: context };
  }

  // Get conversation history (last 15 messages)
  const history = await db
    .select()
    .from(whatsappMessages)
    .where(eq(whatsappMessages.conversationId, conversationId))
    .orderBy(desc(whatsappMessages.createdAt))
    .limit(15)
    .then((r) => r.reverse());

  const systemPrompt = `Eres el asistente de ventas de ${storeName}, una tienda colombiana de dropshipping con pago contra entrega.

ESTADO ACTUAL: ${state}
CONTEXTO DEL PEDIDO:
${JSON.stringify(context, null, 2)}

TU OBJETIVO:
1. Responder preguntas sobre productos de forma amable y profesional
2. Cuando el cliente quiera comprar, recopilar TODOS estos datos:
   - Nombre completo
   - Dirección exacta (calle, número, barrio)
   - Ciudad
   - Departamento
   - Teléfono de contacto (si no lo tienes del número de WhatsApp)
3. Confirmar el pedido con todos los datos antes de crearlo
4. Informar que el pago es contra entrega (al recibir)

REGLAS IMPORTANTES:
- Responde SIEMPRE en español colombiano
- Sé amable, conciso y profesional
- El pago es SIEMPRE contra entrega, NUNCA pidas pago anticipado
- Cuando tengas todos los datos, confirma el pedido con el cliente
- Si el cliente confirma, responde con exactamente: "PEDIDO_CONFIRMADO"
- Si el cliente pregunta por seguimiento, busca en el contexto el orderId

ESTADOS:
- greeting: Saludo inicial
- product_inquiry: Preguntando sobre productos
- collecting_name: Recopilando nombre
- collecting_address: Recopilando dirección
- collecting_city: Recopilando ciudad
- collecting_phone: Recopilando teléfono
- confirming_order: Confirmando pedido con cliente
- order_placed: Pedido creado
- tracking: Seguimiento de pedido

Responde de forma natural y conversacional. Máximo 3 oraciones por respuesta.`;

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  // Use structured response to extract data
  const extractionPrompt = `Analiza este mensaje del cliente y extrae información si está presente:
Mensaje: "${incomingMessage}"
Contexto actual: ${JSON.stringify(context)}

Responde en JSON con estos campos (null si no aplica):
{
  "customerName": string | null,
  "address": string | null,
  "city": string | null,
  "department": string | null,
  "customerPhone": string | null,
  "quantity": number | null,
  "isConfirmation": boolean,
  "isCancellation": boolean,
  "isTrackingRequest": boolean
}`;

  let extractedData: any = {};
  try {
    const extractionResponse = await invokeLLM({
      messages: [
        { role: "system", content: "Extrae datos del mensaje del cliente. Responde SOLO con JSON válido." },
        { role: "user", content: extractionPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "extracted_data",
          strict: true,
          schema: {
            type: "object",
            properties: {
              customerName: { type: ["string", "null"] },
              address: { type: ["string", "null"] },
              city: { type: ["string", "null"] },
              department: { type: ["string", "null"] },
              customerPhone: { type: ["string", "null"] },
              quantity: { type: ["number", "null"] },
              isConfirmation: { type: "boolean" },
              isCancellation: { type: "boolean" },
              isTrackingRequest: { type: "boolean" },
            },
            required: ["customerName", "address", "city", "department", "customerPhone", "quantity", "isConfirmation", "isCancellation", "isTrackingRequest"],
            additionalProperties: false,
          },
        },
      } as any,
    });
    const content = extractionResponse.choices[0]?.message?.content;
    if (content) {
      extractedData = typeof content === "string" ? JSON.parse(content) : content;
    }
  } catch (e) {
    console.warn("[WhatsApp AI] Extraction failed:", e);
  }

  // Update context with extracted data
  const updatedContext: ConversationContext = { ...context };
  if (extractedData.customerName) updatedContext.customerName = extractedData.customerName;
  if (extractedData.address) updatedContext.address = extractedData.address;
  if (extractedData.city) updatedContext.city = extractedData.city;
  if (extractedData.department) updatedContext.department = extractedData.department;
  if (extractedData.customerPhone) updatedContext.customerPhone = extractedData.customerPhone;
  if (extractedData.quantity) updatedContext.quantity = extractedData.quantity;

  // Determine new state
  let newState = state;
  if (extractedData.isTrackingRequest) newState = "tracking";
  else if (extractedData.isCancellation) newState = "closed";
  else if (updatedContext.customerName && updatedContext.address && updatedContext.city && updatedContext.department) {
    newState = "confirming_order";
  } else if (updatedContext.customerName && !updatedContext.address) {
    newState = "collecting_address";
  } else if (updatedContext.productName && !updatedContext.customerName) {
    newState = "collecting_name";
  }

  // Generate AI response
  const aiResponse = await invokeLLM({ messages });
  let responseText = aiResponse.choices[0]?.message?.content ?? "Hola! ¿En qué puedo ayudarte?";
  if (typeof responseText !== "string") responseText = "Hola! ¿En qué puedo ayudarte?";

  // Handle order confirmation
  if (responseText.includes("PEDIDO_CONFIRMADO") || extractedData.isConfirmation) {
    newState = "order_placed";
    responseText = responseText.replace("PEDIDO_CONFIRMADO", "").trim();
    if (!responseText) {
      responseText = `¡Perfecto! Tu pedido ha sido confirmado. Te llegará en 3-5 días hábiles a ${updatedContext.city ?? "tu ciudad"}. Pagas al recibir. ¡Gracias por tu compra! 🎉`;
    }
  }

  return { response: responseText, newState, updatedContext };
}

// ─── Webhook Verification ─────────────────────────────────────────────────────

whatsappRouter.get("/webhook/whatsapp", async (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const verifyToken = await getSetting("whatsapp_verify_token") ?? "pagocontraentrega_webhook_2024";

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[WhatsApp] Webhook verified");
    res.status(200).send(challenge);
  } else {
    res.status(403).send("Forbidden");
  }
});

// ─── Webhook Message Handler ──────────────────────────────────────────────────

whatsappRouter.post("/webhook/whatsapp", async (req, res) => {
  // Always respond 200 immediately to WhatsApp
  res.status(200).json({ status: "ok" });

  try {
    const body = req.body;
    if (body.object !== "whatsapp_business_account") return;

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.length) return;

    const message = value.messages[0];
    const phoneNumber = message.from;
    const messageText = message.text?.body ?? message.button?.text ?? "";
    const messageId = message.id;

    if (!messageText || !phoneNumber) return;

    const db = await getDb();
    if (!db) return;

    const storeName = await getSetting("store_name") ?? "Pago Contra Entrega";
    const waToken = await getSetting("whatsapp_access_token") ?? "";

    // Get or create conversation
    let conversation = await db
      .select()
      .from(whatsappConversations)
      .where(eq(whatsappConversations.phoneNumber, phoneNumber))
      .limit(1)
      .then((r) => r[0]);

    if (!conversation) {
      const [result] = await db.insert(whatsappConversations).values({
        phoneNumber,
        state: "greeting",
        context: {},
        lastMessageAt: new Date(),
      });
      conversation = await db
        .select()
        .from(whatsappConversations)
        .where(eq(whatsappConversations.id, (result as any).insertId))
        .limit(1)
        .then((r) => r[0]!);
    }

    // Save incoming message
    await db.insert(whatsappMessages).values({
      conversationId: conversation.id,
      role: "user",
      content: messageText,
      messageId,
    });

    // Process with AI
    const context: ConversationContext = (conversation.context as ConversationContext) ?? {};
    const { response, newState, updatedContext } = await processWithAI(
      phoneNumber,
      messageText,
      conversation.id,
      context,
      conversation.state,
      storeName
    );

    // If order is being placed, create in Dropi
    let dropiOrderId: string | null = null;
    if (newState === "order_placed" && updatedContext.productId && updatedContext.customerName && updatedContext.address && updatedContext.city) {
      dropiOrderId = await createDropiOrder({
        productId: updatedContext.productId,
        customerName: updatedContext.customerName,
        customerPhone: updatedContext.customerPhone ?? phoneNumber,
        address: updatedContext.address,
        city: updatedContext.city,
        department: updatedContext.department ?? "",
        quantity: updatedContext.quantity ?? 1,
      });

      if (dropiOrderId) {
        // Create order in local DB
        const orderNumber = `PCE-${nanoid(8).toUpperCase()}`;
        await db.insert(orders).values({
          orderNumber,
          dropiOrderId,
          productName: updatedContext.productName ?? "Producto",
          productPrice: updatedContext.productPrice ?? "0",
          quantity: updatedContext.quantity ?? 1,
          customerName: updatedContext.customerName,
          customerPhone: updatedContext.customerPhone ?? phoneNumber,
          shippingAddress: updatedContext.address,
          shippingCity: updatedContext.city,
          shippingDepartment: updatedContext.department,
          status: "confirmed",
          source: "whatsapp",
          whatsappConversationId: conversation.id,
          confirmedAt: new Date(),
        });

        updatedContext.orderId = dropiOrderId;
      }
    }

    // Update conversation
    await db.update(whatsappConversations)
      .set({
        state: newState as any,
        context: updatedContext as any,
        lastMessageAt: new Date(),
      })
      .where(eq(whatsappConversations.id, conversation.id));

    // Save AI response
    await db.insert(whatsappMessages).values({
      conversationId: conversation.id,
      role: "assistant",
      content: response,
    });

    // Send response to WhatsApp
    if (waToken) {
      await sendWhatsAppMessage(phoneNumber, response, waToken);
    }

  } catch (error) {
    console.error("[WhatsApp] Webhook processing error:", error);
  }
});

// ─── Tracking Endpoint (for manual check) ────────────────────────────────────

whatsappRouter.get("/api/tracking/:orderNumber", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });

    const { orderNumber } = req.params;
    const orderRows = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);

    if (!orderRows.length) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const order = orderRows[0];

    // Try to get live tracking from Dropi
    let dropiTracking = null;
    if (order.dropiOrderId) {
      dropiTracking = await getDropiTracking(order.dropiOrderId);

      // Update local order if status changed
      if (dropiTracking && dropiTracking.status !== order.status) {
        await db.update(orders).set({
          status: dropiTracking.status as any,
          trackingNumber: dropiTracking.trackingNumber ?? order.trackingNumber,
          carrier: dropiTracking.carrier ?? order.carrier,
          trackingUrl: dropiTracking.trackingUrl ?? order.trackingUrl,
        }).where(eq(orders.id, order.id));
      }
    }

    return res.json({
      orderNumber: order.orderNumber,
      status: dropiTracking?.status ?? order.status,
      trackingNumber: dropiTracking?.trackingNumber ?? order.trackingNumber,
      carrier: dropiTracking?.carrier ?? order.carrier,
      trackingUrl: dropiTracking?.trackingUrl ?? order.trackingUrl,
      productName: order.productName,
      customerName: order.customerName,
      shippingCity: order.shippingCity,
      createdAt: order.createdAt,
    });
  } catch (error) {
    console.error("[Tracking] Error:", error);
    return res.status(500).json({ error: "Error al consultar el pedido" });
  }
});

export default whatsappRouter;
