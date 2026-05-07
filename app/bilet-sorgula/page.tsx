'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

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
  const [email, setEmail] = useState('')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSearched(true)

    try {
      const res = await fetch(
        `https://refreshing-determination-production.up.railway.app/api/tickets/by-email?email=${encodeURIComponent(email)}`
      )
      const data = await res.json()
      setTickets(Array.isArray(data) ? data : [])
    } catch (err) {
      setError('Biletler yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white px-4 py-12">
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-extrabold text-center mb-2">Bilet Sorgula</h1>
        <p className="text-white/60 text-center mb-8 text-sm">
          E-posta adresinizle biletlerinizi görüntüleyin
        </p>

        <form onSubmit={handleSearch} className="flex flex-col gap-4 mb-8">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="ornek@email.com"
            className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white transition hover:bg-orange-400 disabled:opacity-60"
          >
            {loading ? 'Sorgulanıyor...' : 'Biletlerimi Göster'}
          </button>
        </form>

        {error && (
          <div className="rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-300 mb-4">{error}</div>
        )}

        {searched && !loading && tickets.length === 0 && (
          <div className="text-center text-white/50 py-8">
            <p>Bu e-posta adresine ait bilet bulunamadı.</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <p className="text-xs text-white/50 mb-1">Etkinlik</p>
              <p className="text-sm font-semibold text-white mb-3">{ticket.event_title}</p>

              <p className="text-xs text-white/50 mb-1">Tarih</p>
              <p className="text-sm text-white mb-3">
                {new Date(ticket.event_date).toLocaleDateString('tr-TR')}
              </p>

              <p className="text-xs text-white/50 mb-1">Yer</p>
              <p className="text-sm text-white mb-3">{ticket.event_location}</p>

              <p className="text-xs text-white/50 mb-1">Durum</p>
              <p className={`text-sm font-semibold mb-3 ${ticket.status === 'VALID' ? 'text-green-400' : 'text-yellow-400'}`}>
                {ticket.status === 'VALID' ? 'Geçerli' : ticket.status}
              </p>

              <div className="flex flex-col items-center mt-4">
                <p className="text-xs text-white/50 mb-2">Giriş QR Kodunuz</p>
                <div className="bg-white p-2 rounded-lg">
                  <QRCodeSVG value={ticket.qr_token} size={180} level="M" />
                </div>
                <p className="text-[10px] text-white/30 font-mono mt-1">
                  {ticket.qr_token.slice(0, 24)}...
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
