import { CANARY, OFF_TOPIC, ON_TOPIC, REFUSAL, SYSTEM_PROMPT } from './prompt'

export type Env = {
  /** Groq key. If set, the assistant uses Groq; otherwise it uses Anthropic. */
  GROQ_API_KEY?: string
  ANTHROPIC_API_KEY?: string
  /** Optional: signs the assistant's replies. Falls back to a key derived from the API key. */
  CHAT_SECRET?: string
  /** Optional: extra origins allowed to call the API, comma separated (e.g. a custom domain). */
  ALLOWED_ORIGINS?: string
  /** Optional Cloudflare rate limiting binding. Without it, a per-instance limit applies. */
  CHAT_RATE_LIMITER?: { limit: (options: { key: string }) => Promise<{ success: boolean }> }
}

type Lang = 'es' | 'en'
type Turn = { role: 'user' | 'assistant'; content: string; sig?: string }

export const MODEL = 'claude-haiku-5-5'
// Groq's larger production text model: follows long rules more reliably than gpt-oss-20b.
export const GROQ_MODEL = 'openai/gpt-oss-120b'
const MAX_BODY_BYTES = 16_000
const MAX_TURNS = 10 // sent to the model: the last five questions and answers
const MAX_USER_CHARS = 500
const MAX_ASSISTANT_CHARS = 1_500
const LOCAL_LIMIT = { requests: 10, windowMs: 60_000 }

const ERRORS = {
  es: {
    bad: 'No pude leer tu mensaje. Recarga la página e inténtalo de nuevo.',
    long: `Tu pregunta es muy larga. Resúmela en menos de ${MAX_USER_CHARS} caracteres.`,
    origin: 'Este chat solo responde desde el portafolio de Cristian.',
    rate: 'Has enviado muchas preguntas seguidas. Espera un minuto e inténtalo de nuevo.',
    busy: 'El asistente está recibiendo muchas preguntas en este momento. Inténtalo de nuevo en un minuto.',
    config: 'Mi versión con IA todavía no está configurada. Mientras tanto, escríbeme por correo.',
    upstream: 'El asistente no está disponible en este momento. Inténtalo de nuevo en unos minutos.',
  },
  en: {
    bad: 'I could not read your message. Reload the page and try again.',
    long: `Your question is too long. Keep it under ${MAX_USER_CHARS} characters.`,
    origin: "This chat only answers from Cristian's portfolio.",
    rate: 'You have sent many questions in a row. Wait a minute and try again.',
    busy: 'The assistant is getting many questions right now. Try again in a minute.',
    config: 'My AI version is not set up yet. In the meantime, email me.',
    upstream: 'The assistant is not available right now. Try again in a few minutes.',
  },
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })

// ---------- signing: the browser keeps the history, but cannot forge the assistant's turns ----------

const encoder = new TextEncoder()

async function hmacKey(env: Env) {
  const secret = env.CHAT_SECRET || `chat-history:${env.GROQ_API_KEY ?? env.ANTHROPIC_API_KEY}`
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

const toBase64Url = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const fromBase64Url = (text: string) => {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0))
}

export async function sign(env: Env, content: string) {
  return toBase64Url(await crypto.subtle.sign('HMAC', await hmacKey(env), encoder.encode(content)))
}

async function verify(env: Env, content: string, sig: string) {
  try {
    return await crypto.subtle.verify('HMAC', await hmacKey(env), fromBase64Url(sig), encoder.encode(content))
  } catch {
    return false
  }
}

// ---------- request checks ----------

function originAllowed(request: Request, env: Env) {
  const origin = request.headers.get('origin')
  if (!origin) return false
  let url: URL
  try {
    url = new URL(origin)
  } catch {
    return false
  }
  if (url.host === new URL(request.url).host) return true
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true
  const extra = (env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean)
  return extra.includes(url.origin)
}

const hits = new Map<string, number[]>()

async function rateLimited(request: Request, env: Env) {
  const ip = request.headers.get('cf-connecting-ip') ?? 'local'
  if (env.CHAT_RATE_LIMITER) {
    const { success } = await env.CHAT_RATE_LIMITER.limit({ key: ip })
    return !success
  }
  // Fallback: per instance only, so it is a speed bump rather than a hard limit.
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < LOCAL_LIMIT.windowMs)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5_000) hits.clear()
  return recent.length > LOCAL_LIMIT.requests
}

// Angle brackets are swapped for look-alikes so a visitor cannot close <pregunta> or open fake tags.
const neutralize = (text: string) => text.replace(/</g, '‹').replace(/>/g, '›')

