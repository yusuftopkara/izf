'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminLogin from './components/AdminLogin'
import AdminDashboard from './components/AdminDashboard'
import AdminContent from './components/AdminContent'
import AdminEvents from './components/AdminEvents'
import AdminDiscounts from './components/AdminDiscounts'
import AdminTickets from './components/AdminTickets'
import AdminUsers from './components/AdminUsers'
import AdminGallery from './components/AdminGallery'
import AdminVideos from './components/AdminVideos'
import { getNavbarToken, decodeTokenRole, TABS, type AdminTab } from './lib'

// ─── Header ───────────────────────────────────────────────────────────────────

function AdminHeader({ onLogout }: { onLogout: () => void }) {
  return (
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
  )
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function AdminTabs({ active, onChange }: { active: AdminTab; onChange: (tab: AdminTab) => void }) {
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-sm border border-gray-100">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex flex-shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            active === tab.key
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ─── Main Admin Shell ─────────────────────────────────────────────────────────

function AdminShell({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader onLogout={onLogout} />
      <div className="mx-auto max-w-7xl px-4 py-6">
        <AdminTabs active={activeTab} onChange={setActiveTab} />
        {activeTab === 'dashboard' && <AdminDashboard token={token} />}
        {activeTab === 'content' && <AdminContent token={token} />}
        {activeTab === 'events' && <AdminEvents token={token} />}
        {activeTab === 'discounts' && <AdminDiscounts token={token} />}
        {activeTab === 'tickets' && <AdminTickets token={token} />}
        {activeTab === 'users' && <AdminUsers token={token} />}
        {activeTab === 'gallery' && <AdminGallery />}
        {activeTab === 'videos' && <AdminVideos />}
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
      if (role === 'admin') setToken(t)
      else setAccessDenied(true)
    }
    setChecked(true)
  }, [])

  useEffect(() => {
    const handler = () => {
      const t = getNavbarToken()
      if (t) {
        const role = decodeTokenRole(t)
        if (role === 'admin') { setToken(t); setAccessDenied(false) }
        else { setToken(null); setAccessDenied(true) }
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

  function handleLoginSuccess(t: string) {
    const role = decodeTokenRole(t)
    if (role === 'admin') setToken(t)
    else setAccessDenied(true)
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
    return <AdminLogin onSuccess={handleLoginSuccess} />
  }

  return <AdminShell token={token} onLogout={handleLogout} />
}