import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingBag, Search, Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [location, navigate] = useLocation();

  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/productos?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-border"
            : "bg-transparent"
        }`}
      >
        <div className="container">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--brand-gold)" }}>
                <ShoppingBag className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-display font-bold text-lg leading-none block" style={{ color: "var(--brand-navy)" }}>
                  Pago
                </span>
                <span className="text-xs font-medium tracking-widest uppercase" style={{ color: "var(--brand-gold)" }}>
                  Contra Entrega
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="/productos"
                className="text-sm font-medium transition-colors hover:text-primary"
                style={{ color: isScrolled ? "var(--brand-navy)" : "inherit" }}
              >
                Productos
              </Link>
              <Link
                href="/productos?categoria=electronica"
                className="text-sm font-medium transition-colors hover:text-primary"
                style={{ color: isScrolled ? "var(--brand-navy)" : "inherit" }}
              >
                Electrónica
              </Link>
              <Link
                href="/productos?categoria=hogar"
                className="text-sm font-medium transition-colors hover:text-primary"
                style={{ color: isScrolled ? "var(--brand-navy)" : "inherit" }}
              >
                Hogar
              </Link>
              <Link
                href="/productos?categoria=moda"
                className="text-sm font-medium transition-colors hover:text-primary"
                style={{ color: isScrolled ? "var(--brand-navy)" : "inherit" }}
              >
                Moda
              </Link>
              <Link
                href="/rastrear"
                className="text-sm font-medium transition-colors hover:text-primary"
                style={{ color: isScrolled ? "var(--brand-navy)" : "inherit" }}
              >
                Rastrear Pedido
              </Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(!searchOpen)}
                className="hidden md:flex"
              >
                <Search className="w-4 h-4" />
              </Button>

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Search bar */}
          {searchOpen && (
            <div className="pb-4 hidden md:block">
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="Buscar productos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="sm" style={{ background: "var(--brand-gold)", color: "white" }}>
                  Buscar
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-border">
            <div className="container py-4 flex flex-col gap-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="Buscar productos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="sm" style={{ background: "var(--brand-gold)", color: "white" }}>
                  <Search className="w-4 h-4" />
                </Button>
              </form>
              {[
                { href: "/productos", label: "Todos los Productos" },
                { href: "/productos?categoria=electronica", label: "Electrónica" },
                { href: "/productos?categoria=hogar", label: "Hogar" },
                { href: "/productos?categoria=moda", label: "Moda" },
                { href: "/rastrear", label: "Rastrear Pedido" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium py-2 border-b border-border last:border-0"
                  style={{ color: "var(--brand-navy)" }}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>
      {/* Spacer */}
      <div className="h-16 md:h-20" />
    </>
  );
}
