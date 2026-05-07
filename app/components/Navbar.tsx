'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import AuthModal from './AuthModal'
import { getAuthToken, removeAuthToken, getAuthUser } from './AuthModal'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'login' | 'register' }>({
    open: false,
    mode: 'login',
  })
  const [user, setUser] = useState<{ name?: string; email?: string; role?: string } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  // Check auth on mount + listen for storage changes
  const refreshUser = useCallback(() => {
    const token = getAuthToken()
    if (token) {
      setUser(getAuthUser())
    } else {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refreshUser()

    // Listen for login/logout from other components (e.g. TicketPurchaseModal)
    const handler = () => refreshUser()
    window.addEventListener('storage', handler)
    window.addEventListener('izf_auth_change', handler)
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener('izf_auth_change', handler)
    }
  }, [refreshUser])

  // Scroll listener for glassmorphism
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  function handleLogout() {
    removeAuthToken()
    setUser(null)
    setMenuOpen(false)
    window.dispatchEvent(new Event('izf_auth_change'))
  }

  function openAuth(mode: 'login' | 'register') {
    setAuthModal({ open: true, mode })
    setMenuOpen(false)
  }

  function handleAuthSuccess() {
    refreshUser()
    window.dispatchEvent(new Event('izf_auth_change'))
  }

  const displayName = user?.name || user?.email?.split('@')[0] || 'Kullanıcı'

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#0d0d1a]/80 backdrop-blur-md border-b border-white/10 shadow-lg'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          {/* Left: Logo + site name */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition">
            <Image
              src="/images/festival-logo.png"
              alt="Istanbul Zumba Festival"
              width={96}
              height={96}
              className="rounded-full"
            />
            <span className="hidden sm:block text-2xl font-bold text-white">
              Istanbul <span className="text-orange-400">Zumba</span> Festival
            </span>
          </Link>

          {/* Right: Auth buttons or user menu */}
          <div className="flex items-center gap-2">
            {user ? (
              /* Logged in state */
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block max-w-[100px] truncate">{displayName}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-white/60">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-[#1a1a2e] border border-white/10 shadow-2xl overflow-hidden">
                    <Link
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 transition"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-orange-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profilim
                    </Link>
                    {user?.role === 'admin' && (
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 transition"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-orange-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-white/10 transition"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Çıkış Yap
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Logged out state */
              <>
                <button
                  onClick={() => openAuth('login')}
                  className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-white/50"
                >
                  Giriş Yap
                </button>
                <button
                  onClick={() => openAuth('register')}
                  className="rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-400 shadow-lg shadow-orange-500/30"
                >
                  Kayıt Ol
                </button>
              </>
            )}
          </div>
        </div>

        {/* Click outside to close dropdown */}
        {menuOpen && (
          <div className="fixed inset-0 z-[-1]" onClick={() => setMenuOpen(false)} />
        )}
      </header>

      <AuthModal
        isOpen={authModal.open}
        initialMode={authModal.mode}
        onClose={() => setAuthModal((v) => ({ ...v, open: false }))}
        onSuccess={handleAuthSuccess}
      />
    </>
  )
}
