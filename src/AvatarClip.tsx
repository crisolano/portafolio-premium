import { useEffect, useRef } from 'react'

export type Mood = 'idle' | 'thinking' | 'talking'

const MOODS: Mood[] = ['idle', 'thinking', 'talking']
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Cristian's pixel-art avatar, animated with Higgsfield. The three loops are stacked
 * and cross-faded, so switching mood never waits for a video to load. With reduced
 * motion only the still portrait is shown.
 */
export default function AvatarClip({ mood = 'idle', className = '' }: { mood?: Mood; className?: string }) {
  const videos = useRef<Record<Mood, HTMLVideoElement | null>>({ idle: null, thinking: null, talking: null })

  useEffect(() => {
    if (still()) return
    for (const m of MOODS) {
      const video = videos.current[m]
      if (!video) continue
      if (m === mood) {
        video.currentTime = 0
        void video.play().catch(() => {})
      } else {
        video.pause()
      }
    }
  }, [mood])

  return (
    <span className={`avatar-clip ${className}`} data-mood={mood} aria-hidden="true">
      <img src="/media/avatar.webp" alt="" width={192} height={192} />
      {!still() && MOODS.map((m) => (
        <video
          key={m}
          ref={(el) => { videos.current[m] = el }}
          className={m === mood ? 'is-active' : ''}
          muted
          loop
          playsInline
          preload={m === 'idle' ? 'auto' : 'metadata'}
          poster="/media/avatar.webp"
          autoPlay={m === 'idle'}
        >
          <source src={`/media/avatar-${m}.webm`} type="video/webm" />
          <source src={`/media/avatar-${m}.mp4`} type="video/mp4" />
        </video>
      ))}
    </span>
  )
}
