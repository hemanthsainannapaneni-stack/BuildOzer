import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/vehicles/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const vehicle = await db.vehicle.findUnique({
      where: { id },
      include: {
        contractor: true,
        site: true,
        driver: { select: { id: true, fullName: true, employeeNumber: true } },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    // Parse currentQRCode JSON to extract QR data URL and timestamp for the UI
    let currentQR: string | null = null
    let qrGeneratedAt: string | null = null
    if (vehicle.currentQRCode) {
      try {
        const parsed = JSON.parse(vehicle.currentQRCode)
        currentQR = parsed.qrDataUrl || null
        qrGeneratedAt = parsed.generatedAt || null
      } catch {
        currentQR = vehicle.currentQRCode
      }
    }

    return NextResponse.json({ data: { ...vehicle, currentQR, qrGeneratedAt } })
  } catch (error) {
    console.error('GET /api/vehicles/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch vehicle' }, { status: 500 })
  }
}

// PUT /api/vehicles/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const existing = await db.vehicle.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    const allowedFields = [
      'vehicleNumber', 'vehicleType', 'owner', 'condition',
      'lastInspectionDate', 'nextInspectionDue', 'contractorId',
      'siteId', 'driverId', 'isActive',
      'photoPath', 'photos', 'currentQRCode', 'qrCodeHistory',
    ]

    const updateData: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        if (['lastInspectionDate', 'nextInspectionDue'].includes(key) && body[key]) {
          updateData[key] = new Date(body[key])
        } else {
          updateData[key] = body[key]
        }
      }
    }

    const vehicle = await db.vehicle.update({
      where: { id },
      data: updateData,
      include: {
        contractor: true,
        site: true,
        driver: { select: { id: true, fullName: true, employeeNumber: true } },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    })

    // Parse QR code for response
    let currentQR: string | null = null
    let qrGeneratedAt: string | null = null
    if (vehicle.currentQRCode) {
      try {
        const parsed = JSON.parse(vehicle.currentQRCode)
        currentQR = parsed.qrDataUrl || null
        qrGeneratedAt = parsed.generatedAt || null
      } catch {
        currentQR = vehicle.currentQRCode
      }
    }

    return NextResponse.json({ data: { ...vehicle, currentQR, qrGeneratedAt } })
  } catch (error) {
    console.error('PUT /api/vehicles/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update vehicle' }, { status: 500 })
  }
}

// DELETE /api/vehicles/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await db.vehicle.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    await db.vehicleDocument.deleteMany({ where: { vehicleId: id } })
    await db.vehicle.delete({ where: { id } })

    return NextResponse.json({ data: { id } })
  } catch (error) {
    console.error('DELETE /api/vehicles/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete vehicle' }, { status: 500 })
  }
}
