import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function seed() {
  // --- Contractors ---
  const contractors = [
    { name: 'BSR', code: 'BSR' },
    { name: 'NCC', code: 'NCC' },
    { name: 'L&T', code: 'LNT' },
    { name: 'MEIL', code: 'MEIL' },
    { name: 'RVR', code: 'RVR' },
  ]

  for (const c of contractors) {
    await db.contractor.upsert({
      where: { code: c.code },
      update: { name: c.name },
      create: { name: c.name, code: c.code },
    })
  }

  // --- Sites (Projects) ---
  const sites = [
    { name: 'Assembly', code: 'ASM' },
    { name: 'High Court', code: 'HC' },
    { name: 'GAD Tower', code: 'GAD' },
    { name: 'Zone 7', code: 'Z7' },
    { name: 'Zone 9', code: 'Z9' },
    { name: 'E3 Phase 1', code: 'E3P1' },
    { name: 'E5 Road', code: 'E5R' },
    { name: 'N5', code: 'N5' },
    { name: 'N13', code: 'N13' },
  ]

  for (const s of sites) {
    await db.site.upsert({
      where: { code: s.code },
      update: { name: s.name },
      create: { name: s.name, code: s.code },
    })
  }

  // --- Labour Camps (per contractor-site combination) ---
  const allContractors = await db.contractor.findMany()
  const allSites = await db.site.findMany()

  const campCounters: Record<string, number> = {}

  for (const contractor of allContractors) {
    for (const site of allSites) {
      const key = `${contractor.code}-${site.code}`
      campCounters[key] = (campCounters[key] || 0) + 1
      const campName = `${contractor.code} Camp ${site.name}`

      await db.labourCamp.upsert({
        where: { id: `camp-${contractor.code.toLowerCase()}-${site.code.toLowerCase()}` },
        update: {},
        create: {
          id: `camp-${contractor.code.toLowerCase()}-${site.code.toLowerCase()}`,
          name: campName,
          contractorId: contractor.id,
          siteId: site.id,
          capacity: 50 + Math.floor(Math.random() * 200),
          currentOccupancy: Math.floor(Math.random() * 80),
        },
      })
    }
  }

  // --- Designations ---
  const designations = [
    'Mason', 'Electrician', 'Rigger', 'Plumber', 'Carpenter',
    'Welder', 'Painter', 'Fitter', 'Helper', 'Supervisor',
    'Safety Officer', 'Crane Operator', 'JCB Operator', 'Dumper Driver',
    'Steel Fixer', 'Bar Bender', 'Shuttering Carpenter', 'Concreting Worker',
    'Surveyor', 'QC Inspector', 'Site Engineer', 'Foreman',
  ]

  for (const name of designations) {
    await db.designation.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }

  // --- System Users ---
  // Admin user
  await db.systemUser.upsert({
    where: { username: 'admin' },
    update: { role: 'ADMIN', fullName: 'Admin' },
    create: {
      username: 'admin',
      password: 'admin123',
      fullName: 'Admin',
      role: 'ADMIN',
    },
  })

  // PMC users (one per site)
  for (const site of allSites) {
    const username = `pmc-${site.code.toLowerCase()}`
    await db.systemUser.upsert({
      where: { username },
      update: { role: 'PMC', siteId: site.id },
      create: {
        username,
        password: 'pmc123',
        fullName: `PMC - ${site.name}`,
        role: 'PMC',
        siteId: site.id,
      },
    })
  }

  console.log('✅ Seed complete')
}

seed()
  .catch(console.error)
  .finally(() => db.$disconnect())
