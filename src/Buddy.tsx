import { useEffect, useRef, useState } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FRAMES, toRects, type FrameName } from './sprite'

const SPRITES = Object.fromEntries(
  Object.entries(FRAMES).map(([name, frame]) => [name, toRects(frame)]),
) as Record<FrameName, ReturnType<typeof toRects>>

const TICK = 140 // ms per animation frame, a classic 7 fps walk
const BUBBLE_MS = 2200

/**
 * 8-bit Cristian rides the flow line. He walks down facing you when you scroll down,
 * climbs back up when you scroll up, blinks when you stop, and hops and says
 * something each time he reaches a section.
 * `lines` has one entry per `.node` in the page, plus a last one for the end of the line.
 */
export default function Buddy({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const linesRef = useRef(lines)
  const [frame, setFrame] = useState<FrameName>('idle')
  const [bubble, setBubble] = useState('')
  const [hop, setHop] = useState(0)

  useEffect(() => {
    linesRef.current = lines
  }, [lines])

  useEffect(() => {
    const el = ref.current!
    const track = el.parentElement!
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    let direction = 1
    let lastMove = 0
    let step = 0
    let idleTicks = 0
    let bubbleTimer: ReturnType<typeof setTimeout> | undefined

    const say = (index: number) => {
      const text = linesRef.current[index]
      if (!text) return
      setBubble(text)
      setHop((n) => n + 1)
      clearTimeout(bubbleTimer)
      bubbleTimer = setTimeout(() => setBubble(''), BUBBLE_MS)
    }

    const place = (progress: number) => {
      const room = Math.max(track.offsetHeight - el.offsetHeight, 0)
      el.style.transform = `translate(-50%, ${progress * room}px)`
    }

    const ride = ScrollTrigger.create({
      trigger: '.flow',
      start: 'top 55%',
      end: 'bottom 55%',
      onUpdate: (self) => {
        place(self.progress)
        direction = self.direction
        lastMove = performance.now()
      },
      onRefresh: (self) => place(self.progress),
      onLeave: () => say(linesRef.current.length - 1),
    })

    // While the 3D avatar is still morphing into him he is hidden, so he waits to speak:
    // Avatar3D sends 'buddy-say' the moment he takes over.
    const stops = Array.from(document.querySelectorAll('.node')).map((node, i) =>
      ScrollTrigger.create({ trigger: node, start: 'top 55%', onEnter: () => el.style.opacity !== '0' && say(i) }),
    )
    const onSay = (e: Event) => say((e as CustomEvent<number>).detail)
    window.addEventListener('buddy-say', onSay)

    const id = setInterval(() => {
      const moving = !still && performance.now() - lastMove < TICK * 1.5
      if (moving) {
        step = (step + 1) % 2
        idleTicks = 0
        setFrame(direction < 0 ? (step ? 'upA' : 'upB') : step ? 'downA' : 'downB')
        return
      }
      idleTicks++
      // Blink for one tick roughly every three seconds.
      setFrame(!still && idleTicks % 22 === 21 ? 'blink' : 'idle')
    }, TICK)

    return () => {
      clearInterval(id)
      clearTimeout(bubbleTimer)
      ride.kill()
      stops.forEach((s) => s.kill())
      window.removeEventListener('buddy-say', onSay)
    }
  }, [])

  return (
    <div ref={ref} className="buddy" aria-hidden="true">
      {bubble && <p className="buddy-bubble" key={bubble}>{bubble}</p>}
      <svg
        key={hop}
        className={hop ? 'buddy-sprite is-hopping' : 'buddy-sprite'}
        viewBox="0 0 12 20"
        shapeRendering="crispEdges"
      >
        {SPRITES[frame].map((r) => (
          <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
        ))}
      </svg>
    </div>
  )
}
