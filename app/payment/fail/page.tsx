'use client'

import Link from 'next/link'

export default function PaymentFailPage() {
  return (
    <div className="min-h-screen bg-[#0d0d1a] pt-20 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Soft background blobs */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-80 w-80 rounded-full bg-red-900/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-900/10 blur-3xl" />

      <div className="w-full max-w-md text-center relative z-10 animate-fadeIn">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/15 animate-shake">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-10 w-10 text-red-300">
              <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-6 6M9 9l6 6" />
            </svg>
          </div>
        </div>

        <h1 className="mb-3 text-2xl sm:text-3xl font-bold text-white">
          Ödeme İşleminiz Tamamlanamadı
        </h1>

        <p className="mb-2 text-white/70 text-sm sm:text-base">
          Üzgünüz, ödeme işlemi sırasında bir sorun oluştu. Bu geçici bir aksaklık olabilir.
        </p>

        <p className="mb-8 text-white/50 text-xs sm:text-sm">
          Kart bilgilerinizi kontrol edip tekrar deneyebilir veya farklı bir ödeme yöntemi kullanabilirsiniz.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="rounded-xl bg-pink-500 px-6 py-3 font-bold text-white transition hover:bg-pink-400 active:scale-[0.98]"
          >
            Tekrar Dene
          </Link>
          <a
            href="mailto:info@izf.com.tr"
            className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/5 active:scale-[0.98]"
          >
            Yardım Al
          </a>
          <Link
            href="/"
            className="rounded-xl px-6 py-3 font-medium text-white/60 transition hover:text-white"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  )
}
