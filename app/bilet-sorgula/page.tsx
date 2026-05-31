'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useLocale } from '../context/LocaleContext'

interface Ticket {
  id: string
  event_title: string
  event_date: string
  event_location: string
  qr_token: string
  status: string
  created_at: string
}

export default function BiletSorgulaPage() {
  const { t, locale } = useLocale()
  const [email, setEmail] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!buyerName.trim()) {
      setError(t('ticketLookup.nameError') || 'Ad soyad bilgisi gereklidir.')
      return
    }
    setLoading(true)
    setError('')
    setSearched(true)

    try {
      const res = await fetch(
        `https://refreshing-determination-production.up.railway.app/api/tickets/by-email?email=${encodeURIComponent(email)}&buyer_name=${encodeURIComponent(buyerName.trim())}`
      )
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || t('ticketLookup.noResult'))
        setTickets([])
      } else {
        setTickets(data.tickets || [])
      }
    } catch {
      setError(t('ticketLookup.loadError') || 'Biletler yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-US'

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white px-4 py-12">
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-extrabold text-center mb-2">{t('ticketLookup.title')}</h1>
        <p className="text-white/60 text-center mb-8 text-sm">
          {t('ticketLookup.subtitle')}
        </p>

        <form onSubmit={handleSearch} className="flex flex-col gap-4 mb-8">
          <input
            type="text"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            required
            placeholder={t('ticketLookup.name') || 'Ad Soyad'}
            className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder={t('ticketLookup.email')}
            className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white transition hover:bg-orange-400 disabled:opacity-60"
          >
            {loading ? t('ticketLookup.searching') : t('ticketLookup.search')}
          </button>
        </form>

        {error && (
          <div className="rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-300 mb-4">{error}</div>
        )}

        {searched && !loading && tickets.length === 0 && !error && (
          <div className="text-center text-white/50 py-8">
            <p>{t('ticketLookup.noResult')}</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <p className="text-xs text-white/50 mb-1">{t('ticketLookup.event')}</p>
              <p className="text-sm font-semibold text-white mb-3">{ticket.event_title}</p>

              <p className="text-xs text-white/50 mb-1">{t('ticketLookup.date')}</p>
              <p className="text-sm text-white mb-3">
                {new Date(ticket.event_date).toLocaleDateString(dateLocale)}
              </p>

              <p className="text-xs text-white/50 mb-1">{t('ticketLookup.location')}</p>
              <p className="text-sm text-white mb-3">{ticket.event_location}</p>

              <p className="text-xs text-white/50 mb-1">{t('ticketLookup.status')}</p>
              <p className={`text-sm font-semibold mb-3 ${ticket.status === 'VALID' ? 'text-green-400' : 'text-yellow-400'}`}>
                {ticket.status === 'VALID' ? t('ticketLookup.active') : ticket.status}
              </p>

              <div className="flex flex-col items-center mt-4">
                <p className="text-xs text-white/50 mb-2">{t('ticketLookup.qrLabel')}</p>
                <div className="bg-white p-2 rounded-lg">
                  <QRCodeSVG value={ticket.qr_token} size={180} level="M" />
                </div>
                <p className="text-xs text-white/50 mt-2">17-18 Ekim 2026</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
