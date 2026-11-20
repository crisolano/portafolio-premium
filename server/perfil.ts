// Everything the chat assistant may say about Cristian. It answers only from this text.
// Sources: his CV, the portfolio content and his five public GitHub repositories
// (read November 2026). Edit this file to update what the assistant knows.

export const CONTACT_EMAIL = 'solanochaparrocristian101@gmail.com'

export const PERFIL = `
## Datos generales
- Nombre: Cristian Ferney Solano Chaparro (se presenta como Cristian Solano).
- Rol: desarrollador de software junior, full stack, enfocado en automatización e IA.
- Ubicación: Piedecuesta, Santander, en el área metropolitana de Bucaramanga, Colombia.
- Idiomas: español nativo, inglés nivel C1.
- Qué busca: empleo como desarrollador. Abierto a trabajo remoto o presencial.
- Contacto: correo ${CONTACT_EMAIL}, GitHub github.com/crisolano y LinkedIn (enlace en el portafolio). La hoja de vida se descarga desde el portafolio.

## Experiencia
- Lácteos La Esmeralda, 2026 hasta hoy. Contrato de aprendizaje como practicante full stack junior: desarrollo y mantenimiento de funcionalidades en el ciclo completo (análisis, implementación, pruebas y despliegue).

## Formación
- Técnico en Desarrollo de Software, Campuslands, enero 2026 a enero 2027 (en curso). Formación intensiva por proyectos con Scrum: fundamentos de programación, bases de datos y trabajo en equipo.
- Técnico en Contabilización de Operaciones Financieras, SENA (Servicio Nacional de Aprendizaje), 2025.
- Bachiller técnico comercial, Centro de Comercio de Piedecuesta, 2025.
- Curso de programación con Python, Cisco Networking Academy.

## Herramientas que usa
- Frontend: HTML, CSS, JavaScript, TypeScript, React, Tailwind CSS, Vite, GSAP y Lenis para animaciones.
- Backend: Python (FastAPI, Django), Java (Spring Boot).
- Datos: MySQL, PostgreSQL, Supabase, SQLite.
- Automatización e IA: n8n, Claude API, Gemini API, Groq, function calling, webhooks, LangChain dentro de n8n.
- Entorno y equipo: Docker, Linux, Git, GitHub, Scrum, Gitflow. Despliega en Vercel y Cloudflare.

## Proyectos (de su GitHub, github.com/crisolano)

### 1. Copiloto de Seguridad Vial (proyecto individual)
- Qué es: copiloto de voz con IA para conductores de transporte terrestre en Colombia. El conductor habla y un agente consulta la ruta, registra novedades en formato PESV (Plan Estratégico de Seguridad Vial, Resolución 40595 de 2022) y, si hay heridos o gravedad alta, escala solo al centro de control.
- Contexto: hecho para un reto de hackathon sobre transporte inteligente y seguridad vial. Cristian es el único autor del repositorio (30 commits, construido en una jornada, junio de 2026). Demo en vivo: copiloto-seguridad-vial.vercel.app.
- Qué construyó: agente con 4 herramientas (consultar ruta, registrar novedad, reportar incidente y escalar al centro de control de forma autónoma); voz en español de Colombia con Web Speech API; inspección pre-viaje por voz con dictamen (apto, apto con precaución, no apto); telemetría con GPS, recordatorio de descanso y clima en vivo (Open-Meteo); mapa en vivo con Leaflet y OpenStreetMap; centro de control en tiempo real que ve a todos los conductores y responde por voz; cámara vial en el navegador.
- IA: tres modos según la clave configurada: reglas sin red (el modo del demo), Claude (Haiku 4.5) o Gemini (2.0 Flash), ambos con function calling.
- Sincronización: entre pestañas con localStorage y BroadcastChannel, o entre dispositivos con Supabase en tiempo real.
- Tecnologías: React, Vite, React Router, Supabase, Leaflet, Web Speech API, Claude API, Gemini API, desplegado en Vercel.

### 2. Gestión Operativa Campuslands (proyecto en equipo, hackathon)
- Qué es: MVP del hackathon de Campuslands "El campus bajo presión" que une en un solo sistema la reserva de salas (sin solapamientos ni exceso de aforo), el préstamo y devolución de equipos con trazabilidad, y el triaje de incidencias con IA (categoría, prioridad y área responsable).
- Equipo de 4 personas. El rol de Cristian fue "Dev 3, interfaz y entrega".
- Lo que hizo Cristian, según el historial del repositorio: definió el stack (Python y FastAPI), la estructura del proyecto, los sprints por desarrollador y el flujo Gitflow; escribió la guía de desarrollo y definió el orden en que se integrarían los pull requests (los merges los hacía otro integrante, el responsable de integración); construyó la interfaz web con plantillas Jinja2, HTMX y Tailwind (páginas de salas con formulario de reserva, de equipos con préstamo y devolución, y de incidencias con triaje de IA); hizo el rediseño visual con la identidad de Campuslands; endureció el Docker (usuario no root, healthcheck, puerto solo local) y completó el README de entrega.
- Del proyecto en general: FastAPI, Pydantic, SQLAlchemy, SQLite en local y PostgreSQL en el despliegue, IA con Gemini y Groq de respaldo, defensa contra inyección de prompts en el triaje, y si la IA falla la incidencia pasa a revisión manual en lugar de romperse. El equipo terminó con más de 300 pruebas automatizadas con pytest y análisis con ruff.

### 3. TalentFlow AI (repositorio de Cristian, con aportes de un compañero en la documentación)
- Qué es: sistema de preselección de candidatos. Un formulario web recibe los datos y la hoja de vida en PDF y los envía a un webhook de n8n.
- El flujo principal de n8n extrae y limpia el texto del PDF, evita postulaciones duplicadas, analiza la hoja de vida con IA (Groq vía LangChain, con salida estructurada), calcula un puntaje de compatibilidad de 0 a 100 frente a los requisitos de la vacante y guarda todo en Google Sheets.
- Un segundo flujo avisa por Telegram a recursos humanos cuando el puntaje es alto (80 o más) y envía al candidato una confirmación por Gmail con su número de ticket, sin mostrarle el puntaje.
- Un bot de Telegram con lista de usuarios autorizados responde los comandos /candidato, /pendientes, /stats y /help.
- Un dashboard web muestra métricas por vacante, estado, fecha y distribución de puntajes, sin datos personales.
- Tecnologías: n8n, Groq, LangChain, Google Sheets, Telegram Bot API, Gmail, HTML, CSS y JavaScript.

### 4. Mesa de Contenido (simulador corporativo con n8n)
- Qué es: formulario para pedir piezas de contenido corporativo (reels, posts, presentaciones) que dispara un flujo en n8n.
- El flujo asigna el responsable según el tipo de pieza (audiovisual, diseño, redacción, presentación), calcula la prioridad según la urgencia (crítica, alta, normal, backlog), adapta el formato al canal (LinkedIn, Instagram, web, correo), guarda en PostgreSQL, actualiza un tablero en Google Sheets y notifica por Gmail al responsable.
- El formulario muestra una ficha en vivo con la prioridad estimada mientras se escribe: manda la urgencia declarada, pero una fecha muy cercana sube el nivel.
- Tecnologías: React 19, TypeScript en modo estricto, Vite, Tailwind CSS v4, React Hook Form, Zod, Radix UI, n8n.

### 5. Panadería Ricuras del Maíz (proyecto individual, en producción)
- Qué es: el sitio web real de la Panadería Ricuras del Maíz, un negocio de Piedecuesta (Santander) que existe desde 2002. Está publicado en ricurasdelmaiz.com. Repositorio: github.com/crisolano/panaderia_premium. Construido en noviembre de 2026.
- Qué hace: catálogo de productos con filtros por categoría (panadería, pastelería, postres); carrito que arma el pedido y lo envía por WhatsApp, con domicilio o recogida en tienda y elección entre dos números de WhatsApp del negocio; formulario para cotizar pedidos personalizados por WhatsApp; mapa con la ubicación del local; política de privacidad y autorización de tratamiento de datos.
- Lo visual: video en la portada y un recorrido de cámara por el local que avanza y retrocede con el scroll (96 cuadros generados con Higgsfield a partir de dos fotos reales del local, dibujados en un canvas, con versiones para pantalla grande y para celular); animaciones con GSAP y Lenis.
- Calidad: SEO local (datos estructurados de tipo Bakery, sitemap, URL canónica y vista previa para redes), cabeceras de seguridad (Content Security Policy, HSTS), revisión de accesibilidad con eslint-plugin-jsx-a11y, fotos reales del negocio optimizadas en WebP y diseño responsive probado en iPhone.
- Cómo se hizo: partió de un prototipo generado con Bolt. Cristian lo auditó y lo reconstruyó: quitó precios, testimonios e historia inventados, corrigió el carrito, los formularios y la accesibilidad, y dejó solo información confirmada por el negocio.
- Tecnologías: React, TypeScript, Vite, Tailwind CSS, GSAP, Lenis, Higgsfield; desplegado en Cloudflare Workers.

### Otros repositorios (ejercicios y proyectos de formación)
- Ricuras del Maíz, primera versión (pagweb-panaderia): la primera página de la panadería, en HTML, CSS y JavaScript, con catálogo y carrito. La reemplazó el sitio en producción.
- Acme School (equipo de 3): sistema web en JavaScript con inicio de sesión y gestión de usuarios para estudiantes, guardando los datos en localStorage.
- Sistema de gestión de herramientas (ferreteria): programa de consola en Python para gestionar el préstamo de herramientas en una comunidad vecinal, con datos en JSON y reportes.
- Explora Colombia (apicolombia-trabajo): página en JavaScript que consume la API pública API Colombia.
- Agroflow: proyecto en equipo con Scrum sobre el movimiento de alimentos entre productores, transportistas y compradores. Cristian fue el Product Owner y el repositorio contiene el product backlog.
- Diario de viaje: ejercicio de Markdown y Git.

## Este portafolio
- Hecho por Cristian con React, TypeScript, Vite, GSAP y Lenis. El video del inicio se generó con IA (Higgsfield). Tiene un Cristian en 8 bits que recorre la página y este asistente de IA.
`.trim()
