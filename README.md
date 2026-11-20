# Portafolio — Cristian Solano

Portafolio personal de Cristian Solano, desarrollador full stack (automatización e IA). Bilingüe (español / inglés), con un video de fondo en el inicio y animaciones ligadas al scroll.

## Stack

- React 19 + TypeScript + Vite
- GSAP + ScrollTrigger y Lenis para las animaciones y el scroll suave
- Tipografía: Archivo (Google Fonts), usando su eje de ancho variable

## Comandos

```bash
npm install
npm run dev      # servidor local en http://localhost:5173
npm run build    # compila a dist/
npm run preview  # sirve dist/ para revisarlo
npm run lint     # oxlint
```

## Dónde cambiar cosas

| Qué | Archivo |
| --- | --- |
| Textos (ES/EN), proyectos, enlaces, herramientas | `src/content.ts` |
| Logos y enlaces oficiales de cada herramienta | `src/tools.ts` |
| Lo que sabe el asistente de IA sobre ti | `server/perfil.ts` |
| Estructura de la página | `src/App.tsx` |
| Animaciones de entrada y de scroll | `src/animations.ts` |
| Colores, tipografía y estilos | `src/index.css` (variables al inicio) |
| Capturas de proyectos | `public/projects/` |
| Video del inicio y su imagen fija | `public/media/` |
| Imagen para compartir (1200×630) | `public/og-image.jpg` |

## Animaciones

- Al cargar: el nombre sube y pasa de ancho condensado a extendido.
- Al bajar desde el inicio: el video se acerca y se oscurece.
- Una línea a la izquierda se llena con el scroll y enciende el punto de cada sección.
- Un Cristian 8-bit recorre esa línea: baja de frente al hacer scroll hacia abajo, sube de espaldas al subir, parpadea cuando paras y salta y dice algo al llegar a cada sección (en celular solo salta). Su dibujo está en `src/sprite.ts` y su comportamiento en `src/Buddy.tsx`.
- "Sobre mí": un Cristian 3D saluda. Al seguir bajando se pixela, se encoge y vuela hasta la línea, donde lo reemplaza el Cristian 8-bit. Está en `src/Avatar3D.tsx` (scroll y transformación) y `src/avatarScene.ts` (three.js). three.js y el modelo solo se descargan al acercarte a la sección; mientras tanto, y con "reducir movimiento", se ve la imagen fija.
- "Qué hago": cada diagrama de flujo se enciende paso a paso y un pulso recorre las conexiones.
- Proyectos: las capturas se abren como un obturador y se desplazan levemente (parallax).
- Experiencia: la línea de tiempo se dibuja con el scroll.
- Si el sistema tiene activado "reducir movimiento", la página se muestra quieta y el video en pausa.

## Imágenes y video generados con Higgsfield

