'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Countdown from './components/Countdown'
import VideoHero from './components/VideoHero'
import Gallery from './components/Gallery'
import FestivalVideos from './components/FestivalVideos'
import { useLocale } from './context/LocaleContext'
import { TicketButton, LiveTicketAvailability } from './components/TicketClient'
import { api, type SiteContent } from './lib/api'

// ─── Default Content ──────────────────────────────────────────────────────────
const DEFAULT_CONTENT: SiteContent = {
  hero_video: {
    url: '/videos/zumbaarkaplan.mp4',
    type: 'mp4',
  },
  countdown_target: '2026-10-17T16:00:00',
  beto_perez: {
    enabled: true,
    title: 'Beto Perez',
    subtitle: 'Zumba Master Class',
    description: "Zumba'nın yaratıcısı Beto Perez ile efsanevi bir master class deneyimi yaşayın. 25. yıl özel etkinliğinde sahne alacak olan Beto, sizi latin ritimlerinin büyüleyici dünyasına davet ediyor!",
    image_url: '/images/story-poster.png',
    button_text: 'Master Class Bileti Al',
    button_link: 'https://wa.me/905337743572?text=Beto%20Perez%20master%20class%20icin%20bilet%20almak%20istiyorum',
  },
  venue: {
    name: 'Green Park Hotel Pendik',
    address: 'Kaynarca, Erol Kaya Cd No:204, 34890 Pendik / İstanbul',
    map_embed_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3011.650675727968!2d29.2872!3d40.8776!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14cadb0f7e5e5e5e%3A0x5e5e5e5e5e5e5e5e!2sGreen%20Park%20Hotel%20Pendik!5e0!3m2!1str!2str!4v1600000000000!5m2!1str!2str',
    description: 'Convention Center',
  },
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ content }: { content: SiteContent }) {
  const { t } = useLocale()
  const heroVideo = content.hero_video || DEFAULT_CONTENT.hero_video

  return (
    <VideoHero videoUrl={heroVideo?.url} videoType={heroVideo?.type}>
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4 text-center">
        <Image
          src="/images/festival-logo.png"
          alt="Istanbul Zumba Festival Logo"
          width={200}
          height={200}
          priority
          className="drop-shadow-2xl"
        />
        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-white drop-shadow-lg sm:text-6xl lg:text-7xl">
          {t('hero.title')}<br />
          <span className="text-orange-400">{t('hero.subtitle')}</span>
        </h1>
        <p className="text-xl font-semibold text-yellow-300 drop-shadow-md sm:text-2xl">
          {t('hero.date')} &nbsp;·&nbsp; {t('hero.location')}
        </p>
        <TicketButton />
      </div>
    </VideoHero>
  )
}

// ─── Countdown ────────────────────────────────────────────────────────────────

function CountdownSection({ content }: { content: SiteContent }) {
  const { t } = useLocale()
  const targetDate = content.countdown_target || DEFAULT_CONTENT.countdown_target

  return (
    <section className="bg-[#0d0d1a] py-16 px-4">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-orange-400">
          {t('countdown.title')}
        </h2>
        <p className="mb-10 text-2xl font-extrabold text-white sm:text-3xl">
          {t('countdown.date')}
        </p>
        <Countdown targetDate={targetDate} />
      </div>
    </section>
  )
}

// ─── Beto Perez ───────────────────────────────────────────────────────────────

