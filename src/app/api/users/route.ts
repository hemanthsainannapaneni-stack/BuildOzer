import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/users — list all system users
export async function GET() {
  try {
    const users = await db.systemUser.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        contractor: { select: { id: true, name: true } },
      },
    })

    const data = users.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      role: u.role,
      contractorName: u.contractor?.name ?? 'All Contractors',
      contractorId: u.contractorId,
      isActive: u.isActive,
      lastLogin: u.lastLogin?.toISOString() ?? null,
    }))

    return NextResponse.json({ data, total: data.length })
  } catch (error) {
    console.error('GET /api/users error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// POST /api/users — create a new system user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fullName, username, role, contractorName } = body

    if (!fullName || !username || !role) {
      return NextResponse.json({ error: 'Missing required fields: fullName, username, role' }, { status: 400 })
    }

    // Check for duplicate username
    const existing = await db.systemUser.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
    }

    // Resolve contractorId from contractorName if not "All Contractors"
    let contractorId: string | null = null
    if (contractorName && contractorName !== 'All Contractors') {
      const contractor = await db.contractor.findFirst({ where: { name: contractorName } })
      if (contractor) {
        contractorId = contractor.id
      }
    }

    const user = await db.systemUser.create({
      data: {
        username,
        fullName,
        role,
        contractorId,
        password: 'demo123', // default password for demo
      },
      include: {
        contractor: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      data: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        contractorName: user.contractor?.name ?? 'All Contractors',
        contractorId: user.contractorId,
        isActive: user.isActive,
        lastLogin: user.lastLogin?.toISOString() ?? null,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/users error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
