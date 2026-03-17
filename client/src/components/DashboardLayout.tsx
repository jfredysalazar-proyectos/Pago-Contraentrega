import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Package, Tag, ShoppingCart,
  Settings, FileText, LogOut, Menu, X, ChevronRight,
  Globe, MessageCircle, RefreshCw, Puzzle
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const menuGroups = [
  {
    group: "Principal",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
      { icon: ShoppingCart, label: "Pedidos", path: "/admin/pedidos" },
    ],
  },
  {
    group: "Catálogo",
    items: [
      { icon: Package, label: "Productos", path: "/admin/productos" },
      { icon: Tag, label: "Categorías", path: "/admin/categorias" },
      { icon: RefreshCw, label: "Sincronizar Dropi", path: "/admin/sync" },
      { icon: Puzzle, label: "Extensión Chrome", path: "/admin/extension" },
    ],
  },
  {
    group: "Contenido",
    items: [
      { icon: FileText, label: "Páginas Legales", path: "/admin/paginas" },
      { icon: Globe, label: "Ver Tienda", path: "/", external: true },
    ],
  },
  {
    group: "Sistema",
    items: [
      { icon: MessageCircle, label: "WhatsApp Bot", path: "/admin/whatsapp" },
      { icon: Settings, label: "Configuración", path: "/admin/configuracion" },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/admin"; },
    onError: () => toast.error("Error al cerrar sesión"),
  });

  const isActive = (path: string) => {
    if (path === "/admin") return location === "/admin";
    return location.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 transition-all duration-300 shadow-sm",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-3 border-b border-gray-200 shrink-0">
          {sidebarOpen && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm text-gray-900 truncate">Admin Panel</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 shrink-0 ml-auto"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {menuGroups.map((group) => (
            <div key={group.group} className="mb-3">
              {sidebarOpen && (
                <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {group.group}
                </p>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      if ((item as any).external) {
                        window.open(item.path, "_blank");
                      } else {
                        navigate(item.path);
                      }
                    }}
                    title={!sidebarOpen ? item.label : undefined}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-0.5",
                      active
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 shrink-0", active ? "text-amber-600" : "")} />
                    {sidebarOpen && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {active && <ChevronRight className="w-3 h-3 text-amber-500" />}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-3 shrink-0">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-amber-700">
                  {(user?.name || "A").charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{user?.name || "Admin"}</p>
                <p className="text-xs text-gray-400 truncate">Administrador</p>
              </div>
              <button
                onClick={() => logoutMutation.mutate()}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => logoutMutation.mutate()}
              className="w-full flex justify-center p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main
        className={cn(
          "flex-1 transition-all duration-300 min-h-screen",
          sidebarOpen ? "ml-64" : "ml-16"
        )}
      >
        {children}
      </main>
    </div>
  );
}
