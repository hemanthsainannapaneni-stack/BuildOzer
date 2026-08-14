import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/legal
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const contractorId = searchParams.get('contractorId') || undefined
    const complianceType = searchParams.get('complianceType') || undefined
    const status = searchParams.get('status') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (contractorId) where.contractorId = contractorId
    if (complianceType) where.complianceType = complianceType
    if (status) where.status = status

    const [records, total] = await Promise.all([
      db.legalCompliance.findMany({
        where,
        skip,
        take: limit,
        include: {
          contractor: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.legalCompliance.count({ where }),
    ])

    return NextResponse.json({ data: records, total, page, limit })
  } catch (error) {
    console.error('GET /api/legal error:', error)
    return NextResponse.json({ error: 'Failed to fetch legal compliances' }, { status: 500 })
  }
}

// POST /api/legal
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.contractorId || !body.complianceType) {
      return NextResponse.json({ error: 'contractorId and complianceType are required' }, { status: 400 })
    }

    const record = await db.legalCompliance.create({
      data: {
        contractorId: body.contractorId,
        complianceType: body.complianceType,
        licenseNumber: body.licenseNumber || null,
        issuingAuthority: body.issuingAuthority || null,
        issueDate: body.issueDate ? new Date(body.issueDate) : null,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        renewalReminderDays: body.renewalReminderDays ?? 30,
        status: body.status || 'Valid',
        remarks: body.remarks || null,
      },
      include: { contractor: true },
    })

    return NextResponse.json({ data: record }, { status: 201 })
  } catch (error) {
    console.error('POST /api/legal error:', error)
    return NextResponse.json({ error: 'Failed to create legal compliance' }, { status: 500 })
  }
}