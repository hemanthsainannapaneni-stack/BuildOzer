'use client'

import { useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Download, User } from 'lucide-react'

interface UserIdCardProps {
  fullName: string
  role: string
  contractorName?: string
  employeeNumber?: string
  photo?: string | null
  bloodGroup?: string
  siteName?: string
}

// ---------- helpers ----------
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ---------- Canvas drawing ----------
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
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

function drawCard(
  canvas: HTMLCanvasElement,
  data: UserIdCardProps,
  photoImg: HTMLImageElement | null,
) {
  const dpr = 2 // retina
  const W = 340
  const H = 214
  canvas.width = W * dpr
  canvas.height = H * dpr
  canvas.style.width = `${W}px`
  canvas.style.height = `${H}px`

  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  // Card background with rounded corners
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, 0, 0, W, H, 10)
  ctx.fill()
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1
  ctx.stroke()

  // Clip to card
  ctx.save()
  roundRect(ctx, 0, 0, W, H, 10)
  ctx.clip()

  // Teal gradient header bar
  const grad = ctx.createLinearGradient(0, 0, W, 0)
  grad.addColorStop(0, '#0d9488')
  grad.addColorStop(0.5, '#14b8a6')
  grad.addColorStop(1, '#0d9488')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, 38)

  // Header text: Buildozer
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 13px Inter, system-ui, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText('Buildozer', 12, 16)

  // Header text: right side - card type
  ctx.font = '600 7.5px Inter, system-ui, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('IDENTITY CARD', W - 12, 16)

  // Photo area
  const photoX = 14
  const photoY = 50
  const photoSize = 56

  if (photoImg) {
    // Draw photo clipped to rounded rect
    ctx.save()
    roundRect(ctx, photoX, photoY, photoSize, photoSize, 6)
    ctx.clip()
    const imgAspect = photoImg.width / photoImg.height
    let sx = 0, sy = 0, sw = photoImg.width, sh = photoImg.height
    if (imgAspect > 1) {
      sx = (photoImg.width - photoImg.height) / 2
      sw = photoImg.height
    } else {
      sy = (photoImg.height - photoImg.width) / 2
      sh = photoImg.width
    }
    ctx.drawImage(photoImg, sx, sy, sw, sh, photoX, photoY, photoSize, photoSize)
    ctx.restore()

    // Photo border
    ctx.strokeStyle = '#0d9488'
    ctx.lineWidth = 2
    roundRect(ctx, photoX, photoY, photoSize, photoSize, 6)
    ctx.stroke()
  } else {
    // Placeholder circle
    ctx.fillStyle = '#f0fdfa'
    roundRect(ctx, photoX, photoY, photoSize, photoSize, 6)
    ctx.fill()
    ctx.strokeStyle = '#0d9488'
    ctx.lineWidth = 2
    roundRect(ctx, photoX, photoY, photoSize, photoSize, 6)
    ctx.stroke()

    // User icon placeholder
    const initials = getInitials(data.fullName)
    ctx.fillStyle = '#0d9488'
    ctx.font = 'bold 18px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(initials, photoX + photoSize / 2, photoY + photoSize / 2)
  }

  // Right side: text info
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const infoX = photoX + photoSize + 14
  const infoY = photoY

  // Full name (bold)
  ctx.fillStyle = '#0f172a'
  ctx.font = 'bold 15px Inter, system-ui, sans-serif'
  ctx.fillText(data.fullName, infoX, infoY, W - infoX - 14)

  // Role badge (teal background pill)
  const roleText = data.role
  ctx.font = '600 9px Inter, system-ui, sans-serif'
  const roleW = ctx.measureText(roleText).width + 12
  const badgeY = infoY + 22
  ctx.fillStyle = '#0d9488'
  roundRect(ctx, infoX, badgeY, roleW, 16, 4)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.fillText(roleText, infoX + 6, badgeY + 3)

  // Employee number
  let nextY = badgeY + 22
  if (data.employeeNumber) {
    ctx.font = '500 8.5px Inter, system-ui, sans-serif'
    ctx.fillStyle = '#64748b'
    ctx.fillText('Emp. No.', infoX, nextY)
    ctx.font = '600 8.5px monospace'
    ctx.fillStyle = '#334155'
    const empLabelW = ctx.measureText('Emp. No.').width
    ctx.fillText(data.employeeNumber, infoX + empLabelW + 6, nextY)
    nextY += 14
  }

  // Blood group badge
  if (data.bloodGroup) {
    const bgText = `Blood: ${data.bloodGroup}`
    ctx.font = '600 8px Inter, system-ui, sans-serif'
    const bgW = ctx.measureText(bgText).width + 10
    ctx.fillStyle = '#fef2f2'
    roundRect(ctx, infoX, nextY, bgW, 14, 3)
    ctx.fill()
    ctx.strokeStyle = '#fecaca'
    ctx.lineWidth = 0.5
    roundRect(ctx, infoX, nextY, bgW, 14, 3)
    ctx.stroke()
    ctx.fillStyle = '#dc2626'
    ctx.fillText(bgText, infoX + 5, nextY + 3)
    nextY += 18
  }

  // Bottom bar
  const bottomY = H - 28
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, bottomY - 4, W, H - bottomY + 4)
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(0, bottomY - 4)
  ctx.lineTo(W, bottomY - 4)
  ctx.stroke()

  // Bottom left: contractor name
  ctx.font = '500 7.5px Inter, system-ui, sans-serif'
  ctx.fillStyle = '#475569'
  const bottomText = data.contractorName || '—'
  ctx.textAlign = 'left'
  ctx.fillText(bottomText, 12, bottomY + 4)

  // Bottom center: site name
  if (data.siteName) {
    ctx.textAlign = 'center'
    ctx.fillStyle = '#64748b'
    ctx.fillText(data.siteName, W / 2, bottomY + 4)
  }

  // Bottom right: Clove Technologies
  ctx.font = '700 7px Inter, system-ui, sans-serif'
  ctx.fillStyle = '#94a3b8'
  ctx.textAlign = 'right'
  ctx.fillText('Clove Technologies', W - 12, bottomY + 4)

  ctx.restore()
}

