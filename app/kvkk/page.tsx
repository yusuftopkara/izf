'use client'

export default function KVKKPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] via-[#1a1a2e] to-[#0a0a1a] text-white pt-32 pb-20 px-4">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 border border-orange-500/20 px-4 py-1.5 text-xs font-semibold text-orange-400 mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Yasal Bilgilendirme
          </div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            KVKK Aydınlatma Metni
          </h1>
          <p className="text-white/40 text-sm mt-3">Son güncelleme: 7 Mayıs 2026</p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <Section title="1. Veri Sorumlusu">
            <p>Istanbul International Zumba Festival organizasyonu olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri sorumlusu sıfatıyla kişisel verilerinizi aşağıda açıklanan amaçlar doğrultusunda işlemekteyiz.</p>
          </Section>

          <Section title="2. İşlenen Kişisel Veriler">
            <div className="grid gap-3">
              <InfoCard icon="👤" label="Kimlik Bilgileri" value="Ad, soyad" />
              <InfoCard icon="📧" label="İletişim Bilgileri" value="E-posta adresi, telefon numarası" />
              <InfoCard icon="💳" label="Ödeme Bilgileri" value="Ödeme işlem bilgileri (kart bilgileri tarafımızca saklanmaz, iyzico altyapısı üzerinden işlenir)" />
              <InfoCard icon="🔒" label="İşlem Güvenliği" value="IP adresi, tarayıcı bilgileri, giriş/çıkış kayıtları" />
            </div>
          </Section>

          <Section title="3. Kişisel Verilerin İşlenme Amaçları">
            <ul className="space-y-2">
              <Li>Etkinlik biletinin oluşturulması ve teslimi</Li>
              <Li>Ödeme işlemlerinin gerçekleştirilmesi</Li>
              <Li>Etkinlik giriş kontrolünün sağlanması (QR kod doğrulama)</Li>
              <Li>Kullanıcı hesap yönetimi</Li>
              <Li>Yasal yükümlülüklerin yerine getirilmesi</Li>
              <Li>İletişim ve bilgilendirme</Li>
            </ul>
          </Section>

          <Section title="4. Kişisel Verilerin Aktarımı">
            <p className="mb-3">Kişisel verileriniz;</p>
            <ul className="space-y-2">
              <Li>Ödeme işlemleri için iyzico Ödeme Hizmetleri A.Ş.&apos;ye</Li>
              <Li>Yasal zorunluluklar kapsamında yetkili kamu kurum ve kuruluşlarına</Li>
            </ul>
            <p className="mt-3 text-white/50">aktarılabilmektedir.</p>
          </Section>

          <Section title="5. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi">
            <p>Kişisel verileriniz, web sitemiz ve mobil uygulamamız aracılığıyla elektronik ortamda, açık rızanıza ve/veya sözleşmenin ifası hukuki sebebine dayanılarak toplanmaktadır.</p>
          </Section>

          <Section title="6. İlgili Kişi Hakları (KVKK Madde 11)">
            <p className="mb-3">Kanun kapsamında aşağıdaki haklara sahipsiniz:</p>
            <ul className="space-y-2">
              <Li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</Li>
              <Li>İşlenmişse buna ilişkin bilgi talep etme</Li>
              <Li>İşlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme</Li>
              <Li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</Li>
              <Li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</Li>
              <Li>KVKK&apos;nın 7. maddesinde öngörülen şartlar çerçevesinde silinmesini isteme</Li>
              <Li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</Li>
            </ul>
          </Section>

          <Section title="7. İletişim">
            <p>KVKK kapsamındaki taleplerinizi <span className="text-orange-400 font-semibold">info@istanbulzumbafestival.com</span> adresine iletebilirsiniz.</p>
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

function InfoCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
      <span className="text-lg">{icon}</span>
      <div>
        <p className="text-white font-semibold text-sm">{label}</p>
        <p className="text-white/50 text-xs mt-0.5">{value}</p>
      </div>
    </div>
  )
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0" />
      <span>{children}</span>
    </li>
  )
}
