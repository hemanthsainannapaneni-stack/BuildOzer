import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function calculateAge(dob: Date): number {
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

function parseDate(val: string): Date | null {
  if (!val) return null
  const dmy = /^\d{2}\/\d{2}\/\d{4}$/.exec(val.trim())
  if (dmy) {
    const [d, m, y] = val.trim().split('/').map(Number)
    const date = new Date(y, m - 1, d)
    if (!isNaN(date.getTime())) return date
  }
  const date = new Date(val)
  if (!isNaN(date.getTime())) return date
  return null
}

const VALID_GENDERS = ['Male', 'Female', 'Other']
const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const VALID_QUALIFICATIONS = ['Below 10th', '10th', '12th', 'ITI', 'Diploma', 'Graduate', 'Other']

interface BulkWorker {
  fullName: string
  dateOfBirth: string
  gender: string
  bloodGroup: string
  aadhaarNumber: string
  permanentAddress: string
  qualification: string
  designationName?: string
  designationId?: string | null
  currentAddress?: string | null
  zone?: string | null
}

// POST /api/workers/bulk-import
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workers, contractorId, contractorCode, siteId } = body as {
      workers: BulkWorker[]
      contractorId: string
      contractorCode?: string
      siteId?: string | null
    }

    if (!contractorId) {
      return NextResponse.json({ error: 'Contractor ID is required' }, { status: 400 })
    }
    if (!workers || !Array.isArray(workers) || workers.length === 0) {
      return NextResponse.json({ error: 'No workers provided' }, { status: 400 })
    }
    if (workers.length > 500) {
      return NextResponse.json({ error: 'Maximum 500 workers per batch' }, { status: 400 })
    }

    // Validate contractor
    const contractor = await db.contractor.findUnique({ where: { id: contractorId } })
    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 400 })
    }

    // Validate site if provided
    if (siteId) {
      const site = await db.site.findUnique({ where: { id: siteId } })
      if (!site) {
        return NextResponse.json({ error: 'Site not found' }, { status: 400 })
      }
    }

    // Get all designations for matching
    const allDesignations = await db.designation.findMany()

    const code = contractorCode || contractor.code
    const errors: { row: number; message: string }[] = []
    const toCreate: {
      employeeNumber: string
      fullName: string
      dateOfBirth: Date
      age: number
      gender: string
      bloodGroup: string
      aadhaarNumber: string
      permanentAddress: string
      currentAddress: string | null
      qualification: string
      designationId: string
      contractorId: string
      siteId: string | null
      zone: string | null
    }[] = []

    // Get current worker count for employee number generation
    const currentCount = await db.worker.count()

    for (let i = 0; i < workers.length; i++) {
      const w = workers[i]
      const rowNum = i + 1
      const rowErrors: string[] = []

      if (!w.fullName?.trim()) rowErrors.push('Full Name is required')
      if (!VALID_GENDERS.includes(w.gender)) rowErrors.push('Invalid gender')
      if (!VALID_BLOOD_GROUPS.includes(w.bloodGroup)) rowErrors.push('Invalid blood group')
      if (!w.aadhaarNumber || !/^\d{12}$/.test(w.aadhaarNumber.trim())) rowErrors.push('Aadhaar must be 12 digits')
      if (!w.permanentAddress?.trim()) rowErrors.push('Permanent address is required')
      if (!VALID_QUALIFICATIONS.includes(w.qualification)) rowErrors.push('Invalid qualification')

      const dob = parseDate(w.dateOfBirth)
      if (!dob) {
        rowErrors.push('Invalid date of birth')
      } else {
        const age = calculateAge(dob)
        if (age < 18 || age > 55) rowErrors.push(`Age ${age} not between 18-55`)
      }

      // Match designation
      let designationId = w.designationId || null
      if (!designationId && w.designationName) {
        const match = allDesignations.find(
          (d) => d.name.toLowerCase() === w.designationName!.toLowerCase()
        )
        if (match) {
          designationId = match.id
        } else {
          rowErrors.push(`Designation "${w.designationName}" not found`)
        }
      }
      if (!designationId) {
        rowErrors.push('Designation is required')
      }

      // Check duplicate aadhaar in this batch
      const aadhaarInBatch = toCreate.some(
        (c) => c.aadhaarNumber === w.aadhaarNumber?.trim()
      )
      if (aadhaarInBatch) rowErrors.push('Duplicate Aadhaar in this batch')

      if (rowErrors.length > 0) {
        errors.push({ row: rowNum, message: rowErrors.join('; ') })
        continue
      }

      const empNum = `${code}-WK-${String(currentCount + toCreate.length + 1).padStart(4, '0')}`

      toCreate.push({
        employeeNumber: empNum,
        fullName: w.fullName.trim(),
        dateOfBirth: dob!,
        age: calculateAge(dob!),
        gender: w.gender,
        bloodGroup: w.bloodGroup,
        aadhaarNumber: w.aadhaarNumber.trim(),
        permanentAddress: w.permanentAddress.trim(),
        currentAddress: w.currentAddress?.trim() || null,
        qualification: w.qualification,
        designationId: designationId!,
        contractorId,
        siteId: siteId || null,
        zone: w.zone?.trim() || null,
      })
    }

    // Batch create
    let created = 0
    if (toCreate.length > 0) {
      const result = await db.$transaction(
        toCreate.map((w) =>
          db.worker.create({ data: w })
        )
      )
      created = result.length
    }

    return NextResponse.json({ created, errors, total: workers.length })
  } catch (error) {
    console.error('POST /api/workers/bulk-import error:', error)
    return NextResponse.json({ error: 'Bulk import failed' }, { status: 500 })
  }
}