function BetoPerez({ content }: { content: SiteContent }) {
  const { t, locale } = useLocale()
  const beto = content.beto_perez || DEFAULT_CONTENT.beto_perez

  if (!beto?.enabled) return null

  // EN: CMS'de _en varsa → onu, yoksa locale fallback. TR: CMS değerini olduğu gibi.
  const title = locale === 'en' ? (beto.title_en || t('beto.defaultTitle')) : beto.title
  const subtitle = locale === 'en' ? (beto.subtitle_en || t('beto.defaultSubtitle')) : beto.subtitle
  const description = locale === 'en' ? (beto.description_en || t('beto.defaultDescription')) : beto.description
  const buttonText = locale === 'en' ? (beto.button_text_en || t('beto.defaultButtonText')) : beto.button_text

  return (
    <section className="bg-[#0d0d1a] py-16 px-4">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-start">
          {/* Poster */}
          <div className="relative w-full max-w-xs flex-shrink-0 overflow-hidden rounded-3xl shadow-2xl lg:max-w-sm">
            <Image
              src={beto.image_url || '/images/story-poster.png'}
              alt={title || 'Beto Perez'}
              width={540}
              height={960}
              className="w-full object-cover"
            />
            {/* Badge */}
            <div className="absolute top-4 right-4 rounded-full bg-yellow-400 px-4 py-2 text-xs font-extrabold text-black shadow-lg">
              25 Years of Zumba
            </div>
          </div>

          {/* Text */}
          <div className="flex flex-col justify-center gap-6 text-center lg:text-left">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-400">
              {t('beto.specialGuest')}
            </p>
            <h2 className="text-4xl font-extrabold text-white sm:text-5xl">
              {title}
            </h2>
            <h3 className="text-2xl font-bold text-yellow-300">
              {subtitle}
            </h3>
            <p className="max-w-lg text-white/70 leading-relaxed">
              {description}
            </p>
            <div className="self-center lg:self-start">
              <TicketButton label={buttonText} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Venue ────────────────────────────────────────────────────────────────────

const hotelImages = [
  { src: '/images/hotel-1.jpeg', alt: 'Green Park Hotel – Genel Görünüm' },
  { src: '/images/hotel-2.jpeg', alt: 'Green Park Hotel – Gece' },
  { src: '/images/hotel-3.jpeg', alt: 'Green Park Hotel – Havuz' },
  { src: '/images/hotel-4.jpeg', alt: 'Green Park Hotel – Spa' },
]

function Venue({ content }: { content: SiteContent }) {
  const { t, locale } = useLocale()
  const venue = content.venue || DEFAULT_CONTENT.venue

  // EN modunda: CMS'deki _en alanı varsa onu kullan, yoksa locale dosyasındaki fallback
  // TR modunda: CMS değerini olduğu gibi kullan
  const venueDescription = locale === 'en'
    ? (venue?.description_en || t('venue.defaultDescription'))
    : venue?.description
  const venueAddress = locale === 'en'
    ? (venue?.address_en || t('venue.defaultAddress'))
    : venue?.address

  return (
    <section className="bg-[#1a1a2e] py-16 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-orange-400">
            {t('venue.title')}
          </p>
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            {venue?.name}<br />
            <span className="text-yellow-300 text-2xl font-semibold">{venueDescription}</span>
          </h2>
          <p className="mt-4 text-white/60">
            {venueAddress}
          </p>
        </div>

        {/* Hotel image grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-10">
          {hotelImages.map((img) => (
            <div key={img.src} className="relative aspect-[4/3] overflow-hidden rounded-xl group">
              <Image
                src={img.src}
                alt={img.alt}
                fill
                className="object-cover transition duration-500 group-hover:scale-110"
              />
            </div>
          ))}
        </div>

        {/* Google Maps embed */}
        <div className="overflow-hidden rounded-2xl shadow-2xl">
          <iframe
            src={venue?.map_embed_url}
            width="100%"
            height="380"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={locale === 'tr' ? 'Etkinlik Yeri Haritası' : 'Event Venue Map'}
          />
        </div>
      </div>
    </section>
  )
}

// ─── Contact ──────────────────────────────────────────────────────────────────

function Contact() {
  const { t } = useLocale()
  return (
    <section className="bg-[#1a1a2e] py-16 px-4">
      <div className="mx-auto max-w-xl text-center">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-orange-400">
          {t('contact.title')}
        </p>
        <h2 className="mb-8 text-3xl font-extrabold text-white sm:text-4xl">
          {t('contact.subtitle')}
        </h2>

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          {/* WhatsApp */}
          <a
            href="https://wa.me/905337743572"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 rounded-full bg-green-500 px-8 py-4 font-bold text-white shadow-lg transition hover:bg-green-400 hover:scale-105"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            WhatsApp
          </a>

          {/* Instagram */}
          <a
            href="https://www.instagram.com/istanbulzumbafestival"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 px-8 py-4 font-bold text-white shadow-lg transition hover:opacity-90 hover:scale-105"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
            Instagram
          </a>
        </div>
      </div>
    </section>
  )
}

// ─── Floating WhatsApp button ─────────────────────────────────────────────────

function FloatingWhatsApp() {
  return (
    <a
      href="https://wa.me/905337743572"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp ile iletişime geç"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-500/40 transition hover:bg-green-400 hover:scale-110"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
    </a>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const { t } = useLocale()
  return (
    <footer className="bg-[#0d0d1a] py-10 px-4 border-t border-white/10">
      <div className="mx-auto max-w-4xl flex flex-col items-center gap-6 text-center">
        <Image
          src="/images/festival-logo.png"
          alt="Istanbul Zumba Festival Logo"
          width={100}
          height={100}
          className="opacity-80"
        />
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <a href="/kvkk" className="text-white/50 hover:text-orange-400 transition">{t('footer.kvkk')}</a>
          <a href="/gizlilik" className="text-white/50 hover:text-orange-400 transition">{t('footer.privacy')}</a>
          <a href="/cerez-politikasi" className="text-white/50 hover:text-orange-400 transition">{t('footer.cookies')}</a>
        </div>
        <div className="space-y-1 text-white/50 text-sm">
          <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          <p>
            ZUMBA® is a registered trademark of Zumba Fitness, LLC.
          </p>
          <p>
            <a href="https://www.istanbulzumbafestival.com" className="hover:text-orange-400 transition">
              www.istanbulzumbafestival.com
            </a>
          </p>
          <p className="mt-3 text-white/30 text-xs">
            {t('footer.credit')}:{' '}
            <a href="https://topqara.dev" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-orange-400 transition">
              topqara
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}

// ─── Loading State ────────────────────────────────────────────────────────────

function LoadingState() {
  const { t } = useLocale()
  return (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-white/60">{t('auth.loading')}</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Page() {
  const [content, setContent] = useState<SiteContent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadContent() {
      try {
        const data = await api.getSiteContent()
        setContent(data)
      } catch (err) {
        console.error('Site content yüklenemedi:', err)
        setContent(DEFAULT_CONTENT)
      } finally {
        setLoading(false)
      }
    }
    loadContent()
  }, [])

  if (loading) return <LoadingState />

  return (
    <div className="min-h-full bg-[#1a1a2e] text-white">
      <Hero content={content || DEFAULT_CONTENT} />
      <CountdownSection content={content || DEFAULT_CONTENT} />
      <LiveTicketAvailability />
      <BetoPerez content={content || DEFAULT_CONTENT} />
      <FestivalVideos />
      <Venue content={content || DEFAULT_CONTENT} />
      <Gallery />
      <Contact />
      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
