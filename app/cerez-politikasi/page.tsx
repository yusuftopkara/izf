'use client'

export default function CerezPolitikasiPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] via-[#1a1a2e] to-[#0a0a1a] text-white pt-32 pb-20 px-4">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 text-xs font-semibold text-blue-400 mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            Çerezler
          </div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            Çerez Politikası
          </h1>
          <p className="text-white/40 text-sm mt-3">Son güncelleme: 7 Mayıs 2026</p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <Section title="1. Çerez Nedir?">
            <p>Çerezler, web sitemizi ziyaret ettiğinizde tarayıcınıza yerleştirilen küçük metin dosyalarıdır. Sitemizin düzgün çalışmasını sağlamak ve kullanıcı deneyiminizi geliştirmek amacıyla kullanılmaktadır.</p>
          </Section>

          <Section title="2. Kullandığımız Çerez Türleri">
            <div className="grid gap-3">
              <div className="flex items-start gap-3 rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-green-400 shrink-0" />
                <div>
                  <p className="text-white font-semibold text-sm">Zorunlu Çerezler</p>
                  <p className="text-white/50 text-xs mt-0.5">Sitemizin temel işlevlerinin çalışması için gereklidir (oturum yönetimi, güvenlik).</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-blue-400 shrink-0" />
                <div>
                  <p className="text-white font-semibold text-sm">İşlevsel Çerezler</p>
                  <p className="text-white/50 text-xs mt-0.5">Tercihlerinizi hatırlamamıza yardımcı olur (dil, tema vb.).</p>
                </div>
              </div>
            </div>
          </Section>

          <Section title="3. Kullanmadığımız Çerezler">
            <div className="rounded-xl bg-green-500/5 border border-green-500/10 p-4">
              <p className="text-green-300/80 text-sm">✓ Sitemizde reklam çerezleri veya üçüncü taraf izleme çerezleri (Google Analytics, Facebook Pixel vb.) kullanılmamaktadır.</p>
            </div>
          </Section>

          <Section title="4. Çerez Yönetimi">
            <p>Tarayıcınızın ayarlarından çerezleri silebilir veya engelleyebilirsiniz. Ancak zorunlu çerezlerin engellenmesi durumunda sitemizin bazı işlevleri düzgün çalışmayabilir.</p>
          </Section>

          <Section title="5. İletişim">
            <p>Çerez politikamız hakkında sorularınız için: <span className="text-blue-400 font-semibold">info@istanbulzumbafestival.com</span></p>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 backdrop-blur-sm">
      <h2 className="text-lg font-bold text-white mb-4">{title}</h2>
      <div className="text-white/70 text-sm leading-relaxed">{children}</div>
    </div>
  )
}
