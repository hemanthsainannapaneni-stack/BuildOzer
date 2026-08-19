import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
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

    // The profile photo is mandatory — allow replacing it, never clearing it
    if ('profilePhotoPath' in body && !body.profilePhotoPath) {
      return NextResponse.json({ error: 'Profile photo is required', field: 'profilePhotoPath' }, { status: 400 })
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

    // Emergency contacts and nominees are edited as whole lists in the form, so
    // replace them wholesale when the payload carries them.
    const emergencyContacts = Array.isArray(body.emergencyContacts) ? body.emergencyContacts : null
    const nominees = Array.isArray(body.nominees) ? body.nominees : null

    // Batched (array) transaction rather than an interactive one — the database is
    // remote, and sequential awaits inside $transaction blow the 5s interactive timeout.
    const ops: Prisma.PrismaPromise<unknown>[] = []

    if (emergencyContacts) {
      ops.push(db.emergencyContact.deleteMany({ where: { workerId: id } }))
      if (emergencyContacts.length > 0) {
        ops.push(
          db.emergencyContact.createMany({
            data: emergencyContacts.map((ec: { name: string; relationship: string; phone: string; isPrimary?: boolean }) => ({
              workerId: id,
              name: ec.name,
              relationship: ec.relationship,
              phone: ec.phone,
              isPrimary: ec.isPrimary || false,
            })),
          }),
        )
      }
    }

    if (nominees) {
      ops.push(db.nominee.deleteMany({ where: { workerId: id } }))
      if (nominees.length > 0) {
        ops.push(
          db.nominee.createMany({
            data: nominees.map((n: { name: string; relationship: string; idNumber?: string; contactNumber?: string }) => ({
              workerId: id,
              name: n.name,
              relationship: n.relationship,
              idNumber: n.idNumber || null,
              contactNumber: n.contactNumber || null,
            })),
          }),
        )
      }
    }

    ops.push(
      db.worker.update({
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
      }),
    )

    const results = await db.$transaction(ops)
    const worker = results[results.length - 1]

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
