'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '../../lib/api'

interface CompleteResult {
  success: boolean
  ticket_id?: string
  event_title?: string
  quantity?: number
  status?: string
}

const STATUS_MESSAGES: Record<string, string> = {
  loading: 'Ödemeniz doğrulanıyor...',
  completed: 'Ödemeniz alındı! Biletiniz oluşturuldu.',
  failed: 'Ödeme işleminiz tamamlanamadı.',
}

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

function StatusIcon({ status }: { status: 'loading' | 'completed' | 'failed' }) {
  if (status === 'loading') {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-400/30 border-t-purple-400" />
      </div>
    )
  }

  if (status === 'completed') {
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

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const refParam = searchParams.get('ref')

  const [displayStatus, setDisplayStatus] = useState<'loading' | 'completed' | 'failed'>('loading')
  const [result, setResult] = useState<CompleteResult | null>(null)
  const [message, setMessage] = useState(STATUS_MESSAGES.loading)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    // Try ref from URL first, then fallback to localStorage
    let pendingId = refParam
    if (!pendingId && typeof window !== 'undefined') {
      pendingId = localStorage.getItem('pending_payment_id')
    }

    if (!pendingId) {
      setDisplayStatus('failed')
      setMessage('Ödeme referansı bulunamadı.')
      return
    }

    async function complete() {
      try {
        const data = await api.completePayment(pendingId!)
        setResult(data)
        if (data.success) {
          setDisplayStatus('completed')
          setMessage(STATUS_MESSAGES.completed)
          setShowConfetti(true)
          setTimeout(() => setShowConfetti(false), 5000)
          // Clean up localStorage after successful payment
          if (typeof window !== 'undefined') {
            localStorage.removeItem('pending_payment_id')
          }
        } else {
          setDisplayStatus('failed')
          setMessage(STATUS_MESSAGES.failed)
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Bir sorun oluştu'
        setDisplayStatus('failed')
        setMessage(msg)
      }
    }

    complete()
  }, [refParam])

  const isSuccess = displayStatus === 'completed'
  const isError = displayStatus === 'failed'

  return (
    <>
      {showConfetti && <Confetti />}
      <div className="min-h-screen bg-[#0d0d1a] pt-20 flex items-center justify-center px-4 relative overflow-hidden">
        {/* Decorative background gradient blobs */}
        <div className="pointer-events-none absolute -top-40 -left-40 h-80 w-80 rounded-full bg-purple-900/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-pink-900/20 blur-3xl" />

        <div className="w-full max-w-md text-center relative z-10 animate-fadeIn">
          <div className="mb-6 flex justify-center">
            <StatusIcon status={displayStatus} />
          </div>

          <h1 className="mb-2 text-2xl sm:text-3xl font-bold text-white">
            {isSuccess && 'Ödeme Başarılı!'}
            {isError && 'Bir Sorun Oluştu'}
            {displayStatus === 'loading' && 'Ödemeniz Doğrulanıyor'}
          </h1>

          <p className="mb-6 text-white/70 text-sm sm:text-base">{message}</p>

          {/* Payment details */}
          {isSuccess && result?.event_title && (
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-left animate-fadeIn">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-500/20">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-pink-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 4v12l-4-2-4 2V4M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-white/50">Etkinlik</p>
                  <p className="text-sm font-semibold text-white">{result.event_title}</p>
                </div>
              </div>
              {typeof result.quantity === 'number' && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-purple-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-white/50">Bilet Sayısı</p>
                    <p className="text-sm font-semibold text-white">{result.quantity} adet</p>
                  </div>
                </div>
              )}
              {result.ticket_id && (
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-green-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-white/50">Bilet No</p>
                    <p className="text-sm font-semibold text-white font-mono">{result.ticket_id}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            {isSuccess && (
              <>
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
                  Ana Sayfaya Dön
                </Link>
              </>
            )}

            {isError && (
              <>
                <Link
                  href="/"
                  className="rounded-xl bg-pink-500 px-6 py-3 font-bold text-white transition hover:bg-pink-400 active:scale-[0.98]"
                >
                  Ana Sayfaya Dön
                </Link>
                <Link
                  href="/profile"
                  className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/5 active:scale-[0.98]"
                >
                  Profilime Git
                </Link>
              </>
            )}

            {displayStatus === 'loading' && (
              <button
                disabled
                className="rounded-xl border border-white/10 px-6 py-3 font-semibold text-white/40 cursor-not-allowed"
              >
                Lütfen Bekleyin...
              </button>
            )}
          </div>
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
            <h1 className="mb-2 text-2xl font-bold text-white">Yükleniyor...</h1>
            <p className="text-white/60">Ödeme bilgileri alınıyor</p>
          </div>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  )
}
