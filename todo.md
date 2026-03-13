# Pago Contra Entrega - TODO

## Fase 1: Base de datos y estructura
- [x] Schema: tabla products (sincronización Dropi)
- [x] Schema: tabla orders (pedidos WhatsApp/Dropi)
- [x] Schema: tabla sync_logs (historial de sincronizaciones)
- [x] Schema: tabla whatsapp_conversations (conversaciones bot)
- [x] Schema: tabla settings (configuración de integraciones)
- [x] Migración de base de datos (script create-tables.mjs)
- [x] Settings iniciales insertados (seed-settings.mjs)

## Fase 2: Frontend - Tienda pública
- [x] Diseño elegante: paleta Navy/Gold, tipografía Playfair Display + Inter
- [x] Homepage con hero, categorías destacadas y productos populares
- [x] Catálogo de productos con filtros, búsqueda, paginación y ordenamiento
- [x] Página individual de producto con SEO optimizado (JSON-LD, meta tags, OG)
- [x] Botón "Comprar por WhatsApp" con mensaje predefinido y variables
- [x] Breadcrumbs y navegación SEO-friendly
- [x] Página de seguimiento de pedido con progreso visual
- [x] robots.txt y sitemap.xml dinámico
- [x] Core Web Vitals: lazy loading, shimmer skeletons, fonts en index.html
- [x] Componentes Navbar y Footer reutilizables
- [x] ProductCard con skeleton loader

## Fase 3: Backend - Integraciones
- [x] Servicio de sincronización automática con Dropi API (runDropiSync)
- [x] Endpoint de sincronización manual (admin)
- [x] Feed XML dinámico para Google Merchant Center (/api/feed/google-merchant.xml)
- [x] Feed JSON dinámico para Google Merchant Center (/api/feed/google-merchant.json)
- [x] Tracking Google Ads: conversiones y eventos (clic WhatsApp)
- [x] Endpoint de seguimiento de envíos (/api/tracking/:orderNumber)
- [x] API pública de productos (tRPC publicProcedure)
- [x] Sitemap XML dinámico (/sitemap.xml)
- [x] Robots.txt (/robots.txt)

## Fase 4: Panel de administración
- [x] Dashboard con tabs: Productos, Pedidos, Sincronización, Configuración
- [x] Gestión de productos: activar/desactivar, destacar, editar precio
- [x] Lista de pedidos con cambio de estado
- [x] Historial de sincronizaciones con Dropi
- [x] Configuración de integraciones (Dropi token, WhatsApp, Google Ads/Merchant)
- [x] Configuración de número de WhatsApp y mensaje predefinido
- [x] Protección por rol admin

## Fase 5: Bot de WhatsApp con IA
- [x] Integración con Abacus.ai (invokeLLM) para procesamiento de lenguaje natural
- [x] Flujo de conversación: saludo → producto → datos envío → confirmación
- [x] Extracción estructurada de datos del cliente con JSON Schema
- [x] Creación automática de órdenes en Dropi desde el bot
- [x] Webhook de WhatsApp Business API (GET verificación + POST mensajes)
- [x] Manejo de estados de conversación en base de datos
- [x] Guardado de historial de mensajes

## Fase 6: Optimización y despliegue
- [x] TypeScript sin errores (0 errores)
- [x] Tests unitarios pasando (3/3 - auth.logout + abacus.ai)
- [x] CSS corregido (Google Fonts en index.html, no en CSS)
- [x] Checkpoint final

## Pendiente (configuración post-deploy)
- [ ] Configurar token de Dropi en panel admin (/admin → Configuración)
- [ ] Configurar número de WhatsApp Business en panel admin
- [ ] Configurar WhatsApp Business API (token + phone_number_id)
- [ ] Agregar ID de Google Ads en panel admin
- [ ] Agregar ID de Google Merchant Center en panel admin
- [ ] Conectar dominio pagocontraentrega.net
- [ ] Configurar Google Search Console
- [ ] Subir feed a Google Merchant Center (/api/feed/google-merchant.xml)
- [ ] Implementar Redis caché (requiere upgrade a plan con Redis)
