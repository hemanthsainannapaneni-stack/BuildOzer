import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/labour-camps?siteId=xxx&all=true
//   - By default only active camps are returned.
//   - Pass all=true to include inactive camps as well (used by the
//     Locations module which needs to display Camp Status).
//   - Worker counts are included via Prisma's _count.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')
    const includeInactive = searchParams.get('all') === 'true'

    const where: Record<string, unknown> = {}
    if (!includeInactive) where.isActive = true
    if (siteId) where.siteId = siteId

    const camps = await db.labourCamp.findMany({
      where,
      include: {
        contractor: { select: { id: true, name: true, code: true } },
        site: { select: { id: true, name: true, code: true } },
        _count: { select: { workers: true } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(camps)
  } catch (error) {
    console.error('GET /api/labour-camps error:', error)
    return NextResponse.json({ error: 'Failed to fetch labour camps' }, { status: 500 })
  }
}

// POST /api/labour-camps
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, contractorId, siteId, address, capacity } = body

    if (!name || !contractorId || !siteId) {
      return NextResponse.json({ error: 'Name, contractorId, and siteId are required' }, { status: 400 })
    }

    const camp = await db.labourCamp.create({
      data: { name, contractorId, siteId, address, capacity },
      include: {
        contractor: { select: { id: true, name: true, code: true } },
        site: { select: { id: true, name: true, code: true } },
        _count: { select: { workers: true } },
      },
    })
    return NextResponse.json(camp, { status: 201 })
  } catch (error) {
    console.error('POST /api/labour-camps error:', error)
    return NextResponse.json({ error: 'Failed to create labour camp' }, { status: 500 })
  }
}

// PUT /api/labour-camps
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, address, capacity, isActive } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const camp = await db.labourCamp.update({
      where: { id },
      data: { name, address, capacity, isActive },
      include: {
        contractor: { select: { id: true, name: true, code: true } },
        site: { select: { id: true, name: true, code: true } },
        _count: { select: { workers: true } },
      },
    })
    return NextResponse.json(camp)
  } catch (error) {
    console.error('PUT /api/labour-camps error:', error)
    return NextResponse.json({ error: 'Failed to update labour camp' }, { status: 500 })
  }
}

// DELETE /api/labour-camps?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID query parameter is required' }, { status: 400 })
    }

    const camp = await db.labourCamp.update({
      where: { id },
      data: { isActive: false },
    })
    return NextResponse.json(camp)
  } catch (error) {
    console.error('DELETE /api/labour-camps error:', error)
    return NextResponse.json({ error: 'Failed to delete labour camp' }, { status: 500 })
  }
}
