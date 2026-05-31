/**
 * Professional ticket image generator
 * Used by: profile page, admin panel, (and backend could serve similar for mobile)
 */

interface TicketDownloadOptions {
  qrSvgElementId: string
  attendeeName: string
  eventTitle?: string
  filename?: string
}

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 1200

export function downloadTicketImage(options: TicketDownloadOptions) {
  const { qrSvgElementId, attendeeName, eventTitle, filename } = options

  const svgEl = document.getElementById(qrSvgElementId)
  if (!svgEl) return

  const serializer = new XMLSerializer()
  const svgStr = serializer.serializeToString(svgEl)

  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Load logo + QR then draw
  const logo = new Image()
  logo.crossOrigin = 'anonymous'
  const qrImg = new Image()

  let loaded = 0
  const onBothLoaded = () => {
    loaded++
    if (loaded < 2) return
    drawTicket(ctx, canvas, logo, qrImg, attendeeName, eventTitle || '9th Istanbul International Zumba Festival')
    const link = document.createElement('a')
    link.download = filename || `bilet-${attendeeName.replace(/[^a-zA-Z0-9-_]/g, '_')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  logo.onload = onBothLoaded
  logo.onerror = () => { loaded++; onBothLoaded() } // proceed without logo if failed
  qrImg.onload = onBothLoaded

  logo.src = '/images/festival-logo.png'
  qrImg.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)))
}

function drawTicket(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  logo: HTMLImageElement,
  qrImg: HTMLImageElement,
  attendeeName: string,
  eventTitle: string
) {
  const w = canvas.width
  const h = canvas.height

  // ─── Background gradient (dark purple to dark blue) ───
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#1a0533')
  grad.addColorStop(0.5, '#0d1b3e')
  grad.addColorStop(1, '#0a0a1a')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  // ─── Decorative top accent line ───
  const accentGrad = ctx.createLinearGradient(0, 0, w, 0)
  accentGrad.addColorStop(0, '#f97316')
  accentGrad.addColorStop(1, '#ec4899')
  ctx.fillStyle = accentGrad
  ctx.fillRect(0, 0, w, 6)

  // ─── Logo ───
  const logoSize = 160
  if (logo.complete && logo.naturalWidth > 0) {
    const logoX = (w - logoSize) / 2
    ctx.drawImage(logo, logoX, 40, logoSize, logoSize)
  }

  // ─── Event Title ───
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 32px "Segoe UI", sans-serif'
  ctx.fillText(eventTitle, w / 2, 240)

  // ─── Date & Location ───
  ctx.font = '22px "Segoe UI", sans-serif'
  ctx.fillStyle = '#f97316'
  ctx.fillText('17-18 October 2026', w / 2, 285)

  ctx.font = '18px "Segoe UI", sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fillText('Green Park Hotel Pendik, Istanbul', w / 2, 320)

  // ─── Divider line ───
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 1
  ctx.setLineDash([8, 4])
  ctx.beginPath()
  ctx.moveTo(60, 360)
  ctx.lineTo(w - 60, 360)
  ctx.stroke()
  ctx.setLineDash([])

  // ─── QR Code (white background rounded rect) ───
  const qrSize = 380
  const qrX = (w - qrSize - 40) / 2
  const qrY = 400
  const qrPadding = 20

  // White rounded rect behind QR
  roundedRect(ctx, qrX, qrY, qrSize + 40, qrSize + 40, 20)
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  // Draw QR
  ctx.drawImage(qrImg, qrX + qrPadding, qrY + qrPadding, qrSize, qrSize)

  // ─── Attendee section ───
  const infoY = qrY + qrSize + 80

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.setLineDash([8, 4])
  ctx.beginPath()
  ctx.moveTo(60, infoY)
  ctx.lineTo(w - 60, infoY)
  ctx.stroke()
  ctx.setLineDash([])

  // Label
  ctx.font = '16px "Segoe UI", sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.fillText('ATTENDEE', w / 2, infoY + 40)

  // Name
  ctx.font = 'bold 30px "Segoe UI", sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(attendeeName.toUpperCase(), w / 2, infoY + 80)

  // ─── Bottom accent ───
  ctx.font = '14px "Segoe UI", sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.fillText('Present this QR code at the event entrance', w / 2, h - 60)
  ctx.fillText('istanbulzumbafestival.com', w / 2, h - 35)

  // Bottom accent line
  ctx.fillStyle = accentGrad
  ctx.fillRect(0, h - 6, w, 6)
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
