import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/vehicles
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const vehicleType = searchParams.get('vehicleType') || undefined
    const condition = searchParams.get('condition') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { vehicleNumber: { contains: search } },
      ]
    }
    if (vehicleType) where.vehicleType = vehicleType
    if (condition) where.condition = condition

    const [vehicles, total] = await Promise.all([
      db.vehicle.findMany({
        where,
        skip,
        take: limit,
        include: {
          contractor: { select: { id: true, name: true, code: true } },
          site: { select: { id: true, name: true, code: true } },
          driver: { select: { id: true, fullName: true, employeeNumber: true } },
          _count: { select: { documents: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.vehicle.count({ where }),
    ])

    return NextResponse.json({ data: vehicles, total, page, limit })
  } catch (error) {
    console.error('GET /api/vehicles error:', error)
    return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 })
  }
}

// POST /api/vehicles
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.vehicleNumber || !body.vehicleType) {
      return NextResponse.json({ error: 'vehicleNumber and vehicleType are required' }, { status: 400 })
    }

    const vehicle = await db.vehicle.create({
      data: {
        vehicleNumber: body.vehicleNumber,
        vehicleType: body.vehicleType,
        owner: body.owner || 'Contractor',
        condition: body.condition || 'Fit',
        lastInspectionDate: body.lastInspectionDate ? new Date(body.lastInspectionDate) : null,
        nextInspectionDue: body.nextInspectionDue ? new Date(body.nextInspectionDue) : null,
        contractorId: body.contractorId || null,
        siteId: body.siteId || null,
        driverId: body.driverId || null,
      },
      include: {
        contractor: true,
        site: true,
        driver: { select: { id: true, fullName: true, employeeNumber: true } },
      },
    })

    return NextResponse.json({ data: vehicle }, { status: 201 })
  } catch (error) {
    console.error('POST /api/vehicles error:', error)
    return NextResponse.json({ error: 'Failed to create vehicle' }, { status: 500 })
  }
}