import { PrismaClient } from '@prisma/client'
import { runDemoSeed } from '../src/lib/seed-engine'

const db = new PrismaClient()

async function main() {
  console.log('=== CLOVE Demo Seed Script ===')
  console.log('This will DELETE all existing data and create fresh demo data.\n')
  try {
    const counts = await runDemoSeed(db)
    console.log('\n=== Seed Summary ===')
    for (const [key, value] of Object.entries(counts)) {
      console.log(`  ${key}: ${value}`)
    }
    console.log('\n✅ Demo seed completed successfully!')
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

main()
