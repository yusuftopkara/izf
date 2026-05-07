'use client'

import { useEffect, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface FestivalVideo {
  id: string
  title: string
  url: string
  order: number
}

// ─── Storage helpers ──────────────────────────────────────────────────────────
const STORAGE_KEY = 'izf_festival_videos'

const DEFAULT_VIDEOS: FestivalVideo[] = [
  {
    id: 'v_m98gPq5p3jA',
    title: 'Istanbul Zumba Festival – Highlights',
    url: 'https://www.youtube.com/embed/m98gPq5p3jA',
    order: 0,
  },
]

export function loadVideos(): FestivalVideo[] {
  if (typeof window === 'undefined') return DEFAULT_VIDEOS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_VIDEOS
    const parsed = JSON.parse(raw) as FestivalVideo[]
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_VIDEOS
    return parsed.sort((a, b) => a.order - b.order)
  } catch {
    return DEFAULT_VIDEOS
  }
}

export function saveVideos(videos: FestivalVideo[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(videos))
}

// ─── URL helpers ──────────────────────────────────────────────────────────────
function getYouTubeEmbedUrl(url: string): string | null {
  // Zaten embed formatındaysa direkt döndür
  if (url.includes('youtube.com/embed/')) return url

  // youtube.com/watch?v=ID
  const watchMatch = url.match(/youtube\.com\/watch\?.*v=([^&]+)/)
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`

  // youtu.be/ID
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/)
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`

  return null
}

function isMp4(url: string) {
  return url.match(/\.(mp4|webm|ogg)(\?|$)/i) !== null
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function FestivalVideos() {
  const [videos, setVideos] = useState<FestivalVideo[]>([])

  useEffect(() => {
    setVideos(loadVideos())

    // localStorage değişikliklerini dinle (admin panelden güncelleme gelince)
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setVideos(loadVideos())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  if (videos.length === 0) return null

  return (
    <section className="bg-[#0d0d1a] py-16 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-orange-400">
            Festival Videoları
          </p>
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Festivali İzle
          </h2>
        </div>

        <div className={`grid gap-6 ${videos.length === 1 ? 'grid-cols-1 max-w-3xl mx-auto' : 'grid-cols-1 lg:grid-cols-2'}`}>
          {videos.map((video) => {
            const embedUrl = getYouTubeEmbedUrl(video.url)
            const isVideo = isMp4(video.url)

            return (
              <div key={video.id} className="overflow-hidden rounded-2xl shadow-2xl">
                {isVideo ? (
                  <video
                    controls
                    className="w-full aspect-video object-cover"
                    title={video.title}
                  >
                    <source src={video.url} />
                  </video>
                ) : embedUrl ? (
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      src={embedUrl}
                      title={video.title}
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full border-0"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-gray-900 text-gray-500 text-sm">
                    Geçersiz video URL
                  </div>
                )}
                {video.title && (
                  <p className="bg-[#1a1a2e] px-4 py-2.5 text-sm font-medium text-white/70">
                    {video.title}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
