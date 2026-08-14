import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/notifications — ordered by createdAt desc
export async function GET() {
  try {
    const notifications = await db.notification.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(notifications)
  } catch (error) {
    console.error('GET /api/notifications error:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

// DELETE /api/notifications — clear all notifications
export async function DELETE() {
  try {
    await db.notification.deleteMany()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/notifications error:', error)
    return NextResponse.json({ error: 'Failed to clear notifications' }, { status: 500 })
  }
}
