'use client'

import { useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface TrainingCertificateProps {
  workerName: string
  employeeNumber: string
  trainingTitle: string
  trainingType: string
  dateConducted: string
  durationHours: number
  trainerName: string | null
  certificateNumber: string | null
  validityDate: string | null
  contractorName: string
  designation: string
}

function formatLabel(date: string): string {
  try {
    const d = new Date(date)
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return date
  }
}

function trainingTypeLabel(type: string): string {
  switch (type) {
    case 'SafetyInduction': return 'Safety Induction'
    case 'JobSpecific': return 'Job Specific'
    case 'POSH': return 'POSH'
    case 'Special': return 'Special'
    case 'MockDrill': return 'Mock Drill'
    default: return type
  }
}

const W = 1200
const H = 850
const TEAL = '#0d9488'
const TEAL_LIGHT = '#14b8a6'
const GOLD = '#d4a843'
const GOLD_LIGHT = '#e8c96a'
const DARK = '#1e293b'
const MUTED = '#64748b'
const LIGHT_BG = '#f8fafc'

function drawCertificate(ctx: CanvasRenderingContext2D, props: TrainingCertificateProps) {
  const {
    workerName,
    employeeNumber,
    trainingTitle,
    trainingType,
    dateConducted,
    durationHours,
    trainerName,
    certificateNumber,
    validityDate,
    contractorName,
    designation,
  } = props

  // Clear and fill white background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // Subtle background pattern - light gradient
  const bgGrad = ctx.createLinearGradient(0, 0, W, H)
  bgGrad.addColorStop(0, '#ffffff')
  bgGrad.addColorStop(0.5, LIGHT_BG)
  bgGrad.addColorStop(1, '#ffffff')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  // === OUTER BORDER ===
  // Gold outer border
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 3
  ctx.strokeRect(12, 12, W - 24, H - 24)

  // Teal inner border
  ctx.strokeStyle = TEAL
  ctx.lineWidth = 2
  ctx.strokeRect(22, 22, W - 44, H - 44)

  // Thin gold decorative border
  ctx.strokeStyle = GOLD_LIGHT
  ctx.lineWidth = 0.5
  ctx.strokeRect(30, 30, W - 60, H - 60)

  // === CORNER DECORATIONS ===
  const corners = [
    { x: 35, y: 35 },
    { x: W - 35, y: 35 },
    { x: 35, y: H - 35 },
    { x: W - 35, y: H - 35 },
  ]
  ctx.fillStyle = TEAL
  corners.forEach(({ x, y }) => {
    ctx.beginPath()
    ctx.arc(x, y, 6, 0, Math.PI * 2)
    ctx.fill()
  })

  ctx.fillStyle = GOLD
  corners.forEach(({ x, y }) => {
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
  })

  // === HEADER LINE (decorative) ===
  const headerLineY = 105
  const lineGrad = ctx.createLinearGradient(80, headerLineY, W - 80, headerLineY)
  lineGrad.addColorStop(0, 'transparent')
  lineGrad.addColorStop(0.15, TEAL)
  lineGrad.addColorStop(0.5, GOLD)
  lineGrad.addColorStop(0.85, TEAL)
  lineGrad.addColorStop(1, 'transparent')
  ctx.strokeStyle = lineGrad
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(80, headerLineY)
  ctx.lineTo(W - 80, headerLineY)
  ctx.stroke()

  // Thin line above
  ctx.strokeStyle = TEAL_LIGHT
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(80, headerLineY - 4)
  ctx.lineTo(W - 80, headerLineY - 4)
  ctx.stroke()

  // === LOGO AREA (top left) ===
  ctx.fillStyle = TEAL
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('Buildozer', 60, 65)

  // === COMPANY NAME (top right) ===
  ctx.fillStyle = DARK
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('Clove Technologies', W - 60, 65)

  ctx.fillStyle = MUTED
  ctx.font = '12px system-ui, -apple-system, sans-serif'
  ctx.fillText('Amaravati, Andhra Pradesh', W - 60, 82)

  // === CERTIFICATE TITLE ===
  ctx.textAlign = 'center'
  ctx.fillStyle = TEAL
  ctx.font = 'bold 38px Georgia, "Times New Roman", serif'
  ctx.fillText('CERTIFICATE OF COMPLETION', W / 2, 160)

  // Decorative line below title
  const titleLineY = 175
  const titleLineGrad = ctx.createLinearGradient(300, titleLineY, W - 300, titleLineY)
  titleLineGrad.addColorStop(0, 'transparent')
  titleLineGrad.addColorStop(0.2, GOLD)
  titleLineGrad.addColorStop(0.5, GOLD_LIGHT)
  titleLineGrad.addColorStop(0.8, GOLD)
  titleLineGrad.addColorStop(1, 'transparent')
  ctx.strokeStyle = titleLineGrad
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(300, titleLineY)
  ctx.lineTo(W - 300, titleLineY)
  ctx.stroke()

  // Small diamond decorations on the line
  ctx.fillStyle = GOLD
  const diamondPositions = [W / 2 - 2, W / 2 + 2]
  diamondPositions.forEach((dx) => {
    ctx.beginPath()
    ctx.moveTo(dx, titleLineY - 5)
    ctx.lineTo(dx + 5, titleLineY)
    ctx.lineTo(dx, titleLineY + 5)
    ctx.lineTo(dx - 5, titleLineY)
    ctx.closePath()
    ctx.fill()
  })

  // === CERTIFICATION TEXT ===
  ctx.fillStyle = MUTED
  ctx.font = '16px Georgia, "Times New Roman", serif'
  ctx.fillText('This is to certify that', W / 2, 220)

  // === WORKER NAME (large) ===
  ctx.fillStyle = DARK
  ctx.font = 'bold 32px Georgia, "Times New Roman", serif'
  ctx.fillText(workerName, W / 2, 265)

  // Underline under name
  const nameWidth = ctx.measureText(workerName).width
  const nameLineGrad = ctx.createLinearGradient(W / 2 - nameWidth / 2 - 20, 275, W / 2 + nameWidth / 2 + 20, 275)
  nameLineGrad.addColorStop(0, 'transparent')
  nameLineGrad.addColorStop(0.1, GOLD)
  nameLineGrad.addColorStop(0.9, GOLD)
  nameLineGrad.addColorStop(1, 'transparent')
  ctx.strokeStyle = nameLineGrad
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(W / 2 - nameWidth / 2 - 20, 275)
  ctx.lineTo(W / 2 + nameWidth / 2 + 20, 275)
  ctx.stroke()

  // === HAS COMPLETED ===
  ctx.fillStyle = MUTED
  ctx.font = '16px Georgia, "Times New Roman", serif'
  ctx.fillText('has successfully completed the training program', W / 2, 305)

  // === TRAINING TITLE ===
  ctx.fillStyle = TEAL
  ctx.font = 'bold 24px Georgia, "Times New Roman", serif'
  ctx.fillText(`"${trainingTitle}"`, W / 2, 348)

  // Training type badge
  ctx.fillStyle = GOLD
  ctx.font = 'italic 14px Georgia, "Times New Roman", serif'
  ctx.fillText(`(${trainingTypeLabel(trainingType)})`, W / 2, 375)

  // === DETAILS SECTION ===
  const detailStartY = 420
  const detailRowHeight = 40
  const col1X = 160
  const col2X = W / 2 + 40
  const valueX1 = 310
  const valueX2 = W / 2 + 180

  // Section divider
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(120, detailStartY - 20)
  ctx.lineTo(W - 120, detailStartY - 20)
  ctx.stroke()

  const details = [
    { label: 'Date Conducted', value: formatLabel(dateConducted) },
    { label: 'Duration', value: durationHours > 0 ? `${durationHours} hours` : 'N/A' },
    { label: 'Trainer', value: trainerName || 'N/A' },
    { label: 'Valid Until', value: validityDate ? formatLabel(validityDate) : 'N/A' },
    { label: 'Employee No.', value: employeeNumber || 'N/A' },
    { label: 'Designation', value: designation || 'N/A' },
  ]

  details.forEach((detail, idx) => {
    const col = idx % 2
    const row = Math.floor(idx / 2)
    const x = col === 0 ? col1X : col2X
    const y = detailStartY + row * detailRowHeight
    const vx = col === 0 ? valueX1 : valueX2

    // Label
    ctx.fillStyle = MUTED
    ctx.font = '14px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${detail.label}:`, x, y)

    // Value
    ctx.fillStyle = DARK
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(detail.value, vx, y)
  })

  // === CONTRACTOR ===
  if (contractorName) {
    ctx.fillStyle = MUTED
    ctx.font = '14px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`Contractor: ${contractorName}`, W / 2, detailStartY + 3 * detailRowHeight)
  }

  // === FOOTER LINE ===
  const footerLineY = H - 140
  const footerLineGrad = ctx.createLinearGradient(80, footerLineY, W - 80, footerLineY)
  footerLineGrad.addColorStop(0, 'transparent')
  footerLineGrad.addColorStop(0.15, TEAL)
  footerLineGrad.addColorStop(0.5, GOLD)
  footerLineGrad.addColorStop(0.85, TEAL)
  footerLineGrad.addColorStop(1, 'transparent')
  ctx.strokeStyle = footerLineGrad
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(80, footerLineY)
  ctx.lineTo(W - 80, footerLineY)
  ctx.stroke()

  // === SIGNATURE AREA ===
  const sigY = footerLineY + 55

  // Left signature - Trainer
  if (trainerName) {
    ctx.strokeStyle = DARK
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(160, sigY - 30)
    ctx.lineTo(360, sigY - 30)
    ctx.stroke()

    ctx.fillStyle = DARK
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(trainerName, 260, sigY - 5)

    ctx.fillStyle = MUTED
    ctx.font = '11px system-ui, -apple-system, sans-serif'
    ctx.fillText('Trainer / Instructor', 260, sigY + 12)
  }

  // Right signature - Authorized Signatory
  ctx.strokeStyle = DARK
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(W - 360, sigY - 30)
  ctx.lineTo(W - 160, sigY - 30)
  ctx.stroke()

  ctx.fillStyle = DARK
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Authorized Signatory', W - 260, sigY - 5)

  ctx.fillStyle = MUTED
  ctx.font = '11px system-ui, -apple-system, sans-serif'
  ctx.fillText('Clove Technologies', W - 260, sigY + 12)

  // === CERTIFICATE NUMBER (bottom center) ===
  ctx.fillStyle = MUTED
  ctx.font = '10px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  const certNum = certificateNumber || `TRN-${Date.now().toString(36).toUpperCase()}`
  ctx.fillText(`Certificate No: ${certNum}`, W / 2, H - 55)

  // Issued date
  ctx.fillText(`Issued: ${formatLabel(new Date().toISOString())}`, W / 2, H - 40)
}

export default function TrainingCertificate(props: TrainingCertificateProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderedRef = useRef(false)

  // Draw the certificate once when component mounts or props change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = W
    canvas.height = H

    drawCertificate(ctx, props)
    renderedRef.current = true
  }, [props])

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const safeName = props.workerName.replace(/[^a-zA-Z0-9]/g, '_')
      link.download = `Certificate_${safeName}_${props.trainingTitle.replace(/[^a-zA-Z0-9]/g, '_')}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }, 'image/png')
  }, [props])

  return (
    <div className="space-y-4">
      {/* Certificate Preview */}
      <div className="rounded-lg border overflow-hidden bg-white">
        <div className="overflow-auto max-h-[70vh]">
          <canvas
            ref={canvasRef}
            className="w-full h-auto"
            style={{ imageRendering: '-webkit-optimize-contrast' }}
          />
        </div>
      </div>

      {/* Download Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleDownload}
          className="bg-[#0d9488] hover:bg-[#0f766e] text-white gap-2"
        >
          <Download className="h-4 w-4" />
          Download Certificate (PNG)
        </Button>
      </div>
    </div>
  )
}
