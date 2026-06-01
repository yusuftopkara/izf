'use client'

import { useState, useEffect, useCallback } from 'react'
import { api, type AdminEvent, type CreateEventRequest } from '../../lib/api'

const EMPTY_EVENT: CreateEventRequest = {
  title: '',
  date: '',
  location: '',
  price: undefined,
  tl_price: undefined,
  payment_link: '',
  tl_payment_link: '',
  capacity: 0,
  description: '',
}

export default function AdminEvents({ token }: { token: string }) {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateEventRequest>(EMPTY_EVENT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api.getAdminEvents(token)
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_EVENT)
    setError('')
    setShowForm(true)
  }

  function openEdit(ev: AdminEvent) {
    setEditingId(ev.id)
    setForm({
      title: ev.title,
      date: ev.date || '',
      location: ev.location || '',
      price: ev.price,
      tl_price: ev.tl_price,
      payment_link: (ev as any).payment_link || '',
      tl_payment_link: (ev as any).tl_payment_link || '',
      capacity: ev.capacity,
      description: ev.description || '',
    })
    setError('')
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        date: form.date || undefined,
        location: form.location || undefined,
        description: form.description || undefined,
      }
      if (editingId) {
        await api.updateAdminEvent(editingId, payload, token)
      } else {
        await api.createAdminEvent(payload, token)
      }
      setShowForm(false)
      load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu etkinliği silmek istediğinize emin misiniz?')) return
    try {
      await api.deleteAdminEvent(id, token)
      load()
    } catch {
      alert('Silinemedi')
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Etkinlik Yönetimi</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-400"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Yeni Etkinlik
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="mb-4 font-bold text-gray-800">{editingId ? 'Etkinlik Düzenle' : 'Yeni Etkinlik'}</h3>
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Başlık <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                placeholder="Etkinlik başlığı"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Tarih</label>
              <input
                type="datetime-local"
                value={form.date || ''}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Yer</label>
              <input
                type="text"
                value={form.location || ''}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="İstanbul, Türkiye"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Fiyat (EUR)</label>
              <input
                type="number"
                value={form.price ?? ''}
                onChange={(e) => setForm({ ...form, price: e.target.value ? Number(e.target.value) : undefined })}
                min={0}
                step={0.01}
                placeholder="0.00"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">TL Fiyat</label>
              <input
                type="number"
                value={form.tl_price ?? ''}
                onChange={(e) => setForm({ ...form, tl_price: e.target.value ? Number(e.target.value) : undefined })}
                min={0}
                step={0.01}
                placeholder="7200.00"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Ödeme Linki (EUR)</label>
              <input
                type="url"
                value={form.payment_link || ''}
                onChange={(e) => setForm({ ...form, payment_link: e.target.value })}
                placeholder="https://iyzi.link/... (EUR)"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Ödeme Linki (TL)</label>
              <input
                type="url"
                value={form.tl_payment_link || ''}
                onChange={(e) => setForm({ ...form, tl_payment_link: e.target.value })}
                placeholder="https://iyzi.link/... (TL)"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Kapasite <span className="text-red-500">*</span></label>
              <input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                required
                min={0}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Açıklama</label>
              <textarea
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Etkinlik hakkında kısa bilgi..."
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 resize-none"
              />
            </div>

            {error && (
              <div className="col-span-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            )}

            <div className="col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-400 disabled:opacity-60"
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-gray-400">Yükleniyor...</div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Başlık</th>
                  <th className="px-4 py-3 text-left">Tarih</th>
                  <th className="px-4 py-3 text-left">Yer</th>
                  <th className="px-4 py-3 text-left">Fiyat (EUR)</th>
                  <th className="px-4 py-3 text-left">Fiyat (TL)</th>
                  <th className="px-4 py-3 text-left">Kapasite</th>
                  <th className="px-4 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Etkinlik bulunamadı</td>
                  </tr>
                ) : (
                  events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{ev.title}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {ev.date ? new Date(ev.date).toLocaleString('tr-TR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{ev.location || '—'}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {ev.price !== undefined ? `${ev.price.toLocaleString('de-DE')} €` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {ev.tl_price !== undefined ? `${ev.tl_price.toLocaleString('de-DE')} ₺` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {ev.tickets_sold ?? 0} / {ev.capacity}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(ev)}
                            className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={() => handleDelete(ev.id)}
                            className="rounded-lg border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                          >
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}