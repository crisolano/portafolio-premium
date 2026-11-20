import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import AvatarClip, { type Mood } from './AvatarClip'
import { content, type Lang } from './content'

type Turn = { role: 'user' | 'assistant'; content: string; sig?: string }

const MAX_CHARS = 500
const TYPE_STEP = 3 // characters revealed per tick while the avatar "speaks"
const TYPE_MS = 18
const NUDGE_DELAY = 1_500
const CLOSE_MS = 340 // keep in sync with the chat-collapse animation in index.css

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

// Turns the email and the few known URLs into links; everything else stays plain text.
const LINKABLE = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+|(?:https?:\/\/)?(?:github\.com\/crisolano[\w/-]*|copiloto-seguridad-vial\.vercel\.app|ricurasdelmaiz\.com))/g

function linkify(text: string): ReactNode[] {
  return text.split(LINKABLE).map((part, i) => {
    if (i % 2 === 0) return part
    const href = part.includes('@') ? `mailto:${part}` : part.startsWith('http') ? part : `https://${part}`
    return <a key={i} href={href} target={part.includes('@') ? undefined : '_blank'} rel="noreferrer">{part}</a>
  })
}

export default function Chat({ lang }: { lang: Lang }) {
  const t = content[lang].chat
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [typed, setTyped] = useState<number | null>(null) // characters shown of the last reply
  const [greet, setGreet] = useState<number | null>(null) // characters shown of the greeting
  const greeted = useRef(false)
  const [closing, setClosing] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [nudge, setNudge] = useState(false)
  const [announce, setAnnounce] = useState('')
  const titleId = useId()
  const input = useRef<HTMLTextAreaElement>(null)
  const launcher = useRef<HTMLButtonElement>(null)
  const log = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLElement>(null)

  useEffect(() => {
    if (open) input.current?.focus()
  }, [open])

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight })
  }, [turns, busy, error, typed])

  // Reveal the latest reply a few characters at a time while the avatar talks.
  const last = turns[turns.length - 1]
  useEffect(() => {
    if (typed === null || !last || last.role !== 'assistant') return
    const total = last.content.length
    const id = setTimeout(() => setTyped((n) => (n === null || n + TYPE_STEP >= total ? null : n + TYPE_STEP)), TYPE_MS)
    return () => clearTimeout(id)
  }, [typed, last])

  // The first time the chat opens, the avatar says hello: the greeting is typed out.
  useEffect(() => {
    if (greet === null) return
    const total = t.greeting.length
    const id = setTimeout(() => setGreet((n) => (n === null || n + TYPE_STEP >= total ? null : n + TYPE_STEP)), TYPE_MS * 1.6)
    return () => clearTimeout(id)
  }, [greet, t.greeting])

  // A one-time hint next to the launcher, shown a moment after the visitor scrolls past
  // the hero (over the hero it would cover the call-to-action buttons).
  useEffect(() => {
    let seen = false
    try {
      seen = sessionStorage.getItem('chat-nudge') === '1'
    } catch {
      /* storage can be unavailable; then the hint just shows */
    }
    if (seen) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const onScroll = () => {
      if (timer || scrollY < innerHeight * 0.9) return
      timer = setTimeout(() => setNudge(true), NUDGE_DELAY)
      removeEventListener('scroll', onScroll)
    }
    addEventListener('scroll', onScroll, { passive: true })
    return () => {
      removeEventListener('scroll', onScroll)
      clearTimeout(timer)
    }
  }, [])

  const dismissNudge = () => {
    setNudge(false)
    try {
      sessionStorage.setItem('chat-nudge', '1')
    } catch {
      /* ignore */
    }
  }

  const speaking = typed !== null || greet !== null
  const mood: Mood = busy ? 'thinking' : speaking ? 'talking' : 'idle'
  const status = busy ? t.status.thinking : speaking ? t.status.typing : t.status.online

  const openChat = () => {
    dismissNudge()
    setOpen(true)
    if (!greeted.current && !reducedMotion()) setGreet(0)
    greeted.current = true
  }

  // Closing plays the panel shrinking back into the launcher, then unmounts it.
  const close = () => {
    if (closing) return
    const finish = () => {
      setOpen(false)
      setClosing(false)
      launcher.current?.focus()
    }
    if (reducedMotion()) return finish()
    setClosing(true)
    closeTimer.current = setTimeout(finish, CLOSE_MS)
  }

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  // The panel grows out of the launcher's avatar and shrinks back into it: measure where
  // that avatar is, relative to the panel, before the first frame is painted.
  useLayoutEffect(() => {
    if (!open || !panel.current || !launcher.current) return
    const face = launcher.current.querySelector('.avatar-clip') ?? launcher.current
    const a = face.getBoundingClientRect()
    const p = panel.current.getBoundingClientRect()
    panel.current.style.setProperty('--origin', `${a.left + a.width / 2 - p.left}px ${a.top + a.height / 2 - p.top}px`)
  }, [open])

  const ask = async (question: string) => {
    const text = question.trim().slice(0, MAX_CHARS)
    if (!text || busy) return
    setTyped(null)
    const history: Turn[] = [...turns, { role: 'user', content: text }]
    setTurns(history)
    setDraft('')
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history, lang }),
      })
      const data = (await res.json().catch(() => ({}))) as { reply?: string; sig?: string; error?: string }
      if (!res.ok || !data.reply || !data.sig) throw new Error(data.error || t.offline)
      setTurns([...history, { role: 'assistant', content: data.reply, sig: data.sig }])
      setTyped(reducedMotion() ? null : 0)
      setAnnounce(data.reply)
    } catch (e) {
      // Give the question back so the visitor can retry without retyping it.
      setTurns(turns)
      setDraft(text)
      setError(e instanceof Error && e.message !== 'Failed to fetch' ? e.message : t.offline)
    } finally {
      setBusy(false)
      input.current?.focus()
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void ask(draft)
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void ask(draft)
    }
  }

  return (
    <>
      {nudge && !open && (
        <div className="chat-nudge" role="status">
          <button type="button" className="chat-nudge-text" onClick={openChat}>
            {t.nudge}
          </button>
          <button type="button" className="chat-nudge-close" onClick={dismissNudge} aria-label={t.hideNudge}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" /></svg>
          </button>
        </div>
      )}

      <button
        ref={launcher}
        type="button"
        className={`chat-launcher${open && !closing ? ' is-hidden' : ''}`}
        onClick={openChat}
        aria-expanded={open}
        aria-controls="chat-panel"
      >
        <AvatarClip className="chat-launcher-avatar" />
        <span>{t.launcher}</span>
      </button>

      {open && (
        <section
          ref={panel}
          id="chat-panel"
          className={`chat${turns.length > 0 ? ' is-compact' : ''}`}
          data-state={closing ? 'closing' : 'open'}
          role="dialog"
          aria-labelledby={titleId}
          onKeyDown={(e) => e.key === 'Escape' && close()}
        >
          <header className="chat-stage" data-mood={mood}>
            <button type="button" className="chat-close" onClick={close} aria-label={t.close}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            <div className="stage-avatar">
              <span className="stage-ring" aria-hidden="true" />
              <AvatarClip mood={mood} />
            </div>
            <h2 id={titleId}>{t.title}</h2>
            <p className="stage-sub">{t.subtitle}</p>
            <p className="chat-status" data-mood={mood}>
              <i aria-hidden="true" />
              {status}
              <span className="voice" aria-hidden="true"><b /><b /><b /><b /><b /></span>
            </p>
          </header>

          <div className="chat-log" ref={log}>
            <div className="msg is-bot">
              <img className="msg-avatar" src="/media/avatar.webp" alt="" width={48} height={48} />
              <p className={`bubble is-bot${greet !== null ? ' is-typing' : ''}`} onClick={greet !== null ? () => setGreet(null) : undefined}>
                {greet !== null ? t.greeting.slice(0, greet) : t.greeting}
              </p>
            </div>
            {turns.map((turn, i) => {
              const typing = i === turns.length - 1 && turn.role === 'assistant' && typed !== null
              const text = typing ? turn.content.slice(0, typed ?? 0) : turn.content
              return turn.role === 'user' ? (
                <p key={i} className="bubble is-user">{turn.content}</p>
              ) : (
                <div key={i} className="msg is-bot">
                  <img className="msg-avatar" src="/media/avatar.webp" alt="" width={48} height={48} />
                  <p
                    className={`bubble is-bot${typing ? ' is-typing' : ''}`}
                    onClick={typing ? () => setTyped(null) : undefined}
                  >
                    {linkify(text)}
                  </p>
                </div>
              )
            })}
            {busy && (
              <div className="msg is-bot">
                <img className="msg-avatar" src="/media/avatar.webp" alt="" width={48} height={48} />
                <p className="bubble is-bot is-thinking">
                  <span className="sr-only">{t.thinking}</span>
                  <i /><i /><i />
                </p>
              </div>
            )}
            <p className="sr-only" aria-live="polite">{announce}</p>
            {error && <p className="chat-error" role="alert">{linkify(error)}</p>}
            {turns.length === 0 && !busy && greet === null && (
              <ul className="chat-suggestions">
                {t.suggestions.map((s) => (
                  <li key={s}><button type="button" onClick={() => void ask(s)}>{s}</button></li>
                ))}
              </ul>
            )}
          </div>

          <form className="chat-form" onSubmit={submit}>
            <label className="sr-only" htmlFor="chat-input">{t.placeholder}</label>
            <textarea
              id="chat-input"
              ref={input}
              rows={1}
              value={draft}
              maxLength={MAX_CHARS}
              placeholder={t.placeholder}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKey}
            />
            <button type="submit" className="chat-send" disabled={busy || !draft.trim()} aria-label={t.send}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </form>
          <p className="chat-note">
            {t.note}
            {draft.length > MAX_CHARS - 80 && <span> {draft.length}/{MAX_CHARS} {t.chars}</span>}
          </p>
        </section>
      )}
    </>
  )
}
