import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/workers/bulk-attendance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, status, workerIds } = body as {
      date?: string
      status?: string
      workerIds?: string[]
    }

    if (!date || !status) {
      return NextResponse.json(
        { error: 'date and status are required' },
        { status: 400 }
      )
    }

    const validStatuses = ['Present', 'Absent', 'HalfDay', 'Leave']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Parse and normalize date to midnight UTC
    const parsedDate = new Date(date)
    parsedDate.setUTCHours(0, 0, 0, 0)

    // Determine which workers to mark
    let targetWorkerIds: string[]
    if (workerIds && workerIds.length > 0) {
      targetWorkerIds = workerIds
    } else {
      // Fetch all active workers
      const activeWorkers = await db.worker.findMany({
        where: { isActive: true },
        select: { id: true },
      })
      targetWorkerIds = activeWorkers.map((w) => w.id)
    }

    if (targetWorkerIds.length === 0) {
      return NextResponse.json({ success: true, marked: 0 })
    }

    // Upsert attendance for each worker
    let marked = 0
    for (const workerId of targetWorkerIds) {
      try {
        await db.attendance.upsert({
          where: {
            workerId_date: { workerId, date: parsedDate },
          },
          update: {
            status,
          },
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

    return NextResponse.json({ success: true, marked })
  } catch (error) {
    console.error('POST /api/workers/bulk-attendance error:', error)
    return NextResponse.json(
      { error: 'Failed to mark bulk attendance' },
      { status: 500 }
    )
  }
}
