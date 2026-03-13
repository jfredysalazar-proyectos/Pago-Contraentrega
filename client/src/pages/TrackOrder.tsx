import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Search, Package, Truck, CheckCircle, Clock, XCircle, AlertCircle, MessageCircle, MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; step: number }> = {
  pending:    { label: "Pendiente",    icon: Clock,         color: "oklch(0.55 0.15 75)",  bg: "oklch(0.95 0.05 75)",  step: 1 },
  confirmed:  { label: "Confirmado",   icon: CheckCircle,   color: "oklch(0.55 0.18 250)", bg: "oklch(0.95 0.05 250)", step: 2 },
  processing: { label: "En Proceso",   icon: Package,       color: "oklch(0.55 0.18 250)", bg: "oklch(0.95 0.05 250)", step: 2 },
  shipped:    { label: "Enviado",      icon: Truck,         color: "oklch(0.55 0.18 145)", bg: "oklch(0.92 0.08 145)", step: 3 },
  delivered:  { label: "Entregado",    icon: CheckCircle,   color: "oklch(0.40 0.18 145)", bg: "oklch(0.90 0.10 145)", step: 4 },
  cancelled:  { label: "Cancelado",    icon: XCircle,       color: "oklch(0.55 0.22 25)",  bg: "oklch(0.95 0.08 25)",  step: 0 },
  returned:   { label: "Devuelto",     icon: AlertCircle,   color: "oklch(0.55 0.15 300)", bg: "oklch(0.95 0.05 300)", step: 0 },
};

const STEPS = [
  { label: "Recibido",   icon: Package,     step: 1 },
  { label: "Confirmado", icon: CheckCircle, step: 2 },
  { label: "En Camino",  icon: Truck,       step: 3 },
  { label: "Entregado",  icon: CheckCircle, step: 4 },
];

interface TrackingResult {
  orderNumber: string;
  status: string;
  trackingNumber?: string;
  carrier?: string;
  trackingUrl?: string;
  productName: string;
  customerName?: string;
  shippingCity?: string;
  createdAt: string;
}

