import { Link } from "wouter";
import { ShoppingBag, MessageCircle, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: "var(--brand-navy)" }} className="text-white">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--brand-gold)" }}>
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-display font-bold text-lg leading-none block text-white">Pago</span>
                <span className="text-xs font-medium tracking-widest uppercase" style={{ color: "var(--brand-gold)" }}>Contra Entrega</span>
              </div>
            </Link>
            <p className="text-sm leading-relaxed" style={{ color: "oklch(0.75 0.01 240)" }}>
              Tu tienda de confianza con pago contra entrega. Compra seguro, recibe en casa y paga al recibir.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a
                href="https://wa.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{ background: "var(--brand-whatsapp)" }}
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-4 h-4 text-white" />
              </a>
            </div>
          </div>

          {/* Categorías */}
          <div>
            <h4 className="font-display font-semibold text-base mb-5" style={{ color: "var(--brand-gold)" }}>Categorías</h4>
            <ul className="space-y-3">
              {[
                { href: "/productos?categoria=electronica", label: "Electrónica" },
                { href: "/productos?categoria=hogar", label: "Hogar y Jardín" },
                { href: "/productos?categoria=moda", label: "Moda y Accesorios" },
                { href: "/productos?categoria=deportes", label: "Deportes" },
                { href: "/productos?categoria=belleza", label: "Belleza y Salud" },
                { href: "/productos", label: "Ver Todo" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm transition-colors hover:text-white"
                    style={{ color: "oklch(0.75 0.01 240)" }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Información */}
          <div>
            <h4 className="font-display font-semibold text-base mb-5" style={{ color: "var(--brand-gold)" }}>Información</h4>
            <ul className="space-y-3">
              {[
                { href: "/rastrear", label: "Rastrear mi Pedido" },
                { href: "/como-comprar", label: "¿Cómo Comprar?" },
                { href: "/politica-envios", label: "Política de Envíos" },
                { href: "/politica-devoluciones", label: "Devoluciones" },
                { href: "/terminos", label: "Términos y Condiciones" },
                { href: "/privacidad", label: "Política de Privacidad" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm transition-colors hover:text-white"
                    style={{ color: "oklch(0.75 0.01 240)" }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="font-display font-semibold text-base mb-5" style={{ color: "var(--brand-gold)" }}>Contacto</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MessageCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--brand-gold)" }} />
                <div>
                  <p className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>WhatsApp</p>
                  <a href="https://wa.me/" className="text-sm text-white hover:underline">Escríbenos</a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--brand-gold)" }} />
                <div>
                  <p className="text-xs" style={{ color: "oklch(0.65 0.01 240)" }}>Cobertura</p>
                  <p className="text-sm text-white">Colombia</p>
                </div>
              </li>
            </ul>
            <div className="mt-6 p-4 rounded-lg" style={{ background: "oklch(0.25 0.04 240)" }}>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--brand-gold)" }}>Pago Seguro</p>
              <p className="text-xs" style={{ color: "oklch(0.75 0.01 240)" }}>
                Paga al recibir tu pedido. Sin riesgos, sin adelantos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: "1px solid oklch(0.30 0.04 240)" }}>
        <div className="container py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs" style={{ color: "oklch(0.60 0.01 240)" }}>
            © {year} Pago Contra Entrega. Todos los derechos reservados.
          </p>
          <p className="text-xs" style={{ color: "oklch(0.60 0.01 240)" }}>
            Powered by <span style={{ color: "var(--brand-gold)" }}>Dropi Colombia</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
