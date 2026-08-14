import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/incidents/[id]/followups — add follow-up
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const incident = await db.incident.findUnique({ where: { id } })
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
    }

    if (!body.action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    const followUp = await db.incidentFollowUp.create({
      data: {
        incidentId: id,
        action: body.action,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        responsiblePerson: body.responsiblePerson || null,
        completed: body.completed ?? false,
        completedAt: body.completed ? new Date() : null,
        remarks: body.remarks || null,
      },
    })

    return NextResponse.json({ data: followUp }, { status: 201 })
  } catch (error) {
    console.error('POST /api/incidents/[id]/followups error:', error)
    return NextResponse.json({ error: 'Failed to create follow-up' }, { status: 500 })
  }
}

// PUT /api/incidents/[id]/followups — mark completed
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    if (!body.followUpId) {
      return NextResponse.json({ error: 'followUpId is required' }, { status: 400 })
    }

    const followUp = await db.incidentFollowUp.findFirst({
      where: { id: body.followUpId, incidentId: id },
    })
    if (!followUp) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 })
    }

    const updated = await db.incidentFollowUp.update({
      where: { id: body.followUpId },
      data: {
        completed: body.completed ?? true,
        completedAt: body.completed ? new Date() : null,
        remarks: body.remarks ?? followUp.remarks,
        action: body.action ?? followUp.action,
        dueDate: body.dueDate ? new Date(body.dueDate) : followUp.dueDate,
        responsiblePerson: body.responsiblePerson ?? followUp.responsiblePerson,
      },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('PUT /api/incidents/[id]/followups error:', error)
    return NextResponse.json({ error: 'Failed to update follow-up' }, { status: 500 })
  }
}