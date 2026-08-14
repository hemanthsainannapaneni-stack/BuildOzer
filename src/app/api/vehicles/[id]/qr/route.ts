import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { db } from '@/lib/db'

interface QRData {
  qrDataUrl: string
  generatedAt: string
  content: object
}

// GET /api/vehicles/[id]/qr — return current QR if exists
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const vehicle = await db.vehicle.findUnique({
      where: { id },
      select: { id: true, currentQRCode: true, vehicleNumber: true, updatedAt: true },
    })

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    let qrData: QRData | null = null
    if (vehicle.currentQRCode) {
      try {
        qrData = JSON.parse(vehicle.currentQRCode)
      } catch {
        // Legacy format: raw data URL string
        qrData = { qrDataUrl: vehicle.currentQRCode, generatedAt: vehicle.updatedAt.toISOString(), content: {} }
      }
    }

    return NextResponse.json({
      data: {
        currentQR: qrData?.qrDataUrl || null,
        qrGeneratedAt: qrData?.generatedAt || null,
        vehicleNumber: vehicle.vehicleNumber,
      },
    })
  } catch (error) {
    console.error('GET /api/vehicles/[id]/qr error:', error)
    return NextResponse.json({ error: 'Failed to fetch QR code' }, { status: 500 })
  }
}

// POST /api/vehicles/[id]/qr — generate a new QR code
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const vehicle = await db.vehicle.findUnique({
      where: { id },
      include: {
        contractor: { select: { name: true } },
        site: { select: { name: true } },
      },
    })

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    const qrContent = {
      registration: vehicle.vehicleNumber,
      type: vehicle.vehicleType,
      owner: vehicle.owner,
      contractor: vehicle.contractor?.name || 'N/A',
      site: vehicle.site?.name || 'N/A',
      condition: vehicle.condition,
      generatedAt: new Date().toISOString(),
    }

    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrContent), {
      width: 512,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })

    const now = new Date().toISOString()
    const qrData: QRData = { qrDataUrl, generatedAt: now, content: qrContent }

    await db.vehicle.update({
      where: { id },
      data: { currentQRCode: JSON.stringify(qrData) },
    })

    return NextResponse.json({
      data: {
        currentQR: qrDataUrl,
        qrGeneratedAt: now,
        vehicleNumber: vehicle.vehicleNumber,
      },
    })
  } catch (error) {
    console.error('POST /api/vehicles/[id]/qr error:', error)
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 })
  }
}

// PUT /api/vehicles/[id]/qr — regenerate QR code
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return POST(req, params)
}
