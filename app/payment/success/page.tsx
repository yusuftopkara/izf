'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { api, type Event } from '../../lib/api'

interface ClaimResult {
  success: boolean
  ticket_id?: string
  qr_token?: string
  reason?: string
  event_title?: string
}

// ─── Confetti ────────────────────────────────────────────────────────────────
function ConfettiPiece({ delay, left, color }: { delay: number; left: string; color: string }) {
  return (
    <div
      className="absolute top-0 w-2 h-3 rounded-sm animate-confetti-fall"
      style={{
        left,
        backgroundColor: color,
        animationDelay: `${delay}s`,
        animationDuration: `${2.5 + Math.random() * 1.5}s`,
      }}
    />
  )
}

function Confetti() {
  const colors = ['#f472b6', '#c084fc', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#f87171']
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    delay: Math.random() * 2,
    left: `${Math.random() * 100}%`,
    color: colors[Math.floor(Math.random() * colors.length)],
  }))

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} delay={p.delay} left={p.left} color={p.color} />
      ))}
    </div>
  )
}

// ─── Status Icon ─────────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: 'loading' | 'valid' | 'invalid' | 'claimed' | 'success' | 'error' }) {
  if (status === 'loading') {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-400/30 border-t-purple-400" />
      </div>
    )
  }
  if (status === 'success') {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 animate-popIn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-10 w-10 text-green-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    )
  }
  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20 animate-shake">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-10 w-10 text-red-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  )
}

