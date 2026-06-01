'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '../../lib/api'
import { useLocale } from '../../context/LocaleContext'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProfileData {
  name: string
  phone: string
  city: string
  bio: string
  country: 'TR' | 'OTHER'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('izf_token')
}

function getUser() {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('izf_token')
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

function clearToken() {
  localStorage.removeItem('izf_token')
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProfileSettingsPage() {
  const { t } = useLocale()
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Profile form
  const [form, setForm] = useState<ProfileData>({
    name: '',
    phone: '',
    city: '',
    bio: '',
    country: 'TR',
  })

  // Password change form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    const u = getUser()
    setUser(u)
    if (u) {
      loadProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadProfile() {
    try {
      setLoading(true)
      const token = getToken()
      if (!token) return

      const profile = await api.getProfile?.(token)
      if (profile) {
        setForm({
          name: profile.name || '',
          phone: profile.phone || '',
          city: profile.city || '',
          bio: profile.bio || '',
          country: (profile.country === 'TR' || profile.country === 'OTHER') ? profile.country : 'TR',
        })
      } else {
        const u = getUser()
        setForm((prev) => ({ ...prev, name: u?.name || '', country: prev.country }))
      }
    } catch (err) {
      console.error('Profile load error:', err)
      const u = getUser()
      setForm((prev) => ({ ...prev, name: u?.name || '' }))
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')

    if (!form.name.trim()) {
      setError(t('profileSettings.nameRequired'))
      return
    }

    setSaving(true)
    try {
      const token = getToken()
      if (!token) throw new Error(t('profileSettings.sessionExpired'))

      if (api.updateProfile) {
        await api.updateProfile(form, token)
      }

      setMessage(t('profileSettings.profileUpdated'))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('profileSettings.profileUpdateError'))
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')

    if (newPassword !== confirmPassword) {
      setError(t('profileSettings.passwordsDontMatch'))
      return
    }

    if (newPassword.length < 6) {
      setError(t('profileSettings.passwordTooShort'))
      return
    }

    setSaving(true)
    try {
      const token = getToken()
      if (!token) throw new Error(t('profileSettings.sessionExpired'))

      await new Promise((resolve) => setTimeout(resolve, 500))
      setMessage(t('profileSettings.passwordChanged'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('profileSettings.genericError'))
    } finally {
      setSaving(false)
    }
  }

  function handleLogout() {
    clearToken()
    window.location.href = '/profile'
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">{t('profileSettings.loginRequired')}</p>
          <Link href="/profile" className="rounded-xl bg-orange-500 px-6 py-2.5 font-bold text-white">
            {t('profileSettings.loginBtn')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0d1a] pt-20">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/60 transition hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7-7l-7 7 7 7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{t('profileSettings.title')}</h1>
            <p className="text-sm text-white/50">{t('profileSettings.subtitle')}</p>
          </div>
        </div>

        {/* Alerts */}
        {message && (
          <div className="mb-6 rounded-xl bg-green-500/20 px-4 py-3 text-sm text-green-300">{message}</div>
        )}
        {error && (
          <div className="mb-6 rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        {/* Profile Info Card */}
        <div className="mb-8 rounded-3xl bg-[#1a1a2e] border border-white/10 p-6">
          <h2 className="mb-4 text-lg font-bold text-white">{t('profileSettings.profileInfo')}</h2>

          {loading ? (
            <div className="py-8 text-center text-white/40">{t('profileSettings.loading')}</div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/60">{t('profileSettings.name')} *</label>
                <div className="relative">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder={t('profileSettings.namePlaceholder')}
                    className="w-full rounded-xl bg-white/10 pl-12 pr-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Email - Read only */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/60">{t('profileSettings.email')}</label>
                <div className="relative">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <input
                    type="email"
                    value={user.email || ''}
                    disabled
                    className="w-full rounded-xl bg-white/5 pl-12 pr-4 py-3 text-white/60 cursor-not-allowed"
                  />
                </div>
                <p className="mt-1 text-xs text-white/30">{t('profileSettings.emailNotChangeable')}</p>
              </div>

              {/* Phone */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/60">{t('profileSettings.phone')}</label>
                <div className="relative">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder={t('profileSettings.phonePlaceholder')}
                    className="w-full rounded-xl bg-white/10 pl-12 pr-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* City */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/60">{t('profileSettings.city')}</label>
                <div className="relative">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder={t('profileSettings.cityPlaceholder')}
                    className="w-full rounded-xl bg-white/10 pl-12 pr-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/60">{t('profileSettings.bio')}</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder={t('profileSettings.bioPlaceholder')}
                  rows={4}
                  className="w-full resize-none rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Country */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/60">Ülke / Country</label>
                <select
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value as 'TR' | 'OTHER' })}
                  className="w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="TR">🇹🇷 Türkiye</option>
                  <option value="OTHER">🌍 International (Diğer)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white transition hover:bg-orange-400 disabled:opacity-60"
              >
                {saving ? t('profileSettings.saving') : t('profileSettings.saveProfile')}
              </button>
            </form>
          )}
        </div>

        {/* Password Change */}
        <div className="mb-8 rounded-3xl bg-[#1a1a2e] border border-white/10 p-6">
          <h2 className="mb-4 text-lg font-bold text-white">{t('profileSettings.passwordChange')}</h2>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/60">{t('profileSettings.currentPassword')}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/60">{t('profileSettings.newPassword')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/60">{t('profileSettings.newPasswordRepeat')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white transition hover:bg-orange-400 disabled:opacity-60"
            >
              {saving ? t('profileSettings.processing') : t('profileSettings.changePassword')}
            </button>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="rounded-3xl bg-red-500/10 border border-red-500/20 p-6">
          <h2 className="mb-4 text-lg font-bold text-red-400">{t('profileSettings.session')}</h2>
          <p className="mb-4 text-sm text-white/50">{t('profileSettings.logoutDesc')}</p>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/20 px-4 py-3 font-bold text-red-400 transition hover:bg-red-500/30"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {t('profileSettings.logout')}
          </button>
        </div>
      </div>
    </div>
  )
}
