import { Suspense } from 'react'
import AdminPendingPaymentsClient from './components/AdminPendingPaymentsClient'

export default function AdminPendingPaymentsPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-gray-400">Yükleniyor...</div>}>
      <AdminPendingPaymentsClient />
    </Suspense>
  )
}
