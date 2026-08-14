import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/workers/[id]/training
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const records = await db.trainingRecord.findMany({
      where: { workerId: id },
      orderBy: { dateConducted: 'desc' },
    })
    return NextResponse.json({ data: records })
  } catch (error) {
    console.error('GET /api/workers/[id]/training error:', error)
    return NextResponse.json({ error: 'Failed to fetch training records' }, { status: 500 })
  }
}

// POST /api/workers/[id]/training
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

    if (!body.trainingType || !body.trainingTitle || !body.dateConducted) {
      return NextResponse.json({ error: 'trainingType, trainingTitle, and dateConducted are required' }, { status: 400 })
    }

    const record = await db.trainingRecord.create({
      data: {
        workerId: id,
        trainingType: body.trainingType,
        trainingTitle: body.trainingTitle,
        dateConducted: new Date(body.dateConducted),
        durationHours: body.durationHours ?? 0,
        trainerName: body.trainerName || null,
        trainerCredentials: body.trainerCredentials || null,
        trainingAgency: body.trainingAgency || null,
        certificateNumber: body.certificateNumber || null,
        certificatePath: body.certificatePath || null,
        validityDate: body.validityDate ? new Date(body.validityDate) : null,
        status: body.status || 'Valid',
        isCompleted: body.isCompleted ?? false,
        remarks: body.remarks || null,
      },
    })

    return NextResponse.json({ data: record }, { status: 201 })
  } catch (error) {
    console.error('POST /api/workers/[id]/training error:', error)
    return NextResponse.json({ error: 'Failed to create training record' }, { status: 500 })
  }
}
