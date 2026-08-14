import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/legal/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const record = await db.legalCompliance.findUnique({
      where: { id },
      include: { contractor: true },
    })

    if (!record) {
      return NextResponse.json({ error: 'Legal compliance not found' }, { status: 404 })
    }

    return NextResponse.json({ data: record })
  } catch (error) {
    console.error('GET /api/legal/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch legal compliance' }, { status: 500 })
  }
}

// PUT /api/legal/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const existing = await db.legalCompliance.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Legal compliance not found' }, { status: 404 })
    }

    const allowedFields = [
      'complianceType', 'licenseNumber', 'issuingAuthority',
      'issueDate', 'expiryDate', 'renewalReminderDays', 'status', 'remarks',
    ]

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

    const record = await db.legalCompliance.update({
      where: { id },
      data: updateData,
      include: { contractor: true },
    })

    return NextResponse.json({ data: record })
  } catch (error) {
    console.error('PUT /api/legal/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update legal compliance' }, { status: 500 })
  }
}

// DELETE /api/legal/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await db.legalCompliance.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Legal compliance not found' }, { status: 404 })
    }

    await db.legalCompliance.delete({ where: { id } })
    return NextResponse.json({ data: { id } })
  } catch (error) {
    console.error('DELETE /api/legal/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete legal compliance' }, { status: 500 })
  }
}
