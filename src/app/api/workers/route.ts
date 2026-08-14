import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function calculateAge(dob: Date): number {
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

// GET /api/workers
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const contractorId = searchParams.get('contractorId') || undefined
    const designationId = searchParams.get('designationId') || undefined
    const siteId = searchParams.get('siteId') || undefined
    const labourCampId = searchParams.get('labourCampId') || undefined
    const gender = searchParams.get('gender') || undefined
    const status = searchParams.get('status') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { employeeNumber: { contains: search } },
        { aadhaarNumber: { contains: search } },
      ]
    }
    if (contractorId) where.contractorId = contractorId
    if (designationId) where.designationId = designationId
    if (siteId) where.siteId = siteId
    if (labourCampId) where.labourCampId = labourCampId
    if (gender) where.gender = gender
    if (status === 'active') where.isActive = true
    else if (status === 'inactive') where.isActive = false

    const [workers, total] = await Promise.all([
      db.worker.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          employeeNumber: true,
          fullName: true,
          gender: true,
          bloodGroup: true,
          uanNumber: true,
          isActive: true,
          profilePhotoPath: true,
          policeRecords: true,
          nativeState: true,
          createdAt: true,
          designation: { select: { id: true, name: true, category: true } },
          contractor: { select: { id: true, name: true, code: true } },
          site: { select: { id: true, name: true, code: true } },
          labourCamp: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.worker.count({ where }),
    ])

    return NextResponse.json({ data: workers, total, page, limit })
  } catch (error) {
    console.error('GET /api/workers error:', error)
    return NextResponse.json({ error: 'Failed to fetch workers' }, { status: 500 })
  }
}

// POST /api/workers
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      fullName, dateOfBirth, gender, aadhaarNumber, permanentAddress,
      currentAddress, bloodGroup, qualification, qualificationNote,
      designationId, contractorId, siteId, zone, reportingSupervisor,
      profilePhotoPath, aadhaarScanPath, emergencyContacts, nominees,
      uanNumber, labourCampId,
    } = body

    // Validate required fields
    if (!fullName || !dateOfBirth || !gender || !aadhaarNumber || !permanentAddress || !bloodGroup || !qualification || !designationId || !contractorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate age 18-55
    const dob = new Date(dateOfBirth)
    const age = calculateAge(dob)
    if (age < 18 || age > 55) {
      return NextResponse.json({ error: 'Age must be between 18 and 55', field: 'dateOfBirth' }, { status: 400 })
    }

    // Validate aadhaar 12-digit
    if (!/^\d{12}$/.test(aadhaarNumber)) {
      return NextResponse.json({ error: 'Aadhaar must be exactly 12 digits', field: 'aadhaarNumber' }, { status: 400 })
    }

    // Validate designation exists
    const designation = await db.designation.findUnique({ where: { id: designationId } })
    if (!designation) {
      return NextResponse.json({ error: 'Designation not found' }, { status: 400 })
    }

    // Validate contractor exists
    const contractor = await db.contractor.findUnique({ where: { id: contractorId } })
    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 400 })
    }

    // Auto-generate employee number
    const count = await db.worker.count()
    const employeeNumber = `${contractor.code}-WK-${String(count + 1).padStart(4, '0')}`

    const worker = await db.worker.create({
      data: {
        employeeNumber,
        fullName,
        dateOfBirth: dob,
        age,
        gender,
        aadhaarNumber,
        aadhaarScanPath: aadhaarScanPath || null,
        permanentAddress,
        currentAddress: currentAddress || null,
        bloodGroup,
        qualification,
        qualificationNote: qualificationNote || null,
        designationId,
        contractorId,
        siteId: siteId || null,
        zone: zone || null,
        reportingSupervisor: reportingSupervisor || null,
        profilePhotoPath: profilePhotoPath || null,
        uanNumber: uanNumber || null,
        labourCampId: labourCampId || null,
        emergencyContacts: {
          create: (emergencyContacts || []).map((ec: { name: string; relationship: string; phone: string; isPrimary?: boolean }) => ({
            name: ec.name,
            relationship: ec.relationship,
            phone: ec.phone,
            isPrimary: ec.isPrimary || false,
          })),
        },
        nominees: {
          create: (nominees || []).map((n: { name: string; relationship: string; idNumber?: string; contactNumber?: string }) => ({
            name: n.name,
            relationship: n.relationship,
            idNumber: n.idNumber || null,
            contactNumber: n.contactNumber || null,
          })),
        },
      },
      include: {
        designation: true,
        contractor: true,
        site: true,
        emergencyContacts: true,
        nominees: true,
      },
    })

    return NextResponse.json({ data: worker }, { status: 201 })
  } catch (error: unknown) {
    console.error('POST /api/workers error:', error)
    const msg = error instanceof Error && error.message.includes('Unique')
      ? 'Employee number or aadhaar already exists'
      : 'Failed to create worker'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
