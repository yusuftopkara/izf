'use client'

import { useState, useEffect } from 'react'
import { api, type SiteContent } from '../../lib/api'

const EMPTY_SITE_CONTENT: SiteContent = {
  hero_video: { url: '', type: 'youtube' },
  countdown_target: '',
  beto_perez: {
    enabled: false,
    title: '',
    subtitle: '',
    description: '',
    image_url: '',
    button_text: '',
    button_link: '',
    title_en: '',
    subtitle_en: '',
    description_en: '',
    button_text_en: '',
  },
  venue: {
    name: '',
    address: '',
    map_embed_url: '',
    description: '',
    address_en: '',
    description_en: '',
  },
}

export default function AdminContent({ token }: { token: string }) {
  const [content, setContent] = useState<SiteContent>(EMPTY_SITE_CONTENT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setLoading(true)
    api.getSiteContent()
      .then((data: SiteContent) => {
        setContent({
          ...EMPTY_SITE_CONTENT,
          ...data,
          hero_video: { ...EMPTY_SITE_CONTENT.hero_video, ...(data.hero_video || {}) },
          beto_perez: { ...EMPTY_SITE_CONTENT.beto_perez, ...(data.beto_perez || {}) },
          venue: { ...EMPTY_SITE_CONTENT.venue, ...(data.venue || {}) },
        })
      })
      .catch(() => setError('İçerik yüklenemedi'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await api.updateSiteContent(content, token)
      setSuccess('Değişiklikler kaydedildi')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  function updateHeroVideo(updates: Partial<SiteContent['hero_video']>) {
    setContent((prev: SiteContent) => ({
      ...prev,
      hero_video: { ...prev.hero_video!, ...updates },
    }))
  }

  function updateBetoPerez(updates: Partial<SiteContent['beto_perez']>) {
    setContent((prev: SiteContent) => ({
      ...prev,
      beto_perez: { ...prev.beto_perez!, ...updates },
    }))
  }

  function updateVenue(updates: Partial<SiteContent['venue']>) {
    setContent((prev: SiteContent) => ({
      ...prev,
      venue: { ...prev.venue!, ...updates },
    }))
  }

  const getVideoPreviewUrl = (url: string, type: 'youtube' | 'mp4'): string => {
    if (type === 'youtube' && url) {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/)
      if (match) {
        return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`
      }
    }
    return url
  }

  if (loading) {
    return <div className="py-16 text-center text-gray-400">Yükleniyor...</div>
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Site İçeriği Yönetimi</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Hero Video Section */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="mb-4 font-bold text-gray-800 flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-orange-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Hero Video
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Video URL</label>
              <input
                type="text"
                value={content.hero_video?.url || ''}
                onChange={(e) => updateHeroVideo({ url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=... veya https://.../video.mp4"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
              <p className="mt-1 text-xs text-gray-400">YouTube linki veya MP4 URL</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Video Tipi</label>
              <select
                value={content.hero_video?.type || 'youtube'}
                onChange={(e) => updateHeroVideo({ type: e.target.value as 'youtube' | 'mp4' })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              >
                <option value="youtube">YouTube</option>
                <option value="mp4">MP4 (Doğrudan Link)</option>
              </select>
            </div>
          </div>
          {content.hero_video?.url && (
            <div className="mt-4">
              <label className="mb-2 block text-xs font-semibold text-gray-600">Önizleme</label>
              <div className="relative aspect-video max-w-md overflow-hidden rounded-xl bg-gray-100">
                {content.hero_video.type === 'youtube' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getVideoPreviewUrl(content.hero_video.url, 'youtube')}
                    alt="Video önizleme"
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <video
                    src={content.hero_video.url}
                    className="h-full w-full object-cover"
                    controls
                    preload="metadata"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Countdown Section */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="mb-4 font-bold text-gray-800 flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-orange-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Countdown (Geri Sayım)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Hedef Tarih ve Saat</label>
              <input
                type="datetime-local"
                value={content.countdown_target || ''}
                onChange={(e) => setContent((prev: SiteContent) => ({ ...prev, countdown_target: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Seçili Hedef Tarihi</label>
              <div className="rounded-xl bg-gray-50 px-4 py-2.5 text-sm text-gray-700">
                {content.countdown_target
                  ? new Date(content.countdown_target).toLocaleString('tr-TR')
                  : 'Tarih seçilmedi'}
              </div>
            </div>
          </div>
        </div>

        {/* Beto Perez Section */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="mb-4 font-bold text-gray-800 flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-orange-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Beto Perez Bölümü
          </h3>
          <div className="mb-4 flex items-center gap-3">
            <input
              type="checkbox"
              id="beto-enabled"
              checked={content.beto_perez?.enabled || false}
              onChange={(e) => updateBetoPerez({ enabled: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
            />
            <label htmlFor="beto-enabled" className="text-sm font-medium text-gray-700">
              Bu bölümü göster
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Başlık</label>
              <input
                type="text"
                value={content.beto_perez?.title || ''}
                onChange={(e) => updateBetoPerez({ title: e.target.value })}
                placeholder="Örn: Beto Perez ile Özel Ders"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Alt Başlık</label>
              <input
                type="text"
                value={content.beto_perez?.subtitle || ''}
                onChange={(e) => updateBetoPerez({ subtitle: e.target.value })}
                placeholder="Örn: Zumba® Fitness Kurucusu"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Açıklama</label>
              <textarea
                value={content.beto_perez?.description || ''}
                onChange={(e) => updateBetoPerez({ description: e.target.value })}
                rows={3}
                placeholder="Beto Perez hakkında açıklama..."
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 resize-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Görsel URL</label>
              <input
                type="text"
                value={content.beto_perez?.image_url || ''}
                onChange={(e) => updateBetoPerez({ image_url: e.target.value })}
                placeholder="https://.../beto.jpg"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Buton Metni</label>
              <input
                type="text"
                value={content.beto_perez?.button_text || ''}
                onChange={(e) => updateBetoPerez({ button_text: e.target.value })}
                placeholder="Örn: Detayları Gör"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Buton Linki</label>
              <input
                type="text"
                value={content.beto_perez?.button_link || ''}
                onChange={(e) => updateBetoPerez({ button_link: e.target.value })}
                placeholder="https://... veya /events/beto-perez"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>

            {/* English Translations Divider */}
            <div className="md:col-span-2 mt-2 pt-4 border-t border-dashed border-gray-200">
              <p className="text-sm font-bold text-blue-600 flex items-center gap-2">
                <span className="text-base">🇬🇧</span> English Translation
                <span className="text-xs font-normal text-gray-400">(opsiyonel — boş bırakılırsa TR gösterilir)</span>
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Title (EN)</label>
              <input
                type="text"
                value={content.beto_perez?.title_en || ''}
                onChange={(e) => updateBetoPerez({ title_en: e.target.value })}
                placeholder="e.g. ZUMBA WITH BETO PEREZ"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Subtitle (EN)</label>
              <input
                type="text"
                value={content.beto_perez?.subtitle_en || ''}
                onChange={(e) => updateBetoPerez({ subtitle_en: e.target.value })}
                placeholder="e.g. Founder of Zumba® Fitness"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Description (EN)</label>
              <textarea
                value={content.beto_perez?.description_en || ''}
                onChange={(e) => updateBetoPerez({ description_en: e.target.value })}
                rows={3}
                placeholder="An unforgettable experience with the creator of Zumba..."
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Button Text (EN)</label>
              <input
                type="text"
                value={content.beto_perez?.button_text_en || ''}
                onChange={(e) => updateBetoPerez({ button_text_en: e.target.value })}
                placeholder="e.g. Buy Ticket"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
          {content.beto_perez?.image_url && (
            <div className="mt-4">
              <label className="mb-2 block text-xs font-semibold text-gray-600">Görsel Önizleme</label>
              <div className="relative h-48 w-48 overflow-hidden rounded-xl bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={content.beto_perez.image_url}
                  alt="Beto Perez"
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Venue Section */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="mb-4 font-bold text-gray-800 flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-orange-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Venue (Mekan) Bilgileri
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Mekan Adı</label>
              <input
                type="text"
                value={content.venue?.name || ''}
                onChange={(e) => updateVenue({ name: e.target.value })}
                placeholder="Örn: Istanbul Congress Center"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Adres</label>
              <textarea
                value={content.venue?.address || ''}
                onChange={(e) => updateVenue({ address: e.target.value })}
                rows={2}
                placeholder="Tam adres bilgisi..."
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Harita Embed URL</label>
              <input
                type="text"
                value={content.venue?.map_embed_url || ''}
                onChange={(e) => updateVenue({ map_embed_url: e.target.value })}
                placeholder="https://www.google.com/maps/embed?pb=..."
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
              <p className="mt-1 text-xs text-gray-400">Google Maps embed URL'si</p>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Açıklama</label>
              <textarea
                value={content.venue?.description || ''}
                onChange={(e) => updateVenue({ description: e.target.value })}
                rows={3}
                placeholder="Mekan hakkında açıklama..."
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 resize-none"
              />
            </div>

            {/* English Translations Divider */}
            <div className="md:col-span-2 mt-2 pt-4 border-t border-dashed border-gray-200">
              <p className="text-sm font-bold text-blue-600 flex items-center gap-2">
                <span className="text-base">🇬🇧</span> English Translation
                <span className="text-xs font-normal text-gray-400">(opsiyonel — boş bırakılırsa TR gösterilir)</span>
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Address (EN)</label>
              <textarea
                value={content.venue?.address_en || ''}
                onChange={(e) => updateVenue({ address_en: e.target.value })}
                rows={2}
                placeholder="e.g. Pendik, Istanbul, Turkey"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Description (EN)</label>
              <textarea
                value={content.venue?.description_en || ''}
                onChange={(e) => updateVenue({ description_en: e.target.value })}
                rows={3}
                placeholder="A description about the venue in English..."
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
              />
            </div>
          </div>
          {content.venue?.map_embed_url && (
            <div className="mt-4">
              <label className="mb-2 block text-xs font-semibold text-gray-600">Harita Önizleme</label>
              <div className="relative aspect-video max-w-lg overflow-hidden rounded-xl bg-gray-100">
                <iframe
                  src={content.venue.map_embed_url}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Venue Map"
                  className="absolute inset-0"
                />
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}
        {success && (
          <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-600">{success}</div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-400 disabled:opacity-60"
          >
            {saving ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Kaydediliyor...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Değişiklikleri Kaydet
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}