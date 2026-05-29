'use client'

import { useState, useEffect, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { api, type AdminTicket, type AdminEvent } from '../../lib/api'

const PAGE_SIZE = 50

export default function AdminTickets({ token }: { token: string }) {
  const [tickets, setTickets] = useState<AdminTicket[]>([])
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [qrInput, setQrInput] = useState('')
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [filter, setFilter] = useState<'all' | 'VALID' | 'USED' | 'unassigned' | 'assigned'>('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

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

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const doFetch = useCallback((pg: number, searchTerm: string) => {
    setLoading(true)
    api.getAdminTickets(token, { page: pg, page_size: PAGE_SIZE, search: searchTerm })
      .then(res => {
        setTickets(res.tickets)
        setTotal(res.total)
        setPage(pg)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  // Initial load & reload
  const reload = () => doFetch(1, search)

  useEffect(() => {
    doFetch(1, search)
    api.getAdminEvents(token).then(setEvents).catch(() => {})
  }, [token, doFetch])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput.trim())
    setPage(1)
    doFetch(1, searchInput.trim())
  }

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

  const displayed = tickets.filter((t) => {
    if (filter === 'VALID' && t.status !== 'VALID') return false
    if (filter === 'USED' && t.status !== 'USED') return false
    if (filter === 'unassigned' && (t.is_assigned || t.user_id)) return false
    if (filter === 'assigned' && !t.buyer_name && !t.buyer_email) return false
    return true
  })

  const stats = {
    total,
    valid: 0,  // calculated from current page only (no full scan)
    used: 0,
    unassigned: 0,
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
        <div className="rounded-xl bg-white border border-gray-100 px-4 py-3"><p className="text-xs text-gray-500">Toplam</p><p className="text-xl font-extrabold text-gray-900">{total}</p></div>
        <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3"><p className="text-xs text-gray-500">Sayfa {page}/{totalPages || 1}</p><p className="text-xl font-extrabold text-green-700">{displayed.length}</p></div>
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3"><p className="text-xs text-gray-500">Aktif</p><p className="text-xl font-extrabold text-gray-700">{displayed.filter(t => t.status === 'VALID').length}</p></div>
        <div className="rounded-xl bg-yellow-50 border border-yellow-100 px-4 py-3"><p className="text-xs text-gray-500">Atanmamış</p><p className="text-xl font-extrabold text-yellow-700">{displayed.filter(t => !t.is_assigned && !t.user_id).length}</p></div>
      </div>

      {/* Search + Filter */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 min-w-[200px]">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="İsim, e-posta veya QR ile ara..."
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-orange-500"
          />
          <button
            type="submit"
            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-400 transition"
          >
            Ara
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchInput(''); doFetch(1, '') }}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
            >
              ✕ Temizle
            </button>
          )}
        </form>
        {(['all', 'VALID', 'USED', 'unassigned', 'assigned'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === f ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {f === 'all' ? 'Tümü' : f === 'VALID' ? 'Aktif' : f === 'USED' ? 'Kullanılmış' : f === 'unassigned' ? 'Atanmamış' : 'Atanmış'}
          </button>
        ))}
        <span className="ml-2 self-center text-xs text-gray-400">{total} bilet</span>
      </div>

      {/* Pagination */}
      <div className="mb-4 flex items-center justify-center gap-2">
        <button
          onClick={() => doFetch(1, search)}
          disabled={page <= 1}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          « Başa Git
        </button>
        <button
          onClick={() => doFetch(page - 1, search)}
          disabled={page <= 1}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Önceki
        </button>
        <span className="px-3 text-sm text-gray-600">Sayfa {page} / {totalPages || 1}</span>
        <button
          onClick={() => doFetch(page + 1, search)}
          disabled={page >= totalPages}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Sonraki →
        </button>
        <button
          onClick={() => doFetch(totalPages, search)}
          disabled={page >= totalPages}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Sona Git »
        </button>
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
                {displayed.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Bilet bulunamadı</td>
                  </tr>
                ) : (
                  displayed.map((t) => {
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

      {/* Bottom Pagination */}
      {!loading && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => doFetch(1, search)}
            disabled={page <= 1}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            « Başa Git
          </button>
          <button
            onClick={() => doFetch(page - 1, search)}
            disabled={page <= 1}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Önceki
          </button>
          <span className="px-3 text-sm text-gray-600">Sayfa {page} / {totalPages}</span>
          <button
            onClick={() => doFetch(page + 1, search)}
            disabled={page >= totalPages}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Sonraki →
          </button>
          <button
            onClick={() => doFetch(totalPages, search)}
            disabled={page >= totalPages}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Sona Git »
          </button>
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
