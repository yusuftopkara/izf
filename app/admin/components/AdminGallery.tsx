'use client'

import { useState, useEffect } from 'react'
import {
  loadGalleryImages,
  saveGalleryImages,
  addDeletedDefault,
  type GalleryImage,
} from '../../components/GalleryStorage'

export default function AdminGallery() {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ src: '', alt: '', order: 0 })
  const [error, setError] = useState('')

  useEffect(() => {
    setImages(loadGalleryImages())
  }, [])

  function persist(updated: GalleryImage[]) {
    const sorted = [...updated].sort((a, b) => a.order - b.order)
    saveGalleryImages(sorted)
    setImages(sorted)
    window.dispatchEvent(new StorageEvent('storage', { key: 'izf_gallery_images' }))
  }

  function openAdd() {
    const maxOrder = images.length > 0 ? Math.max(...images.map((i) => i.order)) + 1 : 0
    setForm({ src: '', alt: '', order: maxOrder })
    setError('')
    setShowForm(true)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.src.trim()) {
      setError('Fotoğraf URL zorunludur')
      return
    }
    const newImg: GalleryImage = {
      id: `g_${Date.now()}`,
      src: form.src.trim(),
      alt: form.alt.trim() || 'Festival fotoğrafı',
      order: Number(form.order),
    }
    persist([...images, newImg])
    setShowForm(false)
    setForm({ src: '', alt: '', order: 0 })
  }

  function handleDelete(id: string) {
    if (!confirm('Bu fotoğrafı silmek istediğinize emin misiniz?')) return
    const img = images.find((i) => i.id === id)
    if (img) {
      addDeletedDefault(img.src)
    }
    persist(images.filter((img) => img.id !== id))
  }

  function moveUp(index: number) {
    if (index === 0) return
    const updated = [...images]
    const tmp = updated[index - 1].order
    updated[index - 1] = { ...updated[index - 1], order: updated[index].order }
    updated[index] = { ...updated[index], order: tmp }
    persist(updated)
  }

  function moveDown(index: number) {
    if (index === images.length - 1) return
    const updated = [...images]
    const tmp = updated[index + 1].order
    updated[index + 1] = { ...updated[index + 1], order: updated[index].order }
    updated[index] = { ...updated[index], order: tmp }
    persist(updated)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Galeri / Anı Yönetimi</h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-400"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Yeni Fotoğraf
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="mb-4 font-bold text-gray-800">Yeni Fotoğraf Ekle</h3>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Fotoğraf URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.src}
                onChange={(e) => setForm({ ...form, src: e.target.value })}
                placeholder="https://... veya /images/foto.jpeg"
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
              <p className="mt-1 text-xs text-gray-400">Harici link (https://...) veya public/images/ yolu (/images/foto.jpeg)</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Başlık / Açıklama</label>
              <input
                type="text"
                value={form.alt}
                onChange={(e) => setForm({ ...form, alt: e.target.value })}
                placeholder="Örn: Festival 2024 – Ana Sahne"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div className="w-32">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Sıralama</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                min={0}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                type="submit"
                className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-400"
              >
                Ekle
              </button>
            </div>
          </form>
        </div>
      )}

      {images.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-gray-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto mb-4 h-12 w-12 text-gray-300">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 16m-6-6a2 2 0 100-4 2 2 0 000 4z" />
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
          <p className="text-gray-400">Henüz fotoğraf eklenmemiş</p>
          <button
            onClick={openAdd}
            className="mt-4 text-sm font-semibold text-orange-500 hover:text-orange-400"
          >
            İlk fotoğrafı ekle
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {images.map((img, index) => (
            <div
              key={img.id}
              className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm border border-gray-100"
            >
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                  aria-label="Yukarı taşı"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === images.length - 1}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                  aria-label="Aşağı taşı"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                {index + 1}
              </span>

              {/* Thumbnail */}
              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} alt={img.alt} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3' }} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-900">{img.alt || <span className="text-gray-400 italic">Başlıksız</span>}</p>
                <p className="truncate text-xs text-gray-400">{img.src}</p>
              </div>

              <button
                onClick={() => handleDelete(img.id)}
                className="flex-shrink-0 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
              >
                Sil
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-gray-400">
        Değişiklikler anında kaydedilir. Ana sayfadaki galeri bölümüne yansır.
      </p>
    </div>
  )
}