import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/designations
export async function GET() {
  try {
    const designations = await db.designation.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(designations)
  } catch (error) {
    console.error('GET /api/designations error:', error)
    return NextResponse.json({ error: 'Failed to fetch designations' }, { status: 500 })
  }
}