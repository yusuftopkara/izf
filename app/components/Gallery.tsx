'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import Lightbox from './Lightbox'
import { useLocale } from '../context/LocaleContext'
import { loadGalleryImages, getDeletedDefaults, type GalleryImage } from './GalleryStorage'

const DEFAULT_IMAGES: { src: string; alt: string }[] = [
  { src: '/images/past-festivals.jpeg', alt: 'Past Festivals Collage' },
  { src: '/images/festival-2.jpeg', alt: 'Festival 2' },
  { src: '/images/festival-3.jpeg', alt: 'Festival 3' },
  { src: '/images/festival-4.jpeg', alt: 'Festival 4' },
  { src: '/images/festival-5.jpeg', alt: 'Festival 5' },
  { src: '/images/festival-6.jpeg', alt: 'Festival 6' },
  { src: '/images/festival-8.jpeg', alt: 'Festival 8' },
  { src: '/images/festival-9.jpeg', alt: 'Festival 9' },
]

function buildImages(): { src: string; alt: string }[] {
  const adminImages = loadGalleryImages()
  const deletedDefaults = getDeletedDefaults()
  
  // Filter out deleted defaults and missing images from DEFAULT_IMAGES
  const filteredDefaults = DEFAULT_IMAGES.filter((img) => {
    // Skip if in deleted list
    if (deletedDefaults.includes(img.src)) return false
    // Skip festival-1 and festival-7 (missing files)
    if (img.src.includes('festival-1') || img.src.includes('festival-7')) return false
    return true
  })
  
  // Filter admin images too
  const filteredAdminImages = adminImages.filter((img: GalleryImage) => {
    if (img.src.includes('festival-1') || img.src.includes('festival-7')) return false
    return true
  })
  
  if (filteredAdminImages.length === 0) return filteredDefaults
  
  // Merge: filtered defaults first, then admin-added extras
  const adminSrcs = new Set(filteredAdminImages.map((img: GalleryImage) => img.src))
  const filtered = filteredDefaults.filter((img) => !adminSrcs.has(img.src))
  const adminMapped = filteredAdminImages.map((img: GalleryImage) => ({ src: img.src, alt: img.alt }))
  return [...filtered, ...adminMapped]
}

export default function Gallery() {
  const { t } = useLocale()
  const [galleryImages, setGalleryImages] = useState<{ src: string; alt: string }[]>(DEFAULT_IMAGES)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    setGalleryImages(buildImages())

    function onStorage(e: StorageEvent) {
      if (e.key === 'izf_gallery_images' || e.key === 'izf_gallery_deleted') {
        setGalleryImages(buildImages())
      }
    }
    window.addEventListener('storage', onStorage)
    
    // Force refresh every 3 seconds to catch localStorage changes
    const interval = setInterval(() => {
      setGalleryImages(buildImages())
    }, 3000)
    
    return () => {
      window.removeEventListener('storage', onStorage)
      clearInterval(interval)
    }
  }, [])

  return (
    <section className="bg-[#0d0d1a] py-16 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-orange-400">
            {t('gallery.subtitle')}
          </p>
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            {t('gallery.title')}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {galleryImages.map((img, i) => (
            <button
              key={img.src}
              onClick={() => setLightboxIndex(i)}
              aria-label={`${t('gallery.zoom')}: ${img.alt}`}
              className={`relative overflow-hidden rounded-xl group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                i === 0
                  ? 'col-span-2 row-span-2 aspect-square sm:col-span-2 sm:row-span-2'
                  : 'aspect-square'
              }`}
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                className="object-cover transition duration-500 group-hover:scale-110 group-hover:brightness-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <svg viewBox="0 0 24 24" className="h-8 w-8 text-white drop-shadow-lg fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={galleryImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </section>
  )
}