export default function TrackOrder() {
  const [inputValue, setInputValue] = useState("");
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const { data: settingsData } = trpc.settings.getPublic.useQuery();
  const whatsappNumber = settingsData?.whatsapp_number ?? "";

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSearched(true);

    try {
      const res = await fetch(`/api/tracking/${encodeURIComponent(inputValue.trim())}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Pedido no encontrado");
        return;
      }
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Error al consultar el pedido. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = result ? (STATUS_CONFIG[result.status] ?? STATUS_CONFIG.pending) : null;
  const currentStep = statusConfig?.step ?? 0;
  const StatusIcon = statusConfig?.icon ?? Clock;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Navbar />

      {/* Header */}
      <section className="py-14 border-b border-border" style={{ background: "var(--brand-cream)" }}>
        <div className="container text-center">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--brand-gold)" }}>
            Seguimiento
          </p>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-3" style={{ color: "var(--brand-navy)" }}>
            Rastrear mi Pedido
          </h1>
          <p className="text-sm max-w-md mx-auto" style={{ color: "var(--muted-foreground)" }}>
            Ingresa tu número de pedido para ver el estado de tu envío en tiempo real.
          </p>
        </div>
      </section>

      <div className="container py-12 max-w-xl mx-auto">
        {/* Search form */}
        <div className="bg-card rounded-2xl border border-border p-6 md:p-8 mb-8 shadow-sm">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block" style={{ color: "var(--brand-navy)" }}>
                Número de Pedido
              </label>
              <Input
                placeholder="Ej: PCE-ABC12345"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                className="font-mono text-base"
                required
              />
              <p className="text-xs mt-1.5" style={{ color: "var(--muted-foreground)" }}>
                El número de pedido lo recibiste por WhatsApp al confirmar tu compra.
              </p>
            </div>
            <Button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="w-full py-5 font-semibold text-base"
              style={{ background: "var(--brand-gold)", color: "var(--brand-navy)" }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Buscando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Rastrear Pedido
                </span>
              )}
            </Button>
          </form>
        </div>

        {/* Error */}
        {searched && error && (
          <div className="bg-card rounded-2xl border border-border p-8 text-center shadow-sm">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-display font-semibold mb-2" style={{ color: "var(--brand-navy)" }}>
              Pedido no encontrado
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
              {error}. Verifica el número o contáctanos por WhatsApp.
            </p>
            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber}?text=Hola! Quiero rastrear mi pedido número: ${inputValue}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white"
                style={{ background: "var(--brand-whatsapp)" }}
              >
                <MessageCircle className="w-4 h-4" />
                Consultar por WhatsApp
              </a>
            )}
          </div>
        )}

        {/* Result */}
        {result && statusConfig && (
          <div className="space-y-4">
            {/* Status card */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
              <div className="p-5" style={{ background: statusConfig.bg }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-sm">
                    <StatusIcon className="w-6 h-6" style={{ color: statusConfig.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: statusConfig.color }}>
                      Estado del Pedido
                    </p>
                    <p className="text-xl font-display font-bold" style={{ color: "var(--brand-navy)" }}>
                      {statusConfig.label}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: "var(--muted-foreground)" }}>Número de Pedido</p>
                    <p className="font-semibold font-mono" style={{ color: "var(--brand-navy)" }}>{result.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: "var(--muted-foreground)" }}>Fecha</p>
                    <p className="font-medium" style={{ color: "var(--brand-navy)" }}>
                      {new Date(result.createdAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs mb-0.5" style={{ color: "var(--muted-foreground)" }}>Producto</p>
                    <p className="font-medium line-clamp-2" style={{ color: "var(--brand-navy)" }}>{result.productName}</p>
                  </div>
                  {result.shippingCity && (
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: "var(--muted-foreground)" }}>Ciudad</p>
                      <p className="font-medium flex items-center gap-1" style={{ color: "var(--brand-navy)" }}>
                        <MapPin className="w-3 h-3" style={{ color: "var(--brand-gold)" }} />
                        {result.shippingCity}
                      </p>
                    </div>
                  )}
                  {result.trackingNumber && (
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: "var(--muted-foreground)" }}>Guía</p>
                      <p className="font-medium font-mono" style={{ color: "var(--brand-navy)" }}>{result.trackingNumber}</p>
                    </div>
                  )}
                  {result.carrier && (
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: "var(--muted-foreground)" }}>Transportadora</p>
                      <p className="font-medium" style={{ color: "var(--brand-navy)" }}>{result.carrier}</p>
                    </div>
                  )}
                </div>

                {result.trackingUrl && (
                  <a
                    href={result.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors hover:bg-muted"
                    style={{ borderColor: "var(--brand-gold)", color: "var(--brand-gold)" }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver en transportadora
                  </a>
                )}

                {whatsappNumber && (
                  <a
                    href={`https://wa.me/${whatsappNumber}?text=Hola! Quiero consultar sobre mi pedido: ${result.orderNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: "var(--brand-whatsapp)" }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Consultar por WhatsApp
                  </a>
                )}
              </div>
            </div>

            {/* Progress steps */}
            {currentStep > 0 && (
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                <h3 className="font-display font-semibold mb-6 text-sm" style={{ color: "var(--brand-navy)" }}>
                  Progreso del Envío
                </h3>
                <div className="relative flex justify-between">
                  {/* Connector line */}
                  <div className="absolute top-5 left-5 right-5 h-0.5" style={{ background: "var(--border)" }}>
                    <div
                      className="h-full transition-all duration-700"
                      style={{
                        background: "var(--brand-gold)",
                        width: `${Math.max(0, ((currentStep - 1) / (STEPS.length - 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  {STEPS.map((step) => {
                    const Icon = step.icon;
                    const done = currentStep >= step.step;
                    const current = currentStep === step.step;
                    return (
                      <div key={step.step} className="flex flex-col items-center gap-2 z-10 w-16">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${current ? "ring-4 ring-offset-2 ring-amber-300" : ""}`}
                          style={{
                            background: done ? "var(--brand-gold)" : "var(--muted)",
                            color: done ? "white" : "var(--muted-foreground)",
                          }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <p className="text-xs text-center leading-tight font-medium" style={{ color: done ? "var(--brand-navy)" : "var(--muted-foreground)" }}>
                          {step.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Help text when empty */}
        {!searched && (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              Ingresa el número de pedido que recibiste por WhatsApp para ver el estado de tu envío.
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
