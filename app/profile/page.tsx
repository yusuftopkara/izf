'use client'

import { useState, useEffect, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Link from 'next/link'
import { api, type Ticket } from '../lib/api'
import { useLocale } from '../context/LocaleContext'

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
  const { t } = useLocale()
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
        window.dispatchEvent(new Event('izf_auth_change'))
        onSuccess()
      } else {
        await api.register(name, email, password)
        const res = await api.login(email, password)
        saveToken(res.access_token)
        window.dispatchEvent(new Event('izf_auth_change'))
        onSuccess()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.genericError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl bg-[#1a1a2e]/80 border border-white/10 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-6 text-center">
          <div className="mb-3 text-4xl">👤</div>
          <h1 className="text-2xl font-extrabold text-white" data-testid="profile-login-title">
            {mode === 'login' ? t('auth.loginTitle') : t('auth.profileCreateTitle')}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {mode === 'login' ? t('auth.profileLoginDesc') : t('auth.profileRegisterDesc')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/60">{t('auth.name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={t('auth.namePlaceholder')}
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/60">{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t('auth.emailPlaceholder')}
              className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/60">{t('auth.password')}</label>
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
            data-testid="profile-login-submit"
            className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white transition hover:bg-orange-400 disabled:opacity-60"
          >
            {loading ? t('auth.loading') : mode === 'login' ? t('auth.loginBtn') : t('auth.profileCreateTitle')}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-white/50">
          {mode === 'login' ? (
            <>
              {t('auth.noAccountShort')}{' '}
              <button onClick={() => setMode('register')} className="font-semibold text-orange-400 hover:underline">
                {t('auth.registerLink')}
              </button>
            </>
          ) : (
            <>
              {t('auth.hasAccountShort')}{' '}
              <button onClick={() => setMode('login')} className="font-semibold text-orange-400 hover:underline">
                {t('auth.loginLink')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── QR Download ──────────────────────────────────────────────────────────────
import { downloadTicketImage } from '../lib/ticket-download'

// ─── Ticket Card ──────────────────────────────────────────────────────────────
function TicketCard({ ticket, userName }: { ticket: Ticket; userName: string }) {
  const { t, locale } = useLocale()
  const [showQR, setShowQR] = useState(false)
  const isUsed = ticket.status === 'used'

  return (
    <div className={`rounded-3xl border p-5 transition ${isUsed ? 'border-white/5 bg-white/5 opacity-60' : 'border-orange-500/20 bg-gradient-to-br from-[#1a1a2e] to-[#16213e]'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-bold text-white">{ticket.event_title}</p>
          {ticket.created_at && (
            <p className="mt-0.5 text-xs text-white/40">
              {new Date(ticket.created_at).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${isUsed ? 'bg-gray-500/20 text-gray-400' : 'bg-green-500/20 text-green-400'}`}>
          {isUsed ? t('profileDash.statusUsed') : t('profileDash.statusActive')}
        </span>
      </div>

      {!isUsed && (
        <button
          onClick={() => setShowQR(!showQR)}
          className="mb-3 flex w-full items-center justify-between rounded-xl bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10"
        >
          <span>{t('profileDash.qrShow')}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`h-4 w-4 transition ${showQR ? 'rotate-180' : ''}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {showQR && !isUsed && (
        <div className="flex flex-col items-center gap-3">
          <img src="/images/festival-logo.png" alt="Festival Logo" className="h-10 w-auto" />
          <div className="rounded-2xl bg-white p-4 shadow-lg">
            <QRCodeSVG id={`profile-qr-${ticket.id}`} value={ticket.qr_token} size={180} level="M" />
          </div>
          <p className="text-xs text-white/50">{t('ticket.form.eventDate')}</p>
          <button
            onClick={() => downloadTicketImage({
              qrSvgElementId: `profile-qr-${ticket.id}`,
              attendeeName: userName || 'Attendee',
              eventTitle: ticket.event_title,
            })}
            className="flex items-center gap-2 rounded-xl bg-orange-500/20 px-4 py-2 text-sm font-semibold text-orange-400 transition hover:bg-orange-500/30"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t('profileDash.qrDownload')}
          </button>
        </div>
      )}

      {isUsed && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t('profileDash.ticketUsed')}
        </div>
      )}
    </div>
  )
}

// ─── Profile Dashboard ────────────────────────────────────────────────────────
function ProfileDashboard({ authToken, onLogout }: { authToken: string; onLogout: () => void }) {
  const { t } = useLocale()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'used'>('all')
  const [user, setUser] = useState<User | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setUser(getUser())
    api.getMyTickets(authToken)
      .then(setTickets)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [authToken])

  useEffect(() => { load() }, [load])

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      await api.deleteMe(authToken)
      clearToken()
      window.dispatchEvent(new Event('izf_auth_change'))
      window.location.href = '/'
    } catch {
      alert(t('profileDash.deleteError') || 'Hesap silinemedi')
      setShowDeleteModal(false)
    } finally {
      setDeleting(false)
    }
  }

  const filtered = tickets.filter((tk) => {
    if (filter === 'all') return true
    if (filter === 'active') return tk.status !== 'used'
    return tk.status === 'used'
  })

  const activeCount = tickets.filter((tk) => tk.status !== 'used').length
  const usedCount = tickets.filter((tk) => tk.status === 'used').length

  const isAdmin = user?.role === 'admin'
  const displayName = user?.name || user?.email?.split('@')[0] || t('nav.userFallback')
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
                {isAdmin ? t('profileDash.roleAdmin') : t('profileDash.roleUser')}
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
            <span className="font-semibold text-white">{t('profileDash.profileSettings')}</span>
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
              <span className="font-semibold text-white">{t('profileDash.adminPanel')}</span>
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
            <span className="font-semibold text-red-400">{t('profileDash.logout')}</span>
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-3 rounded-2xl bg-[#1a1a2e] border border-white/10 p-4 transition hover:bg-red-500/10 hover:border-red-500/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-red-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <span className="font-semibold text-red-400">{t('profileDash.deleteAccount')}</span>
          </button>
        </div>

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-sm rounded-3xl bg-[#1a1a2e] border border-white/10 p-6 shadow-2xl">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-7 w-7 text-red-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="mb-2 text-xl font-bold text-white">{t('profileDash.deleteConfirmTitle')}</h2>
              <p className="mb-6 text-sm text-white/60">
                {t('profileDash.deleteConfirmText') || 'Hesabinizi silmek istediginize emin misiniz? Bu islem geri alinamaz.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 rounded-xl bg-white/10 py-3 font-semibold text-white transition hover:bg-white/20"
                >
                  {t('profileDash.cancel')}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 rounded-xl bg-red-500 py-3 font-bold text-white transition hover:bg-red-400 disabled:opacity-60"
                >
                  {deleting ? (t('profileDash.deleting') || 'Siliniyor...') : (t('profileDash.confirmDelete') || 'Sil')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tickets Section */}
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">{t('profileDash.myTickets')}</h2>
            <Link href="/" className="text-sm font-semibold text-orange-400 hover:underline">
              {t('profileDash.buyTicket')}
            </Link>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/5 p-4 text-center">
              <p className="text-2xl font-extrabold text-white">{tickets.length}</p>
              <p className="text-xs text-white/50 mt-0.5">{t('profileDash.total')}</p>
            </div>
            <div className="rounded-2xl bg-green-500/10 p-4 text-center">
              <p className="text-2xl font-extrabold text-green-400">{activeCount}</p>
              <p className="text-xs text-white/50 mt-0.5">{t('profileDash.active')}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 text-center">
              <p className="text-2xl font-extrabold text-white/40">{usedCount}</p>
              <p className="text-xs text-white/50 mt-0.5">{t('profileDash.used')}</p>
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
                {f === 'all' ? t('profileDash.filterAll') : f === 'active' ? t('profileDash.filterActive') : t('profileDash.filterUsed')}
              </button>
            ))}
          </div>

          {/* Tickets */}
          {loading ? (
            <div className="py-16 text-center text-white/40">{t('profileDash.loading')}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="text-5xl opacity-30">🎫</div>
              <p className="text-white/40">
                {filter === 'all' ? t('profileDash.noTicketsAll') : filter === 'active' ? t('profileDash.noTicketsActive') : t('profileDash.noTicketsUsed')}
              </p>
              {filter === 'all' && (
                <a
                  href="/"
                  className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-orange-400"
                >
                  {t('profileDash.buyTicket')}
                </a>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} userName={user?.name || ''} />
              ))}
            </div>
          )}
        </div>

        {/* Festival info */}
        <div className="mt-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 px-5 py-4">
          <p className="text-sm font-bold text-orange-400 mb-1">9th Istanbul International Zumba Festival</p>
          <p className="text-xs text-white/50">{t('profileDash.festivalDates')}</p>
          <p className="mt-2 text-xs text-white/40">{t('profileDash.qrHint')}</p>
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
