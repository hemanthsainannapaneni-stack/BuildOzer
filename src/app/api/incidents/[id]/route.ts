import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/incidents/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const incident = await db.incident.findUnique({
      where: { id },
      include: {
        contractor: true,
        site: true,
        workers: { include: { worker: { select: { id: true, fullName: true, employeeNumber: true } } } },
        followUps: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
    }

    return NextResponse.json({ data: incident })
  } catch (error) {
    console.error('GET /api/incidents/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch incident' }, { status: 500 })
  }
}

// PUT /api/incidents/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const existing = await db.incident.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
    }

    const allowedFields = [
      'incidentType', 'date', 'time', 'locationOnSite', 'description',
      'rootCause', 'immediateAction', 'firstResponder', 'hospitalReferred',
      'severity', 'status', 'isDeath', 'policeFIRReference',
      'employerNotifiedAt', 'compensationStatus', 'familyNotified',
      'closureStatus', 'contractorId', 'siteId', 'photos',
    ]

    const updateData: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        if (['date', 'employerNotifiedAt'].includes(key) && body[key]) {
          updateData[key] = new Date(body[key])
        } else {
          updateData[key] = body[key]
        }
      }
    }

    const incident = await db.incident.update({
      where: { id },
      data: updateData,
      include: {
        contractor: true,
        site: true,
        workers: { include: { worker: { select: { id: true, fullName: true, employeeNumber: true } } } },
        followUps: { orderBy: { createdAt: 'desc' } },
      },
    })

    return NextResponse.json({ data: incident })
  } catch (error) {
    console.error('PUT /api/incidents/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update incident' }, { status: 500 })
  }
}