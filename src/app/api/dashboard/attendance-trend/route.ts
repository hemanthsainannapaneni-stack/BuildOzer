import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/dashboard/attendance-trend
// Returns last 7 days attendance data
export async function GET() {
  try {
    const today = new Date()
    const days: { date: string; label: string; present: number; absent: number; total: number }[] = []

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      d.setUTCHours(0, 0, 0, 0)
      const nextD = new Date(d)
      nextD.setDate(nextD.getDate() + 1)

      const [present, absent] = await Promise.all([
        db.attendance.count({
          where: { date: { gte: d, lt: nextD }, status: 'Present' },
        }),
        db.attendance.count({
          where: { date: { gte: d, lt: nextD }, status: 'Absent' },
        }),
      ])

      const dayLabel = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
      days.push({
        date: d.toISOString().split('T')[0],
        label: dayLabel,
        present,
        absent,
        total: present + absent,
      })
    }

    return NextResponse.json(days)
  } catch (error) {
    console.error('GET /api/dashboard/attendance-trend error:', error)
    return NextResponse.json({ error: 'Failed to fetch attendance trend' }, { status: 500 })
  }
}
