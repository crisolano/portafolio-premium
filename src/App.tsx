import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { animate, smoothScroll } from './animations'
import Avatar3D from './Avatar3D'
import Buddy from './Buddy'
import Chat from './Chat'
import { TOOLS } from './tools'
import { content, links, projects, type Lang } from './content'

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

// Hover colour for a logo: its brand colour, or near-white when the brand is black,
// since the hovered tile is dark.
function brandColor(hex?: string) {
  if (!hex) return '#eef1f4'
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.12 ? '#eef1f4' : hex
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => (navigator.language.startsWith('en') ? 'en' : 'es'))
  const [copied, setCopied] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const t = content[lang]

  useEffect(smoothScroll, [])

  // Re-run on language change: the animated nodes (words, lines) are new ones.
  useEffect(() => {
    document.documentElement.lang = lang
    return animate(root.current!)
  }, [lang])

  // The hero film only plays while the hero is on screen; decoding it off screen
  // competes with scrolling for no visible gain.
  useEffect(() => {
    const film = video.current!
    if (reducedMotion()) {
      film.pause()
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void film.play().catch(() => {})
      else film.pause()
    })
    observer.observe(film)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 2200)
    return () => clearTimeout(id)
  }, [copied])

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(links.email)
      setCopied(true)
    } catch {
      location.href = `mailto:${links.email}`
    }
  }

  return (
    <div ref={root}>
      <a className="skip" href="#about">{lang === 'es' ? 'Saltar al contenido' : 'Skip to content'}</a>
      <div className="progress" aria-hidden="true" />

      <header className="nav is-dark">
        <a href="#top" className="nav-name">Cristian Solano</a>
        <nav aria-label={lang === 'es' ? 'Secciones' : 'Sections'}>
          <a href="#about">{t.nav.about}</a>
          <a href="#work">{t.nav.work}</a>
          <a href="#career">{t.nav.career}</a>
          <a href="#contact">{t.nav.contact}</a>
          <button type="button" className="nav-lang" onClick={() => setLang(lang === 'es' ? 'en' : 'es')} aria-label={t.switchLang}>
            {lang === 'es' ? 'EN' : 'ES'}
          </button>
        </nav>
      </header>

      <main>
        <section className="hero" id="top">
          <video
            ref={video}
            className="hero-video"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/media/hero-poster.webp"
            aria-hidden="true"
          >
            <source src="/media/hero.webm" type="video/webm" />
            <source src="/media/hero.mp4" type="video/mp4" />
          </video>
          <div className="hero-shade" aria-hidden="true" />
          <div className="hero-inner">
            <p className="hero-role">{t.role}</p>
            <h1 className="hero-name">
              <span className="mask"><span className="hero-line">Cristian</span></span>
              <span className="mask"><span className="hero-line">Solano</span></span>
            </h1>
            <div className="hero-foot">
              <p className="hero-summary">{t.heroSummary}</p>
              <div className="hero-actions">
                <a className="btn btn-solid" href="#work">{t.viewWork}</a>
                <a className="btn btn-ghost" href={links.cv} download>{t.downloadCv}</a>
              </div>
            </div>
          </div>
          <p className="hero-place">{t.place}</p>
        </section>

        <div className="flow">
          <div className="flow-track" aria-hidden="true">
            <div className="flow-fill" />
            <Buddy lines={t.buddy} />
          </div>

          <section className="block about" id="about">
            <span className="node" aria-hidden="true" />
            <h2 className="heading"><span className="mask"><span>{t.aboutTitle}</span></span></h2>
            <div className="about-grid">
              <p className="about-text">
                {t.about.split(' ').map((w, i) => <span className="word" key={i}>{w} </span>)}
              </p>
              <div className="about-side">
                <Avatar3D hello={t.avatarHello} alt={t.avatarAlt} />
                <dl className="facts">
                  {t.facts.map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </section>

          <section className="block what" id="what">
            <span className="node" aria-hidden="true" />
            <h2 className="heading"><span className="mask"><span>{t.whatTitle}</span></span></h2>
            <div className="what-grid">
              {t.what.map((f) => (
                <article className="service" key={f.title}>
                  <ol className="pipeline" aria-label={f.nodes.map(([a]) => a).join(', ')}>
                    {f.nodes.map(([name, detail]) => (
                      <li className="pipe-node" key={name}>
                        <strong>{name}</strong>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ol>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                  <ul className="tags">{f.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
                </article>
              ))}
            </div>
          </section>

          <section className="block work" id="work">
            <span className="node" aria-hidden="true" />
            <h2 className="heading"><span className="mask"><span>{t.workTitle}</span></span></h2>
            <p className="lede">{t.workIntro}</p>
            <div className="projects">
              {projects.map((p, i) => (
                <article className={`project${i === 0 ? ' is-featured' : ''}`} key={p.title}>
                  <figure className="shot">
                    <img src={p.img} alt={p.title} loading="lazy" width={1280} height={800} />
                  </figure>
                  <div className="project-body">
                    <h3>{p.title}</h3>
                    <p>{t.projects[i]}</p>
                    <ul className="tags">{p.tools.map((tool) => <li key={tool}>{tool}</li>)}</ul>
                    <p className="project-links">
                      {p.demo && <a className="btn btn-solid" href={p.demo} target="_blank" rel="noreferrer">{t.demo}</a>}
                      <a className="btn btn-line" href={p.repo} target="_blank" rel="noreferrer">{t.repo}</a>
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="block career" id="career">
            <span className="node" aria-hidden="true" />
            <h2 className="heading"><span className="mask"><span>{t.careerTitle}</span></span></h2>
            <ol className="timeline">
              {t.career.map((c) => (
                <li className={`step${c.when === 'now' ? ' is-now' : ''}`} key={c.role}>
                  <p className="step-when">{c.when === 'now' ? t.now : c.when}</p>
                  <div>
                    <h3>{c.role}</h3>
                    <p className="step-place">{c.place}</p>
                    <p>{c.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="block stack">
            <span className="node" aria-hidden="true" />
            <h2 className="heading"><span className="mask"><span>{t.stackTitle}</span></span></h2>
            <p className="lede">{t.stackIntro}</p>
            <dl className="stack-grid">
              {t.stack.map(([group, items]) => (
                <div className="stack-group" key={group}>
                  <dt>{group}</dt>
                  <dd>
                    <ul className="logos">
                      {items.map((name) => {
                        const tool = TOOLS[name]
                        return (
                          <li key={name}>
                            <a
                              className="logo"
                              href={tool.url}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`${name}, ${t.officialSite}`}
                              style={{ '--brand': brandColor(tool.hex) } as CSSProperties}
                            >
                              {tool.path
                                ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d={tool.path} /></svg>
                                : <span className="logo-word" aria-hidden="true">{name}</span>}
                              <span className="logo-name" aria-hidden="true">{name}</span>
                            </a>
                          </li>
                        )
                      })}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </main>

      <footer className="contact" id="contact">
        <h2 className="contact-title">{t.contactTitle}</h2>
        <p className="contact-text">{t.contactText}</p>
        <div className="contact-mail">
          <a href={`mailto:${links.email}`}>{links.email}</a>
          <button type="button" className="btn btn-ghost" onClick={copyEmail}>{copied ? t.copied : t.copy}</button>
          <span className="sr-only" aria-live="polite">{copied ? t.copied : ''}</span>
        </div>
        <div className="contact-grid">
          <p>
            <a href={links.github} target="_blank" rel="noreferrer">GitHub</a>
            <a href={links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
            <a href={links.cv} download>{t.downloadCv}</a>
          </p>
          <p>{t.place}<br />{t.langs}</p>
          <p>{t.madeBy}<br />© 2026</p>
        </div>
      </footer>

      <Chat lang={lang} />
    </div>
  )
}
