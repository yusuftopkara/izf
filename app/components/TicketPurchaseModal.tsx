'use client'

import { useState, useEffect } from 'react'
import { useLocale } from '../context/LocaleContext'
import { api, type Event } from '../lib/api'
import AuthModal from './AuthModal'

// ─── Types ────────────────────────────────────────────────────────────────────
interface TicketPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
}

interface PaymentResult {
  success: boolean
  message: string
  ticket_id?: string
  event_title?: string
  quantity?: number
  qr_token?: string
}

// ─── Close button ─────────────────────────────────────────────────────────────
function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="sticky top-3 float-right mr-3 mt-3 z-[60] flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-orange-500"
      aria-label="Kapat"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function TicketPurchaseModal({ isOpen, onClose }: TicketPurchaseModalProps) {
  const { t, locale } = useLocale()
  const [event, setEvent] = useState<Event | null>(null)
  const [loadingEvent, setLoadingEvent] = useState(false)

  // Step state (1 = selection, 2 = guest form, 3 = redirecting)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  
  // Auth modal for registered user flow
  const [authModalOpen, setAuthModalOpen] = useState(false)

  // Form state
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [discountCode, setDiscountCode] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [kvkkAccepted, setKvkkAccepted] = useState(false)

  // Submit state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Payment state (simplified - no longer needed since we use static PWI link)
  const [redirecting, setRedirecting] = useState(false)

  // ─── Auto-skip to step 2 if already logged in ────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const token = localStorage.getItem('izf_token')
    if (!token) return
    api.getMe(token)
      .then((me) => {
        setEmail(me.email)
        setName(me.name)
        setPhone((me as { phone?: string }).phone ?? '')
        setStep(2)
      })
      .catch(() => {
        // Invalid token — stay on step 1
        localStorage.removeItem('izf_token')
      })
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    setLoadingEvent(true)
    api.getEvents()
      .then((events) => {
        if (events.length > 0) setEvent(events[0])
      })
      .catch(() => {})
      .finally(() => setLoadingEvent(false))
  }, [isOpen])

  function handleClose() {
    onClose()
    setTimeout(() => {
      setStep(1)
      setEmail('')
      setName('')
      setPhone('')
      setDiscountCode('')
      setQuantity(1)
      setKvkkAccepted(false)
      setError('')
      setSubmitting(false)
      setAuthModalOpen(false)
      setRedirecting(false)
    }, 300)
  }

  function handleRedirectToPayment() {
    if (!kvkkAccepted) {
      setError(t('ticket.form.kvkkRequired'))
      return
    }
    setError('')
    setRedirecting(true)
    setStep(3)
    // Auto-open iyzico payment page
    window.open('https://iyzi.link/AKkMUg', '_blank')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    handleRedirectToPayment()
  }

  if (!isOpen) return null

  const eventDate = event?.date
    ? new Date(event.date).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : t('hero.date')

  const WHATSAPP_URL = `https://wa.me/905337743572?text=${encodeURIComponent(locale === 'tr' ? 'Bilet almak istiyorum' : 'I would like to buy a ticket')}`

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

        <div className="relative z-10 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-[#1a1a2e] border border-white/10 shadow-2xl max-h-[95vh] overflow-y-auto">
          <CloseBtn onClick={handleClose} />
          <div className="p-6 pt-2">

            {/* Header */}
            <div className="text-center mb-6">
              <div className="mb-2 text-4xl">🎉</div>
              <h2 className="text-2xl font-extrabold text-white mb-1">{t('ticket.buy')}</h2>
              <p className="text-white/60 text-sm">
                {event?.title ?? 'Istanbul Zumba Festival'}
              </p>
              {event?.price !== undefined && (
                <p className="mt-1 text-orange-400 font-bold text-lg">
                  €{event.price.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US')}
                  {quantity > 1 && (
                    <span className="text-white/60 text-sm font-normal ml-1">
                      × {quantity} = €{(event.price * quantity).toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US')}
                    </span>
                  )}
                </p>
              )}
              <p className="text-white/40 text-xs mt-0.5">{eventDate}</p>
            </div>

            {loadingEvent ? (
              <div className="py-10 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-purple-400/30 border-t-purple-400" />
                <p className="text-white/50 text-sm">{t('ticket.loadingEvent')}</p>
              </div>
            ) : step === 1 ? (
              // ─── Step 1: Selection Screen ──────────────────────────────────
              <div className="flex flex-col gap-3">
                {/* WhatsApp Info Banner */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 mb-1">
                  <p className="text-xs text-white/70 text-center leading-relaxed">
                    <span className="mr-1 text-base align-middle">{locale === 'tr' ? '🇹🇷' : '🌍'}</span>
                    {t('ticket.whatsappInfo')}
                  </p>
                </div>

                {/* WhatsApp Option */}
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-4 transition hover:shadow-lg hover:shadow-green-500/30 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                      </svg>
                      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs shadow ring-2 ring-green-600" aria-hidden="true">
                        {locale === 'tr' ? '🇹🇷' : '🌍'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white">{t('ticket.whatsappBtn')}</p>
                      <p className="text-xs text-white/80">{t('ticket.whatsappSub')}</p>
                    </div>
                    <svg className="h-5 w-5 text-white/60 transition group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </a>

                {/* Registered User Option */}
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 transition hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98] text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                      <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 12a3 3 0 100-6 3 3 0 000 6z" />
                        <path fillRule="evenodd" d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1zm0 2a9 9 0 100 18 9 9 0 000-18z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white">{t('ticket.memberBtn')}</p>
                      <p className="text-xs text-white/80">{t('ticket.memberSub')}</p>
                    </div>
                    <svg className="h-5 w-5 text-white/60 transition group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                {/* Guest Option */}
                <button
                  onClick={() => setStep(2)}
                  className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-4 transition hover:shadow-lg hover:shadow-purple-500/30 active:scale-[0.98] text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                      <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M14 6a4 4 0 11-8 0 4 4 0 018 0zM0 18a6 6 0 0112 0v1H0v-1z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white">{t('ticket.guestBtn')}</p>
                      <p className="text-xs text-white/80">{t('ticket.guestSub')}</p>
                    </div>
                    <svg className="h-5 w-5 text-white/60 transition group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            ) : step === 2 ? (
              // ─── Step 2: Guest Form ────────────────────────────────────────
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Email */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-white/60">{t('ticket.form.email')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder={t('ticket.form.emailPlaceholder') || 'ornek@email.com'}
                    className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-white/60">{t('ticket.form.name')}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder={t('ticket.form.namePlaceholder')}
                    className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-white/60">{t('ticket.form.phone')} <span className="text-white/30">({t('ticket.form.optional') || 'Opsiyonel'})</span></label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('ticket.form.phonePlaceholder')}
                    className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Adet */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-white/60">{t('ticket.form.quantity')}</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
                    >
                      −
                    </button>
                    <span className="min-w-[2rem] text-center text-white font-bold">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Coupon */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-white/60">{t('ticket.form.coupon')} ({t('ticket.form.optional')})</label>
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    placeholder={t('ticket.form.couponPlaceholder')}
                    className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Error */}
                {/* KVKK */}
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={kvkkAccepted}
                    onChange={(e) => setKvkkAccepted(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-white/30 bg-white/10 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-xs text-white/60">
                    {locale === 'tr' ? (
                      <>
                        <a href="/kvkk" target="_blank" className="text-orange-400 hover:underline">{t('footer.kvkk')}</a>
                        {`'ni ve `}
                        <a href="/gizlilik" target="_blank" className="text-orange-400 hover:underline">{t('footer.privacy')}</a>
                        {t('ticket.form.kvkkSuffix')}
                      </>
                    ) : (
                      <>
                        I have read and accept the{' '}
                        <a href="/kvkk" target="_blank" className="text-orange-400 hover:underline">{t('footer.kvkk')}</a>
                        {' and '}
                        <a href="/gizlilik" target="_blank" className="text-orange-400 hover:underline">{t('footer.privacy')}</a>
                        .
                      </>
                    )}
                  </span>
                </label>

                {error && (
                  <div className="rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-300">{error}</div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting || !event}
                  className="mt-2 w-full rounded-xl bg-orange-500 py-3.5 font-bold text-white transition hover:bg-orange-400 disabled:opacity-60 active:scale-[0.98]"
                >
                  {submitting ? t('ticket.form.redirecting') : t('ticket.form.pay')}
                </button>

                {/* Back button */}
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full rounded-xl bg-white/10 py-3.5 font-bold text-white transition hover:bg-white/20"
                >
                  {t('ticket.form.goBack')}
                </button>

                <p className="text-xs text-white/30 text-center">
                  {t('ticket.form.iyzicoNote')}
                </p>
              </form>
            ) : step === 3 ? (
              // ─── Step 3: Redirecting to payment ───────────────────────────────
              <div className="flex flex-col gap-4 items-center">
                <div className="mb-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-400/30 border-t-purple-400" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white text-center">Ödeme Sayfası</h3>

                <p className="text-center text-white/70 text-sm">
                  Ödeme sayfası yeni sekmede açıldı. Açılmadıysa aşağıdaki butona tıklayın. Ödeme sonrasında biletiniz otomatik olarak oluşturulacaktır.
                </p>

                <a
                  href="https://iyzi.link/AKkMUg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-3 px-6 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold rounded-xl text-lg transition-all"
                >
                  Ödemeye Git →
                </a>

                <p className="text-center text-white/50 text-xs mt-2">
                  Yeni sekmede açılacaktır
                </p>
              </div>
            ) : null
            }
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode="login"
        onClose={() => setAuthModalOpen(false)}
        onSuccess={async () => {
          setAuthModalOpen(false)
          const token = localStorage.getItem('izf_token')
          if (token) {
            try {
              const me = await api.getMe(token)
              setEmail(me.email)
              setName(me.name)
              setPhone((me as { phone?: string }).phone ?? '')
              setStep(2)
            } catch {
              // show step 1 if getMe fails
            }
          }
        }}
      />
    </>
  )
}
