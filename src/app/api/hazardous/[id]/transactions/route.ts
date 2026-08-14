import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/hazardous/[id]/transactions — add In/Out transaction
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const material = await db.hazardousMaterial.findUnique({ where: { id } })
    if (!material) {
      return NextResponse.json({ error: 'Hazardous material not found' }, { status: 404 })
    }

    if (!body.transactionType || body.quantity === undefined) {
      return NextResponse.json({ error: 'transactionType (In/Out) and quantity are required' }, { status: 400 })
    }

    if (!['In', 'Out'].includes(body.transactionType)) {
      return NextResponse.json({ error: 'transactionType must be In or Out' }, { status: 400 })
    }

    if (body.quantity < 0) {
      return NextResponse.json({ error: 'quantity must be positive' }, { status: 400 })
    }

    let newBalance = material.quantityCurrent
    if (body.transactionType === 'In') {
      newBalance += body.quantity
    } else {
      newBalance -= body.quantity
      if (newBalance < 0) {
        return NextResponse.json({ error: 'Insufficient stock for this transaction' }, { status: 400 })
      }
    }

    if (newBalance > material.quantityMaxPermissible) {
      return NextResponse.json(
        { error: 'Transaction would exceed maximum permissible quantity' },
        { status: 400 },
      )
    }

    const [transaction] = await db.$transaction([
      db.materialTransaction.create({
        data: {
          materialId: id,
          transactionType: body.transactionType,
          quantity: body.quantity,
          runningBalance: newBalance,
          date: body.date ? new Date(body.date) : new Date(),
          remarks: body.remarks || null,
        },
      }),
      db.hazardousMaterial.update({
        where: { id },
        data: { quantityCurrent: newBalance },
      }),
    ])

    return NextResponse.json({ data: transaction }, { status: 201 })
  } catch (error) {
    console.error('POST /api/hazardous/[id]/transactions error:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}
