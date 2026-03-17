import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Package, ArrowLeft } from "lucide-react";

export default function SitePage() {
  const [location] = useLocation();
  const slug = location.replace(/^\//, "");

  const { data: page, isLoading } = trpc.sitePages.bySlug.useQuery({ slug });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Página no encontrada</h1>
          <Link href="/" className="text-amber-600 hover:text-amber-700">← Volver al inicio</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium text-sm">
            <ArrowLeft className="w-4 h-4" />
            Volver a la tienda
          </Link>
          <div className="flex-1" />
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-600 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-10">
        <article className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 md:p-12">
          <div
            className="prose prose-gray max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3 prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600 prose-a:text-amber-600 prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: page.content || "" }}
          />
        </article>
      </main>

      {/* Footer Links */}
      <footer className="max-w-4xl mx-auto px-4 py-6 border-t border-gray-200 mt-4">
        <div className="flex flex-wrap gap-4 justify-center text-sm text-gray-400">
          <Link href="/politica-de-privacidad" className="hover:text-amber-600 transition-colors">Política de Privacidad</Link>
          <Link href="/terminos-y-condiciones" className="hover:text-amber-600 transition-colors">Términos y Condiciones</Link>
          <Link href="/politica-de-cookies" className="hover:text-amber-600 transition-colors">Política de Cookies</Link>
          <Link href="/contacto" className="hover:text-amber-600 transition-colors">Contacto</Link>
        </div>
      </footer>
    </div>
  );
}
