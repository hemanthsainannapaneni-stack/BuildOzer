import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/vehicles/[id]/documents
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const documents = await db.vehicleDocument.findMany({
      where: { vehicleId: id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ data: documents })
  } catch (error) {
    console.error('GET /api/vehicles/[id]/documents error:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

// POST /api/vehicles/[id]/documents
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const vehicle = await db.vehicle.findUnique({ where: { id } })
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    if (!body.docType) {
      return NextResponse.json({ error: 'docType is required' }, { status: 400 })
    }

    const doc = await db.vehicleDocument.create({
      data: {
        vehicleId: id,
        docType: body.docType,
        docNumber: body.docNumber || null,
        issueDate: body.issueDate ? new Date(body.issueDate) : null,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        uploadPath: body.uploadPath || null,
        status: body.status || 'Valid',
      },
    })

    return NextResponse.json({ data: doc }, { status: 201 })
  } catch (error) {
    console.error('POST /api/vehicles/[id]/documents error:', error)
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
  }
}

// PUT /api/vehicles/[id]/documents
export async function PUT(
  req: NextRequest,
  _params: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json()

    if (!body.id) {
      return NextResponse.json({ error: 'Document id is required' }, { status: 400 })
    }

    const existing = await db.vehicleDocument.findUnique({ where: { id: body.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const allowedFields = ['docType', 'docNumber', 'issueDate', 'expiryDate', 'uploadPath', 'status']
    const updateData: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        if (['issueDate', 'expiryDate'].includes(key) && body[key]) {
          updateData[key] = new Date(body[key])
        } else {
          updateData[key] = body[key]
        }
      }
    }

    const doc = await db.vehicleDocument.update({
      where: { id: body.id },
      data: updateData,
    })

    return NextResponse.json({ data: doc })
  } catch (error) {
    console.error('PUT /api/vehicles/[id]/documents error:', error)
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
  }
}

// DELETE /api/vehicles/[id]/documents
export async function DELETE(
  _req: NextRequest,
  _params: { params: Promise<{ id: string }> }
) {
  try {
    // Use query param for document id
    const url = _req.url
    const { searchParams } = new URL(url)
    const docId = searchParams.get('docId')

    if (!docId) {
      return NextResponse.json({ error: 'docId query param is required' }, { status: 400 })
    }

    const existing = await db.vehicleDocument.findUnique({ where: { id: docId } })
    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    await db.vehicleDocument.delete({ where: { id: docId } })

    return NextResponse.json({ data: { id: docId } })
  } catch (error) {
    console.error('DELETE /api/vehicles/[id]/documents error:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}