import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/workers/[id]/medical
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const records = await db.medicalRecord.findMany({
      where: { workerId: id },
      orderBy: { examinationDate: 'desc' },
    })
    return NextResponse.json({ data: records })
  } catch (error) {
    console.error('GET /api/workers/[id]/medical error:', error)
    return NextResponse.json({ error: 'Failed to fetch medical records' }, { status: 500 })
  }
}

// POST /api/workers/[id]/medical
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

    if (!body.examinationDate) {
      return NextResponse.json({ error: 'examinationDate is required' }, { status: 400 })
    }

    const record = await db.medicalRecord.create({
      data: {
        workerId: id,
        examinationDate: new Date(body.examinationDate),
        examinationType: body.examinationType || 'PreEmployment',
        examiningDoctor: body.examiningDoctor || null,
        examiningFacility: body.examiningFacility || null,
        result: body.result || 'Pending',
        previousHealthIssues: body.previousHealthIssues || null,
        chronicDiseases: body.chronicDiseases || null,
        chronicDiseaseNotes: body.chronicDiseaseNotes || null,
        currentMedications: body.currentMedications || null,
        pastSurgeries: body.pastSurgeries || null,
        nextCheckupDate: body.nextCheckupDate ? new Date(body.nextCheckupDate) : null,
        checkupFrequencyMonths: body.checkupFrequencyMonths ?? 12,
        certificatePath: body.certificatePath || null,
        photos: body.photos || null,
        remarks: body.remarks || null,
      },
    })

    return NextResponse.json({ data: record }, { status: 201 })
  } catch (error) {
    console.error('POST /api/workers/[id]/medical error:', error)
    return NextResponse.json({ error: 'Failed to create medical record' }, { status: 500 })
  }
}
