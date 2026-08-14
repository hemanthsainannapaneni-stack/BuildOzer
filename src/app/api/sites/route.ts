import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/sites
export async function GET() {
  try {
    const sites = await db.site.findMany({
      where: { isActive: true },
      include: {
        contractor: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(sites)
  } catch (error) {
    console.error('GET /api/sites error:', error)
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 })
  }
}

// POST /api/sites
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, code, address, contractorId } = body

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 })
    }

    const existing = await db.site.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json({ error: 'Site with this code already exists' }, { status: 409 })
    }

    const site = await db.site.create({
      data: { name, code, address, contractorId },
      include: {
        contractor: { select: { id: true, name: true, code: true } },
      },
    })
    return NextResponse.json(site, { status: 201 })
  } catch (error) {
    console.error('POST /api/sites error:', error)
    return NextResponse.json({ error: 'Failed to create site' }, { status: 500 })
  }
}

// PUT /api/sites
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, code, address, contractorId, isActive } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    if (code) {
      const existing = await db.site.findFirst({ where: { code, NOT: { id } } })
      if (existing) {
        return NextResponse.json({ error: 'Site with this code already exists' }, { status: 409 })
      }
    }

    const site = await db.site.update({
      where: { id },
      data: { name, code, address, contractorId, isActive },
      include: {
        contractor: { select: { id: true, name: true, code: true } },
      },
    })
    return NextResponse.json(site)
  } catch (error) {
    console.error('PUT /api/sites error:', error)
    return NextResponse.json({ error: 'Failed to update site' }, { status: 500 })
  }
}

// DELETE /api/sites?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID query parameter is required' }, { status: 400 })
    }

    const site = await db.site.update({
      where: { id },
      data: { isActive: false },
    })
    return NextResponse.json(site)
  } catch (error) {
    console.error('DELETE /api/sites error:', error)
    return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 })
  }
}
