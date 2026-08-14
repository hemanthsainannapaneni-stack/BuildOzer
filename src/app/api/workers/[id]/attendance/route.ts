import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/workers/[id]/attendance?month=2025-06
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') // e.g. "2025-06"

    const worker = await db.worker.findUnique({ where: { id } })
    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    const where: Record<string, unknown> = { workerId: id }
    if (month) {
      const startDate = new Date(`${month}-01T00:00:00.000Z`)
      const year = parseInt(month.split('-')[0], 10)
      const m = parseInt(month.split('-')[1], 10)
      const endDate = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999))
      where.date = { gte: startDate, lte: endDate }
    }

    const records = await db.attendance.findMany({
      where,
      orderBy: { date: 'asc' },
    })

    return NextResponse.json({ data: records })
  } catch (error) {
    console.error('GET /api/workers/[id]/attendance error:', error)
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 })
  }
}

// POST /api/workers/[id]/attendance — upsert by workerId+date
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

    if (!body.date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    const date = new Date(body.date)
    // Normalize to midnight UTC for consistent upsert
    date.setUTCHours(0, 0, 0, 0)

    const record = await db.attendance.upsert({
      where: {
        workerId_date: { workerId: id, date },
      },
      update: {
        status: body.status || 'Present',
        shiftTiming: body.shiftTiming ?? undefined,
        isBiometric: body.isBiometric ?? false,
        overtimeHours: body.overtimeHours ?? 0,
        remarks: body.remarks ?? undefined,
      },
      create: {
        workerId: id,
        date,
        status: body.status || 'Present',
        shiftTiming: body.shiftTiming || null,
        isBiometric: body.isBiometric ?? false,
        overtimeHours: body.overtimeHours ?? 0,
        remarks: body.remarks || null,
      },
    })

    return NextResponse.json({ data: record })
  } catch (error) {
    console.error('POST /api/workers/[id]/attendance error:', error)
    return NextResponse.json({ error: 'Failed to mark attendance' }, { status: 500 })
  }
}