- `public/media/hero.mp4`, `hero.webm` y `hero-poster.webp`: video en bucle del inicio (imagen con Nano Banana Pro, animada con Seedance 2.0).
- `public/media/avatar.webp` y `avatar-idle|thinking|talking.{webm,mp4}`: el avatar pixel art del chat (retrato con Nano Banana Pro a partir del Cristian 8-bit, animado con Seedance 2.0). El chat muestra "thinking" mientras espera la respuesta y "talking" mientras la escribe.
- `public/media/avatar-3d.glb` y `avatar-3d.webp`: el avatar 3D con su saludo. La figura de cuerpo completo se generó con Nano Banana Pro y se convirtió a 3D con SAM 3D (Higgsfield); el esqueleto, el saludo y la imagen fija se hicieron en Blender. Los originales editables están en `modelo-3d/` (`avatar-cristian.blend`).
- `public/projects/gestion.webp`: portada del proyecto *Gestión Operativa Campuslands*.
- Los logos de herramientas vienen de [Simple Icons](https://simpleicons.org); la taza de Java sale de su versión 6.23.0, la última que la tenía. Groq y Scrum no tienen logo ahí y muestran su nombre.
- `public/og-image.jpg`: fondo generado con Higgsfield; el texto se añadió aparte con la fuente Archivo.

## Asistente de IA

El botón "Pregúntale a mi IA" abre un chat que responde sobre Cristian usando `openai/gpt-oss-120b` en Groq (si existe `GROQ_API_KEY`) o, como alternativa, Claude Haiku 5.5 de Anthropic (si solo existe `ANTHROPIC_API_KEY`). No hay entrenamiento: en cada pregunta el modelo recibe la ficha de `server/perfil.ts` y solo puede responder con lo que dice ahí. Para cambiar lo que sabe, edita ese archivo.

Cómo está armado:

- `src/Chat.tsx`: la ventana del chat.
- `functions/api/chat.ts`: la función de Cloudflare que atiende `POST /api/chat`. La clave de la API vive solo ahí, nunca llega al navegador.
- `server/chat.ts`: validaciones y defensas. `server/prompt.ts`: las reglas del asistente.

Defensas contra abuso y prompt injection:

- Solo responde sobre Cristian. Si la pregunta es de otro tema, el servidor devuelve siempre el mismo mensaje fijo, sin que el modelo lo redacte.
- La pregunta del visitante va encerrada en `<pregunta>` y se neutralizan los signos `< >`, para que no pueda cerrar esa etiqueta ni inventar otras.
- El historial lo guarda el navegador, pero cada respuesta del asistente va firmada (HMAC). Si alguien intenta inyectar respuestas falsas del asistente, el servidor rechaza la conversación.
- Un código secreto (canario) vive solo en las instrucciones. Si aparece en una respuesta, o aparecen fragmentos de las reglas, la respuesta se descarta.
- Preguntas de máximo 500 caracteres, solo las últimas 5 preguntas y respuestas como contexto, y un límite de longitud en las respuestas.
- Solo acepta peticiones desde el mismo dominio del portafolio (o `localhost` al desarrollar).
- Límite de 10 preguntas por minuto por visitante. Este límite vive en la memoria de cada instancia, así que es un freno básico: en producción conviene sumar la regla de Cloudflare indicada abajo.
- No da teléfono, salario ni datos personales: remite al correo.

### Probarlo en tu PC

1. Crea tu clave en https://console.groq.com/keys.
2. Copia `.dev.vars.example` como `.dev.vars` y pega la clave ahí (`GROQ_API_KEY="gsk_..."`). Ese archivo no se sube a git.
3. En una terminal: `npm run build` y luego `npm run dev:api` (la función queda en el puerto 8788).
4. En otra terminal: `npm run dev` y abre http://localhost:5173.
5. Opcional: con la función corriendo, `npm run probar:asistente` lanza 20 preguntas de ataque, fuera de tema y válidas, y te dice cuáles pasan (tarda unos dos minutos y medio).

### Publicarlo en Cloudflare Pages

1. En Cloudflare: Workers & Pages → Create → Pages → conecta el repositorio de GitHub.
2. Build command: `npm run build`. Build output directory: `dist`. La carpeta `functions/` se detecta sola.
3. En el proyecto: Settings → Variables and Secrets (en algunas cuentas aparece como Environment variables) → Add, tipo **Secret**, nombre `GROQ_API_KEY`, valor tu clave, en Production. Vuelve a desplegar para que la tome.
   - Alternativa desde la terminal: `npx wrangler login` y luego `npx wrangler pages secret put GROQ_API_KEY --project-name portafolio-cristian` (te pide la clave sin mostrarla).
4. Si usas un dominio propio, funciona sin cambios. Solo si llamas a la API desde otro dominio distinto, agrega la variable `ALLOWED_ORIGINS` con esos dominios separados por comas.
5. Recomendado: si el sitio usa un dominio propio en Cloudflare, en Security → WAF → Rate limiting rules crea una regla para la ruta `/api/chat` (por ejemplo, 20 peticiones por minuto por IP).
6. Pon un límite de gasto en tu cuenta de Groq (o de Anthropic), para que un abuso nunca te cueste más de lo que decidas.

## Antes de publicar

En `index.html`, cambia `content="/og-image.jpg"` de `og:image` por la URL completa del sitio (por ejemplo `https://tu-dominio.vercel.app/og-image.jpg`), para que LinkedIn y WhatsApp muestren la vista previa.