async function parseTurns(raw: unknown, env: Env): Promise<Turn[] | 'long' | null> {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 40) return null
  const turns: Turn[] = []
  for (const [i, item] of raw.entries()) {
    if (!item || typeof item !== 'object') return null
    const { role, content, sig } = item as Record<string, unknown>
    if (typeof content !== 'string') return null
    const text = content.trim()
    const expected: Turn['role'] = i % 2 === 0 ? 'user' : 'assistant'
    if (role !== expected || !text) return null
    if (expected === 'user' && text.length > MAX_USER_CHARS) return 'long'
    if (expected === 'assistant') {
      if (text.length > MAX_ASSISTANT_CHARS || typeof sig !== 'string') return null
      if (!(await verify(env, text, sig))) return null
    }
    turns.push({ role: expected, content: text })
  }
  // The conversation must end with the visitor's new question.
  if (turns[turns.length - 1].role !== 'user') return null
  return turns.slice(-MAX_TURNS + 1)
}

// ---------- reply checks ----------

// Messages that try to override the rules or ask about the hidden text. They are refused
// before reaching the model, so no wording trick gets a chance to work.
const INJECTION_PATTERNS = [
  /\b(ignore|disregard|forget|override|bypass)\b[^.?!\n]{0,40}\b(instructions?|rules?|prompt|context|above|previous|prior)\b/i,
  /\b(ignora|ignorá|olvida|olvidá|omite|salta|anula|descarta)\w*\b[^.?!\n]{0,40}\b(instrucci\w*|reglas?|prompt|contexto|arriba|anterior\w*|previ\w*)\b/i,
  /\b(system|initial|hidden|original|your)\s+(prompt|instructions?|message)\b/i,
  /\b(prompt|instrucciones|mensaje)\s+(del\s+sistema|inicial|oculto|original)\b/i,
  /\b(tus|sus)\s+(instrucciones|reglas|prompt)\b/i,
  /\b(written|said|text|says|stated)\b[^.?!\n]{0,30}\b(above|beginning|start|before this)\b/i,
  /\b(page|text|document|message|conversation|context)\s+(above|before)\b/i,
  /\b(escrito|dice|texto|aparece)\b[^.?!\n]{0,30}\b(arriba|al\s+(principio|inicio|comienzo)|antes\s+de\s+esto)\b/i,
  /\b(p[aá]gina|texto|documento|mensaje|conversaci[oó]n|contexto)\s+(de\s+)?(arriba|anterior)\b/i,
  /\b(developer|debug|god|admin|dan)\s+mode\b|\bmodo\s+(desarrollador|depuraci[oó]n|admin\w*|dios)\b|\bjailbreak\b/i,
  /<\/?(pregunta|reglas|perfil|system)\b/i,
]

export const isInjection = (text: string) => INJECTION_PATTERNS.some((pattern) => pattern.test(text))

// Signs that a reply quotes or describes the hidden instructions instead of answering.
const LEAK_PATTERNS = [
  /<\/?(reglas|perfil|pregunta)\b/i,
  /^\s*#{1,3}\s/m,
  /perfil profesional["”»]|["“«]\s*cristian solano\s*[—–-]/i,
  /\b(c[oó]digo interno|internal (control )?code)\b/i,
  /\b(system prompt|prompt del sistema|mis instrucciones|my instructions|my system message)\b/i,
  /\b(the|this)\s+(page|text|document|prompt|context)\s+(begins|starts|opens)\b/i,
  /\b(la|esta)\s+(p[aá]gina|texto|documento|prompt)\s+(empieza|comienza|inicia|abre)\b/i,
  /\b(el|este)\s+(texto|documento|prompt|contexto)\s+(empieza|comienza|inicia|abre)\b/i,
]


function cleanReply(raw: string, lang: Lang) {
  const text = raw.trim()
  const [first, ...rest] = text.split('\n')
  const marker = first.trim()
  if (marker === OFF_TOPIC) return { reply: REFUSAL[lang], offTopic: true }
  const body = (marker === ON_TOPIC ? rest.join('\n') : text).trim()
  const leaked =
    body.includes(CANARY) ||
    body.includes(ON_TOPIC) ||
    body.includes(OFF_TOPIC) ||
    LEAK_PATTERNS.some((pattern) => pattern.test(body))
  if (!body || leaked) return { reply: REFUSAL[lang], offTopic: true }
  return { reply: body.replace(/\*\*/g, '').slice(0, MAX_ASSISTANT_CHARS), offTopic: false }
}

// ---------- model providers ----------

