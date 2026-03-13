import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Search, SlidersHorizontal, X, ChevronDown, Grid2X2, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProductCard, { ProductCardSkeleton, ProductCardData } from "@/components/ProductCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ITEMS_PER_PAGE = 24;

export default function Catalog() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const [, navigate] = useLocation();

  const [search, setSearch] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState(params.get("categoria") ?? "");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc" | "name">("newest");
  const [page, setPage] = useState(0);
  const [inputValue, setInputValue] = useState(params.get("q") ?? "");

  const { data: productsData, isLoading } = trpc.products.list.useQuery({
    limit: ITEMS_PER_PAGE,
    offset: page * ITEMS_PER_PAGE,
    category: category || undefined,
    search: search || undefined,
    sortBy,
  });

  const { data: categoriesData } = trpc.products.categories.useQuery();
  const { data: settingsData } = trpc.settings.getPublic.useQuery();

  const products = (productsData?.products ?? []) as ProductCardData[];
  const total = productsData?.total ?? 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const whatsappNumber = settingsData?.whatsapp_number ?? "";
  const messageTemplate = settingsData?.whatsapp_message_template ?? "";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(inputValue);
    setPage(0);
  };

  const clearFilters = () => {
    setSearch("");
    setInputValue("");
    setCategory("");
    setSortBy("newest");
    setPage(0);
  };

  const hasFilters = search || category;

  // SEO meta
  useEffect(() => {
    const title = category
      ? `${category.charAt(0).toUpperCase() + category.slice(1)} - Pago Contra Entrega`
      : search
      ? `Búsqueda: ${search} - Pago Contra Entrega`
      : "Catálogo de Productos - Pago Contra Entrega";
    document.title = title;
  }, [category, search]);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Navbar />

      {/* Header */}
      <section className="py-10 border-b border-border" style={{ background: "var(--brand-cream)" }}>
        <div className="container">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <nav className="flex items-center gap-2 text-xs mb-2" style={{ color: "var(--muted-foreground)" }}>
                <a href="/" className="hover:underline">Inicio</a>
                <span>/</span>
                <span style={{ color: "var(--brand-navy)" }}>
                  {category ? category.charAt(0).toUpperCase() + category.slice(1) : "Productos"}
                </span>
              </nav>
              <h1 className="text-3xl font-display font-bold" style={{ color: "var(--brand-navy)" }}>
                {category ? category.charAt(0).toUpperCase() + category.slice(1) : "Todos los Productos"}
              </h1>
              {!isLoading && (
                <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
                  {total} {total === 1 ? "producto" : "productos"} encontrados
                </p>
              )}
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto md:min-w-[320px]">
              <Input
                placeholder="Buscar productos..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" style={{ background: "var(--brand-gold)", color: "white" }}>
                <Search className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </section>

      <div className="container py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:w-56 shrink-0">
            <div className="sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: "var(--brand-navy)" }}>
                  <SlidersHorizontal className="w-4 h-4" />
                  Filtros
                </h3>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs flex items-center gap-1 hover:underline"
                    style={{ color: "var(--brand-gold)" }}
                  >
                    <X className="w-3 h-3" /> Limpiar
                  </button>
                )}
              </div>

              {/* Active filters */}
              {hasFilters && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {search && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      "{search}"
                      <button onClick={() => { setSearch(""); setInputValue(""); }}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {category && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      {category}
                      <button onClick={() => setCategory("")}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              )}

              {/* Categories */}
              <div className="mb-6">
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted-foreground)" }}>
                  Categorías
                </h4>
                <ul className="space-y-1">
                  <li>
                    <button
                      onClick={() => { setCategory(""); setPage(0); }}
                      className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                        !category ? "font-semibold" : "hover:bg-muted"
                      }`}
                      style={!category ? { background: "oklch(0.62 0.13 75 / 0.12)", color: "var(--brand-gold)" } : { color: "var(--foreground)" }}
                    >
                      Todos
                    </button>
                  </li>
                  {(categoriesData ?? []).map((cat) => (
                    <li key={cat.category}>
                      <button
                        onClick={() => { setCategory(cat.category!); setPage(0); }}
                        className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                          category === cat.category ? "font-semibold" : "hover:bg-muted"
                        }`}
                        style={category === cat.category ? { background: "oklch(0.62 0.13 75 / 0.12)", color: "var(--brand-gold)" } : { color: "var(--foreground)" }}
                      >
                        <span className="capitalize">{cat.category}</span>
                        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{cat.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1 min-w-0">
            {/* Sort bar */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                {isLoading ? "Cargando..." : `${total} productos`}
              </p>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-44 text-sm">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Más Recientes</SelectItem>
                  <SelectItem value="price_asc">Precio: Menor a Mayor</SelectItem>
                  <SelectItem value="price_desc">Precio: Mayor a Menor</SelectItem>
                  <SelectItem value="name">Nombre A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                {Array.from({ length: 12 }).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-display font-semibold mb-2" style={{ color: "var(--brand-navy)" }}>
                  No encontramos productos
                </h3>
                <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
                  Intenta con otros términos de búsqueda o explora nuestras categorías.
                </p>
                <Button onClick={clearFilters} style={{ background: "var(--brand-gold)", color: "white" }}>
                  Ver Todos los Productos
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                  {products.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      whatsappNumber={whatsappNumber}
                      messageTemplate={messageTemplate}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage(p => p - 1)}
                    >
                      Anterior
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                        const pageNum = i;
                        return (
                          <button
                            key={i}
                            onClick={() => setPage(pageNum)}
                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                              page === pageNum ? "text-white" : "hover:bg-muted"
                            }`}
                            style={page === pageNum ? { background: "var(--brand-gold)", color: "white" } : {}}
                          >
                            {pageNum + 1}
                          </button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Siguiente
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
