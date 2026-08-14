import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/workers/[id]/fitness
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const fitness = await db.workerFitness.findUnique({
      where: { workerId: id },
    })
    if (!fitness) {
      return NextResponse.json({ data: null })
    }
    return NextResponse.json({ data: fitness })
  } catch (error) {
    console.error('GET /api/workers/[id]/fitness error:', error)
    return NextResponse.json({ error: 'Failed to fetch fitness record' }, { status: 500 })
  }
}

// PUT /api/workers/[id]/fitness — upsert
export async function PUT(
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

    const data = {
      fitnessStatus: body.fitnessStatus || 'Pending',
      fitnessCertificatePath: body.fitnessCertificatePath ?? undefined,
      fitnessValidityDate: body.fitnessValidityDate ? new Date(body.fitnessValidityDate) : undefined,
      totalExperienceYears: body.totalExperienceYears ?? 0,
      relevantExperienceYears: body.relevantExperienceYears ?? 0,
      relevantExperienceDesc: body.relevantExperienceDesc ?? undefined,
      priorEmployer: body.priorEmployer ?? undefined,
      skillLevel: body.skillLevel || 'Unskilled',
    }

    const fitness = await db.workerFitness.upsert({
      where: { workerId: id },
      update: data,
      create: { workerId: id, ...data },
    })

    return NextResponse.json({ data: fitness })
  } catch (error) {
    console.error('PUT /api/workers/[id]/fitness error:', error)
    return NextResponse.json({ error: 'Failed to upsert fitness record' }, { status: 500 })
  }
}
