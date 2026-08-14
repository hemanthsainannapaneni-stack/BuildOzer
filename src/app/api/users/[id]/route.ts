import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/users/[id] — get single user
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await db.systemUser.findUnique({
      where: { id },
      include: {
        contractor: { select: { id: true, name: true } },
      },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
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
    })
  } catch (error) {
    console.error('GET /api/users/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

// PUT /api/users/[id] — update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { fullName, role, contractorName, isActive } = body

    const existing = await db.systemUser.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Resolve contractorId from contractorName
    let contractorId = existing.contractorId
    if (contractorName !== undefined) {
      if (contractorName === 'All Contractors') {
        contractorId = null
      } else {
        const contractor = await db.contractor.findFirst({ where: { name: contractorName } })
        contractorId = contractor?.id ?? null
      }
    }

    const updateData: Record<string, unknown> = {}
    if (fullName !== undefined) updateData.fullName = fullName
    if (role !== undefined) updateData.role = role
    if (contractorId !== undefined) updateData.contractorId = contractorId
    if (isActive !== undefined) updateData.isActive = isActive

    const user = await db.systemUser.update({
      where: { id },
      data: updateData,
      include: {
        contractor: { select: { id: true, name: true } },
      },
    })

    // Create audit log entry
    const deletedBy = new URL(request.url).searchParams.get('deletedBy')
    const actingUser = deletedBy || 'Unknown'
    const changeDetails: string[] = []
    if (fullName !== undefined && fullName !== existing.fullName) changeDetails.push(`fullName: ${existing.fullName} → ${fullName}`)
    if (role !== undefined && role !== existing.role) changeDetails.push(`role: ${existing.role} → ${role}`)
    if (contractorName !== undefined && contractorName !== (existing.contractor?.name ?? 'All Contractors')) changeDetails.push(`contractorName: ${existing.contractor?.name ?? 'All Contractors'} → ${contractorName}`)
    if (isActive !== undefined && isActive !== existing.isActive) changeDetails.push(`isActive: ${String(existing.isActive)} → ${String(isActive)}`)

    if (changeDetails.length > 0) {
      await db.auditLog.create({
        data: {
          userName: actingUser,
          action: 'UPDATE',
          entity: 'SystemUser',
          entityId: id,
          oldValue: changeDetails.map((d) => d.split(' → ')[0]).join(', '),
          newValue: changeDetails.map((d) => d.split(' → ')[1]).join(', '),
          field: changeDetails.join('; '),
        },
      })
    }

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
    })
  } catch (error) {
    console.error('PUT /api/users/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// DELETE /api/users/[id] — delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const existing = await db.systemUser.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const deletedBy = new URL(request.url).searchParams.get('deletedBy') || 'Unknown'

    // Create audit log entry before deleting
    await db.auditLog.create({
      data: {
        userName: deletedBy,
        action: 'DELETE',
        entity: 'SystemUser',
        entityId: id,
        oldValue: `User: ${existing.fullName} (@${existing.username}), Role: ${existing.role}`,
        newValue: null,
      },
    })

    await db.systemUser.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/users/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
