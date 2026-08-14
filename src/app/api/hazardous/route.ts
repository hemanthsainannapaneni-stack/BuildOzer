import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/hazardous
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const siteId = searchParams.get('siteId') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { materialName: { contains: search } },
        { hazardClassification: { contains: search } },
      ]
    }
    if (siteId) where.siteId = siteId

    const [materials, total] = await Promise.all([
      db.hazardousMaterial.findMany({
        where,
        skip,
        take: limit,
        include: {
          site: { select: { id: true, name: true, code: true } },
          _count: { select: { transactions: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.hazardousMaterial.count({ where }),
    ])

    return NextResponse.json({ data: materials, total, page, limit })
  } catch (error) {
    console.error('GET /api/hazardous error:', error)
    return NextResponse.json({ error: 'Failed to fetch hazardous materials' }, { status: 500 })
  }
}

// POST /api/hazardous
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.materialName || body.quantityMaxPermissible === undefined) {
      return NextResponse.json({ error: 'materialName and quantityMaxPermissible are required' }, { status: 400 })
    }

    // Validate quantityCurrent <= maxPermissible
    if (body.quantityCurrent !== undefined && body.quantityCurrent > body.quantityMaxPermissible) {
      return NextResponse.json(
        { error: 'Current quantity cannot exceed maximum permissible quantity' },
        { status: 400 },
      )
    }

    const material = await db.hazardousMaterial.create({
      data: {
        materialName: body.materialName,
        category: body.category || 'General',
        hazardClassification: body.hazardClassification || null,
        msdsUploadPath: body.msdsUploadPath || null,
        storageLicenseNumber: body.storageLicenseNumber || null,
        storageLicenseExpiry: body.storageLicenseExpiry ? new Date(body.storageLicenseExpiry) : null,
        quantityCurrent: body.quantityCurrent ?? 0,
        quantityMaxPermissible: body.quantityMaxPermissible,
        unit: body.unit || 'KG',
        storageLocation: body.storageLocation || null,
        storageConditionCompliant: body.storageConditionCompliant ?? true,
        handlingResponsiblePerson: body.handlingResponsiblePerson || null,
        emergencyProcedureRef: body.emergencyProcedureRef || null,
        photoPath: body.photoPath || null,
        photos: body.photos || null,
        siteId: body.siteId || null,
      },
      include: {
        site: true,
      },
    })

    return NextResponse.json({ data: material }, { status: 201 })
  } catch (error) {
    console.error('POST /api/hazardous error:', error)
    return NextResponse.json({ error: 'Failed to create hazardous material' }, { status: 500 })
  }
}