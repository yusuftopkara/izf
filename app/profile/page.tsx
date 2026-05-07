'use client'

import { useState, useEffect, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Link from 'next/link'
import { api, type Ticket } from '../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────
interface User {
  name?: string
  email?: string
  role?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('izf_token')
}

function getUser(): User | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('izf_token')
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return decoded
  } catch {
    return null
  }
}

function saveToken(t: string) {
  localStorage.setItem('izf_token', t)
}
function clearToken() {
  localStorage.removeItem('izf_token')
}

// ─── Login ────────────────────────────────────────────────────────────────────
function ProfileLogin({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const res = await api.login(email, password)
        saveToken(res.access_token)
        onSuccess()
      } else {
        await api.register(name, email, password)
        const res = await api.login(email, password)
        saveToken(res.access_token)
        onSuccess()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl bg-[#1a1a2e]/80 border border-white/10 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-6 text-center">
          <div className="mb-3 text-4xl">👤</div>
          <h1 className="text-2xl font-extrabold text-white">
            {mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {mode === 'login' ? 'Biletlerini görüntüle' : 'Festival ailesine katıl'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/60">Ad Soyad</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Adınız Soyadınız"
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/60">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ornek@email.com"
              className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/60">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-300">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white transition hover:bg-orange-400 disabled:opacity-60"
          >
            {loading ? 'Yükleniyor...' : mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-white/50">
          {mode === 'login' ? (
            <>
              Hesabın yok mu?{' '}
              <button onClick={() => setMode('register')} className="font-semibold text-orange-400 hover:underline">
                Kayıt Ol
              </button>
            </>
          ) : (
            <>
              Zaten hesabın var mı?{' '}
              <button onClick={() => setMode('login')} className="font-semibold text-orange-400 hover:underline">
                Giriş Yap
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── QR Download ──────────────────────────────────────────────────────────────
function downloadQR(token: string, id: string) {
  const svg = document.getElementById(`profile-qr-${id}`)
  if (!svg) return
  const serializer = new XMLSerializer()
  const svgStr = serializer.serializeToString(svg)
  const canvas = document.createElement('canvas')
  canvas.width = 300
  canvas.height = 300
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const img = new Image()
  img.onload = () => {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 300, 300)
    ctx.drawImage(img, 0, 0, 300, 300)
    const link = document.createElement('a')
    link.download = `bilet-${token.slice(0, 8)}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)))
}

// ─── Ticket Card ──────────────────────────────────────────────────────────────
function TicketCard({ ticket }: { ticket: Ticket }) {
  const [showQR, setShowQR] = useState(false)
  const isUsed = ticket.status === 'used'

  return (
    <div className={`rounded-3xl border p-5 transition ${isUsed ? 'border-white/5 bg-white/5 opacity-60' : 'border-orange-500/20 bg-gradient-to-br from-[#1a1a2e] to-[#16213e]'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-bold text-white">{ticket.event_title}</p>
          {ticket.created_at && (
            <p className="mt-0.5 text-xs text-white/40">
              {new Date(ticket.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${isUsed ? 'bg-gray-500/20 text-gray-400' : 'bg-green-500/20 text-green-400'}`}>
          {isUsed ? 'Kullanılmış' : 'Aktif'}
        </span>
      </div>

      {!isUsed && (
        <button
          onClick={() => setShowQR(!showQR)}
          className="mb-3 flex w-full items-center justify-between rounded-xl bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10"
        >
          <span>QR Kodu Göster</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`h-4 w-4 transition ${showQR ? 'rotate-180' : ''}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {showQR && !isUsed && (
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-lg">
            <QRCodeSVG id={`profile-qr-${ticket.id}`} value={ticket.qr_token} size={180} level="M" />
          </div>
          <p className="text-xs text-white/30 font-mono">{ticket.qr_token.slice(0, 20)}...</p>
          <button
            onClick={() => downloadQR(ticket.qr_token, ticket.id)}
            className="flex items-center gap-2 rounded-xl bg-orange-500/20 px-4 py-2 text-sm font-semibold text-orange-400 transition hover:bg-orange-500/30"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            QR Kodu İndir
          </button>
        </div>
      )}

      {isUsed && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Bu bilet kullanılmıştır
        </div>
      )}
    </div>
  )
}

// ─── Profile Dashboard ────────────────────────────────────────────────────────
function ProfileDashboard({ authToken, onLogout }: { authToken: string; onLogout: () => void }) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'used'>('all')
  const [user, setUser] = useState<User | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    // Load user from token
    setUser(getUser())
    api.getMyTickets(authToken)
      .then(setTickets)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [authToken])

  useEffect(() => { load() }, [load])

  const filtered = tickets.filter((t) => {
    if (filter === 'all') return true
    if (filter === 'active') return t.status !== 'used'
    return t.status === 'used'
  })

  const activeCount = tickets.filter((t) => t.status !== 'used').length
  const usedCount = tickets.filter((t) => t.status === 'used').length

  const isAdmin = user?.role === 'admin'
  const displayName = user?.name || user?.email?.split('@')[0] || 'Kullanıcı'
  const userInitial = displayName.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-[#0d0d1a] pt-20">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* User Profile Card */}
        <div className="mb-8 rounded-3xl bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-500 text-2xl font-bold text-white">
              {userInitial}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">{displayName}</h1>
              <p className="text-sm text-white/50">{user?.email}</p>
              <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                isAdmin ? 'bg-orange-500/20 text-orange-400' : 'bg-white/10 text-white/60'
              }`}>
                {isAdmin ? 'Yönetici' : 'Kullanıcı'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid grid-cols-2 gap-3">
          <Link
            href="/profile/settings"
            className="flex items-center gap-3 rounded-2xl bg-[#1a1a2e] border border-white/10 p-4 transition hover:bg-[#1a1a2e]/80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-purple-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="font-semibold text-white">Profil Ayarları</span>
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-2xl bg-[#1a1a2e] border border-white/10 p-4 transition hover:bg-[#1a1a2e]/80"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-orange-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="font-semibold text-white">Admin Panel</span>
            </Link>
          )}

          <button
            onClick={onLogout}
            className="flex items-center gap-3 rounded-2xl bg-[#1a1a2e] border border-white/10 p-4 transition hover:bg-red-500/10 hover:border-red-500/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-red-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <span className="font-semibold text-red-400">Çıkış Yap</span>
          </button>
        </div>

        {/* Tickets Section */}
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Biletlerim</h2>
            <Link href="/" className="text-sm font-semibold text-orange-400 hover:underline">
              Bilet Al
            </Link>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/5 p-4 text-center">
              <p className="text-2xl font-extrabold text-white">{tickets.length}</p>
              <p className="text-xs text-white/50 mt-0.5">Toplam</p>
            </div>
            <div className="rounded-2xl bg-green-500/10 p-4 text-center">
              <p className="text-2xl font-extrabold text-green-400">{activeCount}</p>
              <p className="text-xs text-white/50 mt-0.5">Aktif</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 text-center">
              <p className="text-2xl font-extrabold text-white/40">{usedCount}</p>
              <p className="text-xs text-white/50 mt-0.5">Kullanılmış</p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="mb-6 flex gap-2">
            {(['all', 'active', 'used'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${filter === f ? 'bg-orange-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
              >
                {f === 'all' ? 'Tümü' : f === 'active' ? 'Aktif' : 'Kullanılmış'}
              </button>
            ))}
          </div>

          {/* Tickets */}
          {loading ? (
            <div className="py-16 text-center text-white/40">Biletler yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="text-5xl opacity-30">🎫</div>
              <p className="text-white/40">
                {filter === 'all' ? 'Henüz biletiniz yok' : filter === 'active' ? 'Aktif biletiniz yok' : 'Kullanılmış biletiniz yok'}
              </p>
              {filter === 'all' && (
                <a
                  href="/"
                  className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-orange-400"
                >
                  Bilet Al
                </a>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </div>

        {/* Festival info */}
        <div className="mt-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 px-5 py-4">
          <p className="text-sm font-bold text-orange-400 mb-1">9th Istanbul International Zumba Festival</p>
          <p className="text-xs text-white/50">17–18 Ekim 2026 · Green Park Hotel Pendik Convention Center</p>
          <p className="mt-2 text-xs text-white/40">Girişte QR kodunuzu görevlilere okutunuz.</p>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [token, setToken] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const t = getToken()
    setToken(t)
    setChecked(true)
  }, [])

  function handleLogout() {
    clearToken()
    setToken(null)
  }

  if (!checked) return null

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] pt-20">
        <ProfileLogin onSuccess={() => setToken(getToken())} />
      </div>
    )
  }

  return <ProfileDashboard authToken={token} onLogout={handleLogout} />
}
