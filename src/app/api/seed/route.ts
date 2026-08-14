import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { runDemoSeed } from '@/lib/seed-engine'

export const maxDuration = 300 // Allow up to 5 minutes for seeding

// POST /api/seed — Full comprehensive demo seed
export async function POST() {
  const t0 = Date.now()
  try {
    console.log('[API/SEED] Starting comprehensive demo seed...')
    const counts = await runDemoSeed(db)
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    console.log(`[API/SEED] Completed in ${elapsed}s`)
    return NextResponse.json({
      success: true,
      message: 'Demo data seeded successfully',
      elapsedSeconds: parseFloat(elapsed),
      counts,
    })
  } catch (error) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    console.error(`[API/SEED] Failed after ${elapsed}s:`, error)
    return NextResponse.json(
      { success: false, error: 'Seed failed', details: String(error), elapsedSeconds: parseFloat(elapsed) },
      { status: 500 }
    )
  }
}
