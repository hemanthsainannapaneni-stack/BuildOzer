import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/incidents
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const incidentType = searchParams.get('incidentType') || undefined
    const severity = searchParams.get('severity') || undefined
    const status = searchParams.get('status') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { incidentNumber: { contains: search } },
        { description: { contains: search } },
        { locationOnSite: { contains: search } },
      ]
    }
    if (incidentType) where.incidentType = incidentType
    if (severity) where.severity = severity
    if (status) where.status = status

    const [incidents, total] = await Promise.all([
      db.incident.findMany({
        where,
        skip,
        take: limit,
        include: {
          contractor: { select: { id: true, name: true, code: true } },
          site: { select: { id: true, name: true, code: true } },
          workers: { include: { worker: { select: { id: true, fullName: true, employeeNumber: true } } } },
          _count: { select: { followUps: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.incident.count({ where }),
    ])

    return NextResponse.json({ data: incidents, total, page, limit })
  } catch (error) {
    console.error('GET /api/incidents error:', error)
    return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 })
  }
}

// POST /api/incidents
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.incidentType || !body.date || !body.description) {
      return NextResponse.json({ error: 'incidentType, date, and description are required' }, { status: 400 })
    }

    // Auto-generate incident number: INC-YYYY-XXX
    const year = new Date().getFullYear()
    const prefix = `INC-${year}-`
    const count = await db.incident.count({
      where: { incidentNumber: { startsWith: prefix } },
    })
    const incidentNumber = `${prefix}${String(count + 1).padStart(3, '0')}`

    const incident = await db.incident.create({
      data: {
        incidentNumber,
        incidentType: body.incidentType,
        date: new Date(body.date),
        time: body.time || null,
        locationOnSite: body.locationOnSite || null,
        description: body.description,
        rootCause: body.rootCause || null,
        immediateAction: body.immediateAction || null,
        firstResponder: body.firstResponder || null,
        hospitalReferred: body.hospitalReferred || null,
        severity: body.severity || 'Medium',
        status: body.status || 'Open',
        isDeath: body.isDeath ?? false,
        policeFIRReference: body.policeFIRReference || null,
        employerNotifiedAt: body.employerNotifiedAt ? new Date(body.employerNotifiedAt) : null,
        compensationStatus: body.compensationStatus || null,
        familyNotified: body.familyNotified ?? false,
        closureStatus: body.closureStatus || null,
        contractorId: body.contractorId || null,
        siteId: body.siteId || null,
        photoPaths: body.photoPaths || null,
        workers: {
          create: (body.workers || []).map((w: { workerId?: string; workerName?: string; injuryDesc?: string }) => ({
            workerId: w.workerId || null,
            workerName: w.workerName || null,
            injuryDesc: w.injuryDesc || null,
          })),
        },
      },
      include: {
        contractor: true,
        site: true,
        workers: { include: { worker: { select: { id: true, fullName: true, employeeNumber: true } } } },
      },
    })

    return NextResponse.json({ data: incident }, { status: 201 })
  } catch (error) {
    console.error('POST /api/incidents error:', error)
    return NextResponse.json({ error: 'Failed to create incident' }, { status: 500 })
  }
}