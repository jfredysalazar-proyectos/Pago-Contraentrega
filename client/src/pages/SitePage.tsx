import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ─── Contenido por defecto para cada página ──────────────────────────────────
// Se usa cuando la página no existe aún en la base de datos.

const DEFAULT_PAGES: Record<string, { title: string; content: string }> = {
  "terminos-y-condiciones": {
    title: "Términos y Condiciones",
    content: `
      <h1>Términos y Condiciones</h1>
      <p><em>Última actualización: ${new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}</em></p>

      <p>Bienvenido a <strong>Pago Contra Entrega</strong>. Al acceder y utilizar nuestro sitio web y realizar compras, usted acepta los presentes Términos y Condiciones. Le recomendamos leerlos detenidamente antes de realizar cualquier pedido.</p>

      <h2>1. Identificación del Comercio</h2>
      <p>Pago Contra Entrega es una tienda en línea que opera en Colombia, dedicada a la venta de productos con modalidad de pago contra entrega. Nuestras operaciones se rigen por las leyes colombianas vigentes.</p>

      <h2>2. Proceso de Compra</h2>
      <p>Para realizar un pedido, el cliente debe proporcionar su nombre completo, dirección de entrega, número de teléfono y correo electrónico. Al confirmar el pedido, el cliente acepta pagar el valor total del producto más los gastos de envío al momento de recibir el paquete en su domicilio.</p>

      <h2>3. Precios y Pagos</h2>
      <p>Todos los precios publicados en el sitio están expresados en pesos colombianos (COP) e incluyen IVA cuando aplique. El pago se realiza <strong>exclusivamente al momento de la entrega</strong>, en efectivo al mensajero o transportista. No se realizan cobros anticipados bajo ninguna circunstancia.</p>

      <h2>4. Envíos y Tiempos de Entrega</h2>
      <p>Realizamos envíos a todo el territorio colombiano. Los tiempos de entrega estimados son:</p>
      <ul>
        <li><strong>Ciudades principales</strong> (Bogotá, Medellín, Cali, Barranquilla, Cartagena): 2 a 4 días hábiles.</li>
        <li><strong>Otras ciudades y municipios:</strong> 4 a 7 días hábiles.</li>
        <li><strong>Zonas rurales o de difícil acceso:</strong> 7 a 12 días hábiles.</li>
      </ul>
      <p>Los tiempos de entrega son estimados y pueden variar por factores externos como condiciones climáticas, días festivos o situaciones de orden público.</p>

      <h2>5. Política de Devoluciones y Garantías</h2>
      <p>El cliente tiene derecho a rechazar el paquete al momento de la entrega si el embalaje presenta daños visibles o si el producto no corresponde a lo solicitado. Una vez aceptado el paquete, el cliente cuenta con <strong>7 días calendario</strong> para reportar cualquier defecto de fábrica o inconformidad con el producto.</p>
      <p>Para gestionar una devolución, el cliente debe contactarnos a través de nuestros canales de atención con el número de pedido y una descripción del inconveniente.</p>

      <h2>6. Responsabilidades</h2>
      <p>Pago Contra Entrega no se hace responsable por demoras en la entrega causadas por información incorrecta suministrada por el cliente (dirección errónea, número de teléfono equivocado, etc.), ni por situaciones de fuerza mayor. El cliente es responsable de estar disponible para recibir el pedido en la dirección indicada.</p>

      <h2>7. Propiedad Intelectual</h2>
      <p>Todo el contenido de este sitio web, incluyendo textos, imágenes, logotipos y diseños, es propiedad de Pago Contra Entrega o de sus proveedores y está protegido por las leyes de propiedad intelectual colombianas. Queda prohibida su reproducción sin autorización expresa.</p>

      <h2>8. Modificaciones</h2>
      <p>Nos reservamos el derecho de modificar estos Términos y Condiciones en cualquier momento. Los cambios entrarán en vigencia inmediatamente después de su publicación en el sitio web.</p>

      <h2>9. Ley Aplicable</h2>
      <p>Estos términos se rigen por las leyes de la República de Colombia. Cualquier controversia será resuelta ante los tribunales competentes de Colombia.</p>

      <h2>10. Contacto</h2>
      <p>Si tiene preguntas sobre estos Términos y Condiciones, puede contactarnos a través de nuestra página de <a href="/contacto">Contacto</a> o por WhatsApp.</p>
    `,
  },

  "politica-de-privacidad": {
    title: "Política de Privacidad",
    content: `
      <h1>Política de Privacidad</h1>
      <p><em>Última actualización: ${new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}</em></p>

      <p>En <strong>Pago Contra Entrega</strong> nos comprometemos a proteger la privacidad y los datos personales de nuestros clientes, en cumplimiento de la <strong>Ley 1581 de 2012</strong> (Ley de Protección de Datos Personales de Colombia) y el Decreto 1377 de 2013.</p>

      <h2>1. Responsable del Tratamiento</h2>
      <p>Pago Contra Entrega es el responsable del tratamiento de los datos personales recopilados a través de este sitio web y en el proceso de compra.</p>

      <h2>2. Datos Personales que Recopilamos</h2>
      <p>Para procesar sus pedidos y brindarle un servicio adecuado, recopilamos los siguientes datos:</p>
      <ul>
        <li><strong>Datos de identificación:</strong> Nombre completo.</li>
        <li><strong>Datos de contacto:</strong> Número de teléfono y correo electrónico.</li>
        <li><strong>Datos de ubicación:</strong> Dirección de entrega (ciudad, barrio, dirección exacta).</li>
        <li><strong>Datos de navegación:</strong> Dirección IP, tipo de navegador y páginas visitadas (mediante cookies).</li>
      </ul>

      <h2>3. Finalidad del Tratamiento</h2>
      <p>Sus datos personales serán utilizados exclusivamente para:</p>
      <ul>
        <li>Procesar y gestionar sus pedidos.</li>
        <li>Coordinar la entrega del producto en su domicilio.</li>
        <li>Enviarle confirmaciones y actualizaciones sobre el estado de su pedido.</li>
        <li>Atender sus solicitudes, quejas y reclamos.</li>
        <li>Mejorar nuestros servicios y experiencia de usuario.</li>
        <li>Cumplir con obligaciones legales y regulatorias.</li>
      </ul>

      <h2>4. Derechos del Titular</h2>
      <p>Como titular de sus datos personales, usted tiene derecho a:</p>
      <ul>
        <li><strong>Conocer, actualizar y rectificar</strong> sus datos personales.</li>
        <li><strong>Solicitar prueba</strong> de la autorización otorgada para el tratamiento.</li>
        <li><strong>Ser informado</strong> sobre el uso que se ha dado a sus datos.</li>
        <li><strong>Presentar quejas</strong> ante la Superintendencia de Industria y Comercio (SIC).</li>
        <li><strong>Revocar la autorización</strong> y solicitar la supresión de sus datos cuando no exista obligación legal de conservarlos.</li>
      </ul>

      <h2>5. Seguridad de los Datos</h2>
      <p>Implementamos medidas técnicas y organizativas para proteger sus datos personales contra acceso no autorizado, pérdida, alteración o divulgación. Sin embargo, ningún sistema de transmisión por internet es 100% seguro.</p>

      <h2>6. Compartición de Datos con Terceros</h2>
      <p>Sus datos podrán ser compartidos únicamente con:</p>
      <ul>
        <li><strong>Empresas de logística y transporte</strong> para gestionar la entrega de su pedido.</li>
        <li><strong>Proveedores de productos</strong> (Dropi Colombia) para coordinar el despacho.</li>
        <li><strong>Autoridades competentes</strong> cuando sea requerido por ley.</li>
      </ul>
      <p>No vendemos, alquilamos ni cedemos sus datos personales a terceros con fines comerciales.</p>

      <h2>7. Conservación de Datos</h2>
      <p>Sus datos serán conservados durante el tiempo necesario para cumplir con las finalidades descritas y las obligaciones legales aplicables.</p>

      <h2>8. Contacto</h2>
      <p>Para ejercer sus derechos o resolver dudas sobre esta política, contáctenos a través de nuestra página de <a href="/contacto">Contacto</a>.</p>
    `,
  },

  "politica-de-cookies": {
    title: "Política de Cookies",
    content: `
      <h1>Política de Cookies</h1>
      <p><em>Última actualización: ${new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}</em></p>

      <p>Esta política explica qué son las cookies, cómo las utilizamos en <strong>Pago Contra Entrega</strong> y cómo puede gestionarlas.</p>

      <h2>1. ¿Qué son las Cookies?</h2>
      <p>Las cookies son pequeños archivos de texto que se almacenan en su dispositivo (computador, teléfono o tableta) cuando visita un sitio web. Permiten que el sitio recuerde sus preferencias y mejore su experiencia de navegación.</p>

      <h2>2. Tipos de Cookies que Utilizamos</h2>

      <h3>Cookies Estrictamente Necesarias</h3>
      <p>Son indispensables para el funcionamiento del sitio. Sin ellas, servicios como el carrito de compras no funcionarían correctamente. No requieren su consentimiento.</p>
      <ul>
        <li><strong>Sesión de usuario:</strong> Mantiene su sesión activa mientras navega.</li>
        <li><strong>Carrito de compras:</strong> Recuerda los productos que ha agregado.</li>
        <li><strong>Preferencias de idioma y moneda:</strong> Guarda sus configuraciones.</li>
      </ul>

      <h3>Cookies Analíticas</h3>
      <p>Nos ayudan a entender cómo los visitantes interactúan con el sitio, qué páginas visitan con más frecuencia y si encuentran errores. Utilizamos esta información para mejorar el sitio.</p>
      <ul>
        <li><strong>Google Analytics:</strong> Analiza el tráfico y comportamiento de los usuarios de forma anónima.</li>
      </ul>

      <h3>Cookies de Marketing</h3>
      <p>Se utilizan para mostrarle publicidad relevante en otros sitios web y medir la efectividad de nuestras campañas.</p>
      <ul>
        <li><strong>Google Ads:</strong> Seguimiento de conversiones y remarketing.</li>
        <li><strong>Facebook Pixel:</strong> Seguimiento de conversiones en redes sociales.</li>
      </ul>

      <h2>3. Cómo Gestionar las Cookies</h2>
      <p>Puede controlar y eliminar las cookies desde la configuración de su navegador:</p>
      <ul>
        <li><strong>Google Chrome:</strong> Configuración → Privacidad y seguridad → Cookies.</li>
        <li><strong>Mozilla Firefox:</strong> Opciones → Privacidad y seguridad → Cookies.</li>
        <li><strong>Safari:</strong> Preferencias → Privacidad → Cookies.</li>
        <li><strong>Microsoft Edge:</strong> Configuración → Privacidad → Cookies.</li>
      </ul>
      <p>Tenga en cuenta que deshabilitar ciertas cookies puede afectar la funcionalidad del sitio, como el carrito de compras.</p>

      <h2>4. Cookies de Terceros</h2>
      <p>Algunos de nuestros socios (Google, Facebook) pueden instalar cookies en su dispositivo cuando visita nuestro sitio. Estas cookies están sujetas a las políticas de privacidad de dichos terceros.</p>

      <h2>5. Actualizaciones</h2>
      <p>Podemos actualizar esta política periódicamente. Le recomendamos revisarla con regularidad.</p>

      <h2>6. Contacto</h2>
      <p>Si tiene preguntas sobre nuestra política de cookies, contáctenos a través de nuestra página de <a href="/contacto">Contacto</a>.</p>
    `,
  },

  "contacto": {
    title: "Contacto",
    content: `
      <h1>Contáctanos</h1>
      <p>Estamos aquí para ayudarte. Si tienes preguntas sobre un pedido, un producto o cualquier otro asunto, no dudes en comunicarte con nosotros a través de los siguientes canales:</p>

      <h2>📱 WhatsApp (Canal Principal)</h2>
      <p>La forma más rápida de contactarnos es por <strong>WhatsApp</strong>. Nuestro equipo de atención al cliente responde de lunes a sábado de <strong>8:00 a.m. a 8:00 p.m.</strong></p>
      <p>Haz clic en el botón de WhatsApp en la esquina inferior de la pantalla o escríbenos directamente.</p>

      <h2>📦 Rastreo de Pedidos</h2>
      <p>Para consultar el estado de tu pedido, visita nuestra página de <a href="/rastrear">Rastrear mi Pedido</a> e ingresa tu número de seguimiento.</p>

      <h2>🕐 Horarios de Atención</h2>
      <ul>
        <li><strong>Lunes a viernes:</strong> 8:00 a.m. – 8:00 p.m.</li>
        <li><strong>Sábados:</strong> 9:00 a.m. – 5:00 p.m.</li>
        <li><strong>Domingos y festivos:</strong> Atención limitada por WhatsApp.</li>
      </ul>

      <h2>📍 Cobertura</h2>
      <p>Realizamos envíos a <strong>todo Colombia</strong>: más de 1.000 municipios en los 32 departamentos del país. Ciudades principales como Bogotá, Medellín, Cali, Barranquilla, Cartagena, Bucaramanga, Pereira, Manizales y muchas más.</p>

      <h2>❓ Preguntas Frecuentes</h2>

      <p><strong>¿Cómo funciona el pago contra entrega?</strong><br/>
      Realizas tu pedido en el sitio, nosotros te lo enviamos y pagas en efectivo al mensajero cuando lo recibes en tu puerta. Sin pagos anticipados, sin tarjeta de crédito.</p>

      <p><strong>¿Cuánto tarda el envío?</strong><br/>
      Entre 3 y 7 días hábiles dependiendo de tu ciudad. Ciudades principales: 2 a 4 días.</p>

      <p><strong>¿Qué pasa si no me gusta el producto?</strong><br/>
      Tienes 7 días para reportar cualquier inconformidad. Gestionamos cambios o devoluciones sin complicaciones.</p>

      <p><strong>¿Puedo cancelar mi pedido?</strong><br/>
      Sí, puedes cancelar tu pedido antes de que sea despachado. Contáctanos lo antes posible por WhatsApp.</p>

      <p><strong>¿Hacen envíos a municipios pequeños?</strong><br/>
      Sí, llegamos a más de 1.000 municipios en todo el territorio colombiano.</p>
    `,
  },
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function SitePage() {
  const [location] = useLocation();
  const slug = location.replace(/^\//, "");

  const { data: page, isLoading } = trpc.sitePages.bySlug.useQuery({ slug });

  // Contenido a mostrar: primero BD, luego contenido por defecto
  const defaultPage = DEFAULT_PAGES[slug];
  const title = page?.title ?? defaultPage?.title ?? "Página";
  const content = page?.content ?? defaultPage?.content ?? "";
  const hasContent = !!page || !!defaultPage;

  // SEO dinámico
  if (typeof document !== "undefined" && title) {
    document.title = `${title} | Pago Contra Entrega`;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: "var(--background)" }}>
        <Navbar />
        <div className="container py-20 flex justify-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--brand-gold)", borderTopColor: "transparent" }} />
        </div>
        <Footer />
      </div>
    );
  }

  if (!hasContent) {
    return (
      <div className="min-h-screen" style={{ background: "var(--background)" }}>
        <Navbar />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: "var(--brand-navy)" }}>Página no encontrada</h1>
          <a href="/" className="text-sm hover:underline" style={{ color: "var(--brand-gold)" }}>← Volver al inicio</a>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Navbar />

      {/* Hero de página */}
      <div className="py-10" style={{ background: "var(--brand-navy)" }}>
        <div className="container">
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white">{title}</h1>
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs mt-2" style={{ color: "oklch(0.75 0.01 240)" }}>
            <a href="/" className="hover:text-white transition-colors">Inicio</a>
            <span>/</span>
            <span className="text-white">{title}</span>
          </nav>
        </div>
      </div>

      {/* Contenido */}
      <main className="container py-10">
        <div className="max-w-3xl mx-auto">
          <article
            className="bg-white rounded-2xl shadow-sm border p-8 md:p-12 prose prose-gray max-w-none
              prose-headings:font-display prose-headings:text-gray-900
              prose-h1:text-3xl prose-h1:mb-2
              prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-3 prose-h2:border-b prose-h2:pb-2
              prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2
              prose-p:text-gray-600 prose-p:leading-relaxed prose-p:mb-4
              prose-li:text-gray-600 prose-li:leading-relaxed
              prose-strong:text-gray-800
              prose-a:no-underline hover:prose-a:underline"
            style={{ "--tw-prose-links": "var(--brand-gold)" } as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
