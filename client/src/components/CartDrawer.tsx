import { X, Trash2, Plus, Minus, ShoppingBag, MessageCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQty, totalItems, totalPrice, clearCart } = useCart();
  const { data: settingsData } = trpc.settings.getPublic.useQuery();

  const whatsappNumber = settingsData?.whatsapp_number ?? "";

  function buildWhatsAppMessage(): string {
    if (items.length === 0) return "";
    const lines = [
      "🛒 *Mi Pedido — Pago Contra Entrega*",
      "",
      ...items.map((item, i) =>
        `${i + 1}. *${item.name}*\n   Cantidad: ${item.quantity}\n   Precio: ${formatPrice(item.price * item.quantity)}`
      ),
      "",
      `💰 *Total: ${formatPrice(totalPrice)}*`,
      "",
      "📦 Modalidad: Pago Contra Entrega",
      "Por favor indícame tu nombre completo, dirección de entrega, ciudad y teléfono de contacto.",
    ];
    return lines.join("\n");
  }

  function handleCheckout() {
    if (!whatsappNumber || items.length === 0) return;
    const msg = buildWhatsAppMessage();
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    clearCart();
    closeCart();
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full w-full max-w-sm z-50 flex flex-col shadow-2xl"
        style={{ background: "var(--background)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" style={{ color: "var(--brand-gold)" }} />
            <h2 className="font-display font-semibold text-lg">
              Carrito <span className="text-sm font-normal text-muted-foreground">({totalItems} {totalItems === 1 ? "producto" : "productos"})</span>
            </h2>
          </div>
          <button
            onClick={closeCart}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            aria-label="Cerrar carrito"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center text-muted-foreground py-16">
              <ShoppingBag className="w-16 h-16 opacity-20" />
              <p className="font-medium">Tu carrito está vacío</p>
              <p className="text-sm">Agrega productos para comenzar tu pedido</p>
              <Button variant="outline" onClick={closeCart} className="mt-2">
                Ver Productos
              </Button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-3 p-3 rounded-xl border bg-card">
                {/* Image */}
                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
                  {item.mainImage ? (
                    <img
                      src={item.mainImage}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight line-clamp-2 mb-1">{item.name}</p>
                  {item.brand && (
                    <p className="text-xs text-muted-foreground mb-1">{item.brand}</p>
                  )}
                  <p className="text-sm font-bold" style={{ color: "var(--brand-gold)" }}>
                    {formatPrice(item.price * item.quantity)}
                  </p>
                  {item.quantity > 1 && (
                    <p className="text-xs text-muted-foreground">{formatPrice(item.price)} c/u</p>
                  )}

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQty(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
                      aria-label="Reducir cantidad"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-semibold w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
                      aria-label="Aumentar cantidad"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-auto p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                      aria-label="Eliminar producto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t px-5 py-5 space-y-4">
            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="font-medium text-muted-foreground">Total del pedido</span>
              <span className="text-xl font-bold" style={{ color: "var(--brand-gold)" }}>
                {formatPrice(totalPrice)}
              </span>
            </div>

            {/* WhatsApp CTA */}
            <a
              href={whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(buildWhatsAppMessage())}` : "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { clearCart(); closeCart(); }}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: "var(--brand-whatsapp)" }}
              aria-label="Finalizar pedido por WhatsApp"
            >
              <MessageCircle className="w-5 h-5" />
              Finalizar Pedido por WhatsApp
            </a>

            <p className="text-xs text-center text-muted-foreground">
              Un asesor te atenderá y tomará tus datos de envío. <strong>Pago al recibir.</strong>
            </p>
          </div>
        )}
      </div>
    </>
  );
}
