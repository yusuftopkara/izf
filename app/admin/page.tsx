'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import {
  api,
  type AdminStats,
  type Discount,
  type AdminUser,
  type AdminTicket,
  type AdminEvent,
  type CreateDiscountRequest,
  type CreateEventRequest,
  type SiteContent,
} from '../lib/api'
import {
  loadVideos,
  saveVideos,
  type FestivalVideo,
} from '../components/FestivalVideos'
import {
  loadGalleryImages,
  saveGalleryImages,
  addDeletedDefault,
  type GalleryImage,
} from '../components/GalleryStorage'

// ─── helpers ─────────────────────────────────────────────────────────────────
function getNavbarToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('izf_token')
}

function decodeTokenRole(token: string): string | null {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return decoded?.role ?? null
  } catch {
    return null
  }
}

// ─── Login ───────────────────────────────────────────────────────────────────
function AdminLogin({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.login(email, password)
      // Save as the standard navbar token
      localStorage.setItem('izf_token', res.access_token)
      window.dispatchEvent(new Event('izf_auth_change'))
      onSuccess(res.access_token)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Giriş başarısız')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mb-3 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6 text-orange-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Paneli</h1>
          <p className="mt-1 text-sm text-gray-500">Istanbul Zumba Festival</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@example.com"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white transition hover:bg-orange-400 disabled:opacity-60"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Stat card ───────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>{icon}</div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
function Dashboard({ token }: { token: string }) {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAdminStats(token)
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <div className="py-16 text-center text-gray-400">Yükleniyor...</div>
  if (!stats) return <div className="py-16 text-center text-gray-400">Veri alınamadı</div>

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-gray-900">Genel Bakış</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Toplam Kullanıcı"
          value={stats.total_users}
          color="bg-blue-100"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-blue-600"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <StatCard
          label="Toplam Bilet"
          value={stats.total_tickets}
          color="bg-orange-100"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-orange-600"><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>}
        />
        <StatCard
          label="Kullanılan Bilet"
          value={stats.tickets_used}
          color="bg-green-100"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-green-600"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Toplam Etkinlik"
          value={stats.total_events}
          color="bg-purple-100"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-purple-600"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
      </div>
      {stats.total_revenue !== undefined && (
        <div className="mt-4 rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-400 p-6 text-white shadow-sm">
          <p className="text-sm font-medium text-white/80">Toplam Gelir</p>
          <p className="mt-1 text-4xl font-bold">{stats.total_revenue.toLocaleString('de-DE')} €</p>
        </div>
      )}
    </div>
  )
}

// ─── Discounts ───────────────────────────────────────────────────────────────
const EMPTY_DISCOUNT: CreateDiscountRequest = {
  code: '',
  discount_type: 'percentage',
  value: 0,
  valid_from: '',
  valid_until: '',
  max_uses: undefined,
}

function DiscountsPanel({ token }: { token: string }) {
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

// ─── Tickets Panel ────────────────────────────────────────────────────────────
function TicketsPanel({ token }: { token: string }) {
  const [tickets, setTickets] = useState<AdminTicket[]>([])
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [qrInput, setQrInput] = useState('')
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [filter, setFilter] = useState<'all' | 'VALID' | 'USED' | 'unassigned'>('all')
  const [search, setSearch] = useState('')

  // Bulk create modal
  const [showBulk, setShowBulk] = useState(false)
  const [bulkEventId, setBulkEventId] = useState('')
  const [bulkQuantity, setBulkQuantity] = useState(50)
  const [bulkNote, setBulkNote] = useState('Elden satış')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkError, setBulkError] = useState('')

  // Assign modal
  const [assignTicket, setAssignTicket] = useState<AdminTicket | null>(null)
  const [assignName, setAssignName] = useState('')
  const [assignEmail, setAssignEmail] = useState('')
  const [assignPhone, setAssignPhone] = useState('')
  const [assignLoading, setAssignLoading] = useState(false)

  const reload = () => {
    setLoading(true)
    api.getAdminTickets(token).then(setTickets).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => {
    api.getAdminTickets(token).then(setTickets).catch(() => {}).finally(() => setLoading(false))
    api.getAdminEvents(token).then(setEvents).catch(() => {})
  }, [token])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!qrInput.trim()) return
    setVerifying(true)
    setVerifyResult(null)
    try {
      const res = await api.verifyQR(qrInput.trim(), token)
      setVerifyResult(res)
      if (res.success) reload()
    } catch (err: unknown) {
      setVerifyResult({ success: false, message: err instanceof Error ? err.message : 'Doğrulama başarısız' })
    } finally {
      setVerifying(false)
    }
  }

  async function handleBulkCreate(e: React.FormEvent) {
    e.preventDefault()
    setBulkError('')
    if (!bulkEventId) { setBulkError('Etkinlik seçin'); return }
    if (bulkQuantity < 1 || bulkQuantity > 1000) { setBulkError('Adet 1 ile 1000 arasında olmalı'); return }
    setBulkLoading(true)
    try {
      const res = await api.bulkCreateTickets(bulkEventId, bulkQuantity, bulkNote, token)
      setShowBulk(false)
      setBulkQuantity(50)
      reload()
      alert(`${res.count} adet bilet üretildi. QR kodları artık tabloda görünür ve indirilebilir.`)
    } catch (err: unknown) {
      setBulkError(err instanceof Error ? err.message : 'Toplu üretim başarısız')
    } finally {
      setBulkLoading(false)
    }
  }

  async function handleAssignSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!assignTicket || !assignName.trim()) return
    setAssignLoading(true)
    try {
      await api.assignTicket(
        assignTicket.id,
        { buyer_name: assignName.trim(), buyer_email: assignEmail.trim(), buyer_phone: assignPhone.trim() },
        token
      )
      setAssignTicket(null)
      setAssignName(''); setAssignEmail(''); setAssignPhone('')
      reload()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Atama başarısız')
    } finally {
      setAssignLoading(false)
    }
  }

  function openAssignModal(ticket: AdminTicket) {
    setAssignTicket(ticket)
    setAssignName(ticket.buyer_name || '')
    setAssignEmail(ticket.buyer_email || '')
    setAssignPhone(ticket.buyer_phone || '')
  }

  async function handleDownloadQR(ticket: AdminTicket) {
    const svgEl = document.getElementById(`admin-qr-${ticket.id}`) as unknown as SVGSVGElement | null
    if (!svgEl) { alert('QR kodu hazırlanıyor, lütfen 1 saniye sonra tekrar deneyin.'); return }
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svgEl)
    const canvas = document.createElement('canvas')
    const size = 720
    canvas.width = size
    canvas.height = size + 220
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 60, 40, size - 120, size - 120)
      ctx.fillStyle = '#0d0d1a'
      ctx.font = 'bold 28px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(ticket.event_title || '', canvas.width / 2, size - 40)
      ctx.font = '20px sans-serif'
      ctx.fillStyle = '#444'
      const buyer = ticket.buyer_name || ticket.user_name || 'Atanmamış / Unassigned'
      ctx.fillText(buyer, canvas.width / 2, size + 0)
      ctx.font = '14px monospace'
      ctx.fillStyle = '#888'
      ctx.fillText(ticket.qr_token, canvas.width / 2, size + 40)
      ctx.font = '12px sans-serif'
      ctx.fillStyle = '#aaa'
      ctx.fillText('Istanbul International Zumba Festival', canvas.width / 2, size + 80)
      const filename = `bilet-${(ticket.buyer_name || ticket.user_name || ticket.qr_token.slice(0, 8)).replace(/[^a-zA-Z0-9-_]/g, '_')}.png`
      const link = document.createElement('a')
      link.download = filename
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)))
  }

  const filtered = tickets.filter((t) => {
    if (filter === 'VALID' && t.status !== 'VALID') return false
    if (filter === 'USED' && t.status !== 'USED') return false
    if (filter === 'unassigned' && (t.is_assigned || t.user_id)) return false
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      (t.buyer_name || '').toLowerCase().includes(q) ||
      (t.buyer_email || '').toLowerCase().includes(q) ||
      (t.user_name || '').toLowerCase().includes(q) ||
      (t.user_email || '').toLowerCase().includes(q) ||
      (t.qr_token || '').toLowerCase().includes(q)
    )
  })

  const stats = {
    total: tickets.length,
    valid: tickets.filter((t) => t.status === 'VALID').length,
    used: tickets.filter((t) => t.status === 'USED').length,
    unassigned: tickets.filter((t) => !t.is_assigned && !t.user_id).length,
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Bilet Yönetimi</h2>
        <button
          onClick={() => setShowBulk(true)}
          className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-purple-500 shadow-sm"
        >
          + Toplu Bilet Üret (Elden Satış)
        </button>
      </div>

      {/* QR Verify */}
      <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="mb-4 font-bold text-gray-800">QR Kod Doğrulama (Etkinlik Girişi)</h3>
        <form onSubmit={handleVerify} className="flex gap-3">
          <input
            type="text"
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            placeholder="QR token veya kod girin..."
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />
          <button
            type="submit"
            disabled={verifying}
            className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-400 disabled:opacity-60"
          >
            {verifying ? '...' : 'Doğrula'}
          </button>
        </form>
        {verifyResult && (
          <div className={`mt-3 rounded-xl px-4 py-3 text-sm font-medium ${verifyResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {verifyResult.success ? '✓ ' : '✗ '}{verifyResult.message}
          </div>
        )}
      </div>

      {/* Stats summary */}
      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white border border-gray-100 px-4 py-3"><p className="text-xs text-gray-500">Toplam</p><p className="text-xl font-extrabold text-gray-900">{stats.total}</p></div>
        <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3"><p className="text-xs text-gray-500">Aktif</p><p className="text-xl font-extrabold text-green-700">{stats.valid}</p></div>
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3"><p className="text-xs text-gray-500">Kullanılan</p><p className="text-xl font-extrabold text-gray-700">{stats.used}</p></div>
        <div className="rounded-xl bg-yellow-50 border border-yellow-100 px-4 py-3"><p className="text-xs text-gray-500">Atanmamış (Elden)</p><p className="text-xl font-extrabold text-yellow-700">{stats.unassigned}</p></div>
      </div>

      {/* Search + Filter */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="İsim, e-posta veya QR ile ara..."
          className="flex-1 min-w-[200px] rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-orange-500"
        />
        {(['all', 'VALID', 'USED', 'unassigned'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === f ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {f === 'all' ? 'Tümü' : f === 'VALID' ? 'Aktif' : f === 'USED' ? 'Kullanılmış' : 'Atanmamış'}
          </button>
        ))}
        <span className="ml-2 self-center text-xs text-gray-400">{filtered.length} bilet</span>
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-400">Yükleniyor...</div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Kullanıcı / Müşteri</th>
                  <th className="px-4 py-3 text-left">Etkinlik</th>
                  <th className="px-4 py-3 text-left">QR Token</th>
                  <th className="px-4 py-3 text-left">Kaynak</th>
                  <th className="px-4 py-3 text-left">Durum</th>
                  <th className="px-4 py-3 text-left">Tarih</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Bilet bulunamadı</td>
                  </tr>
                ) : (
                  filtered.map((t) => {
                    const owner = t.buyer_name || t.user_name
                    const ownerEmail = t.buyer_email || t.user_email
                    const isUnassigned = !owner && !ownerEmail
                    return (
                      <tr key={t.id} className={`hover:bg-gray-50 ${isUnassigned ? 'bg-yellow-50/30' : ''}`}>
                        <td className="px-4 py-3">
                          {isUnassigned ? (
                            <button
                              onClick={() => openAssignModal(t)}
                              className="text-xs font-bold text-yellow-700 bg-yellow-100 px-3 py-1.5 rounded-full hover:bg-yellow-200 transition"
                            >
                              ⊕ Müşteri Ata
                            </button>
                          ) : (
                            <div>
                              <p className="font-medium text-gray-900">{owner || 'Misafir'}</p>
                              {ownerEmail && <p className="text-xs text-gray-500">{ownerEmail}</p>}
                              {t.buyer_phone && <p className="text-xs text-gray-400">{t.buyer_phone}</p>}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{t.event_title}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-400" title={t.qr_token}>{t.qr_token.slice(0, 12)}...</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            t.source === 'user' ? 'bg-blue-100 text-blue-700' :
                            t.source === 'guest' ? 'bg-indigo-100 text-indigo-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {t.source === 'user' ? 'Üye' : t.source === 'guest' ? 'Misafir' : 'Elden'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.status === 'VALID' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {t.status === 'VALID' ? 'Aktif' : 'Kullanılmış'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {t.created_at ? new Date(t.created_at).toLocaleDateString('tr-TR') : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <div className="hidden">
                              <QRCodeSVG id={`admin-qr-${t.id}`} value={t.qr_token} size={600} level="M" includeMargin={false} />
                            </div>
                            {!isUnassigned && t.is_offline && (
                              <button
                                onClick={() => openAssignModal(t)}
                                className="rounded-lg bg-yellow-50 px-2 py-1.5 text-xs font-semibold text-yellow-700 hover:bg-yellow-100 transition"
                                title="Müşteri bilgisini düzenle"
                              >
                                ✎
                              </button>
                            )}
                            <button
                              onClick={() => handleDownloadQR(t)}
                              className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-400 transition shadow-sm"
                              title="QR kodu indir"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              İndir
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulk Create Modal */}
      {showBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-bold text-gray-900">Toplu Bilet Üret</h3>
            <p className="mb-4 text-sm text-gray-500">Elden satış için QR'lı bilet üretin. Sonra her birini ayrı ayrı müşteriye atayabilirsiniz.</p>
            <form onSubmit={handleBulkCreate} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Etkinlik *</label>
                <select
                  value={bulkEventId}
                  onChange={(e) => setBulkEventId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-purple-500"
                >
                  <option value="">Etkinlik seçin...</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Adet *</label>
                <input
                  type="number"
                  value={bulkQuantity}
                  onChange={(e) => setBulkQuantity(parseInt(e.target.value) || 0)}
                  min={1}
                  max={1000}
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-purple-500"
                />
                <p className="mt-1 text-xs text-gray-400">Önerilen: 400 (1 ile 1000 arası)</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Not (opsiyonel)</label>
                <input
                  type="text"
                  value={bulkNote}
                  onChange={(e) => setBulkNote(e.target.value)}
                  placeholder="Elden satış - Stand A"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-purple-500"
                />
              </div>
              {bulkError && (
                <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{bulkError}</div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulk(false)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={bulkLoading}
                  className="flex-1 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-500 disabled:opacity-60"
                >
                  {bulkLoading ? 'Üretiliyor...' : `${bulkQuantity} Bilet Üret`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-bold text-gray-900">Müşteri Bilgisi</h3>
            <p className="mb-4 text-sm text-gray-500">QR: <span className="font-mono text-xs">{assignTicket.qr_token.slice(0, 20)}...</span></p>
            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Ad Soyad *</label>
                <input
                  type="text"
                  value={assignName}
                  onChange={(e) => setAssignName(e.target.value)}
                  required
                  placeholder="Müşterinin adı soyadı"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">E-posta (opsiyonel)</label>
                <input
                  type="email"
                  value={assignEmail}
                  onChange={(e) => setAssignEmail(e.target.value)}
                  placeholder="ornek@email.com"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Telefon (opsiyonel)</label>
                <input
                  type="tel"
                  value={assignPhone}
                  onChange={(e) => setAssignPhone(e.target.value)}
                  placeholder="05XX XXX XX XX"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignTicket(null)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={assignLoading || !assignName.trim()}
                  className="flex-1 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-400 disabled:opacity-60"
                >
                  {assignLoading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Users Panel ──────────────────────────────────────────────────────────────
function UsersPanel({ token }: { token: string }) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  
  // Create user modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '' })
  const [creating, setCreating] = useState(false)
  
  // Reset password modal state
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetUser, setResetUser] = useState<AdminUser | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetting, setResetting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.getAdminUsers(token)
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load])

  async function handleRoleChange(id: string, role: string) {
    setUpdatingId(id)
    try {
      await api.updateUserRole(id, role, token)
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role: role as AdminUser['role'] } : u))
    } catch {
      alert('Rol güncellenemedi')
    } finally {
      setUpdatingId(null)
    }
  }
  
  async function handleCreateUser() {
    if (!createForm.name || !createForm.email || !createForm.password) {
      alert('Tüm alanları doldurun')
      return
    }
    setCreating(true)
    try {
      await api.createUser(createForm, token)
      alert('Kullanıcı oluşturuldu')
      setShowCreateModal(false)
      setCreateForm({ name: '', email: '', password: '' })
      load()
    } catch (err) {
      alert('Kullanıcı oluşturulamadı')
    } finally {
      setCreating(false)
    }
  }
  
  async function handleResetPassword() {
    if (!resetPassword || !resetUser) return
    setResetting(true)
    try {
      await api.resetUserPassword(resetUser.id, resetPassword, token)
      alert('Şifre sıfırlandı')
      setShowResetModal(false)
      setResetUser(null)
      setResetPassword('')
    } catch (err) {
      alert('Şifre sıfırlanamadı')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Kullanıcı Yönetimi</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
        >
          + Yeni Kullanıcı
        </button>
      </div>

      {showCreateModal && (
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Yeni Kullanıcı Ekle</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Ad Soyad</label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500"
                placeholder="Ad Soyad"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">E-posta</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500"
                placeholder="ornek@email.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Şifre</label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500"
                placeholder="••••••"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreateUser}
              disabled={creating}
              className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
            >
              {creating ? 'Oluşturuluyor...' : 'Oluştur'}
            </button>
            <button
              onClick={() => setShowCreateModal(false)}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {showResetModal && (
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Şifre Sıfırla</h3>
          <p className="mb-4 text-sm text-gray-600">{resetUser?.name} ({resetUser?.email}) için yeni şifre belirleyin</p>
          <div className="flex gap-4">
            <input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500"
              placeholder="Yeni şifre"
            />
            <button
              onClick={handleResetPassword}
              disabled={resetting}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {resetting ? 'Sıfırlanıyor...' : 'Sıfırla'}
            </button>
            <button
              onClick={() => { setShowResetModal(false); setResetUser(null); setResetPassword(''); }}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200"
            >
              İptal
            </button>
          </div>
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
                  <th className="px-4 py-3 text-left">Kullanıcı</th>
                  <th className="px-4 py-3 text-left">Bilet Sayısı</th>
                  <th className="px-4 py-3 text-left">Rol</th>
                  <th className="px-4 py-3 text-left">Kayıt Tarihi</th>
                  <th className="px-4 py-3 text-left">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Kullanıcı bulunamadı</td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.tickets_count ?? '—'}</td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={updatingId === u.id}
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold outline-none focus:border-orange-500 disabled:opacity-50"
                        >
                          <option value="user">Kullanıcı</option>
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('tr-TR') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { setResetUser(u); setShowResetModal(true); }}
                          className="rounded bg-orange-100 px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-200"
                        >
                          Şifre Sıfırla
                        </button>
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

// ─── Videos Panel ────────────────────────────────────────────────────────────
function VideosPanel() {
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

// ─── Events Panel ─────────────────────────────────────────────────────────────
const EMPTY_EVENT: CreateEventRequest = {
  title: '',
  date: '',
  location: '',
  price: undefined,
  capacity: 0,
  description: '',
}

function EventsPanel({ token }: { token: string }) {
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
                  <th className="px-4 py-3 text-left">Fiyat</th>
                  <th className="px-4 py-3 text-left">Kapasite</th>
                  <th className="px-4 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Etkinlik bulunamadı</td>
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

// ─── Gallery Panel ────────────────────────────────────────────────────────────
function GalleryPanel() {
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

// ─── Content Panel ────────────────────────────────────────────────────────────
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

function ContentPanel({ token }: { token: string }) {
  const [content, setContent] = useState<SiteContent>(EMPTY_SITE_CONTENT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setLoading(true)
    api.getSiteContent()
      .then((data) => {
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
    setContent((prev) => ({
      ...prev,
      hero_video: { ...prev.hero_video!, ...updates },
    }))
  }

  function updateBetoPerez(updates: Partial<SiteContent['beto_perez']>) {
    setContent((prev) => ({
      ...prev,
      beto_perez: { ...prev.beto_perez!, ...updates },
    }))
  }

  function updateVenue(updates: Partial<SiteContent['venue']>) {
    setContent((prev) => ({
      ...prev,
      venue: { ...prev.venue!, ...updates },
    }))
  }

  // Video preview URL helper
  const getVideoPreviewUrl = (url: string, type: 'youtube' | 'mp4'): string => {
    if (type === 'youtube' && url) {
      // Extract video ID from various YouTube URL formats
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
          {/* Video Preview */}
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
                onChange={(e) => setContent((prev) => ({ ...prev, countdown_target: e.target.value }))}
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
          {/* Image Preview */}
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
          {/* Map Preview */}
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

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
type AdminTab = 'dashboard' | 'discounts' | 'tickets' | 'users' | 'videos' | 'events' | 'gallery' | 'content'

const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
  {
    key: 'dashboard',
    label: 'Genel Bakış',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  },
  {
    key: 'content',
    label: 'İçerik',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>,
  },
  {
    key: 'events',
    label: 'Etkinlikler',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  },
  {
    key: 'discounts',
    label: 'Kuponlar',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M17 17h.01M7 17L17 7M3 12a9 9 0 1118 0 9 9 0 01-18 0z" /></svg>,
  },
  {
    key: 'tickets',
    label: 'Biletler',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>,
  },
  {
    key: 'users',
    label: 'Kullanıcılar',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    key: 'gallery',
    label: 'Galeri / Anılar',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 16m-6-6a2 2 0 100-4 2 2 0 000 4z" /><rect x="3" y="3" width="18" height="18" rx="2" /></svg>,
  },
  {
    key: 'videos',
    label: 'Videolar',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
  },
]

function AdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900">Admin Panel</span>
            <span className="hidden text-sm text-gray-400 sm:block">· Istanbul Zumba Festival</span>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Çıkış
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Tab bar */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-sm border border-gray-100">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'dashboard' && <Dashboard token={token} />}
        {activeTab === 'content' && <ContentPanel token={token} />}
        {activeTab === 'events' && <EventsPanel token={token} />}
        {activeTab === 'discounts' && <DiscountsPanel token={token} />}
        {activeTab === 'tickets' && <TicketsPanel token={token} />}
        {activeTab === 'users' && <UsersPanel token={token} />}
        {activeTab === 'gallery' && <GalleryPanel />}
        {activeTab === 'videos' && <VideosPanel />}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    const t = getNavbarToken()
    if (t) {
      const role = decodeTokenRole(t)
      if (role === 'admin') {
        setToken(t)
      } else {
        setAccessDenied(true)
      }
    }
    setChecked(true)
  }, [])

  // Also listen for auth changes (e.g. after login in AdminLogin)
  useEffect(() => {
    const handler = () => {
      const t = getNavbarToken()
      if (t) {
        const role = decodeTokenRole(t)
        if (role === 'admin') {
          setToken(t)
          setAccessDenied(false)
        } else {
          setToken(null)
          setAccessDenied(true)
        }
      } else {
        setToken(null)
        setAccessDenied(false)
      }
    }
    window.addEventListener('izf_auth_change', handler)
    return () => window.removeEventListener('izf_auth_change', handler)
  }, [])

  function handleLogout() {
    localStorage.removeItem('izf_token')
    window.dispatchEvent(new Event('izf_auth_change'))
    setToken(null)
    router.push('/')
  }

  if (!checked) return null

  if (accessDenied) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6 text-red-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Erişim Reddedildi</h1>
          <p className="text-sm text-gray-500 mb-6">Bu sayfaya erişmek için admin yetkisine ihtiyacınız var.</p>
          <button
            onClick={() => router.push('/')}
            className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white transition hover:bg-orange-400"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <AdminLogin
        onSuccess={(t) => {
          const role = decodeTokenRole(t)
          if (role === 'admin') {
            setToken(t)
          } else {
            setAccessDenied(true)
          }
        }}
      />
    )
  }

  return <AdminDashboard token={token} onLogout={handleLogout} />
}
