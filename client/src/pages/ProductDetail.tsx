import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  MessageCircle, ChevronRight, Star, Truck, ShieldCheck,
  CreditCard, Package, Share2, ChevronLeft, ChevronRight as ChevronRightIcon,
  Tag, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProductCardSkeleton } from "@/components/ProductCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

function formatPrice(price: string | number): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const [activeImage, setActiveImage] = useState(0);

  const { data: product, isLoading } = trpc.products.bySlug.useQuery({ slug: slug ?? "" }, { enabled: !!slug });
  const { data: settingsData } = trpc.settings.getPublic.useQuery();
  const { data: relatedData } = trpc.products.list.useQuery(
    { limit: 4, category: product?.category ?? undefined },
    { enabled: !!product?.category }
  );

  const whatsappNumber = settingsData?.whatsapp_number ?? "";
  const messageTemplate = settingsData?.whatsapp_message_template ?? "";

  const images = product?.images as string[] | null ?? [];
  const allImages = product?.mainImage
    ? [product.mainImage, ...images.filter((i) => i !== product.mainImage)]
    : images;

  const price = product ? parseFloat(String(product.price)) : 0;
  const comparePrice = product?.comparePrice ? parseFloat(String(product.comparePrice)) : null;
  const discount = comparePrice && comparePrice > price ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;
  const inStock = !product || product.stock === null || product.stock === undefined || product.stock > 0;

  const waMessage = product
    ? (messageTemplate || `Hola! Me interesa el producto: ${product.name} - Precio: ${formatPrice(price)}. ¿Está disponible?`)
        .replace("{product_name}", product.name)
        .replace("{price}", formatPrice(price))
        .replace("{url}", `${window.location.origin}/producto/${product.slug}`)
    : "";

  const waLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waMessage)}`;

  // SEO & JSON-LD
  useEffect(() => {
    if (!product) return;

    document.title = `${product.metaTitle ?? product.name} | Pago Contra Entrega`;

    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", product.metaDescription ?? product.shortDescription ?? product.description?.substring(0, 160) ?? "");

    // Open Graph
    const ogTags: Record<string, string> = {
      "og:title": product.name,
      "og:description": product.shortDescription ?? product.description?.substring(0, 160) ?? "",
      "og:image": product.mainImage ?? "",
      "og:url": window.location.href,
      "og:type": "product",
    };
    Object.entries(ogTags).forEach(([property, content]) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    });

    // JSON-LD structured data
    const jsonLd = {
      "@context": "https://schema.org/",
      "@type": "Product",
      name: product.name,
      description: product.description ?? product.shortDescription ?? "",
      image: allImages,
      sku: product.sku ?? product.dropiId,
      brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
      offers: {
        "@type": "Offer",
        url: window.location.href,
        priceCurrency: "COP",
        price: String(price),
        priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        seller: { "@type": "Organization", name: "Pago Contra Entrega" },
      },
    };

    let script = document.querySelector("#product-jsonld") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "product-jsonld";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);

    return () => {
      document.querySelector("#product-jsonld")?.remove();
    };
  }, [product]);

  const handleWhatsAppClick = () => {
    // Google Ads conversion tracking
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "conversion", {
        send_to: settingsData?.google_ads_id,
        event_category: "ecommerce",
        event_label: "whatsapp_purchase_intent",
        value: price,
        currency: "COP",
      });
      (window as any).gtag("event", "whatsapp_click", {
        event_category: "engagement",
        event_label: product?.name,
        value: price,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: "var(--background)" }}>
        <Navbar />
        <div className="container py-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="aspect-square rounded-2xl shimmer" />
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`h-${i === 0 ? 8 : 4} rounded shimmer`} style={{ width: `${80 - i * 10}%` }} />
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen" style={{ background: "var(--background)" }}>
        <Navbar />
        <div className="container py-20 text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-display font-bold mb-2" style={{ color: "var(--brand-navy)" }}>
            Producto no encontrado
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
            El producto que buscas no existe o fue eliminado.
          </p>
          <Button onClick={() => navigate("/productos")} style={{ background: "var(--brand-gold)", color: "white" }}>
            Ver Catálogo
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Navbar />

      <div className="container py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs mb-6" style={{ color: "var(--muted-foreground)" }}>
          <a href="/" className="hover:underline">Inicio</a>
          <ChevronRight className="w-3 h-3" />
          <a href="/productos" className="hover:underline">Productos</a>
          {product.category && (
            <>
              <ChevronRight className="w-3 h-3" />
              <a href={`/productos?categoria=${product.category}`} className="hover:underline capitalize">
                {product.category}
              </a>
            </>
          )}
          <ChevronRight className="w-3 h-3" />
          <span className="line-clamp-1" style={{ color: "var(--brand-navy)" }}>{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
          {/* Images */}
          <div>
            {/* Main image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted mb-3 border border-border">
              {allImages.length > 0 ? (
                <img
                  src={allImages[activeImage]}
                  alt={`${product.name} - imagen ${activeImage + 1}`}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--brand-cream)" }}>
                  <Tag className="w-20 h-20" style={{ color: "var(--brand-gold)" }} />
                </div>
              )}
              {discount > 0 && (
                <div className="absolute top-4 left-4">
                  <Badge className="text-sm font-bold px-3 py-1 text-white" style={{ background: "oklch(0.55 0.22 25)" }}>
                    -{discount}% OFF
                  </Badge>
                </div>
              )}
              {/* Nav arrows */}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImage((i) => (i - 1 + allImages.length) % allImages.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-md hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActiveImage((i) => (i + 1) % allImages.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-md hover:bg-white transition-colors"
                  >
                    <ChevronRightIcon className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      activeImage === i ? "" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                    style={activeImage === i ? { borderColor: "var(--brand-gold)" } : {}}
                  >
                    <img src={img} alt={`Imagen ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            {product.brand && (
              <p className="text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--brand-gold)" }}>
                {product.brand}
              </p>
            )}

            <h1 className="text-2xl md:text-3xl font-display font-bold leading-tight mb-4" style={{ color: "var(--brand-navy)" }}>
              {product.name}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-bold" style={{ color: "var(--brand-navy)" }}>
                {formatPrice(price)}
              </span>
              {comparePrice && comparePrice > price && (
                <span className="text-lg line-through" style={{ color: "var(--muted-foreground)" }}>
                  {formatPrice(comparePrice)}
                </span>
              )}
              {discount > 0 && (
                <Badge className="text-sm font-bold text-white" style={{ background: "oklch(0.55 0.22 25)" }}>
                  Ahorras {formatPrice(comparePrice! - price)}
                </Badge>
              )}
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2 mb-6">
              <div className={`w-2 h-2 rounded-full ${inStock ? "bg-green-500" : "bg-red-400"}`} />
              <span className="text-sm font-medium" style={{ color: inStock ? "oklch(0.55 0.18 145)" : "oklch(0.55 0.22 25)" }}>
                {inStock ? "Disponible" : "Sin Stock"}
              </span>
              {product.stock && product.stock < 10 && product.stock > 0 && (
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  (Últimas {product.stock} unidades)
                </span>
              )}
            </div>

            {/* Short description */}
            {product.shortDescription && (
              <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--muted-foreground)" }}>
                {product.shortDescription}
              </p>
            )}

            {/* CTA */}
            <div className="flex flex-col gap-3 mb-8">
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsAppClick}
                className={`flex items-center justify-center gap-3 py-4 rounded-xl text-base font-bold transition-all shadow-lg ${
                  !inStock ? "opacity-50 pointer-events-none" : "hover:-translate-y-0.5 hover:shadow-xl"
                }`}
                style={{ background: "var(--brand-whatsapp)", color: "white" }}
                aria-label={`Comprar ${product.name} por WhatsApp`}
              >
                <MessageCircle className="w-5 h-5" />
                {inStock ? "Comprar por WhatsApp" : "Sin Stock"}
              </a>
              <p className="text-center text-xs" style={{ color: "var(--muted-foreground)" }}>
                Nuestro asistente te atenderá al instante y coordinará tu pedido
              </p>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { icon: <CreditCard className="w-4 h-4" />, text: "Pago al Recibir" },
                { icon: <Truck className="w-4 h-4" />, text: "Envío Colombia" },
                { icon: <ShieldCheck className="w-4 h-4" />, text: "Garantía" },
              ].map((b) => (
                <div
                  key={b.text}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-center border border-border"
                >
                  <div style={{ color: "var(--brand-gold)" }}>{b.icon}</div>
                  <span className="text-xs font-medium" style={{ color: "var(--brand-navy)" }}>{b.text}</span>
                </div>
              ))}
            </div>

            {/* Product meta */}
            {(product.sku || product.brand || product.category) && (
              <div className="space-y-2 text-sm border-t border-border pt-4">
                {product.sku && (
                  <div className="flex gap-2">
                    <span style={{ color: "var(--muted-foreground)" }}>SKU:</span>
                    <span style={{ color: "var(--brand-navy)" }}>{product.sku}</span>
                  </div>
                )}
                {product.brand && (
                  <div className="flex gap-2">
                    <span style={{ color: "var(--muted-foreground)" }}>Marca:</span>
                    <span style={{ color: "var(--brand-navy)" }}>{product.brand}</span>
                  </div>
                )}
                {product.category && (
                  <div className="flex gap-2">
                    <span style={{ color: "var(--muted-foreground)" }}>Categoría:</span>
                    <a
                      href={`/productos?categoria=${product.category}`}
                      className="capitalize hover:underline"
                      style={{ color: "var(--brand-gold)" }}
                    >
                      {product.category}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="mb-16">
            <h2 className="text-2xl font-display font-bold mb-6" style={{ color: "var(--brand-navy)" }}>
              Descripción del Producto
            </h2>
            <div
              className="prose prose-sm max-w-none text-sm leading-relaxed"
              style={{ color: "var(--foreground)" }}
              dangerouslySetInnerHTML={{ __html: product.description.replace(/\n/g, "<br/>") }}
            />
          </div>
        )}

        {/* Related Products */}
        {relatedData && relatedData.products.length > 1 && (
          <div className="mb-16">
            <h2 className="text-2xl font-display font-bold mb-6" style={{ color: "var(--brand-navy)" }}>
              Productos Relacionados
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {(relatedData.products as any[])
                .filter((p) => p.slug !== slug)
                .slice(0, 4)
                .map((p) => (
                  <a key={p.id} href={`/producto/${p.slug}`} className="product-card bg-card rounded-xl overflow-hidden border border-border group block">
                    <div className="aspect-square overflow-hidden bg-muted">
                      {p.mainImage ? (
                        <img src={p.mainImage} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--brand-cream)" }}>
                          <Tag className="w-8 h-8" style={{ color: "var(--brand-gold)" }} />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium line-clamp-2 mb-1" style={{ color: "var(--brand-navy)", fontFamily: "Inter, sans-serif" }}>{p.name}</p>
                      <p className="text-sm font-bold" style={{ color: "var(--brand-navy)" }}>{formatPrice(p.price)}</p>
                    </div>
                  </a>
                ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
