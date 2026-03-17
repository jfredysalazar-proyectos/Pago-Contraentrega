import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import ProductDetail from "./pages/ProductDetail";
import TrackOrder from "./pages/TrackOrder";
import Admin from "./pages/Admin";
import SitePage from "./pages/SitePage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/productos" component={Catalog} />
      <Route path="/producto/:slug" component={ProductDetail} />
      <Route path="/rastrear" component={TrackOrder} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/productos" component={Admin} />
      <Route path="/admin/categorias" component={Admin} />
      <Route path="/admin/paginas" component={Admin} />
      <Route path="/admin/sync" component={Admin} />
      <Route path="/admin/pedidos" component={Admin} />
      <Route path="/admin/configuracion" component={Admin} />
      <Route path="/admin/whatsapp" component={Admin} />
      <Route path="/politica-de-privacidad" component={SitePage} />
      <Route path="/terminos-y-condiciones" component={SitePage} />
      <Route path="/politica-de-cookies" component={SitePage} />
      <Route path="/contacto" component={SitePage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
