'use client'

import { useState, useEffect } from 'react'
import { api, type AdminStats } from '../../lib/api'

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>{icon}</div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard({ token }: { token: string }) {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAdminStats(token)
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <div className="py-16 text-center text-gray-400">Yükleniyor...</div>
  if (!stats) return <div className="py-16 text-center text-gray-400">Veri alınamadı</div>

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-gray-900">Genel Bakış</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Toplam Kullanıcı"
          value={stats.total_users}
          color="bg-blue-100"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-blue-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          label="Toplam Bilet"
          value={stats.total_tickets}
          color="bg-orange-100"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-orange-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          }
        />
        <StatCard
          label="Kullanılan Bilet"
          value={stats.tickets_used}
          color="bg-green-100"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-green-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Toplam Etkinlik"
          value={stats.total_events}
          color="bg-purple-100"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-purple-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>
      {stats.total_revenue !== undefined && (
        <div className="mt-4 rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-400 p-6 text-white shadow-sm">
          <p className="text-sm font-medium text-white/80">Toplam Gelir</p>
          <p className="mt-1 text-4xl font-bold">{stats.total_revenue.toLocaleString('de-DE')} €</p>
        </div>
      )}
    </div>
  )
}