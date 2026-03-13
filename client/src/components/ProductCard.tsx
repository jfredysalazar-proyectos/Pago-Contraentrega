import { Link } from "wouter";
import { MessageCircle, Star, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ProductCardData {
  id: number;
  slug: string;
  name: string;
  price: string | number;
  comparePrice?: string | number | null;
  mainImage?: string | null;
  images?: string[] | null;
  brand?: string | null;
  category?: string | null;
  stock?: number | null;
  isFeatured?: boolean;
  condition?: string | null;
}

interface ProductCardProps {
  product: ProductCardData;
  whatsappNumber?: string;
  messageTemplate?: string;
}

function formatPrice(price: string | number): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function getDiscount(price: string | number, comparePrice: string | number): number {
  const p = typeof price === "string" ? parseFloat(price) : price;
  const cp = typeof comparePrice === "string" ? parseFloat(comparePrice) : comparePrice;
  if (cp <= p) return 0;
  return Math.round(((cp - p) / cp) * 100);
}

export default function ProductCard({ product, whatsappNumber = "", messageTemplate = "" }: ProductCardProps) {
  const image = product.mainImage || (product.images && product.images[0]) || null;
  const discount = product.comparePrice ? getDiscount(product.price, product.comparePrice) : 0;
  const inStock = product.stock === null || product.stock === undefined || product.stock > 0;

  const waMessage = messageTemplate
    ? messageTemplate
        .replace("{product_name}", product.name)
        .replace("{price}", formatPrice(product.price))
        .replace("{url}", `${window.location.origin}/producto/${product.slug}`)
    : `Hola! Me interesa el producto: ${product.name} - Precio: ${formatPrice(product.price)}. ¿Está disponible?`;

  const waLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waMessage)}`;

  return (
    <article className="product-card bg-card rounded-xl overflow-hidden border border-border group">
      {/* Image */}
      <Link href={`/producto/${product.slug}`} className="block relative overflow-hidden aspect-square bg-muted">
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--brand-cream)" }}>
            <Tag className="w-12 h-12" style={{ color: "var(--brand-gold)" }} />
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {discount > 0 && (
            <Badge className="text-xs font-bold px-2 py-0.5 text-white" style={{ background: "oklch(0.55 0.22 25)" }}>
              -{discount}%
            </Badge>
          )}
          {product.isFeatured && (
            <Badge className="text-xs font-bold px-2 py-0.5 text-white" style={{ background: "var(--brand-gold)" }}>
              Destacado
            </Badge>
          )}
          {!inStock && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              Agotado
            </Badge>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        {product.brand && (
          <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--brand-gold)" }}>
            {product.brand}
          </p>
        )}
        <Link href={`/producto/${product.slug}`}>
          <h3 className="font-medium text-sm leading-snug line-clamp-2 mb-3 hover:text-primary transition-colors" style={{ color: "var(--brand-navy)", fontFamily: "Inter, sans-serif" }}>
            {product.name}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-lg font-bold" style={{ color: "var(--brand-navy)" }}>
            {formatPrice(product.price)}
          </span>
          {product.comparePrice && parseFloat(String(product.comparePrice)) > parseFloat(String(product.price)) && (
            <span className="text-sm line-through" style={{ color: "var(--muted-foreground)" }}>
              {formatPrice(product.comparePrice)}
            </span>
          )}
        </div>

        {/* WhatsApp CTA */}
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            // Google Ads conversion tracking
            if (typeof window !== "undefined" && (window as any).gtag) {
              (window as any).gtag("event", "whatsapp_click", {
                event_category: "engagement",
                event_label: product.name,
                value: parseFloat(String(product.price)),
              });
            }
          }}
          className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            !inStock ? "opacity-50 pointer-events-none" : ""
          }`}
          style={{
            background: "var(--brand-whatsapp)",
            color: "white",
          }}
          aria-label={`Comprar ${product.name} por WhatsApp`}
        >
          <MessageCircle className="w-4 h-4" />
          {inStock ? "Comprar por WhatsApp" : "Sin Stock"}
        </a>
      </div>
    </article>
  );
}

// Skeleton loader
export function ProductCardSkeleton() {
  return (
    <div className="bg-card rounded-xl overflow-hidden border border-border">
      <div className="aspect-square shimmer" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-16 rounded shimmer" />
        <div className="h-4 w-full rounded shimmer" />
        <div className="h-4 w-3/4 rounded shimmer" />
        <div className="h-6 w-24 rounded shimmer" />
        <div className="h-10 w-full rounded-lg shimmer" />
      </div>
    </div>
  );
}
