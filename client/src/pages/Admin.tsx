import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  Package, ShoppingCart, Settings, RefreshCw, Eye, EyeOff,
  Star, StarOff, TrendingUp, Users, Truck, CheckCircle,
  AlertCircle, Clock, BarChart3, Zap, Save, ExternalLink,
  MessageCircle, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

function StatCard({ icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  const Icon = icon;
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>{label}</p>
        <p className="text-2xl font-bold font-display" style={{ color: "var(--brand-navy)" }}>{value}</p>
      </div>
    </div>
  );
}

export default function Admin() {
  const { user, isAuthenticated, loading } = useAuth();
  const [syncLoading, setSyncLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsValues, setSettingsValues] = useState<Record<string, string>>({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const utils = trpc.useUtils();

  const { data: orderStats } = trpc.orders.stats.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: productsData, isLoading: productsLoading } = trpc.products.adminList.useQuery(
    { limit: 50, search: productSearch || undefined },
    { enabled: isAuthenticated && user?.role === "admin" }
  );
  const { data: ordersData } = trpc.orders.list.useQuery(
    { limit: 20 },
    { enabled: isAuthenticated && user?.role === "admin" }
  );
  const { data: syncLogs } = trpc.sync.logs.useQuery(
    { limit: 5 },
    { enabled: isAuthenticated && user?.role === "admin" }
  );
  const { data: allSettings } = trpc.settings.getAll.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  // Load settings into state when first fetched
  if (allSettings && !settingsLoaded) {
    const vals: Record<string, string> = {};
    allSettings.forEach((s: { key: string; value: string | null }) => { vals[s.key] = s.value ?? ""; });
    setSettingsValues(vals);
    setSettingsLoaded(true);
  }

  const syncMutation = trpc.sync.trigger.useMutation({
    onSuccess: () => {
      toast.success("Sincronización iniciada. Puede tomar unos minutos.");
      setSyncLoading(false);
      utils.sync.logs.invalidate();
      utils.sync.status.invalidate();
    },
    onError: (e) => {
      toast.error(e.message);
      setSyncLoading(false);
    },
  });

  const toggleActiveMutation = trpc.products.toggleActive.useMutation({
    onSuccess: () => utils.products.adminList.invalidate(),
  });

  const toggleFeaturedMutation = trpc.products.toggleFeatured.useMutation({
    onSuccess: () => utils.products.adminList.invalidate(),
  });

  const updateStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      utils.orders.list.invalidate();
      utils.orders.stats.invalidate();
      toast.success("Estado actualizado");
    },
  });

  const updateSettingMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.getAll.invalidate();
      utils.settings.getPublic.invalidate();
    },
  });

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="text-center">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-xl font-display font-bold mb-2" style={{ color: "var(--brand-navy)" }}>Acceso Restringido</h2>
          <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>Debes iniciar sesión para acceder al panel.</p>
          <Button onClick={() => window.location.href = getLoginUrl()} style={{ background: "var(--brand-gold)", color: "white" }}>
            Iniciar Sesión
          </Button>
        </div>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="text-center">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-display font-bold mb-2" style={{ color: "var(--brand-navy)" }}>Sin Permisos</h2>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>No tienes permisos de administrador.</p>
        </div>
      </div>
    );
  }

  const handleSync = () => {
    setSyncLoading(true);
    syncMutation.mutate();
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      for (const [key, value] of Object.entries(settingsValues)) {
        await updateSettingMutation.mutateAsync({ key, value });
      }
      toast.success("Configuración guardada correctamente");
    } catch (e) {
      toast.error("Error al guardar configuración");
    } finally {
      setSettingsSaving(false);
    }
  };

  const formatPrice = (price: string | number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(Number(price));

  const STATUS_LABELS: Record<string, string> = {
    pending: "Pendiente", confirmed: "Confirmado", processing: "En Proceso",
    shipped: "Enviado", delivered: "Entregado", cancelled: "Cancelado", returned: "Devuelto",
  };

  const SETTINGS_LABELS: Record<string, { label: string; type: string; desc: string }> = {
    whatsapp_number: { label: "Número WhatsApp", type: "text", desc: "Con código de país, ej: 573001234567" },
    whatsapp_message_template: { label: "Plantilla de Mensaje", type: "text", desc: "Variables: {product_name}, {price}, {url}" },
    dropi_token: { label: "Token de Dropi API", type: "password", desc: "Token de autenticación de Dropi" },
    dropi_store_id: { label: "ID Tienda Dropi", type: "text", desc: "ID de tu tienda en Dropi" },
    google_ads_id: { label: "Google Ads ID", type: "text", desc: "Ej: AW-123456789" },
    google_merchant_id: { label: "Google Merchant Center ID", type: "text", desc: "ID de tu cuenta de Merchant Center" },
    sync_interval_minutes: { label: "Intervalo de Sync (min)", type: "number", desc: "Cada cuántos minutos sincronizar con Dropi" },
    store_name: { label: "Nombre de la Tienda", type: "text", desc: "Nombre visible en la tienda" },
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold" style={{ color: "var(--brand-navy)" }}>Panel de Administración</h1>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Gestiona tu tienda Pago Contra Entrega</p>
          </div>
          <Button
            onClick={handleSync}
            disabled={syncLoading}
            className="gap-2"
            style={{ background: "var(--brand-gold)", color: "white" }}
          >
            <RefreshCw className={`w-4 h-4 ${syncLoading ? "animate-spin" : ""}`} />
            {syncLoading ? "Sincronizando..." : "Sincronizar Dropi"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Package} label="Total Productos" value={productsData?.total ?? 0} color="oklch(0.62 0.13 75)" />
          <StatCard icon={ShoppingCart} label="Total Pedidos" value={orderStats?.total ?? 0} color="oklch(0.55 0.18 250)" />
          <StatCard icon={Truck} label="Enviados" value={orderStats?.shipped ?? 0} color="oklch(0.55 0.18 145)" />
          <StatCard icon={CheckCircle} label="Entregados" value={orderStats?.delivered ?? 0} color="oklch(0.45 0.18 145)" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="products">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="products">Productos</TabsTrigger>
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
            <TabsTrigger value="sync">Sincronización</TabsTrigger>
            <TabsTrigger value="settings">Configuración</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="mt-6">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex items-center gap-3">
                <Input
                  placeholder="Buscar productos..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="max-w-xs"
                />
                <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {productsData?.total ?? 0} productos
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border" style={{ background: "var(--muted)" }}>
                      <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Producto</th>
                      <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Precio</th>
                      <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Categoría</th>
                      <th className="text-center p-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Activo</th>
                      <th className="text-center p-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Destacado</th>
                      <th className="text-center p-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Ver</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-border">
                          {Array.from({ length: 6 }).map((_, j) => (
                            <td key={j} className="p-3"><div className="h-4 rounded shimmer" /></td>
                          ))}
                        </tr>
                      ))
                    ) : (productsData?.products ?? []).map((p) => (
                      <tr key={p.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {p.mainImage && (
                              <img src={p.mainImage} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                            )}
                            <div>
                              <p className="font-medium line-clamp-1 max-w-[200px]" style={{ color: "var(--brand-navy)" }}>{p.name}</p>
                              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>ID: {p.dropiId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-semibold" style={{ color: "var(--brand-navy)" }}>{formatPrice(p.price)}</td>
                        <td className="p-3">
                          {p.category && (
                            <Badge variant="secondary" className="text-xs capitalize">{p.category}</Badge>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Switch
                            checked={p.isActive}
                            onCheckedChange={(v) => toggleActiveMutation.mutate({ id: p.id, isActive: v })}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <Switch
                            checked={p.isFeatured}
                            onCheckedChange={(v) => toggleFeaturedMutation.mutate({ id: p.id, isFeatured: v })}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <a href={`/producto/${p.slug}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="w-8 h-8">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-6">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold" style={{ color: "var(--brand-navy)" }}>Pedidos Recientes</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border" style={{ background: "var(--muted)" }}>
                      <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Pedido</th>
                      <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Cliente</th>
                      <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Producto</th>
                      <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Total</th>
                      <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Estado</th>
                      <th className="text-center p-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ordersData?.orders ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center" style={{ color: "var(--muted-foreground)" }}>
                          No hay pedidos aún
                        </td>
                      </tr>
                    ) : (ordersData?.orders ?? []).map((o) => (
                      <tr key={o.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="p-3 font-mono text-xs font-medium" style={{ color: "var(--brand-navy)" }}>{o.orderNumber}</td>
                        <td className="p-3">
                          <p className="font-medium" style={{ color: "var(--brand-navy)" }}>{o.customerName ?? "—"}</p>
                          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{o.customerPhone ?? "—"}</p>
                        </td>
                        <td className="p-3">
                          <p className="line-clamp-1 max-w-[180px]" style={{ color: "var(--brand-navy)" }}>{o.productName}</p>
                        </td>
                        <td className="p-3 font-semibold" style={{ color: "var(--brand-navy)" }}>{formatPrice(o.productPrice)}</td>
                        <td className="p-3">
                          <Badge
                            variant="secondary"
                            className="text-xs"
                            style={{
                              background: o.status === "delivered" ? "oklch(0.92 0.08 145)" : o.status === "shipped" ? "oklch(0.92 0.05 250)" : "var(--muted)",
                              color: o.status === "delivered" ? "oklch(0.35 0.18 145)" : o.status === "shipped" ? "oklch(0.35 0.18 250)" : "var(--muted-foreground)",
                            }}
                          >
                            {STATUS_LABELS[o.status] ?? o.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <select
                            value={o.status}
                            onChange={(e) => updateStatusMutation.mutate({ id: o.id, status: e.target.value as any })}
                            className="text-xs border border-border rounded-lg px-2 py-1"
                            style={{ color: "var(--brand-navy)" }}
                          >
                            {Object.entries(STATUS_LABELS).map(([v, l]) => (
                              <option key={v} value={v}>{l}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Sync Tab */}
          <TabsContent value="sync" className="mt-6">
            <div className="grid gap-6">
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2" style={{ color: "var(--brand-navy)" }}>
                    <Activity className="w-4 h-4" style={{ color: "var(--brand-gold)" }} />
                    Sincronización con Dropi
                  </h3>
                  <Button onClick={handleSync} disabled={syncLoading} size="sm" style={{ background: "var(--brand-gold)", color: "white" }}>
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncLoading ? "animate-spin" : ""}`} />
                    Sincronizar Ahora
                  </Button>
                </div>
                <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
                  La sincronización importa todos los productos de tu tienda Dropi a esta plataforma. Configura primero el Token de Dropi en la pestaña de Configuración.
                </p>

                <h4 className="font-medium text-sm mb-3" style={{ color: "var(--brand-navy)" }}>Historial de Sincronizaciones</h4>
                <div className="space-y-2">
                  {(syncLogs ?? []).length === 0 ? (
                    <p className="text-sm text-center py-4" style={{ color: "var(--muted-foreground)" }}>No hay sincronizaciones aún</p>
                  ) : (syncLogs ?? []).map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${log.status === "success" ? "bg-green-500" : log.status === "error" ? "bg-red-500" : "bg-yellow-500"}`} />
                        <div>
                          <p className="text-sm font-medium capitalize" style={{ color: "var(--brand-navy)" }}>{log.type}</p>
                          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                            {new Date(log.startedAt).toLocaleString("es-CO")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="text-xs mb-1">
                          {log.status === "success" ? "Exitoso" : log.status === "error" ? "Error" : "En curso"}
                        </Badge>
                        {log.status === "success" && (
                          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                            {log.productsFound} encontrados · {log.productsCreated} nuevos · {log.productsUpdated} actualizados
                          </p>
                        )}
                        {log.errorMessage && (
                          <p className="text-xs" style={{ color: "oklch(0.55 0.22 25)" }}>{log.errorMessage}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold flex items-center gap-2" style={{ color: "var(--brand-navy)" }}>
                  <Settings className="w-4 h-4" style={{ color: "var(--brand-gold)" }} />
                  Configuración de Integraciones
                </h3>
                <Button onClick={handleSaveSettings} disabled={settingsSaving} style={{ background: "var(--brand-gold)", color: "white" }}>
                  <Save className="w-4 h-4 mr-2" />
                  {settingsSaving ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>

              <div className="grid gap-5">
                {Object.entries(SETTINGS_LABELS).map(([key, meta]) => (
                  <div key={key}>
                    <label className="text-sm font-medium block mb-1" style={{ color: "var(--brand-navy)" }}>
                      {meta.label}
                    </label>
                    <Input
                      type={meta.type}
                      value={settingsValues[key] ?? ""}
                      onChange={(e) => setSettingsValues((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={meta.desc}
                      className="max-w-lg"
                    />
                    <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>{meta.desc}</p>
                  </div>
                ))}
              </div>

              {/* Feed links */}
              <div className="mt-8 pt-6 border-t border-border">
                <h4 className="font-medium text-sm mb-3" style={{ color: "var(--brand-navy)" }}>Feeds de Productos</h4>
                <div className="space-y-2">
                  {[
                    { label: "Feed Google Merchant (XML)", url: "/api/feed/google-merchant.xml" },
                    { label: "Feed Google Merchant (JSON)", url: "/api/feed/google-merchant.json" },
                    { label: "Sitemap XML", url: "/sitemap.xml" },
                  ].map((f) => (
                    <div key={f.url} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <span className="text-sm" style={{ color: "var(--brand-navy)" }}>{f.label}</span>
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-medium hover:underline"
                        style={{ color: "var(--brand-gold)" }}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Ver Feed
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
