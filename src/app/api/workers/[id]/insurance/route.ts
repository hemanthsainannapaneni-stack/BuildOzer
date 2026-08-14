import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/workers/[id]/insurance
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const records = await db.insurance.findMany({
      where: { workerId: id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ data: records })
  } catch (error) {
    console.error('GET /api/workers/[id]/insurance error:', error)
    return NextResponse.json({ error: 'Failed to fetch insurance records' }, { status: 500 })
  }
}

// POST /api/workers/[id]/insurance
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const worker = await db.worker.findUnique({ where: { id } })
    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    if (!body.policyType || !body.policyNumber) {
      return NextResponse.json({ error: 'policyType and policyNumber are required' }, { status: 400 })
    }

    const record = await db.insurance.create({
      data: {
        workerId: id,
        policyType: body.policyType,
        policyNumber: body.policyNumber,
        insurerName: body.insurerName || null,
        coverageAmount: body.coverageAmount ?? null,
        validityStartDate: body.validityStartDate ? new Date(body.validityStartDate) : null,
        validityEndDate: body.validityEndDate ? new Date(body.validityEndDate) : null,
        nomineeName: body.nomineeName || null,
        remarks: body.remarks || null,
      },
    })

    return NextResponse.json({ data: record }, { status: 201 })
  } catch (error) {
    console.error('POST /api/workers/[id]/insurance error:', error)
    return NextResponse.json({ error: 'Failed to create insurance record' }, { status: 500 })
  }
}