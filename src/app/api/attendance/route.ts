import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const VALID_STATUSES = ['Present', 'Absent', 'HalfDay', 'Leave', 'Holiday']

// GET /api/attendance?date=2025-01-15&contractorId=xxx
// Returns attendance records for a specific date, optionally filtered by contractor
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')
    const contractorId = searchParams.get('contractorId')

    if (!dateStr) {
      return NextResponse.json({ error: 'date query parameter is required' }, { status: 400 })
    }

    const startDate = new Date(dateStr)
    startDate.setUTCHours(0, 0, 0, 0)
    const endDate = new Date(dateStr)
    endDate.setUTCHours(23, 59, 59, 999)

    const where: Record<string, unknown> = {
      date: { gte: startDate, lte: endDate },
    }

    if (contractorId) {
      where.worker = { contractorId, isActive: true }
    }

    const records = await db.attendance.findMany({
      where,
      include: {
        worker: {
          select: {
            id: true,
            fullName: true,
            employeeNumber: true,
            contractorId: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ data: records })
  } catch (error) {
    console.error('GET /api/attendance error:', error)
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 })
  }
}

// POST /api/attendance
// Single: { workerId, date, status }
// Batch:  { date, records: [{ workerId, status }] }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Batch mode: { date, records: [{ workerId, status }] }
    if (body.records && Array.isArray(body.records)) {
      if (!body.date) {
        return NextResponse.json({ error: 'date is required' }, { status: 400 })
      }

      const parsedDate = new Date(body.date)
      parsedDate.setUTCHours(0, 0, 0, 0)

      let saved = 0
      for (const record of body.records) {
        if (!record.workerId || !record.status) continue
        if (!VALID_STATUSES.includes(record.status)) continue

        try {
          await db.attendance.upsert({
            where: {
              workerId_date: { workerId: record.workerId, date: parsedDate },
            },
            update: { status: record.status },
            create: {
              workerId: record.workerId,
              date: parsedDate,
              status: record.status,
            },
          })
          saved++
        } catch (err) {
          console.error(`Failed to upsert attendance for worker ${record.workerId}:`, err)
        }
      }

      return NextResponse.json({ success: true, saved, total: body.records.length })
    }

    // Single mode: { workerId, date, status }
    const { workerId, date, status } = body
    if (!workerId || !date || !status) {
      return NextResponse.json(
        { error: 'workerId, date, and status are required' },
        { status: 400 }
      )
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify worker exists
    const worker = await db.worker.findUnique({ where: { id: workerId } })
    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    const parsedDate = new Date(date)
    parsedDate.setUTCHours(0, 0, 0, 0)

    const record = await db.attendance.upsert({
      where: {
        workerId_date: { workerId, date: parsedDate },
      },
      update: { status },
      create: {
        workerId,
        date: parsedDate,
        status,
      },
    })

    return NextResponse.json({ data: record })
  } catch (error) {
    console.error('POST /api/attendance error:', error)
    return NextResponse.json({ error: 'Failed to mark attendance' }, { status: 500 })
  }
}

// PUT /api/attendance
// Bulk workers:      { date, workerIds: string[], status }
// Bulk contractor:   { date, contractorId, status }
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, status } = body

    if (!date || !status) {
      return NextResponse.json(
        { error: 'date and status are required' },
        { status: 400 }
      )
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const parsedDate = new Date(date)
    parsedDate.setUTCHours(0, 0, 0, 0)

    let targetWorkerIds: string[]

    // Bulk by contractor
    if (body.contractorId) {
      const workers = await db.worker.findMany({
        where: { contractorId: body.contractorId, isActive: true },
        select: { id: true },
      })
      targetWorkerIds = workers.map((w) => w.id)
    }
    // Bulk by worker IDs
    else if (body.workerIds && Array.isArray(body.workerIds) && body.workerIds.length > 0) {
      targetWorkerIds = body.workerIds
    } else {
      return NextResponse.json(
        { error: 'workerIds or contractorId is required' },
        { status: 400 }
      )
    }

    if (targetWorkerIds.length === 0) {
      return NextResponse.json({ success: true, marked: 0 })
    }

    let marked = 0
    for (const workerId of targetWorkerIds) {
      try {
        await db.attendance.upsert({
          where: {
            workerId_date: { workerId, date: parsedDate },
          },
          update: { status },
          create: {
            workerId,
            date: parsedDate,
            status,
          },
        })
        marked++
      } catch (err) {
        console.error(`Failed to upsert attendance for worker ${workerId}:`, err)
      }
    }

    return NextResponse.json({ success: true, marked, total: targetWorkerIds.length })
  } catch (error) {
    console.error('PUT /api/attendance error:', error)
    return NextResponse.json({ error: 'Failed to mark bulk attendance' }, { status: 500 })
  }
}
