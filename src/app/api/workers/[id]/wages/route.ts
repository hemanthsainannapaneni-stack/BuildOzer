import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/workers/[id]/wages?month=2025-06
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month')

    const worker = await db.worker.findUnique({ where: { id } })
    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    const where: Record<string, unknown> = { workerId: id }
    if (month) {
      where.month = month
    }

    const records = await db.wageRecord.findMany({
      where,
      orderBy: { month: 'desc' },
    })

    return NextResponse.json({ data: records })
  } catch (error) {
    console.error('GET /api/workers/[id]/wages error:', error)
    return NextResponse.json({ error: 'Failed to fetch wage records' }, { status: 500 })
  }
}

// POST/PUT /api/workers/[id]/wages — upsert by workerId+month
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

    if (!body.month) {
      return NextResponse.json({ error: 'month is required (e.g. 2025-06)' }, { status: 400 })
    }

    const data = {
      dailyRate: body.dailyRate ?? null,
      monthlyRate: body.monthlyRate ?? null,
      wageCategory: body.wageCategory || null,
      workingDays: body.workingDays ?? 0,
      totalWages: body.totalWages ?? 0,
      overtimeAmount: body.overtimeAmount ?? 0,
      deductionPF: body.deductionPF ?? 0,
      deductionESI: body.deductionESI ?? 0,
      deductionOther: body.deductionOther ?? 0,
      netPay: body.netPay ?? 0,
      bankAccountNumber: body.bankAccountNumber || null,
      uanNumber: body.uanNumber || null,
      pfContributionPct: body.pfContributionPct ?? 12,
      employerPF: body.employerPF ?? 0,
      employeePF: body.employeePF ?? 0,
      esiNumber: body.esiNumber || null,
      remarks: body.remarks || null,
    }

    const record = await db.wageRecord.upsert({
      where: {
        workerId_month: { workerId: id, month: body.month },
      },
      update: data,
      create: {
        workerId: id,
        month: body.month,
        ...data,
      },
    })

    return NextResponse.json({ data: record })
  } catch (error) {
    console.error('POST /api/workers/[id]/wages error:', error)
    return NextResponse.json({ error: 'Failed to upsert wage record' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Same logic as POST — upsert
  return POST(req, params)
}