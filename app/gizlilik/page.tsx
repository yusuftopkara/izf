'use client'

export default function GizlilikPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] via-[#1a1a2e] to-[#0a0a1a] text-white pt-32 pb-20 px-4">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 border border-purple-500/20 px-4 py-1.5 text-xs font-semibold text-purple-400 mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Gizlilik
          </div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            Gizlilik Politikası
          </h1>
          <p className="text-white/40 text-sm mt-3">Son güncelleme: 7 Mayıs 2026</p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <Section title="1. Genel">
            <p>Istanbul International Zumba Festival olarak kullanıcılarımızın gizliliğine önem veriyoruz. Bu politika, kişisel bilgilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklamaktadır.</p>
          </Section>

          <Section title="2. Toplanan Bilgiler">
            <ul className="space-y-2">
              <Li>Hesap oluştururken: ad, soyad, e-posta, telefon numarası</Li>
              <Li>Bilet satın alırken: ödeme bilgileri (iyzico üzerinden güvenli şekilde işlenir)</Li>
              <Li>Site kullanımında: IP adresi, tarayıcı tipi, ziyaret edilen sayfalar</Li>
            </ul>
          </Section>

          <Section title="3. Bilgilerin Kullanımı">
            <ul className="space-y-2">
              <Li>Bilet satın alma ve teslimat süreçleri</Li>
              <Li>Etkinlik girişinde kimlik doğrulama</Li>
              <Li>Hesap güvenliği ve yönetimi</Li>
              <Li>Etkinlikle ilgili önemli bilgilendirmeler</Li>
            </ul>
          </Section>

          <Section title="4. Bilgi Güvenliği">
            <p>Verileriniz SSL şifreleme ile korunmaktadır. Ödeme bilgileriniz tarafımızca saklanmaz; iyzico&apos;nun PCI DSS uyumlu altyapısı üzerinden işlenir.</p>
          </Section>

          <Section title="5. Üçüncü Taraflar">
            <p>Kişisel verileriniz, hizmet sağlayıcılarımız (iyzico, MongoDB Atlas, Railway) dışında üçüncü taraflarla paylaşılmaz. Bu hizmet sağlayıcıları da kendi gizlilik politikaları kapsamında verilerinizi korumaktadır.</p>
          </Section>

          <Section title="6. Veri Saklama Süresi">
            <p>Kişisel verileriniz, etkinlik tarihinden itibaren en fazla 1 yıl süreyle saklanır. Yasal yükümlülükler saklıdır.</p>
          </Section>

          <Section title="7. Haklarınız">
            <p>Verilerinizin silinmesini, düzeltilmesini veya taşınmasını talep edebilirsiniz. Detaylar için KVKK Aydınlatma Metni&apos;ni inceleyiniz.</p>
          </Section>

          <Section title="8. İletişim">
            <p>Gizlilik ile ilgili sorularınız için: <span className="text-purple-400 font-semibold">info@istanbulzumbafestival.com</span></p>
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

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0" />
      <span>{children}</span>
    </li>
  )
}