// ---------- component ----------
export default function UserIdCard({
  fullName,
  role,
  contractorName,
  employeeNumber,
  photo,
  bloodGroup,
  siteName,
}: UserIdCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleDownload = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Load photo if exists
    let photoImg: HTMLImageElement | null = null
    if (photo && photo.startsWith('data:')) {
      photoImg = new Image()
      await new Promise<void>((resolve) => {
        photoImg!.onload = () => resolve()
        photoImg!.onerror = () => resolve()
        photoImg!.src = photo
      })
      if (!photoImg.complete || photoImg.naturalWidth === 0) {
        photoImg = null
      }
    }

    drawCard(canvas, { fullName, role, contractorName, employeeNumber, bloodGroup, siteName }, photoImg)

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fullName.replace(/\s+/g, '_')}_ID_Card.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 'image/png')
  }, [fullName, role, contractorName, employeeNumber, photo, bloodGroup, siteName])

  // Pre-render the card on canvas for preview
  const initials = getInitials(fullName)

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Visual preview card */}
      <div
        className="id-card-container"
        style={{
          width: '340px',
          height: '214px',
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
          fontFamily: 'Inter, system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #e2e8f0',
          position: 'relative',
        }}
      >
        {/* Teal gradient header */}
        <div
          style={{
            height: '38px',
            background: 'linear-gradient(90deg, #0d9488, #14b8a6, #0d9488)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: 800, letterSpacing: '-0.3px' }}>
            Buildozer
          </span>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '7.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Identity Card
          </span>
        </div>

        {/* Photo + Info */}
        <div style={{ display: 'flex', padding: '12px 14px 8px', gap: '14px', flex: 1 }}>
          {/* Photo */}
          <div style={{ flexShrink: 0 }}>
            {photo && photo.startsWith('data:') ? (
              <img
                src={photo}
                alt={fullName}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '6px',
                  objectFit: 'cover',
                  border: '2px solid #0d9488',
                }}
              />
            ) : (
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '6px',
                  backgroundColor: '#f0fdfa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #0d9488',
                }}
              >
                <span style={{ color: '#0d9488', fontSize: '18px', fontWeight: 700 }}>
                  {initials}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
              {fullName}
            </div>
            <div style={{ marginTop: '4px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: '#0d9488',
                  color: '#ffffff',
                  fontSize: '9px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '4px',
                }}
              >
                {role}
              </span>
            </div>
            {employeeNumber && (
              <div style={{ marginTop: '6px', fontSize: '8.5px', color: '#64748b' }}>
                <span style={{ fontWeight: 500 }}>Emp. No.</span>{' '}
                <span style={{ fontWeight: 600, color: '#334155', fontFamily: 'monospace' }}>{employeeNumber}</span>
              </div>
            )}
            {bloodGroup && (
              <div style={{ marginTop: '4px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    fontSize: '8px',
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: '3px',
                    border: '1px solid #fecaca',
                  }}
                >
                  Blood: {bloodGroup}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            marginTop: 'auto',
            borderTop: '1px solid #e2e8f0',
            padding: '6px 12px',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '7.5px', color: '#475569', fontWeight: 500 }}>
            {contractorName || '—'}
          </span>
          {siteName && (
            <span style={{ fontSize: '7.5px', color: '#64748b' }}>{siteName}</span>
          )}
          <span style={{ fontSize: '7px', color: '#94a3b8', fontWeight: 700 }}>
            Clove Technologies
          </span>
        </div>
      </div>

      {/* Hidden canvas for PNG generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Download button */}
      <Button
        onClick={handleDownload}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        Download ID Card (PNG)
      </Button>
    </div>
  )
}
