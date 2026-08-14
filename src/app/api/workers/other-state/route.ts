import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/workers/other-state
// Returns workers whose nativeState is not null AND not 'Andhra Pradesh'
export async function GET() {
  try {
    const workers = await db.worker.findMany({
      where: {
        nativeState: { not: null },
        isActive: true,
      },
      select: {
        id: true,
        employeeNumber: true,
        fullName: true,
        nativeState: true,
        aadhaarNumber: true,
        dateOfBirth: true,
        gender: true,
        permanentAddress: true,
        contractor: { select: { id: true, name: true } },
        site: { select: { id: true, name: true } },
        emergencyContacts: { where: { isPrimary: true }, select: { phone: true, name: true } },
      },
      orderBy: { nativeState: 'asc' },
    })

    // Filter out Andhra Pradesh workers (case-insensitive)
    const otherStateWorkers = workers.filter(
      (w) => w.nativeState !== null && w.nativeState.toLowerCase() !== 'andhra pradesh'
    )

    // Mask aadhaar: show first 4 and last 4, mask middle
    const masked = otherStateWorkers.map((w) => ({
      id: w.id,
      employeeNumber: w.employeeNumber,
      fullName: w.fullName,
      nativeState: w.nativeState,
      aadhaarNumber: w.aadhaarNumber
        ? `${w.aadhaarNumber.slice(0, 4)}****${w.aadhaarNumber.slice(-4)}`
        : null,
      dateOfBirth: w.dateOfBirth,
      gender: w.gender,
      permanentAddress: w.permanentAddress,
      contractorName: w.contractor.name,
      siteName: w.site?.name ?? '—',
      emergencyPhone: w.emergencyContacts[0]?.phone ?? null,
    }))

    return NextResponse.json({ data: masked, total: masked.length })
  } catch (error) {
    console.error('GET /api/workers/other-state error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch other-state workers' },
      { status: 500 }
    )
  }
}
