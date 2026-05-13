'use client'

import { useState, useEffect, useCallback } from 'react'
import TicketPurchaseModal from './TicketPurchaseModal'
import { api, type Event } from '../lib/api'
import { useLocale } from '../context/LocaleContext'

// ─── Biletini Al Butonu (modal açar) ─────────────────────────────────────────
export function TicketButton({
  label,
  className,
}: {
  label?: string
  className?: string
}) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          className ||
          'mt-4 inline-block rounded-full bg-orange-500 px-10 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-orange-400 hover:scale-105 active:scale-95'
        }
      >
        {label || t('ticket.buy')}
      </button>
      <TicketPurchaseModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}

// ─── Kalan Bilet Göstergesi (API'den) ────────────────────────────────────────
export function LiveTicketAvailability() {
  const { t, locale } = useLocale()
  const [event, setEvent] = useState<Event | null>(null)
  const [open, setOpen] = useState(false)

  const loadEvent = useCallback(() => {
    api
      .getEvents()
      .then((events) => {
        if (events.length > 0) setEvent(events[0])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadEvent()
  }, [loadEvent])

  const total = event?.capacity ?? 1000
  const sold = event?.tickets_sold ?? 0
  const remaining = total - sold

  return (
    <section className="bg-[#1a1a2e] py-14 px-4">
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-orange-400">
          {t('ticketStatus.title')}
        </p>
        <h2 className="mb-1 text-3xl font-extrabold text-white sm:text-4xl">
          {total.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US')} {t('ticket.capacity')}
        </h2>
        <p className="mb-6 text-lg text-yellow-300 font-semibold">
          ⚠ {t('ticketStatus.limited')} — {t('ticketStatus.secureNow')}
        </p>

        {/* Progress bar */}
        <div className="relative h-5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all"
            style={{ width: `${Math.min((sold / total) * 100, 100)}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between text-sm text-white/60">
          <span>{sold.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US')} {t('ticket.sold')}</span>
          <span className="text-orange-300 font-semibold">{remaining.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US')} {t('ticket.remaining')}</span>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="mt-8 inline-block rounded-full bg-orange-500 px-8 py-3 font-bold text-white shadow transition hover:bg-orange-400"
        >
          {t('ticketStatus.buyNow')}
        </button>
      </div>

      <TicketPurchaseModal isOpen={open} onClose={() => setOpen(false)} />
    </section>
  )
}