// ─── Ticket Result Card ───────────────────────────────────────────────────────
function TicketCard({ qr_token, ticket_id, event_title }: { qr_token: string; ticket_id: string; event_title: string }) {
  return (
    <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-left animate-fadeIn">
      {event_title && (
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-500/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-pink-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 4v12l-4-2-4 2V4M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-white/50">Etkinlik</p>
            <p className="text-sm font-semibold text-white">{event_title}</p>
          </div>
        </div>
      )}
      {ticket_id && (
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-green-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-white/50">Bilet No</p>
            <p className="text-sm font-semibold text-white font-mono">{ticket_id.slice(0, 8)}...</p>
          </div>
        </div>
      )}
      {qr_token && (
        <div className="flex flex-col items-center mt-2">
          <p className="text-xs text-white/50 mb-2">QR Kodunuz</p>
          <div className="bg-white p-2 rounded-lg">
            <QRCodeSVG value={qr_token} size={160} level="M" />
          </div>
          <p className="text-[10px] text-white/30 font-mono mt-1">{qr_token.slice(0, 24)}...</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Content ─────────────────────────────────────────────────────────────
function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [step, setStep] = useState<'loading' | 'invalid_token' | 'invalid_used' | 'form' | 'submitting' | 'success' | 'error'>('loading')
  const [event, setEvent] = useState<Event | null>(null)
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [quantity] = useState(1)

  // Load event info on mount
  useEffect(() => {
    api.getEvents()
      .then((events) => {
        if (events.length > 0) setEvent(events[0])
      })
      .catch(() => {})
  }, [])

  // Check token on mount
  useEffect(() => {
    if (!token) {
      setStep('invalid_token')
      return
    }

    async function verify() {
      try {
        const result = await api.verifyToken(token!)
        if (result.valid) {
          setStep('form')
        } else if (result.reason === 'already_used') {
          setStep('invalid_used')
        } else {
          setStep('invalid_token')
        }
      } catch {
        setStep('invalid_token')
      }
    }

    verify()
  }, [token])

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault()
    if (!event || !token) return

    setStep('submitting')
    setErrorMsg('')

    try {
      const result = await api.claimTicket({
        token,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        event_id: event.id,
        quantity,
      })

      if (result.success) {
        setClaimResult({
          success: true,
          ticket_id: result.ticket_id,
          qr_token: result.qr_token,
          event_title: event.title,
        })
        setStep('success')
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 6000)
      } else {
        setErrorMsg(result.reason === 'already_used' ? 'Bu bilet zaten kullanilmis.' : 'Bilet olusturulamadi.')
        setStep('error')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Bir sorun olustu')
      setStep('error')
    }
  }

  return (
    <>
      {showConfetti && <Confetti />}
      <div className="min-h-screen bg-[#0d0d1a] pt-20 flex items-center justify-center px-4 relative overflow-hidden">
        {/* Background blobs */}
        <div className="pointer-events-none absolute -top-40 -left-40 h-80 w-80 rounded-full bg-purple-900/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-pink-900/20 blur-3xl" />

        <div className="w-full max-w-md text-center relative z-10 animate-fadeIn">

          {/* Invalid token / already used */}
          {(step === 'invalid_token' || step === 'invalid_used') && (
            <>
              <div className="mb-6 flex justify-center">
                <StatusIcon status="invalid" />
              </div>
              <h1 className="mb-2 text-2xl sm:text-3xl font-bold text-white">
                {step === 'invalid_used' ? 'Bilet Zaten Kullanildi' : 'Gecersiz Erisim'}
              </h1>
              <p className="mb-6 text-white/70 text-sm sm:text-base">
                {step === 'invalid_used'
                  ? 'Bu odeme zaten kullanilmis veya gecersiz.'
                  : 'Odeme bilgileri bulunamadi. Lutfen odeme sayfasindan tekrar deneyin.'}
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/"
                  className="rounded-xl bg-pink-500 px-6 py-3 font-bold text-white transition hover:bg-pink-400 active:scale-[0.98]"
                >
                  Ana Sayfaya Don
                </Link>
                <Link
                  href="/profile"
                  className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/5 active:scale-[0.98]"
                >
                  Profilime Git
                </Link>
              </div>
            </>
          )}

          {/* Loading */}
          {step === 'loading' && (
            <>
              <div className="mb-6 flex justify-center">
                <StatusIcon status="loading" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-white">Odemeniz Dogrulaniyor</h1>
              <p className="text-white/60 text-sm">Lutfen bekleyin...</p>
            </>
          )}

          {/* Form */}
          {step === 'form' && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-10 w-10 text-green-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h1 className="mb-1 text-2xl sm:text-3xl font-bold text-white">Odeme Basarili!</h1>
              <p className="mb-4 text-white/70 text-sm">Biletinizi olusturmak icin bilgilerinizi girin.</p>

              {event && (
                <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 text-left">
                  <p className="text-xs text-white/50">Etkinlik</p>
                  <p className="text-sm font-semibold text-white">{event.title}</p>
                  <p className="text-xs text-white/50 mt-1">€{event.price} x {quantity} = €{event.price}</p>
                </div>
              )}

              <form onSubmit={handleClaim} className="flex flex-col gap-3 text-left">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-white/60">Ad Soyad *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Adiniz Soyadiniz"
                    className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-white/60">E-posta *</label>
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
                  <label className="mb-1 block text-xs font-semibold text-white/60">Telefon <span className="text-white/30">(Opsiyonel)</span></label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+90 5XX XXX XXXX"
                    className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {errorMsg && (
                  <div className="rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-300">{errorMsg}</div>
                )}

                <button
                  type="submit"
                  className="mt-2 w-full rounded-xl bg-orange-500 py-3.5 font-bold text-white transition hover:bg-orange-400 active:scale-[0.98]"
                >
                  Biletimi Olustur
                </button>
              </form>
            </>
          )}

          {/* Submitting */}
          {step === 'submitting' && (
            <>
              <div className="mb-6 flex justify-center">
                <StatusIcon status="loading" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-white">Biletiniz Olusturuluyor</h1>
              <p className="text-white/60 text-sm">Lutfen bekleyin...</p>
            </>
          )}

          {/* Success */}
          {step === 'success' && claimResult && (
            <>
              <div className="mb-6 flex justify-center">
                <StatusIcon status="success" />
              </div>
              <h1 className="mb-2 text-2xl sm:text-3xl font-bold text-white">Biletiniz Olusturuldu!</h1>
              <p className="mb-2 text-white/70 text-sm">Odemeniz tamamlandi. Biletiniz asagida.</p>

              <TicketCard
                qr_token={claimResult.qr_token || ''}
                ticket_id={claimResult.ticket_id || ''}
                event_title={claimResult.event_title || event?.title || ''}
              />

              <p className="mb-6 text-center text-white/70 text-sm">
                Biletiniz e-posta adresinize de gonderildi.
              </p>

              <div className="flex flex-col gap-3">
                <Link
                  href="/profile"
                  className="rounded-xl bg-pink-500 px-6 py-3 font-bold text-white transition hover:bg-pink-400 active:scale-[0.98]"
                >
                  Profilime Git
                </Link>
                <Link
                  href="/"
                  className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/5 active:scale-[0.98]"
                >
                  Ana Sayfaya Don
                </Link>
              </div>
            </>
          )}

          {/* Error */}
          {step === 'error' && (
            <>
              <div className="mb-6 flex justify-center">
                <StatusIcon status="error" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-white">Biletiniz Olusturulamadi</h1>
              <p className="mb-6 text-white/70 text-sm">{errorMsg}</p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/"
                  className="rounded-xl bg-pink-500 px-6 py-3 font-bold text-white transition hover:bg-pink-400 active:scale-[0.98]"
                >
                  Ana Sayfaya Don
                </Link>
                <Link
                  href="/profile"
                  className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/5 active:scale-[0.98]"
                >
                  Profilime Git
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0d0d1a] pt-20 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-400/30 border-t-purple-400" />
              </div>
            </div>
            <h1 className="mb-2 text-2xl font-bold text-white">Yukleniyor...</h1>
            <p className="text-white/60">Odeme bilgileri aliniyor</p>
          </div>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  )
}
