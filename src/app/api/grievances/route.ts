import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/grievances
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || undefined
    const category = searchParams.get('category') || undefined
    const severity = searchParams.get('severity') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { grievanceNumber: { contains: search } },
        { description: { contains: search } },
        { raisedByName: { contains: search } },
      ]
    }
    if (status) where.status = status
    if (category) where.category = category
    if (severity) where.severity = severity

    const [grievances, total] = await Promise.all([
      db.grievance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.grievance.count({ where }),
    ])

    return NextResponse.json({ data: grievances, total, page, limit })
  } catch (error) {
    console.error('GET /api/grievances error:', error)
    return NextResponse.json({ error: 'Failed to fetch grievances' }, { status: 500 })
  }
}

// POST /api/grievances
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.category || !body.description) {
      return NextResponse.json({ error: 'category and description are required' }, { status: 400 })
    }

    // Auto-generate grievance number: GRV-YYYY-XXX
    const year = new Date().getFullYear()
    const prefix = `GRV-${year}-`
    const count = await db.grievance.count({
      where: { grievanceNumber: { startsWith: prefix } },
    })
    const grievanceNumber = `${prefix}${String(count + 1).padStart(3, '0')}`

    const grievance = await db.grievance.create({
      data: {
        grievanceNumber,
        dateRaised: new Date(),
        raisedBy: body.raisedBy || null,
        raisedByName: body.raisedByName || null,
        category: body.category,
        isPOSH: body.isPOSH ?? false,
        description: body.description,
        severity: body.severity || 'Medium',
        assignedTo: body.assignedTo || null,
        status: body.status || 'Open',
        slaDays: body.slaDays ?? 7,
        photoPaths: body.photoPaths || null,
        photos: body.photos || null,
      },
    })

    return NextResponse.json({ data: grievance }, { status: 201 })
  } catch (error) {
    console.error('POST /api/grievances error:', error)
    return NextResponse.json({ error: 'Failed to create grievance' }, { status: 500 })
  }
}