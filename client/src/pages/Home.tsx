import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { MessageCircle, ShieldCheck, Truck, CreditCard, Star, ArrowRight, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProductCard, { ProductCardSkeleton } from "@/components/ProductCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Home() {
  const [, navigate] = useLocation();
  const { data: productsData, isLoading } = trpc.products.list.useQuery({ limit: 8, featured: true });
  const { data: settingsData } = trpc.settings.getPublic.useQuery();

  const products = productsData?.products ?? [];
  const whatsappNumber = settingsData?.whatsapp_number ?? "";
  const messageTemplate = settingsData?.whatsapp_message_template ?? "";

  const categories = [
    { name: "Electrónica", slug: "electronica", icon: "⚡", color: "oklch(0.55 0.18 250)" },
    { name: "Hogar", slug: "hogar", icon: "🏠", color: "oklch(0.55 0.15 145)" },
    { name: "Moda", slug: "moda", icon: "👗", color: "oklch(0.55 0.18 340)" },
    { name: "Deportes", slug: "deportes", icon: "🏃", color: "oklch(0.55 0.18 25)" },
    { name: "Belleza", slug: "belleza", icon: "✨", color: "oklch(0.55 0.15 300)" },
    { name: "Mascotas", slug: "mascotas", icon: "🐾", color: "oklch(0.55 0.15 60)" },
  ];

  const features = [
    {
      icon: <Truck className="w-6 h-6" />,
      title: "Envío a Todo Colombia",
      desc: "Entrega rápida y segura a cualquier ciudad del país.",
    },
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: "Pago Contra Entrega",
      desc: "Paga solo cuando recibas tu producto. Sin riesgos.",
    },
    {
      icon: <ShieldCheck className="w-6 h-6" />,
      title: "Compra 100% Segura",
      desc: "Garantía de devolución si el producto no es como se describe.",
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "Atención por WhatsApp",
      desc: "Nuestro equipo responde en minutos por WhatsApp.",
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, var(--brand-navy) 0%, oklch(0.22 0.05 240) 60%, oklch(0.28 0.06 220) 100%)`,
          minHeight: "85vh",
        }}
      >
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        {/* Gold accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: "linear-gradient(90deg, transparent, var(--brand-gold), transparent)" }}
        />

        <div className="container relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12 py-20 lg:py-28">
          {/* Text */}
          <div className="flex-1 text-center lg:text-left max-w-xl">
            <Badge
              className="mb-6 text-xs font-semibold px-3 py-1.5 rounded-full border"
              style={{ background: "oklch(0.62 0.13 75 / 0.15)", borderColor: "var(--brand-gold)", color: "var(--brand-gold)" }}
            >
              <Zap className="w-3 h-3 mr-1.5 inline" />
              Pago Contra Entrega en Colombia
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight text-white mb-6">
              Compra Seguro,{" "}
              <span style={{ color: "var(--brand-gold)" }}>Paga al</span>{" "}
              Recibir
            </h1>
            <p className="text-lg leading-relaxed mb-8" style={{ color: "oklch(0.80 0.01 240)" }}>
              Miles de productos con envío a todo Colombia. Sin tarjeta de crédito, sin adelantos. Solo pagas cuando tienes tu producto en manos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                size="lg"
                className="text-base font-semibold px-8 py-6 rounded-xl shadow-lg"
                style={{ background: "var(--brand-gold)", color: "var(--brand-navy)" }}
                onClick={() => navigate("/productos")}
              >
                Ver Productos
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber}?text=Hola! Quiero conocer más sobre sus productos`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-base font-semibold border-2 text-white transition-all hover:bg-white/10"
                  style={{ borderColor: "oklch(0.80 0.01 240 / 0.4)" }}
                >
                  <MessageCircle className="w-5 h-5" style={{ color: "var(--brand-whatsapp)" }} />
                  Escríbenos
                </a>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 mt-10 justify-center lg:justify-start">
              {[
                { value: "10K+", label: "Clientes" },
                { value: "500+", label: "Productos" },
                { value: "4.9★", label: "Calificación" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl font-bold font-display" style={{ color: "var(--brand-gold)" }}>{stat.value}</p>
                  <p className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Visual */}
          <div className="flex-1 flex justify-center lg:justify-end">
            <div className="relative">
              <div
                className="w-72 h-72 md:w-96 md:h-96 rounded-2xl flex items-center justify-center"
                style={{ background: "oklch(0.25 0.04 240)" }}
              >
                <div className="text-center">
                  <div className="text-8xl mb-4">🛍️</div>
                  <p className="text-white font-display font-semibold text-xl">Tu Tienda</p>
                  <p style={{ color: "var(--brand-gold)" }} className="text-sm font-medium">Pago Contra Entrega</p>
                </div>
              </div>
              {/* Floating cards */}
              <div
                className="absolute -top-4 -right-4 bg-white rounded-xl p-3 shadow-xl flex items-center gap-2"
                style={{ minWidth: "160px" }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "oklch(0.90 0.10 145)" }}>
                  <ShieldCheck className="w-4 h-4" style={{ color: "var(--brand-whatsapp)" }} />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: "var(--brand-navy)" }}>Pago Seguro</p>
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Al recibir</p>
                </div>
              </div>
              <div
                className="absolute -bottom-4 -left-4 bg-white rounded-xl p-3 shadow-xl flex items-center gap-2"
                style={{ minWidth: "160px" }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "oklch(0.90 0.10 75)" }}>
                  <Truck className="w-4 h-4" style={{ color: "var(--brand-gold)" }} />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: "var(--brand-navy)" }}>Envío Gratis</p>
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Todo Colombia</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="py-14 border-b border-border" style={{ background: "var(--brand-cream)" }}>
        <div className="container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "oklch(0.62 0.13 75 / 0.12)", color: "var(--brand-gold)" }}
                >
                  {f.icon}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--brand-navy)" }}>{f.title}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="container">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--brand-gold)" }}>Explorar</p>
              <h2 className="text-3xl font-display font-bold" style={{ color: "var(--brand-navy)" }}>Categorías</h2>
            </div>
            <Link href="/productos" className="flex items-center gap-1 text-sm font-medium hover:underline" style={{ color: "var(--brand-gold)" }}>
              Ver todo <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/productos?categoria=${cat.slug}`}
                className="group flex flex-col items-center gap-3 p-5 rounded-2xl border border-border bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `${cat.color}18` }}
                >
                  {cat.icon}
                </div>
                <span className="text-sm font-medium text-center" style={{ color: "var(--brand-navy)" }}>{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Products ─────────────────────────────────────────────── */}
      <section className="py-16" style={{ background: "var(--brand-cream)" }}>
        <div className="container">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--brand-gold)" }}>Lo Mejor</p>
              <h2 className="text-3xl font-display font-bold" style={{ color: "var(--brand-navy)" }}>Productos Destacados</h2>
            </div>
            <Link href="/productos" className="flex items-center gap-1 text-sm font-medium hover:underline" style={{ color: "var(--brand-gold)" }}>
              Ver todos <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-display font-semibold mb-2" style={{ color: "var(--brand-navy)" }}>
                Cargando productos...
              </h3>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                Estamos sincronizando el catálogo desde Dropi. Vuelve pronto.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  whatsappNumber={whatsappNumber}
                  messageTemplate={messageTemplate}
                />
              ))}
            </div>
          )}

          {products.length > 0 && (
            <div className="text-center mt-10">
              <Button
                size="lg"
                variant="outline"
                className="px-10 border-2 font-semibold"
                style={{ borderColor: "var(--brand-gold)", color: "var(--brand-gold)" }}
                onClick={() => navigate("/productos")}
              >
                Ver Todos los Productos
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--brand-gold)" }}>Simple y Rápido</p>
            <h2 className="text-3xl font-display font-bold" style={{ color: "var(--brand-navy)" }}>¿Cómo Comprar?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { step: "01", icon: "🔍", title: "Elige tu Producto", desc: "Navega nuestro catálogo y selecciona el producto que deseas." },
              { step: "02", icon: "💬", title: "Escríbenos por WhatsApp", desc: "Haz clic en el botón de WhatsApp y nuestro bot te atenderá al instante." },
              { step: "03", icon: "📦", title: "Recibe y Paga", desc: "Recibe tu pedido en casa y paga contra entrega al mensajero." },
            ].map((item) => (
              <div key={item.step} className="text-center relative">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5 shadow-sm"
                  style={{ background: "oklch(0.62 0.13 75 / 0.10)", border: "1px solid oklch(0.62 0.13 75 / 0.20)" }}
                >
                  {item.icon}
                </div>
                <span className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-2 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "var(--brand-gold)" }}>
                  {item.step}
                </span>
                <h3 className="font-display font-semibold text-lg mb-2" style={{ color: "var(--brand-navy)" }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────── */}
      <section
        className="py-16"
        style={{ background: `linear-gradient(135deg, var(--brand-navy), oklch(0.25 0.05 240))` }}
      >
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            ¿Listo para Comprar?
          </h2>
          <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: "oklch(0.80 0.01 240)" }}>
            Más de 500 productos disponibles con envío a todo Colombia. Paga solo al recibir.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="px-10 py-6 text-base font-semibold rounded-xl"
              style={{ background: "var(--brand-gold)", color: "var(--brand-navy)" }}
              onClick={() => navigate("/productos")}
            >
              Explorar Catálogo
            </Button>
            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber}?text=Hola! Quiero hacer un pedido`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-10 py-3 rounded-xl text-base font-semibold text-white transition-all"
                style={{ background: "var(--brand-whatsapp)" }}
              >
                <MessageCircle className="w-5 h-5" />
                Comprar por WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
