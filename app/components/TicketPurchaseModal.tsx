'use client'

import { useState, useEffect } from 'react'
import { api, type Event } from '../lib/api'
import { useLocale } from '../lib/locale'
import AuthModal from './AuthModal'

interface TicketPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function TicketPurchaseModal({ isOpen, onClose }: TicketPurchaseModalProps) {
  const { t, locale } = useLocale()
  const [event, setEvent] = useState<Event | null>(null)
  const [loadingEvent, setLoadingEvent] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [discountCode, setDiscountCode] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [kvkkAccepted, setKvkkAccepted] = useState(false)
  const [country, setCountry] = useState<'TR' | 'OTHER'>(locale === 'tr' ? 'TR' : 'OTHER')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [pendingId, setPendingId] = useState('')
  const [checkingPayment, setCheckingPayment] = useState(false)
  const [checkError, setCheckError] = useState('')

  const isTR = country === 'TR'
  const displayPrice = isTR ? (event?.tl_price ?? event?.price) : event?.price
  const displayCurrency = isTR ? '₺' : '€'
  const paymentLink = isTR
    ? (event?.tl_payment_link ?? 'https://iyzi.link/AKmqOw')
    : (event?.payment_link ?? 'https://iyzi.link/AKkMUg')
  const formattedPrice = displayPrice?.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

