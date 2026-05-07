'use client'

import Link from 'next/link'

export default function PaymentErrorPage() {
  return (
    <div className="min-h-screen bg-[#0d0d1a] pt-20 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-10 w-10 text-red-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-white">Ödeme Başarısız</h1>
        <p className="mb-8 text-white/60">
          Ödeme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin veya farklı bir ödeme yöntemi kullanın.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white transition hover:bg-orange-400"
          >
            Tekrar Dene
          </Link>
          <Link
            href="/profile"
            className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/5"
          >
            Profilime Git
          </Link>
        </div>
      </div>
    </div>
  )
}
