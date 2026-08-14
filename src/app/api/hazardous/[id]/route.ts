import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/hazardous/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const material = await db.hazardousMaterial.findUnique({
      where: { id },
      include: {
        site: true,
        transactions: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!material) {
      return NextResponse.json({ error: 'Hazardous material not found' }, { status: 404 })
    }

    return NextResponse.json({ data: material })
  } catch (error) {
    console.error('GET /api/hazardous/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch hazardous material' }, { status: 500 })
  }
}

// PUT /api/hazardous/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const existing = await db.hazardousMaterial.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Hazardous material not found' }, { status: 404 })
    }

    const allowedFields = [
      'materialName', 'category', 'hazardClassification', 'msdsUploadPath',
      'storageLicenseNumber', 'storageLicenseExpiry', 'quantityMaxPermissible',
      'unit', 'storageLocation', 'storageConditionCompliant',
      'handlingResponsiblePerson', 'emergencyProcedureRef', 'siteId',
      'photoPath', 'photos',
    ]

    const updateData: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        if (key === 'storageLicenseExpiry' && body[key]) {
          updateData[key] = new Date(body[key])
        } else {
          updateData[key] = body[key]
        }
      }
    }

    // If max permissible is being updated, check current quantity doesn't exceed it
    if (body.quantityMaxPermissible !== undefined && existing.quantityCurrent > body.quantityMaxPermissible) {
      return NextResponse.json(
        { error: 'Current quantity exceeds the new maximum permissible limit' },
        { status: 400 },
      )
    }

    const material = await db.hazardousMaterial.update({
      where: { id },
      data: updateData,
      include: { site: true },
    })

    return NextResponse.json({ data: material })
  } catch (error) {
    console.error('PUT /api/hazardous/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update hazardous material' }, { status: 500 })
  }
}

// DELETE /api/hazardous/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await db.hazardousMaterial.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Hazardous material not found' }, { status: 404 })
    }

    await db.materialTransaction.deleteMany({ where: { materialId: id } })
    await db.hazardousMaterial.delete({ where: { id } })

    return NextResponse.json({ data: { id } })
  } catch (error) {
    console.error('DELETE /api/hazardous/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete hazardous material' }, { status: 500 })
  }
}
