'use client'

import { useState, useEffect } from 'react'
import { api } from '../lib/api'

// ─── Token helpers (same as TicketPurchaseModal) ──────────────────────────────
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('izf_token')
}

export function saveAuthToken(token: string) {
  localStorage.setItem('izf_token', token)
}

export function removeAuthToken() {
  localStorage.removeItem('izf_token')
}

// ─── Decode JWT payload (no library needed) ───────────────────────────────────
function decodeToken(token: string): { name?: string; email?: string; sub?: string; role?: string } | null {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return decoded
  } catch {
    return null
  }
}

export function getAuthUser(): { name?: string; email?: string; role?: string } | null {
  const token = getAuthToken()
  if (!token) return null
  return decodeToken(token)
}

export function getAuthRole(): string | null {
  const user = getAuthUser()
  return user?.role ?? null
}

// ─── Close button ─────────────────────────────────────────────────────────────
function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
      aria-label="Kapat"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}

// ─── Auth Modal ────────────────────────────────────────────────────────────────
interface AuthModalProps {
  isOpen: boolean
  initialMode?: 'login' | 'register'
  onClose: () => void
  onSuccess: () => void
}

export default function AuthModal({ isOpen, initialMode = 'login', onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Sync mode when prop changes (e.g. clicking "Kayıt Ol" vs "Giriş Yap" in navbar)
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
      setError('')
      setName('')
      setEmail('')
      setPassword('')
    }
  }, [isOpen, initialMode])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const res = await api.login(email, password)
        saveAuthToken(res.access_token)
        onSuccess()
        onClose()
      } else {
        await api.register(name, email, password)
        const res = await api.login(email, password)
        saveAuthToken(res.access_token)
        onSuccess()
        onClose()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-[#1a1a2e] border border-white/10 shadow-2xl">
        <div className="p-6">
          <CloseBtn onClick={onClose} />

          <h2 className="mb-1 text-center text-xl font-extrabold text-white">
            {mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
          </h2>
          <p className="mb-6 text-center text-sm text-white/50">
            {mode === 'login' ? 'Hoş geldiniz! Hesabınıza giriş yapın.' : 'Ücretsiz hesap oluşturun'}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
              className="mt-2 w-full rounded-xl bg-orange-500 py-3 font-bold text-white transition hover:bg-orange-400 disabled:opacity-60"
            >
              {loading ? 'Yükleniyor...' : mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-white/50">
            {mode === 'login' ? (
              <>
                Hesabın yok mu?{' '}
                <button onClick={() => { setMode('register'); setError('') }} className="font-semibold text-orange-400 hover:underline">
                  Kayıt Ol
                </button>
              </>
            ) : (
              <>
                Zaten hesabın var mı?{' '}
                <button onClick={() => { setMode('login'); setError('') }} className="font-semibold text-orange-400 hover:underline">
                  Giriş Yap
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
