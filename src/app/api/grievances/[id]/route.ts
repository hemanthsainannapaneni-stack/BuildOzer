import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/grievances/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const grievance = await db.grievance.findUnique({ where: { id } })

    if (!grievance) {
      return NextResponse.json({ error: 'Grievance not found' }, { status: 404 })
    }

    return NextResponse.json({ data: grievance })
  } catch (error) {
    console.error('GET /api/grievances/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch grievance' }, { status: 500 })
  }
}

// PUT /api/grievances/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const existing = await db.grievance.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Grievance not found' }, { status: 404 })
    }

    const allowedFields = [
      'category', 'isPOSH', 'description', 'severity', 'assignedTo',
      'status', 'resolutionDetails', 'closedBy', 'slaDays', 'raisedByName', 'photos',
    ]

    const updateData: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key]
      }
    }

    // Auto-set resolution date when status changes to Resolved
    if (body.status === 'Resolved' && existing.status !== 'Resolved') {
      updateData.resolutionDate = new Date()
    }

    const grievance = await db.grievance.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: grievance })
  } catch (error) {
    console.error('PUT /api/grievances/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update grievance' }, { status: 500 })
  }
}