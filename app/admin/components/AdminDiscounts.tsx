'use client'

import { useState, useEffect, useCallback } from 'react'
import { api, type Discount, type CreateDiscountRequest } from '../../lib/api'

const EMPTY_DISCOUNT: CreateDiscountRequest = {
  code: '',
  discount_type: 'percentage',
  value: 0,
  valid_from: '',
  valid_until: '',
  max_uses: undefined,
}

export default function AdminDiscounts({ token }: { token: string }) {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateDiscountRequest>(EMPTY_DISCOUNT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api.getDiscounts(token)
      .then(setDiscounts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_DISCOUNT)
    setError('')
    setShowForm(true)
  }

  function openEdit(d: Discount) {
    setEditingId(d.id)
    setForm({
      code: d.code,
      discount_type: d.discount_type,
      value: d.value,
      valid_from: d.valid_from || '',
      valid_until: d.valid_until || '',
      max_uses: d.max_uses,
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
        valid_from: form.valid_from || undefined,
        valid_until: form.valid_until || undefined,
      }
      if (editingId) {
        await api.updateDiscount(editingId, payload, token)
      } else {
        await api.createDiscount(payload, token)
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
    if (!confirm('Bu kuponu silmek istediğinize emin misiniz?')) return
    try {
      await api.deleteDiscount(id, token)
      load()
    } catch {
      alert('Silinemedi')
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Kupon Yönetimi</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-400"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Yeni Kupon
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="mb-4 font-bold text-gray-800">{editingId ? 'Kupon Düzenle' : 'Yeni Kupon'}</h3>
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Kupon Kodu</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                required
                placeholder="YAZI10"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1 block text-xs font-semibold text-gray-600">İndirim Tipi</label>
              <select
                value={form.discount_type}
                onChange={(e) => setForm({ ...form, discount_type: e.target.value as 'percentage' | 'fixed' })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              >
                <option value="percentage">Yüzde (%)</option>
                <option value="fixed">Sabit (€)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Değer {form.discount_type === 'percentage' ? '(%)' : '(€)'}
              </label>
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                required
                min={0}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Maks. Kullanım</label>
              <input
                type="number"
                value={form.max_uses ?? ''}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Sınırsız"
                min={0}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Başlangıç Tarihi</label>
              <input
                type="date"
                value={form.valid_from || ''}
                onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Bitiş Tarihi</label>
              <input
                type="date"
                value={form.valid_until || ''}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
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
                  <th className="px-4 py-3 text-left">Kod</th>
                  <th className="px-4 py-3 text-left">İndirim</th>
                  <th className="px-4 py-3 text-left">Kullanım</th>
                  <th className="px-4 py-3 text-left">Geçerlilik</th>
                  <th className="px-4 py-3 text-left">Durum</th>
                  <th className="px-4 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {discounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Kupon bulunamadı</td>
                  </tr>
                ) : (
                  discounts.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-bold text-gray-900">{d.code}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {d.discount_type === 'percentage' ? `%${d.value}` : `${d.value} €`}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {d.uses_count} / {d.max_uses ?? '∞'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {d.valid_from && <span>{d.valid_from}</span>}
                        {d.valid_from && d.valid_until && <span> – </span>}
                        {d.valid_until && <span>{d.valid_until}</span>}
                        {!d.valid_from && !d.valid_until && '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${d.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {d.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(d)}
                            className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={() => handleDelete(d.id)}
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