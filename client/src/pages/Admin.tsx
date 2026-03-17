import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Package, ShoppingCart, Settings, RefreshCw, Eye, EyeOff,
  Star, TrendingUp, CheckCircle, AlertCircle, Clock, BarChart3,
  Zap, Save, ExternalLink, Activity, Lock, User,
  FileText, Plus, Edit, Trash2, Search, X, MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

function StatCard({ icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  const Icon = icon;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { refresh } = useAuth();
  const loginMutation = trpc.auth.adminLogin.useMutation({
    onSuccess: async () => { await refresh(); },
    onError: (e) => { toast.error(e.message || "Credenciales incorrectas"); setLoading(false); },
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    loginMutation.mutate({ username, password });
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-gray-500 text-sm mt-1">Ingresa tus credenciales para continuar</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" className="pl-10" autoComplete="username" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 pr-10" autoComplete="current-password" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={loading || !username || !password} className="w-full bg-amber-600 hover:bg-amber-700">
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardSection() {
  const { data: orderStats } = trpc.orders.stats.useQuery();
  const { data: productsData } = trpc.products.adminList.useQuery({ limit: 1 });
  const { data: syncStatus } = trpc.sync.status.useQuery();
  return (
    <div className="p-6">
      <PageHeader title="Dashboard" subtitle="Resumen general de tu tienda" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Package} label="Total Productos" value={productsData?.total ?? 0} color="#d97706" />
        <StatCard icon={ShoppingCart} label="Total Pedidos" value={orderStats?.total ?? 0} color="#2563eb" />
        <StatCard icon={Clock} label="Pendientes" value={orderStats?.pending ?? 0} color="#f59e0b" />
        <StatCard icon={CheckCircle} label="Entregados" value={orderStats?.delivered ?? 0} color="#10b981" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-600" /> Última Sincronización Dropi
          </h3>
          {syncStatus ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Estado:</span>
                <Badge variant={syncStatus.status === "success" ? "default" : syncStatus.status === "error" ? "destructive" : "secondary"}>{syncStatus.status}</Badge>
              </div>
              <div className="flex justify-between"><span className="text-gray-500">Encontrados:</span><span className="font-medium">{syncStatus.productsFound ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Creados:</span><span className="font-medium text-green-600">{syncStatus.productsCreated ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Actualizados:</span><span className="font-medium text-blue-600">{syncStatus.productsUpdated ?? 0}</span></div>
              {syncStatus.errorMessage && <p className="text-red-500 text-xs mt-2">{syncStatus.errorMessage}</p>}
            </div>
          ) : <p className="text-gray-400 text-sm">No hay sincronizaciones registradas</p>}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-600" /> Estado de Pedidos
          </h3>
          <div className="space-y-3">
            {[
              { label: "Pendientes", value: orderStats?.pending ?? 0, color: "bg-yellow-400" },
              { label: "Enviados", value: orderStats?.shipped ?? 0, color: "bg-purple-400" },
              { label: "Entregados", value: orderStats?.delivered ?? 0, color: "bg-green-400" },
              { label: "Cancelados", value: orderStats?.cancelled ?? 0, color: "bg-red-400" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${item.color}`} />
                <span className="text-sm text-gray-600 flex-1">{item.label}</span>
                <span className="text-sm font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Products ─────────────────────────────────────────────────────────────────
function ProductsSection() {
  const [search, setSearch] = useState("");
  const [editingPrice, setEditingPrice] = useState<{ id: number; price: string } | null>(null);
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.products.adminList.useQuery({ limit: 100, search: search || undefined });
  const toggleActive = trpc.products.toggleActive.useMutation({ onSuccess: () => { utils.products.adminList.invalidate(); toast.success("Actualizado"); } });
  const toggleFeatured = trpc.products.toggleFeatured.useMutation({ onSuccess: () => { utils.products.adminList.invalidate(); toast.success("Actualizado"); } });
  const updatePrice = trpc.products.updatePrice.useMutation({ onSuccess: () => { utils.products.adminList.invalidate(); setEditingPrice(null); toast.success("Precio actualizado"); } });
  return (
    <div className="p-6">
      <PageHeader title="Productos" subtitle={`${data?.total ?? 0} productos en total`} />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Buscar productos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Producto</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Categoría</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Precio</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Activo</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Destacado</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Ver</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Cargando...</td></tr>
              ) : !data?.products.length ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No hay productos. Sincroniza desde Dropi.</td></tr>
              ) : data.products.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.mainImage && <img src={p.mainImage} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-gray-100" />}
                      <div>
                        <p className="font-medium text-gray-900 line-clamp-1 max-w-xs">{p.name}</p>
                        <p className="text-xs text-gray-400">Dropi: {p.dropiId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.category || "—"}</td>
                  <td className="px-4 py-3">
                    {editingPrice?.id === p.id ? (
                      <div className="flex items-center gap-1">
                        <Input value={editingPrice.price} onChange={(e) => setEditingPrice({ id: p.id, price: e.target.value })} className="w-24 h-7 text-xs" type="number" />
                        <button onClick={() => updatePrice.mutate({ id: p.id, price: editingPrice.price })} className="p-1 text-green-600"><CheckCircle className="w-4 h-4" /></button>
                        <button onClick={() => setEditingPrice(null)} className="p-1 text-gray-400"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingPrice({ id: p.id, price: String(p.price) })} className="font-semibold text-gray-900 hover:text-amber-600">
                        ${Number(p.price).toLocaleString("es-CO")}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch checked={p.isActive} onCheckedChange={(v) => toggleActive.mutate({ id: p.id, isActive: v })} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleFeatured.mutate({ id: p.id, isFeatured: !p.isFeatured })} className={p.isFeatured ? "text-amber-500" : "text-gray-300 hover:text-amber-400"}>
                      <Star className="w-5 h-5" fill={p.isFeatured ? "currentColor" : "none"} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <a href={`/producto/${p.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                      <ExternalLink className="w-3 h-3" /> Ver
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Categories ───────────────────────────────────────────────────────────────
function CategoriesSection() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const emptyForm = { name: "", description: "", metaTitle: "", metaDescription: "", isActive: true, sortOrder: 0 };
  const [form, setForm] = useState(emptyForm);
  const utils = trpc.useUtils();
  const { data: cats, isLoading } = trpc.categories.adminList.useQuery();
  const createMut = trpc.categories.create.useMutation({
    onSuccess: () => { utils.categories.adminList.invalidate(); setShowForm(false); setForm(emptyForm); toast.success("Categoría creada"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.categories.update.useMutation({
    onSuccess: () => { utils.categories.adminList.invalidate(); setEditing(null); setShowForm(false); toast.success("Categoría actualizada"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.categories.delete.useMutation({
    onSuccess: () => { utils.categories.adminList.invalidate(); toast.success("Eliminada"); },
    onError: (e) => toast.error(e.message),
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    editing ? updateMut.mutate({ id: editing.id, ...form }) : createMut.mutate(form);
  };
  const startEdit = (cat: any) => {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description || "", metaTitle: cat.metaTitle || "", metaDescription: cat.metaDescription || "", isActive: cat.isActive, sortOrder: cat.sortOrder || 0 });
    setShowForm(true);
  };
  return (
    <div className="p-6">
      <PageHeader
        title="Categorías"
        subtitle="Gestiona las categorías de tu tienda"
        action={
          <Button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(!showForm); }} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-2" /> Nueva Categoría
          </Button>
        }
      />
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">{editing ? "Editar Categoría" : "Nueva Categoría"}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Electrónica" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orden de visualización</label>
              <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción breve de la categoría" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Título (SEO)</label>
              <Input value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} placeholder="Título para Google (máx 60 chars)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Descripción (SEO)</label>
              <Input value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} placeholder="Descripción para Google (máx 160 chars)" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <label className="text-sm font-medium text-gray-700">Categoría activa</label>
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={createMut.isPending || updateMut.isPending}>
                <Save className="w-4 h-4 mr-2" />{editing ? "Guardar Cambios" : "Crear Categoría"}
              </Button>
            </div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Nombre</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Slug</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Descripción</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Orden</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Cargando...</td></tr>
            ) : !cats?.length ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No hay categorías. Crea la primera.</td></tr>
            ) : cats.map((cat) => (
              <tr key={cat.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{cat.slug}</td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{cat.description || "—"}</td>
                <td className="px-4 py-3 text-center text-gray-600">{cat.sortOrder ?? 0}</td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={cat.isActive ? "default" : "secondary"}>{cat.isActive ? "Activa" : "Inactiva"}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => startEdit(cat)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-amber-600 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => { if (confirm(`¿Eliminar "${cat.name}"?`)) deleteMut.mutate({ id: cat.id }); }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Site Pages ───────────────────────────────────────────────────────────────
const LEGAL_PAGES = [
  { slug: "politica-de-privacidad", title: "Política de Privacidad", description: "Requerida por Google Ads y Ley 1581 de 2012 (Colombia)" },
  { slug: "terminos-y-condiciones", title: "Términos y Condiciones", description: "Aviso legal y términos de uso de la tienda" },
  { slug: "politica-de-cookies", title: "Política de Cookies", description: "Requerida por Google Ads para cookies de seguimiento" },
  { slug: "contacto", title: "Contacto", description: "Información de contacto — requerida por Google Shopping" },
];

function getDefaultContent(slug: string): string {
  const store = "Pago Contra Entrega Colombia";
  const date = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
  if (slug === "politica-de-privacidad") {
    return `<h1>Política de Privacidad</h1>
<p><strong>Última actualización:</strong> ${date}</p>
<p>En <strong>${store}</strong> nos comprometemos a proteger la privacidad de nuestros usuarios, en cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013 de Colombia.</p>
<h2>1. Datos que Recopilamos</h2>
<ul><li>Nombre completo</li><li>Número de teléfono / WhatsApp</li><li>Dirección de entrega</li><li>Ciudad y departamento</li><li>Correo electrónico (opcional)</li></ul>
<h2>2. Finalidad</h2>
<p>Los datos se usan exclusivamente para procesar y entregar tu pedido, y para comunicarnos contigo sobre el estado del mismo.</p>
<h2>3. Derechos del Titular</h2>
<p>Tienes derecho a conocer, actualizar, rectificar y suprimir tus datos. Contáctanos a través de nuestra página de <a href="/contacto">Contacto</a>.</p>
<h2>4. Cookies</h2>
<p>Usamos cookies para mejorar tu experiencia. Consulta nuestra <a href="/politica-de-cookies">Política de Cookies</a>.</p>`;
  }
  if (slug === "terminos-y-condiciones") {
    return `<h1>Términos y Condiciones</h1>
<p><strong>Última actualización:</strong> ${date}</p>
<h2>1. Modalidad de Pago</h2>
<p>Todos los productos se venden con <strong>pago contra entrega</strong>. El pago se realiza al recibir el producto. No realizamos cobros anticipados.</p>
<h2>2. Proceso de Compra</h2>
<p>Para realizar un pedido debes proporcionar nombre, dirección, ciudad y teléfono. Recibirás confirmación con número de seguimiento.</p>
<h2>3. Tiempos de Entrega</h2>
<ul><li>Ciudades principales: 2-4 días hábiles</li><li>Municipios: 4-8 días hábiles</li></ul>
<h2>4. Devoluciones</h2>
<p>Puedes rechazar el pedido al momento de la entrega si no corresponde a lo solicitado, sin costo alguno.</p>`;
  }
  if (slug === "politica-de-cookies") {
    return `<h1>Política de Cookies</h1>
<p><strong>Última actualización:</strong> ${date}</p>
<p>Usamos cookies para mejorar tu experiencia de navegación y para análisis de tráfico.</p>
<h2>Tipos de Cookies</h2>
<ul>
<li><strong>Esenciales:</strong> Necesarias para el funcionamiento del sitio</li>
<li><strong>Google Analytics:</strong> Análisis anónimo de visitas</li>
<li><strong>Google Ads:</strong> Publicidad relevante para usuarios que visitaron el sitio</li>
</ul>
<p>Puedes deshabilitar las cookies en la configuración de tu navegador.</p>`;
  }
  if (slug === "contacto") {
    return `<h1>Contacto</h1>
<p>Estamos aquí para ayudarte. Escríbenos por WhatsApp para atención inmediata.</p>
<h2>Horario de Atención</h2>
<ul><li>Lunes a Viernes: 8:00 AM - 8:00 PM</li><li>Sábados: 9:00 AM - 6:00 PM</li></ul>
<h2>Cobertura</h2>
<p>Realizamos envíos a todo Colombia con pago contra entrega.</p>`;
  }
  return "";
}

function SitePagesSection() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [form, setForm] = useState({ slug: "", title: "", content: "", metaTitle: "", metaDescription: "", isActive: true });
  const utils = trpc.useUtils();
  const { data: pages } = trpc.sitePages.adminList.useQuery();
  const upsertMut = trpc.sitePages.upsert.useMutation({
    onSuccess: () => { utils.sitePages.adminList.invalidate(); toast.success("Página guardada"); },
    onError: (e) => toast.error(e.message),
  });
  const openPage = (slug: string, title: string) => {
    const existing = pages?.find((p) => p.slug === slug);
    setForm({ slug, title: existing?.title || title, content: existing?.content || getDefaultContent(slug), metaTitle: existing?.metaTitle || title, metaDescription: existing?.metaDescription || "", isActive: existing?.isActive ?? true });
    setSelectedSlug(slug);
  };

  if (selectedSlug) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setSelectedSlug(null)} className="text-sm text-amber-600 hover:text-amber-700 font-medium">← Volver a Páginas</button>
          <span className="text-gray-400">/</span>
          <span className="text-sm text-gray-600">{form.title}</span>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); upsertMut.mutate(form); }} className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Contenido de la Página</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contenido (HTML permitido)</label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={20} className="w-full border border-gray-200 rounded-lg p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Search className="w-4 h-4 text-amber-600" /> SEO
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta Título</label>
                <Input value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} placeholder="Título para Google (máx 60 chars)" />
                <p className="text-xs text-gray-400 mt-1">{form.metaTitle.length}/60</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta Descripción</label>
                <Input value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} placeholder="Descripción para Google (máx 160 chars)" />
                <p className="text-xs text-gray-400 mt-1">{form.metaDescription.length}/160</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <label className="text-sm font-medium text-gray-700">Página activa (visible en el sitio)</label>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setSelectedSlug(null)}>Cancelar</Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={upsertMut.isPending}>
                <Save className="w-4 h-4 mr-2" />{upsertMut.isPending ? "Guardando..." : "Guardar Página"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader title="Páginas Legales" subtitle="Requeridas por Google Ads, Shopping y legislación colombiana" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LEGAL_PAGES.map((page) => {
          const existing = pages?.find((p) => p.slug === page.slug);
          return (
            <div key={page.slug} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-amber-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-gray-900">{page.title}</h3>
                </div>
                <Badge variant={existing ? "default" : "secondary"}>{existing ? "Configurada" : "Pendiente"}</Badge>
              </div>
              <p className="text-sm text-gray-500 mb-4">{page.description}</p>
              <div className="flex items-center gap-3">
                <Button size="sm" onClick={() => openPage(page.slug, page.title)} className="bg-amber-600 hover:bg-amber-700">
                  <Edit className="w-3 h-3 mr-1" />{existing ? "Editar" : "Crear"}
                </Button>
                {existing && (
                  <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Ver
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Importante para Google Ads y Shopping
        </h4>
        <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
          <li>La <strong>Política de Privacidad</strong> es obligatoria para Google Ads y Google Shopping</li>
          <li>La <strong>Política de Cookies</strong> es requerida si usas Google Analytics o píxeles de seguimiento</li>
          <li>Los <strong>Términos y Condiciones</strong> protegen tu negocio legalmente</li>
          <li>La página de <strong>Contacto</strong> es requerida por Google Shopping</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Sync ─────────────────────────────────────────────────────────────────────
function SyncSection() {
  const utils = trpc.useUtils();
  const { data: logs } = trpc.sync.logs.useQuery({ limit: 10 });
  const { data: allSettings } = trpc.settings.getAll.useQuery();
  const [dropiToken, setDropiToken] = useState("");
  const triggerSync = trpc.sync.trigger.useMutation({
    onSuccess: () => { utils.sync.logs.invalidate(); utils.sync.status.invalidate(); toast.success("Sincronización iniciada"); },
    onError: (e) => toast.error(e.message),
  });
  const updateSetting = trpc.settings.update.useMutation({
    onSuccess: () => { utils.settings.getAll.invalidate(); toast.success("Token guardado"); },
    onError: (e) => toast.error(e.message),
  });
  const currentToken = allSettings?.find((s) => s.key === "dropi_token")?.value || "";
  return (
    <div className="p-6">
      <PageHeader title="Sincronizar Dropi" subtitle="Importa productos desde tu cuenta de Dropi Colombia" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-600" /> Configuración de Dropi
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Token de API Dropi</label>
              <Input type="password" placeholder={currentToken ? "••••••••••••" : "Pega tu token aquí"} value={dropiToken} onChange={(e) => setDropiToken(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">
                Obtén tu token en <a href="https://app.dropi.co" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">app.dropi.co</a> → Perfil → API
              </p>
            </div>
            <Button onClick={() => updateSetting.mutate({ key: "dropi_token", value: dropiToken })} disabled={!dropiToken || updateSetting.isPending} variant="outline" className="w-full">
              <Save className="w-4 h-4 mr-2" /> Guardar Token
            </Button>
            <Button onClick={() => triggerSync.mutate()} disabled={triggerSync.isPending || !currentToken} className="w-full bg-amber-600 hover:bg-amber-700">
              <RefreshCw className={`w-4 h-4 mr-2 ${triggerSync.isPending ? "animate-spin" : ""}`} />
              {triggerSync.isPending ? "Sincronizando..." : "Sincronizar Ahora"}
            </Button>
            {!currentToken && <p className="text-xs text-red-500">Configura el token antes de sincronizar</p>}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-600" /> Historial de Sincronizaciones
          </h3>
          <div className="space-y-2">
            {!logs?.length ? (
              <p className="text-gray-400 text-sm">No hay sincronizaciones registradas</p>
            ) : logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={log.status === "success" ? "default" : log.status === "error" ? "destructive" : "secondary"} className="text-xs">{log.status}</Badge>
                  <span className="text-gray-600">{log.productsFound ?? 0} encontrados</span>
                </div>
                <span className="text-xs text-gray-400">{new Date(log.startedAt).toLocaleString("es-CO")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Orders ───────────────────────────────────────────────────────────────────
function OrdersSection() {
  const { data, isLoading } = trpc.orders.list.useQuery({ limit: 50 });
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700", confirmed: "bg-blue-100 text-blue-700",
    processing: "bg-purple-100 text-purple-700", shipped: "bg-indigo-100 text-indigo-700",
    delivered: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700", returned: "bg-gray-100 text-gray-700",
  };
  const statusLabels: Record<string, string> = {
    pending: "Pendiente", confirmed: "Confirmado", processing: "En proceso",
    shipped: "Enviado", delivered: "Entregado", cancelled: "Cancelado", returned: "Devuelto",
  };
  return (
    <div className="p-6">
      <PageHeader title="Pedidos" subtitle={`${data?.total ?? 0} pedidos en total`} />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600"># Pedido</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Producto</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Ciudad</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Cargando...</td></tr>
              ) : !data?.orders.length ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No hay pedidos aún</td></tr>
              ) : data.orders.map((order) => (
                <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">#{order.orderNumber}</td>
                  <td className="px-4 py-3 max-w-xs truncate text-gray-900">{order.productName}</td>
                  <td className="px-4 py-3 text-gray-600">{order.customerName || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{order.shippingCity || "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">${Number(order.productPrice).toLocaleString("es-CO")}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || "bg-gray-100 text-gray-700"}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString("es-CO")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function SettingsSection() {
  const utils = trpc.useUtils();
  const { data: allSettings } = trpc.settings.getAll.useQuery();
  const [values, setValues] = useState<Record<string, string>>({});
  const updateMut = trpc.settings.update.useMutation({
    onSuccess: () => { utils.settings.getAll.invalidate(); toast.success("Guardado"); },
    onError: (e) => toast.error(e.message),
  });
  const getValue = (key: string) => values[key] ?? allSettings?.find((s) => s.key === key)?.value ?? "";
  const handleSave = (key: string) => updateMut.mutate({ key, value: getValue(key) });
  const fields1 = [
    { key: "store_name", label: "Nombre de la Tienda", placeholder: "Ej: Mi Tienda Colombia" },
    { key: "store_whatsapp", label: "WhatsApp (sin +)", placeholder: "573001234567" },
    { key: "store_email", label: "Email de Contacto", placeholder: "contacto@mitienda.com" },
    { key: "store_city", label: "Ciudad", placeholder: "Bogotá" },
  ];
  const fields2 = [
    { key: "google_analytics_id", label: "Google Analytics ID", placeholder: "G-XXXXXXXXXX" },
    { key: "google_ads_id", label: "Google Ads ID", placeholder: "AW-XXXXXXXXXX" },
    { key: "google_merchant_id", label: "Google Merchant Center ID", placeholder: "123456789" },
    { key: "meta_pixel_id", label: "Meta Pixel ID", placeholder: "123456789012345" },
  ];
  return (
    <div className="p-6">
      <PageHeader title="Configuración" subtitle="Ajustes generales de la tienda" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Información de la Tienda</h3>
          <div className="space-y-4">
            {fields1.map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <div className="flex gap-2">
                  <Input value={getValue(f.key)} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} placeholder={f.placeholder} />
                  <Button size="sm" onClick={() => handleSave(f.key)} variant="outline" disabled={updateMut.isPending}><Save className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-600" /> Integraciones de Marketing
          </h3>
          <div className="space-y-4">
            {fields2.map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <div className="flex gap-2">
                  <Input value={getValue(f.key)} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} placeholder={f.placeholder} />
                  <Button size="sm" onClick={() => handleSave(f.key)} variant="outline" disabled={updateMut.isPending}><Save className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────
function WhatsAppSection() {
  const { data: conversations } = trpc.whatsapp.conversations.useQuery({ limit: 20 });
  return (
    <div className="p-6">
      <PageHeader title="WhatsApp Bot" subtitle="Conversaciones del bot de ventas" />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Teléfono</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Cliente</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Último mensaje</th>
            </tr>
          </thead>
          <tbody>
            {!conversations?.length ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">No hay conversaciones aún</td></tr>
            ) : conversations.map((conv) => (
              <tr key={conv.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{conv.phoneNumber}</td>
                <td className="px-4 py-3 text-gray-600">{conv.customerName || "—"}</td>
                <td className="px-4 py-3"><Badge variant="secondary" className="text-xs">{conv.state}</Badge></td>
                <td className="px-4 py-3 text-xs text-gray-400">{conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleString("es-CO") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Admin() {
  const { user, isAuthenticated, loading } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") return <LoginForm />;

  const renderSection = () => {
    if (location === "/admin/productos") return <ProductsSection />;
    if (location === "/admin/categorias") return <CategoriesSection />;
    if (location === "/admin/paginas") return <SitePagesSection />;
    if (location === "/admin/sync") return <SyncSection />;
    if (location === "/admin/pedidos") return <OrdersSection />;
    if (location === "/admin/configuracion") return <SettingsSection />;
    if (location === "/admin/whatsapp") return <WhatsAppSection />;
    return <DashboardSection />;
  };

  return <DashboardLayout>{renderSection()}</DashboardLayout>;
}
