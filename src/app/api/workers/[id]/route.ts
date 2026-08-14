import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/workers/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const worker = await db.worker.findUnique({
      where: { id },
      include: {
        designation: true,
        contractor: true,
        site: true,
        labourCamp: { select: { id: true, name: true } },
        fitness: true,
        medicalRecords: { orderBy: { examinationDate: 'desc' } },
        trainingRecords: { orderBy: { dateConducted: 'desc' } },
        insurances: { orderBy: { createdAt: 'desc' } },
        emergencyContacts: true,
        nominees: true,
      },
    })

    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    return NextResponse.json({ data: worker })
  } catch (error) {
    console.error('GET /api/workers/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch worker' }, { status: 500 })
  }
}

// PUT /api/workers/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const existing = await db.worker.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    // If dateOfBirth is being updated, recalculate age
    if (body.dateOfBirth) {
      const dob = new Date(body.dateOfBirth)
      const today = new Date()
      let age = today.getFullYear() - dob.getFullYear()
      const m = today.getMonth() - dob.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
      if (age < 18 || age > 55) {
        return NextResponse.json({ error: 'Age must be between 18 and 55' }, { status: 400 })
      }
      body.age = age
      body.dateOfBirth = dob
    }

    // If aadhaar is being updated, validate
    if (body.aadhaarNumber && body.aadhaarNumber !== existing.aadhaarNumber) {
      if (!/^\d{12}$/.test(body.aadhaarNumber)) {
        return NextResponse.json({ error: 'Aadhaar must be exactly 12 digits' }, { status: 400 })
      }
    }

    const allowedFields = [
      'fullName', 'dateOfBirth', 'age', 'gender', 'aadhaarNumber', 'aadhaarScanPath',
      'permanentAddress', 'currentAddress', 'bloodGroup', 'qualification',
      'qualificationNote', 'designationId', 'contractorId', 'siteId', 'zone',
      'nativeState',
      'reportingSupervisor', 'profilePhotoPath', 'isActive', 'uanNumber', 'labourCampId',
      'policeRecords',
    ]

    const updateData: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key]
      }
    }

    const worker = await db.worker.update({
      where: { id },
      data: updateData,
      include: {
        designation: true,
        contractor: true,
        site: true,
        labourCamp: { select: { id: true, name: true } },
        emergencyContacts: true,
        nominees: true,
      },
    })

    return NextResponse.json({ data: worker })
  } catch (error) {
    console.error('PUT /api/workers/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update worker' }, { status: 500 })
  }
}

// PATCH /api/workers/[id] — partial update (e.g. toggle isActive)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const existing = await db.worker.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    const allowedFields = [
      'fullName', 'dateOfBirth', 'age', 'gender', 'aadhaarNumber', 'aadhaarScanPath',
      'permanentAddress', 'currentAddress', 'bloodGroup', 'qualification',
      'qualificationNote', 'designationId', 'contractorId', 'siteId', 'zone',
      'nativeState', 'reportingSupervisor', 'profilePhotoPath', 'isActive',
      'uanNumber', 'labourCampId', 'policeRecords',
    ]

    const updateData: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const worker = await db.worker.update({
      where: { id },
      data: updateData,
      include: {
        designation: { select: { id: true, name: true, category: true } },
        contractor: { select: { id: true, name: true, code: true } },
        site: { select: { id: true, name: true, code: true } },
      },
    })

    return NextResponse.json({ data: worker })
  } catch (error) {
    console.error('PATCH /api/workers/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update worker' }, { status: 500 })
  }
}

// DELETE /api/workers/[id] — soft delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await db.worker.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    await db.worker.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ data: { id, isActive: false } })
  } catch (error) {
    console.error('DELETE /api/workers/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete worker' }, { status: 500 })
  }
}
