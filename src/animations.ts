import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

gsap.registerPlugin(ScrollTrigger)

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches

export function smoothScroll() {
  if (still()) return
  gsap.ticker.lagSmoothing(0)
  const lenis = new Lenis({ anchors: true })
  lenis.on('scroll', ScrollTrigger.update)
  const tick = (t: number) => lenis.raf(t * 1000)
  gsap.ticker.add(tick)
  return () => {
    gsap.ticker.remove(tick)
    lenis.destroy()
  }
}

// The nav switches to light text while it sits over a dark section.
function navTheme(root: HTMLElement) {
  const nav = root.querySelector<HTMLElement>('.nav')!
  const triggers: ScrollTrigger[] = []
  // A trigger can fire onToggle while it is being created, so read the list lazily.
  const update = () => nav.classList.toggle('is-dark', triggers.some((t) => t.isActive))
  for (const section of root.querySelectorAll('.hero, .contact')) {
    triggers.push(ScrollTrigger.create({ trigger: section, start: 'top 40px', end: 'bottom 40px', onToggle: update }))
  }
  update()
  return triggers
}

// Every tween starts from the visible state in CSS, so without JS or with reduced motion
// the page is simply static.
export function animate(root: HTMLElement) {
  const themeTriggers = navTheme(root)
  if (still()) return () => themeTriggers.forEach((t) => t.kill())

  const ctx = gsap.context(() => {
    // Page load: the name grows from condensed to extended width as it rises into place.
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .from('.hero-line', { yPercent: 105, '--w': 62, duration: 1.5, stagger: 0.12 })
      .from(['.hero-role', '.hero-foot', '.hero-place'], { opacity: 0, y: 24, duration: 1, stagger: 0.08 }, '-=1.1')
      .from('.nav', { opacity: 0, duration: 0.8 }, '<')

    // Hero leaves: the film pushes in and dims, the name drifts up more slowly than the page.
    const heroOut = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    gsap.to('.hero-video', { scale: 1.15, ease: 'none', scrollTrigger: heroOut })
    gsap.to('.hero-shade', { opacity: 1, ease: 'none', scrollTrigger: heroOut })
    gsap.to('.hero-inner', { yPercent: -18, ease: 'none', scrollTrigger: heroOut })

    gsap.to('.progress', {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: true },
    })

    // The flow line fills down the page; each section's node lights up as the line reaches it.
    gsap.fromTo('.flow-fill', { scaleY: 0 }, {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: '.flow', start: 'top 55%', end: 'bottom 55%', scrub: true },
    })
    gsap.utils.toArray<HTMLElement>('.node').forEach((node) =>
      ScrollTrigger.create({ trigger: node, start: 'top 55%', toggleClass: { targets: node, className: 'is-on' } }),
    )

    gsap.utils.toArray<HTMLElement>('.heading .mask > span').forEach((line) =>
      gsap.from(line, { yPercent: 110, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: line, start: 'top 95%' } }),
    )

    // Words light up as you scroll. Only the words whose state changes are touched, and
    // CSS fades them, so a frame costs almost nothing (tweening ~70 spans every frame stuttered).
    const aboutText = root.querySelector<HTMLElement>('.about-text')!
    const words = Array.from(aboutText.querySelectorAll<HTMLElement>('.word'))
    let lit = -1
    aboutText.classList.add('is-scrubbing')
    ScrollTrigger.create({
      trigger: aboutText,
      start: 'top 75%',
      end: 'bottom 50%',
      onUpdate: (self) => {
        const next = Math.round(self.progress * words.length)
        if (next === lit) return
        const [from, to] = next > lit ? [Math.max(lit, 0), next] : [next, lit]
        for (let i = from; i < to; i++) words[i]?.classList.toggle('is-lit', i < next)
        lit = next
      },
    })

    // Pipelines run once in view: nodes switch on in order, then a pulse keeps travelling.
    gsap.utils.toArray<HTMLElement>('.pipeline').forEach((pipe) =>
      ScrollTrigger.create({ trigger: pipe, start: 'top 80%', once: true, onEnter: () => pipe.classList.add('is-running') }),
    )

    // Project shots open like a shutter and settle as they scroll through the viewport.
    gsap.utils.toArray<HTMLElement>('.shot').forEach((shot) => {
      gsap.fromTo(shot, { clipPath: 'inset(18% 10% 18% 10% round 1.25rem)' }, {
        clipPath: 'inset(0% 0% 0% 0% round 0.75rem)', ease: 'none',
        scrollTrigger: { trigger: shot, start: 'top 95%', end: 'top 40%', scrub: true },
      })
      gsap.fromTo(shot.querySelector('img'), { yPercent: -6, scale: 1.12 }, {
        yPercent: 6, scale: 1.12, ease: 'none',
        scrollTrigger: { trigger: shot, start: 'top bottom', end: 'bottom top', scrub: true },
      })
    })

    gsap.fromTo('.timeline', { '--line': 0 }, {
      '--line': 1, ease: 'none',
      scrollTrigger: { trigger: '.timeline', start: 'top 70%', end: 'bottom 60%', scrub: true },
    })

    gsap.from('.logo', {
      opacity: 0, scale: 0.6, duration: 0.6, stagger: 0.03, ease: 'back.out(2)',
      scrollTrigger: { trigger: '.stack-grid', start: 'top 80%' },
    })

    gsap.from('.contact-title', {
      opacity: 0, y: 60, duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: '.contact', start: 'top 70%' },
    })
  }, root)

  return () => {
    ctx.revert()
    themeTriggers.forEach((t) => t.kill())
    root.querySelector('.about-text')?.classList.remove('is-scrubbing')
  }
}
