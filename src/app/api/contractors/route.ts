import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/contractors
export async function GET() {
  try {
    const contractors = await db.contractor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(contractors)
  } catch (error) {
    console.error('GET /api/contractors error:', error)
    return NextResponse.json({ error: 'Failed to fetch contractors' }, { status: 500 })
  }
}

// POST /api/contractors
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, code, gstNumber, address, phone } = body

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 })
    }

    const existing = await db.contractor.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json({ error: 'Contractor with this code already exists' }, { status: 409 })
    }

    const contractor = await db.contractor.create({
      data: { name, code, gstNumber, address, phone },
    })
    return NextResponse.json(contractor, { status: 201 })
  } catch (error) {
    console.error('POST /api/contractors error:', error)
    return NextResponse.json({ error: 'Failed to create contractor' }, { status: 500 })
  }
}

// PUT /api/contractors
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, code, gstNumber, address, phone, isActive } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    if (code) {
      const existing = await db.contractor.findFirst({ where: { code, NOT: { id } } })
      if (existing) {
        return NextResponse.json({ error: 'Contractor with this code already exists' }, { status: 409 })
      }
    }

    const contractor = await db.contractor.update({
      where: { id },
      data: { name, code, gstNumber, address, phone, isActive },
    })
    return NextResponse.json(contractor)
  } catch (error) {
    console.error('PUT /api/contractors error:', error)
    return NextResponse.json({ error: 'Failed to update contractor' }, { status: 500 })
  }
}

// DELETE /api/contractors?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID query parameter is required' }, { status: 400 })
    }

    const contractor = await db.contractor.update({
      where: { id },
      data: { isActive: false },
    })
    return NextResponse.json(contractor)
  } catch (error) {
    console.error('DELETE /api/contractors error:', error)
    return NextResponse.json({ error: 'Failed to delete contractor' }, { status: 500 })
  }
}
