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

    // Nothing is required any more — every column behind this form is
    // nullable. What survives are rules that only bite once a value has
    // actually been entered.
    const dob = dateOfBirth ? new Date(dateOfBirth) : null
    const age = dob ? calculateAge(dob) : null

    if (age !== null && (age < 18 || age > 55)) {
      return NextResponse.json({ error: 'Age must be between 18 and 55', field: 'dateOfBirth' }, { status: 400 })
    }

    if (aadhaarNumber && !/^\d{12}$/.test(aadhaarNumber)) {
      return NextResponse.json({ error: 'Aadhaar must be exactly 12 digits', field: 'aadhaarNumber' }, { status: 400 })
    }

    // A link that was supplied still has to point at something real; a link
    // left blank is simply left blank.
    if (designationId) {
      const designation = await db.designation.findUnique({ where: { id: designationId } })
      if (!designation) {
        return NextResponse.json({ error: 'Designation not found' }, { status: 400 })
      }
    }

    const contractor = contractorId
      ? await db.contractor.findUnique({ where: { id: contractorId } })
      : null
    if (contractorId && !contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 400 })
    }

    // Auto-generate employee number. Workers registered without a contractor
    // fall back to a neutral prefix so the number is still unique and sortable.
    const count = await db.worker.count()
    const employeeNumber = `${contractor?.code || 'GEN'}-WK-${String(count + 1).padStart(4, '0')}`

    const worker = await db.worker.create({
      data: {
        employeeNumber,
        fullName: fullName || '',
        dateOfBirth: dob,
        age,
        gender: gender || '',
        aadhaarNumber: aadhaarNumber || '',
        aadhaarScanPath: aadhaarScanPath || null,
        permanentAddress: permanentAddress || '',
        currentAddress: currentAddress || null,
        bloodGroup: bloodGroup || '',
        qualification: qualification || '',
        qualificationNote: qualificationNote || null,
        designationId: designationId || null,
        contractorId: contractorId || null,
        siteId: siteId || null,
        zone: zone || null,
        reportingSupervisor: reportingSupervisor || null,
        profilePhotoPath: profilePhotoPath || null,
        uanNumber: uanNumber || null,
        labourCampId: labourCampId || null,
        emergencyContacts: {
          create: (emergencyContacts || []).map((ec: { name: string; relationship: string; phone: string; isPrimary?: boolean }) => ({
            name: ec.name || '',
            relationship: ec.relationship || '',
            phone: ec.phone || '',
            isPrimary: ec.isPrimary || false,
          })),
        },
        nominees: {
          create: (nominees || []).map((n: { name: string; relationship: string; idNumber?: string; contactNumber?: string }) => ({
            name: n.name || '',
            relationship: n.relationship || '',
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
    // Match the constraint violation on its error code, not on the word
    // "Unique" appearing in the message — Prisma's validation errors quote
    // type names like `UncheckedCreateInput`, which matched that test and
    // reported an unrelated failure as a duplicate.
    const isDuplicate =
      typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
    const msg = isDuplicate ? 'Employee number or aadhaar already exists' : 'Failed to create worker'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
