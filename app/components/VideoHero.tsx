'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface VideoHeroProps {
  children: React.ReactNode
  videoUrl?: string
  videoType?: 'youtube' | 'mp4'
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function VideoHero({ children, videoUrl, videoType = 'mp4' }: VideoHeroProps) {
  const [muted, setMuted] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)

  // Mobil tespiti
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  function toggleMute() {
    const video = videoRef.current
    if (!video) return
    video.muted = !muted
    setMuted((prev) => !prev)
  }

  // Video URL - fallback to default
  const finalVideoUrl = videoUrl || '/videos/zumbaarkaplan.mp4'
  const isYouTube = videoType === 'youtube' || finalVideoUrl.includes('youtube.com') || finalVideoUrl.includes('youtu.be')

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#1a1a2e]">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        {isYouTube ? (
          /* YouTube embed */
          <div className="absolute inset-0 overflow-hidden" style={{ pointerEvents: 'none' }}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${extractYouTubeId(finalVideoUrl)}?autoplay=1&mute=1&loop=1&playlist=${extractYouTubeId(finalVideoUrl)}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1`}
              allow="autoplay; fullscreen; encrypted-media"
              loading="eager"
              onLoad={() => setVideoLoaded(true)}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '300vw',
                height: '300vh',
                border: 'none',
                pointerEvents: 'none',
              }}
              title="Video arka plan"
            />
          </div>
        ) : (
          /* Self-hosted MP4 video - works on both desktop and mobile */
          <video
            ref={videoRef}
            src={finalVideoUrl}
            autoPlay
            muted={muted}
            loop
            playsInline
            onLoadedData={() => setVideoLoaded(true)}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Overlay: video üzerinde metinler okunabilsin */}
        <div
          className="absolute inset-0"
          style={{
            background: isMobile
              ? undefined
              : 'linear-gradient(to bottom, rgba(26,26,46,0.55) 0%, rgba(26,26,46,0.25) 50%, rgba(26,26,46,0.85) 100%)',
          }}
        />
        {isMobile && (
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e]/60 via-transparent to-[#1a1a2e]" />
        )}
      </div>

      {/* Ses toggle butonu – sağ alt köşe (sadece desktop, video hazır olunca) */}
      {!isMobile && videoLoaded && !isYouTube && (
        <button
          onClick={toggleMute}
          aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}
          className="absolute bottom-6 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
        >
          {muted ? (
            // Muted icon
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            </svg>
          ) : (
            // Unmuted icon
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          )}
        </button>
      )}

      {/* Content */}
      {children}
    </section>
  )
}

// Helper function to extract YouTube video ID
function extractYouTubeId(url: string): string {
  if (!url) return ''
  
  // Handle different YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^\s&?]+)/,
    /youtube\.com\/shorts\/([^\s&?]+)/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  
  // If no pattern matches, assume it's already a video ID
  return url
}
