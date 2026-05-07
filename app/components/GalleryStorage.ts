// ─── Types ────────────────────────────────────────────────────────────────────
export interface GalleryImage {
  id: string
  src: string
  alt: string
  order: number
}

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'izf_gallery_images'
const DELETED_KEY = 'izf_gallery_deleted'

// Default festival images from public/images/
const DEFAULT_IMAGES: GalleryImage[] = [
  { id: 'default_1', src: '/images/festival-1.jpeg', alt: 'Festival fotoğrafı 1', order: 0 },
  { id: 'default_2', src: '/images/festival-2.jpeg', alt: 'Festival fotoğrafı 2', order: 1 },
  { id: 'default_3', src: '/images/festival-3.jpeg', alt: 'Festival fotoğrafı 3', order: 2 },
  { id: 'default_4', src: '/images/festival-4.jpeg', alt: 'Festival fotoğrafı 4', order: 3 },
  { id: 'default_5', src: '/images/festival-5.jpeg', alt: 'Festival fotoğrafı 5', order: 4 },
  { id: 'default_6', src: '/images/festival-6.jpeg', alt: 'Festival fotoğrafı 6', order: 5 },
  { id: 'default_7', src: '/images/festival-7.jpeg', alt: 'Festival fotoğrafı 7', order: 6 },
  { id: 'default_8', src: '/images/festival-8.jpeg', alt: 'Festival fotoğrafı 8', order: 7 },
  { id: 'default_9', src: '/images/festival-9.jpeg', alt: 'Festival fotoğrafı 9', order: 8 },
]

export function loadGalleryImages(): GalleryImage[] {
  if (typeof window === 'undefined') return DEFAULT_IMAGES
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      // Initialize with default images if localStorage is empty
      saveGalleryImages(DEFAULT_IMAGES)
      return DEFAULT_IMAGES
    }
    const parsed = JSON.parse(raw) as GalleryImage[]
    if (!Array.isArray(parsed)) return DEFAULT_IMAGES
    return parsed.sort((a, b) => a.order - b.order)
  } catch {
    return DEFAULT_IMAGES
  }
}

export function saveGalleryImages(images: GalleryImage[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(images))
}

// Track deleted default images
export function getDeletedDefaults(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(DELETED_KEY)
    if (!raw) return []
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}

export function addDeletedDefault(src: string) {
  if (typeof window === 'undefined') return
  const deleted = getDeletedDefaults()
  if (!deleted.includes(src)) {
    deleted.push(src)
    localStorage.setItem(DELETED_KEY, JSON.stringify(deleted))
  }
}

export function clearDeletedDefaults() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(DELETED_KEY)
}
