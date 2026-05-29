'use client'

import { useState, useEffect } from 'react'
import { loadVideos, saveVideos, type FestivalVideo } from '../../components/FestivalVideos'

export default function AdminVideos() {
  const [videos, setVideos] = useState<FestivalVideo[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', url: '', order: 0 })
  const [error, setError] = useState('')

  useEffect(() => {
    setVideos(loadVideos())
  }, [])

  function persist(updated: FestivalVideo[]) {
    const sorted = [...updated].sort((a, b) => a.order - b.order)
    saveVideos(sorted)
    setVideos(sorted)
  }

  function openAdd() {
    const maxOrder = videos.length > 0 ? Math.max(...videos.map((v) => v.order)) + 1 : 0
    setForm({ title: '', url: '', order: maxOrder })
    setError('')
    setShowForm(true)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.url.trim()) {
      setError('Video URL zorunludur')
      return
    }
    const newVideo: FestivalVideo = {
      id: `v_${Date.now()}`,
      title: form.title.trim(),
      url: form.url.trim(),
      order: Number(form.order),
    }
    persist([...videos, newVideo])
    setShowForm(false)
    setForm({ title: '', url: '', order: 0 })
  }

  function handleDelete(id: string) {
    if (!confirm('Bu videoyu silmek istediğinize emin misiniz?')) return
    persist(videos.filter((v) => v.id !== id))
  }

  function moveUp(index: number) {
    if (index === 0) return
    const updated = [...videos]
    const tmp = updated[index - 1].order
    updated[index - 1] = { ...updated[index - 1], order: updated[index].order }
    updated[index] = { ...updated[index], order: tmp }
    persist(updated)
  }

  function moveDown(index: number) {
    if (index === videos.length - 1) return
    const updated = [...videos]
    const tmp = updated[index + 1].order
    updated[index + 1] = { ...updated[index + 1], order: updated[index].order }
    updated[index] = { ...updated[index], order: tmp }
    persist(updated)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Video Yönetimi</h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-400"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Yeni Video
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="mb-4 font-bold text-gray-800">Yeni Video Ekle</h3>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Video Başlığı</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Örn: Festival 2024 Highlights"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Video URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=... veya https://..."
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
              <p className="mt-1 text-xs text-gray-400">YouTube linki veya .mp4 URL kabul edilir</p>
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

      {videos.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-gray-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto mb-4 h-12 w-12 text-gray-300">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-400">Henüz video eklenmemiş</p>
          <button
            onClick={openAdd}
            className="mt-4 text-sm font-semibold text-orange-500 hover:text-orange-400"
          >
            İlk videoyu ekle
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {videos.map((video, index) => (
            <div
              key={video.id}
              className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm border border-gray-100"
            >
              {/* Sıralama butonları */}
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
                  disabled={index === videos.length - 1}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                  aria-label="Aşağı taşı"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Sıra numarası */}
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                {index + 1}
              </span>

              {/* Bilgiler */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-900">{video.title || <span className="text-gray-400 italic">Başlıksız</span>}</p>
                <p className="truncate text-xs text-gray-400">{video.url}</p>
              </div>

              {/* Sil butonu */}
              <button
                onClick={() => handleDelete(video.id)}
                className="flex-shrink-0 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
              >
                Sil
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-gray-400">
        Değişiklikler anında kaydedilir. Site ana sayfasındaki &quot;Festival Videoları&quot; bölümüne yansır.
      </p>
    </div>
  )
}