type ModelMessage = { role: 'user' | 'assistant'; content: string }

class UpstreamError extends Error {
  status: number
  constructor(status: number) {
    super(`Upstream error ${status}`)
    this.status = status
  }
}

async function post(fetcher: typeof fetch, url: string, headers: Record<string, string>, body: unknown, retries = 1): Promise<unknown> {
  let res: Response
  try {
    res = await fetcher(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
  } catch {
    throw new UpstreamError(0)
  }
  // A per-minute token quota usually frees up within seconds: wait once (up to 8 s, while the
  // avatar shows it is thinking) if the provider says so.
  const wait = Number(res.headers.get('retry-after'))
  if (res.status === 429 && retries > 0 && wait > 0 && wait <= 8) {
    await new Promise((resolve) => setTimeout(resolve, wait * 1000))
    return post(fetcher, url, headers, body, retries - 1)
  }
  if (!res.ok) {
    console.error('Model API error', res.status, await res.text().catch(() => ''))
    throw new UpstreamError(res.status)
  }
  return res.json()
}

async function askAnthropic(key: string, messages: ModelMessage[], fetcher: typeof fetch) {
  const data = (await post(fetcher, 'https://api.anthropic.com/v1/messages', { 'x-api-key': key, 'anthropic-version': '2023-06-01' }, {
    model: MODEL, max_tokens: 450, temperature: 0.3, system: SYSTEM_PROMPT, messages,
  })) as { content?: { type: string; text?: string }[] }
  return (data.content ?? []).filter((block) => block.type === 'text').map((block) => block.text ?? '').join('')
}

async function askGroq(key: string, messages: ModelMessage[], fetcher: typeof fetch) {
  const data = (await post(fetcher, 'https://api.groq.com/openai/v1/chat/completions', { authorization: `Bearer ${key}` }, {
    model: GROQ_MODEL,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    // gpt-oss reasons briefly before answering and those tokens count here. Groq also counts
    // this cap against the per-minute token quota, so it is kept just above what is needed.
    max_completion_tokens: 600,
    reasoning_effort: 'low',
    include_reasoning: false,
    temperature: 0.3,
  })) as { choices?: { message?: { content?: string | null } }[] }
  return data.choices?.[0]?.message?.content ?? ''
}

// ---------- handler ----------

export async function handleChat(request: Request, env: Env, fetcher: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: { messages?: unknown; lang?: unknown }
  const declaredLang = request.headers.get('accept-language')?.startsWith('en') ? 'en' : 'es'
  try {
    const text = await request.text()
    if (encoder.encode(text).length > MAX_BODY_BYTES) return json({ error: ERRORS[declaredLang].long }, 413)
    body = JSON.parse(text)
  } catch {
    return json({ error: ERRORS[declaredLang].bad }, 400)
  }
  const lang: Lang = body.lang === 'en' ? 'en' : 'es'
  const t = ERRORS[lang]

  if (!originAllowed(request, env)) return json({ error: t.origin }, 403)
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) return json({ error: t.bad }, 415)
  if (!env.GROQ_API_KEY && !env.ANTHROPIC_API_KEY) return json({ error: t.config }, 503)
  if (await rateLimited(request, env)) return json({ error: t.rate }, 429)

  const turns = await parseTurns(body.messages, env)
  if (turns === 'long') return json({ error: t.long }, 400)
  if (!turns) return json({ error: t.bad }, 400)

  // Only the newest question is new; earlier ones already passed this check.
  if (isInjection(turns[turns.length - 1].content)) return json({ reply: REFUSAL[lang], sig: await sign(env, REFUSAL[lang]), offTopic: true })

  const messages = turns.map((turn) => ({
    role: turn.role,
    // idioma is the page language, reduced by the server to "es" or "en"; the visitor cannot inject text there.
    content: turn.role === 'user' ? `<pregunta idioma="${lang}">\n${neutralize(turn.content)}\n</pregunta>` : turn.content,
  }))

  let raw: string
  try {
    raw = env.GROQ_API_KEY ? await askGroq(env.GROQ_API_KEY, messages, fetcher) : await askAnthropic(env.ANTHROPIC_API_KEY!, messages, fetcher)
  } catch (e) {
    const status = e instanceof UpstreamError ? e.status : 0
    // 429 here is the model provider's quota, not this visitor's limit.
    return json({ error: status === 429 ? t.busy : t.upstream }, status === 429 ? 429 : 502)
  }
  const { reply, offTopic } = cleanReply(raw, lang)
  return json({ reply, sig: await sign(env, reply), offTopic })
}
