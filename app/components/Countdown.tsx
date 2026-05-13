'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '../context/LocaleContext'

interface TimeLeft {
  months: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

interface CountdownProps {
  targetDate?: string
}

function calcTimeLeft(targetDateStr?: string): TimeLeft {
  const target = targetDateStr 
    ? new Date(targetDateStr).getTime()
    : new Date('2026-10-17T16:00:00+03:00').getTime()
  const now = Date.now()
  const diff = Math.max(0, target - now)

  const totalSeconds = Math.floor(diff / 1000)
  const months = Math.floor(totalSeconds / (30 * 24 * 3600))
  const afterMonths = totalSeconds % (30 * 24 * 3600)
  const days = Math.floor(afterMonths / (24 * 3600))
  const afterDays = afterMonths % (24 * 3600)
  const hours = Math.floor(afterDays / 3600)
  const minutes = Math.floor((afterDays % 3600) / 60)
  const seconds = afterDays % 60

  return { months, days, hours, minutes, seconds }
}

function Pad({ n }: { n: number }) {
  return <>{String(n).padStart(2, '0')}</>
}

const PLACEHOLDER: TimeLeft = { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 }

export default function Countdown({ targetDate }: CountdownProps) {
  const { t } = useLocale()
  const [mounted, setMounted] = useState(false)
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(PLACEHOLDER)

  useEffect(() => {
    setMounted(true)
    setTimeLeft(calcTimeLeft(targetDate))
    const id = setInterval(() => setTimeLeft(calcTimeLeft(targetDate)), 1000)
    return () => clearInterval(id)
  }, [targetDate])

  const display = mounted ? timeLeft : PLACEHOLDER

  const units = [
    { label: t('countdown.months'), value: display.months },
    { label: t('countdown.days'), value: display.days },
    { label: t('countdown.hours'), value: display.hours },
    { label: t('countdown.minutes'), value: display.minutes },
    { label: t('countdown.seconds'), value: display.seconds },
  ]

  return (
    <div className="flex flex-wrap justify-center gap-4">
      {units.map(({ label, value }) => (
        <div
          key={label}
          className="flex flex-col items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-xl border border-yellow-500/40 bg-black/40 backdrop-blur-sm"
        >
          <span className="text-3xl sm:text-4xl font-extrabold text-yellow-400 tabular-nums">
            <Pad n={value} />
          </span>
          <span className="text-xs sm:text-sm font-semibold text-orange-300 uppercase tracking-widest mt-1">
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}
