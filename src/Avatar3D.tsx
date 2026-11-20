import { useEffect, useRef, useState } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { AvatarScene } from './avatarScene'

const MODEL = '/media/avatar-3d.glb'
const POSTER = '/media/avatar-3d.webp'
/** Share of the figure's height the character fills (head to sneakers). */
const BODY = 0.92
/** Rows in the 8-bit sprite: its on-screen height / 20 is the size of one sprite pixel. */
const SPRITE_ROWS = 20

const clamp = (v: number) => Math.min(Math.max(v, 0), 1)
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

/**
 * 3D Cristian waves in the about section. As you scroll on he pixelates, shrinks and flies
 * to the flow line, where the 8-bit sprite (Buddy) takes over. Scrolling back reverses it.
 * The poster image shows until the model loads, and is all that shows with reduced motion.
 */
export default function Avatar3D({ hello, alt }: { hello: string; alt: string }) {
  const slot = useRef<HTMLDivElement>(null)
  const figure = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [talking, setTalking] = useState(true)

  useEffect(() => {
    const box = slot.current!
    const fig = figure.current!
    const buddy = document.querySelector<HTMLElement>('.buddy')
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let scene: AvatarScene | null = null
    let disposed = false
    let visible = false
    let progress = 0
    let raf = 0
    let last = 0
    let wasDone = false

    const loop = (now: number) => {
      raf = 0
      if (!scene || !visible || progress >= 1 || document.hidden) return
      scene.render(Math.min((now - last) / 1000, 0.05))
      last = now
      raf = requestAnimationFrame(loop)
    }
    const run = () => {
      if (raf || !scene) return
      last = performance.now()
      raf = requestAnimationFrame(loop)
    }

    const morph = (p: number) => {
      progress = p
      const e = ease(p)
      const from = box.getBoundingClientRect()
      const sprite = buddy?.querySelector('svg')?.getBoundingClientRect()
      if (!sprite || !from.height) return
      const endScale = sprite.height / (from.height * BODY)
      const scale = 1 + (endScale - 1) * e
      const dx = (sprite.left + sprite.width / 2 - (from.left + from.width / 2)) * e
      const dy = (sprite.top + sprite.height / 2 - (from.top + from.height / 2)) * e
      fig.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`
      // The handoff: the figure fades out over the last 20% while the sprite fades in.
      fig.style.opacity = String(1 - clamp((p - 0.8) / 0.18))
      if (buddy) buddy.style.opacity = String(clamp((p - 0.84) / 0.16))
      setTalking(p < 0.04)
      if (scene) {
        // Pixel size grows so that, once shrunk, each block is about one sprite pixel.
        const endBlock = sprite.height / SPRITE_ROWS / endScale
        scene.setBlock(Math.max(1, Math.round(1 + (endBlock - 1) * e ** 1.6)))
        scene.setWave(1 - clamp(p / 0.45))
        if (!raf) scene.render(0)
      }
      const done = p >= 1
      if (done && !wasDone) window.dispatchEvent(new CustomEvent('buddy-say', { detail: 0 }))
      wasDone = done
      if (!done) run()
    }

    if (buddy) buddy.style.opacity = '0'
    const trigger = ScrollTrigger.create({
      trigger: box,
      start: 'center 58%',
      end: 'center 12%',
      onUpdate: (self) => morph(self.progress),
      onRefresh: (self) => morph(self.progress),
    })

    // Load three.js and the model only when the section is close, and render only while on screen.
    const near = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting) return
      near.disconnect()
      const { createAvatarScene } = await import('./avatarScene')
      try {
        const made = await createAvatarScene(canvas.current!, MODEL)
        if (disposed) return made.dispose()
        scene = made
        setReady(true)
        morph(progress)
        run()
      } catch {
        // No WebGL or the model failed: the poster stays, which is fine.
      }
    }, { rootMargin: '600px 0px' })
    near.observe(box)

    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) run()
    })
    seen.observe(box)

    const resized = new ResizeObserver(() => scene?.resize())
    resized.observe(box)
    const onVisibility = () => !document.hidden && run()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      trigger.kill()
      near.disconnect()
      seen.disconnect()
      resized.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      scene?.dispose()
      if (buddy) buddy.style.opacity = ''
    }
  }, [])

  return (
    <div ref={slot} className="avatar3d-slot">
      <figure ref={figure} className={ready ? 'avatar3d is-ready' : 'avatar3d'}>
        <img className="avatar3d-poster" src={POSTER} alt={alt} width={640} height={800} loading="lazy" decoding="async" />
        <canvas ref={canvas} className="avatar3d-canvas" aria-hidden="true" />
        <p className={talking ? 'avatar3d-bubble' : 'avatar3d-bubble is-gone'} aria-hidden="true">{hello}</p>
      </figure>
    </div>
  )
}