  useEffect(() => {
    if (!isOpen) return
    const token = localStorage.getItem('izf_token')
    if (!token) return
    api.getMe(token)
      .then((me) => {
        setEmail(me.email)
        setName(me.name)
        setPhone((me as { phone?: string }).phone ?? '')
        const userCountry = (me as { country?: string }).country ?? (locale === 'tr' ? 'TR' : 'OTHER')
        setCountry(userCountry === 'TR' ? 'TR' : 'OTHER')
        setStep(2)
      })
      .catch(() => {
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
      setPendingId('')
      setCheckingPayment(false)
      setCheckError('')
    }, 300)
  }

  async function handleRegisterAndRedirect() {
    if (!kvkkAccepted) {
      setError(t('ticket.form.kvkkRequired'))
      return
    }
    if (!paymentLink) {
      setError('Ödeme linki henüz oluşturulmamış. Lütfen daha sonra tekrar deneyin.')
      return
    }
    if (!name.trim() || !email.trim()) {
      setError('Lütfen ad soyad ve e-posta adresinizi girin.')
      return
    }
    setError('')
    setSubmitting(true)

    try {
      const result = await api.registerPendingPurchase({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        event_id: event?.id || '',
        currency: isTR ? 'TRY' : 'EUR',
      })

      if (!result.success || !result.pending_id) {
        setError(result.message || 'Kayıt oluşturulamadı')
        setSubmitting(false)
        return
      }

      const pid = result.pending_id
      setPendingId(pid)
      sessionStorage.setItem('izf_pending_id', pid)
      localStorage.setItem('izf_pending_id', pid)

      setStep(3)
      setSubmitting(false)
      window.open(paymentLink, '_blank')
    } catch {
      setError('Bir sorun oluştu. Lütfen tekrar deneyin.')
      setSubmitting(false)
    }
  }

  async function handleCheckPayment() {
    let pid = pendingId
    if (!pid) {
      pid = sessionStorage.getItem('izf_pending_id') || localStorage.getItem('izf_pending_id') || ''
      if (pid) setPendingId(pid)
    }
    if (!pid) {
      setCheckError('Önce ödeme adımına geçmelisiniz.')
      return
    }
    setCheckingPayment(true)
    setCheckError('')
    try {
      const result = await api.checkConfirmedPayment(pid, email)
      if (result.success && result.redirect_url) {
        window.location.href = result.redirect_url
        return
      }
      setCheckError(result.message || 'Ödemeniz henüz onaylanmadı. 10-20 sn bekleyip tekrar deneyin.')
    } catch {
      setCheckError('Bağlantı hatası. Lütfen tekrar deneyin.')
    } finally {
      setCheckingPayment(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    handleRegisterAndRedirect()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-b from-[#0d0d1a] to-[#1a0a1a] p-6 shadow-2xl">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 transition hover:bg-white/20"
        >✕</button>

        <div className="mb-6 text-center">
          <div className="mb-3 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-7 w-7 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
          </div>
          <h3 className="text-xl font-bold text-white">Biletini Al</h3>
          <p className="text-sm text-white/60">{event?.title}</p>
          <p className="text-lg font-bold text-orange-400 mt-1">{displayCurrency}{formattedPrice}</p>
          {event?.date && <p className="text-xs text-white/50 mt-1">{new Date(event.date).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
        </div>

        <div>
          {step === 1 ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl bg-white/5 p-3 text-center mb-2">
                <p className="text-xs text-white/60 mb-2">Bölgenizi seçin</p>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => setCountry('TR')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${country === 'TR' ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>Türkiye</button>
                  <button onClick={() => setCountry('OTHER')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${country === 'OTHER' ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>Diğer</button>
                </div>
              </div>

              <a href="https://wa.me/905309992309" target="_blank" rel="noopener noreferrer" className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-4 transition hover:shadow-lg hover:shadow-green-500/30 active:scale-[0.98] text-left block">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs shadow ring-2 ring-green-600" aria-hidden="true">{locale === 'tr' ? '🇹🇷' : '🌍'}</span>
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

              <button onClick={() => setAuthModalOpen(true)} className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 transition hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98] text-left">
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

              <button onClick={() => setStep(2)} className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-4 transition hover:shadow-lg hover:shadow-purple-500/30 active:scale-[0.98] text-left">
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
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/60">{t('ticket.form.email')}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder={t('ticket.form.emailPlaceholder') || 'ornek@email.com'} className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/60">{t('ticket.form.name')}</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder={t('ticket.form.namePlaceholder')} className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/60">{t('ticket.form.phone')} <span className="text-white/30">({t('ticket.form.optional') || 'Opsiyonel'})</span></label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('ticket.form.phonePlaceholder')} className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/60">{t('ticket.form.quantity')}</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition">−</button>
                  <span className="min-w-[2rem] text-center text-white font-bold">{quantity}</span>
                  <button type="button" onClick={() => setQuantity((q) => Math.min(10, q + 1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition">+</button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/60">{t('ticket.form.coupon')} ({t('ticket.form.optional')})</label>
                <input type="text" value={discountCode} onChange={(e) => setDiscountCode(e.target.value.toUpperCase())} placeholder={t('ticket.form.couponPlaceholder')} className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={kvkkAccepted} onChange={(e) => setKvkkAccepted(e.target.checked)} className="mt-1 h-4 w-4 rounded border-white/30 bg-white/10 text-orange-500 focus:ring-orange-500" />
                <span className="text-xs text-white/60">
                  {locale === 'tr' ? (
                    <>
                      <a href="/kvkk" target="_blank" className="text-orange-400 hover:underline">{t('footer.kvkk')}</a>
                      {'ni ve '}
                      <a href="/gizlilik" target="_blank" className="text-orange-400 hover:underline">{t('footer.privacy')}</a>
                      {' '}
                      {t('ticket.form.kvkkSuffix')}
                    </>
                  ) : (
                    <>
                      {'I have read and accept the '}
                      <a href="/kvkk" target="_blank" className="text-orange-400 hover:underline">{t('footer.kvkk')}</a>
                      {' and '}
                      <a href="/gizlilik" target="_blank" className="text-orange-400 hover:underline">{t('footer.privacy')}</a>
                      {'.'}
                    </>
                  )}
                </span>
              </label>

              {error && <div className="rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-300">{error}</div>}

              <button type="submit" disabled={submitting || !event} className="mt-2 w-full rounded-xl bg-orange-500 py-3.5 font-bold text-white transition hover:bg-orange-400 disabled:opacity-60 active:scale-[0.98]">
                {submitting ? t('ticket.form.redirecting') : t('ticket.form.pay')}
              </button>
              <button type="button" onClick={() => setStep(1)} className="w-full rounded-xl bg-white/10 py-3.5 font-bold text-white transition hover:bg-white/20">
                {t('ticket.form.goBack')}
              </button>
              <p className="text-xs text-white/30 text-center">{t('ticket.form.iyzicoNote')}</p>
            </form>
          ) : step === 3 ? (
            <div className="flex flex-col gap-4 items-center">
              <div className="mb-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-400/30 border-t-purple-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white text-center">Ödeme Sayfası</h3>
              <p className="text-center text-white/70 text-sm">Ödeme sayfanız yeni sekmede açıldı. Ödemeyi tamamlayıp buradaki butona tıkladığınızda biletiniz otomatik oluşturulacaktır.</p>

              {checkError && <div className="w-full rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-300 text-center">{checkError}</div>}

              <button onClick={handleCheckPayment} disabled={checkingPayment} className="block w-full text-center py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-xl text-lg transition-all">
                {checkingPayment ? 'Kontrol Ediliyor...' : 'Ödemeyi Tamamladım → Bilet Oluştur'}
              </button>

              <a href={paymentLink} target="_blank" rel="noopener noreferrer" className="text-center text-orange-400 text-sm hover:underline">
                Ödeme sayfasına tekrar git
              </a>
            </div>
          ) : null}
        </div>
      </div>

      <AuthModal isOpen={authModalOpen} initialMode="login" onClose={() => setAuthModalOpen(false)} onSuccess={async () => {
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
      }} />
    </div>
  )
}
