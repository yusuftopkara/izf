'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '../../lib/api'

export default function AdminPendingPayments({ token }: { token: string }) {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api.getConfirmedPayments(token, false, 0, 50)
      .then((data) => {
        if (data.success && data.items) {
          setItems(data.items)
        }
      })
      .catch(() => setError('Veriler yüklenemedi'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <div className="py-16 text-center text-gray-400">Yükleniyor...</div>
  if (error) return <div className="py-16 text-center text-red-500">{error}</div>

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Bekleyen Ödemeler</h2>
        <p className="text-sm text-gray-500">{items.length} kayıt</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 text-center text-gray-400">
          Bekleyen ödeme bulunmuyor.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Token</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Payment ID</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Alıcı Email</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Alıcı İsim</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Tarih</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={String(item.token || item._id)} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{String(item.token || '').slice(0, 20)}...</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{String(item.payment_id || '-')}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{String(item.buyer_email || '-')}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{String(item.buyer_name || '-')}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.created_at_iso ? new Date(String(item.created_at_iso)).toLocaleString('tr-TR') : '-'}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/payment/success?token=${encodeURIComponent(String(item.token))}&currency=${encodeURIComponent(String(item.currency || 'EUR'))}`}
                      target="_blank"
                      className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-400 transition"
                    >
                      Bilet Oluştur
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
