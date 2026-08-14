import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/dashboard
export async function GET() {
  try {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    // Basic counts
    const [
      totalWorkers,
      activeWorkers,
      openGrievances,
      openIncidents,
      pendingMedical,
      expiringTrainings,
      todayAttendance,
      allIncidents,
      allTrainingRecords,
      allWorkers,
      allMedicalRecords,
      allLabourCamps,
      allContractors,
      allVehicles,
      allVehicleDocuments,
      facilityCount,
      facilityCompliant,
      facilityNonCompliant,
      facilityPending,
      securityCount,
      securityCompliant,
      securityNonCompliant,
      securityPending,
      medCount,
      medCompliant,
      medNonCompliant,
      medPending,
    ] = await Promise.all([
      db.worker.count(),
      db.worker.count({ where: { isActive: true } }),
      db.grievance.count({ where: { status: { in: ['Open', 'InProgress'] } } }),
      db.incident.count({ where: { status: { in: ['Open', 'UnderInvestigation'] } } }),
      db.medicalRecord.count({ where: { result: 'Pending' } }),
      // Training expiring within 30 days
      db.trainingRecord.count({
        where: {
          validityDate: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
          status: 'Valid',
        },
      }),
      // Attendance today
      db.attendance.count({
        where: {
          date: today,
          status: 'Present',
        },
      }),
      // Incident breakdown by type
      db.incident.findMany({
        where: { status: { in: ['Open', 'UnderInvestigation', 'Closed'] } },
        select: { incidentType: true },
      }),
      // Training status breakdown
      db.trainingRecord.findMany({
        select: { status: true },
      }),
      // Gender + Age (for skill mix & age distribution)
      db.worker.findMany({
        select: {
          gender: true,
          age: true,
          designation: { select: { category: true } },
          fitness: { select: { skillLevel: true } },
        },
      }),
      // Medical test breakdown
      db.medicalRecord.findMany({
        select: { result: true, examinationType: true },
      }),
      // All labour camps (with worker counts for workforce-per-camp)
      db.labourCamp.findMany({
        include: {
          contractor: { select: { id: true, name: true, code: true } },
          site: { select: { id: true, name: true } },
          _count: { select: { workers: true } },
        },
      }),
      // All contractors (for camps-per-contractor)
      db.contractor.findMany({
        where: { isActive: true },
        include: { _count: { select: { labourCamps: true, workers: true } } },
      }),
      // Vehicles
      db.vehicle.findMany({
        select: {
          id: true,
          vehicleType: true,
          owner: true,
          condition: true,
          lastInspectionDate: true,
          nextInspectionDue: true,
          isActive: true,
        },
      }),
      // Vehicle documents
      db.vehicleDocument.findMany({
        select: { id: true, status: true, expiryDate: true },
      }),
      // Site facilities compliance breakdown
      db.siteFacility.count(),
      db.siteFacility.count({ where: { status: 'Compliant' } }),
      db.siteFacility.count({ where: { status: 'NonCompliant' } }),
      db.siteFacility.count({ where: { status: 'Pending' } }),
      // Site security compliance breakdown
      db.siteSecurityItem.count(),
      db.siteSecurityItem.count({ where: { status: 'Compliant' } }),
      db.siteSecurityItem.count({ where: { status: 'NonCompliant' } }),
      db.siteSecurityItem.count({ where: { status: 'Pending' } }),
      // Med infra compliance breakdown
      db.medInfraItem.count(),
      db.medInfraItem.count({ where: { status: 'Compliant' } }),
      db.medInfraItem.count({ where: { status: 'NonCompliant' } }),
      db.medInfraItem.count({ where: { status: 'Pending' } }),
    ])

    // ─── Incident breakdown by type ───
    const incidentBreakdown: Record<string, number> = {}
    for (const inc of allIncidents) {
      incidentBreakdown[inc.incidentType] = (incidentBreakdown[inc.incidentType] || 0) + 1
    }

    // ─── Training status breakdown ───
    const trainingStatusBreakdown: Record<string, number> = {}
    for (const t of allTrainingRecords) {
      trainingStatusBreakdown[t.status] = (trainingStatusBreakdown[t.status] || 0) + 1
    }

    // ─── Gender breakdown ───
    const genderBreakdown: Record<string, number> = {}
    for (const w of allWorkers) {
      genderBreakdown[w.gender] = (genderBreakdown[w.gender] || 0) + 1
    }

    // ─── Skilled vs Unskilled (based on designation category + fitness skillLevel) ───
    let skilledWorkers = 0
    let unskilledWorkers = 0
    for (const w of allWorkers) {
      // Skilled if designation category is Safety-Critical/Supervisory OR fitness skillLevel is Skilled/SemiSkilled
      const cat = w.designation?.category
      const skill = w.fitness?.skillLevel
      const isSkilled =
        cat === 'Safety-Critical' || cat === 'Supervisory' ||
        skill === 'Skilled' || skill === 'SemiSkilled'
      if (isSkilled) skilledWorkers++
      else unskilledWorkers++
    }

    // ─── Age distribution (18-30, 30-45, 45-55, 55+) ───
    const ageDistribution = [
      { bucket: '18-30', count: 0 },
      { bucket: '30-45', count: 0 },
      { bucket: '45-55', count: 0 },
      { bucket: '55+', count: 0 },
    ]
    for (const w of allWorkers) {
      const a = w.age || 0
      if (a < 30) ageDistribution[0].count++
      else if (a < 45) ageDistribution[1].count++
      else if (a < 55) ageDistribution[2].count++
      else ageDistribution[3].count++
    }

    // ─── Medical test breakdown (by examination result) ───
    const medicalTestBreakdown: Record<string, number> = {}
    for (const m of allMedicalRecords) {
      const key = m.result || 'Pending'
      medicalTestBreakdown[key] = (medicalTestBreakdown[key] || 0) + 1
    }
    const medicalTestBreakdownArr = Object.entries(medicalTestBreakdown).map(([status, count]) => ({ status, count }))

    // ─── Camps per contractor (count of labour camps per contractor) ───
    const campsPerContractor = allContractors
      .map(c => ({
        contractorId: c.id,
        name: c.name,
        code: c.code,
        camps: c._count?.labourCamps ?? 0,
        workers: c._count?.workers ?? 0,
      }))
      .sort((a, b) => b.camps - a.camps)

    // ─── Workforce per camp (top 8 by worker count) ───
    const workforcePerCamp = allLabourCamps
      .map(c => ({
        id: c.id,
        name: c.name,
        contractor: c.contractor?.name ?? '—',
        site: c.site?.name ?? '—',
        workers: c._count?.workers ?? 0,
        capacity: c.capacity ?? 0,
      }))
      .sort((a, b) => b.workers - a.workers)
      .slice(0, 8)

    // ─── Compliance breakdown (overall, summed across facility + security + medInfra) ───
    const complianceCompliant = facilityCompliant + securityCompliant + medCompliant
    const complianceNonCompliant = facilityNonCompliant + securityNonCompliant + medNonCompliant
    const compliancePending = facilityPending + securityPending + medPending
    const totalComplianceItems = facilityCount + securityCount + medCount
    const compliancePct = totalComplianceItems > 0
      ? Math.round((complianceCompliant / totalComplianceItems) * 100)
      : 100

    // ─── Vehicle stats ───
    const vehicleTotal = allVehicles.length
    const vehicleActive = allVehicles.filter(v => v.isActive).length
    // Equipment status (by condition)
    const equipmentStatus = {
      Fit: allVehicles.filter(v => v.condition === 'Fit').length,
      NeedsRepair: allVehicles.filter(v => v.condition === 'NeedsRepair').length,
      Grounded: allVehicles.filter(v => v.condition === 'Grounded').length,
    }
    // Inspection status (based on nextInspectionDue)
    const now = new Date()
    const soonWindow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
    let inspectionPassed = 0
    let inspectionFailed = 0
    let inspectionPending = 0
    for (const v of allVehicles) {
      if (!v.nextInspectionDue) {
        inspectionPending++
        continue
      }
      const due = new Date(v.nextInspectionDue)
      if (due < now) inspectionFailed++
      else if (due < soonWindow) inspectionPending++
      else inspectionPassed++
    }
    // Ownership
    const ownership = {
      Own: allVehicles.filter(v => v.owner === 'Contractor').length,
      Rented: allVehicles.filter(v => v.owner === 'Rented').length,
    }
    // Approval status (vehicles with all valid documents vs not)
    const vehiclesById = new Map(allVehicles.map(v => [v.id, v]))
    const docsByVehicle = new Map<string, typeof allVehicleDocuments>()
    for (const d of allVehicleDocuments) {
      if (!docsByVehicle.has(d.id)) docsByVehicle.set(d.id, [])
      // not used per-vehicle but keep grouping if needed
    }
    // Simpler: just count docs statuses overall
    const docApproved = allVehicleDocuments.filter(d => d.status === 'Valid').length
    const docRejected = allVehicleDocuments.filter(d => d.status === 'Expired').length
    const docPending = allVehicleDocuments.filter(d => d.status === 'ExpiringSoon').length
    const approvalStatus = {
      Approved: docApproved,
      Rejected: docRejected,
      Pending: docPending,
    }

    // ─── Environmental inspection (derived from incidents of type Environmental + compliance nonCompliant counts) ───
    // Use the compliance NonCompliant + Pending as proxy for envInspection failed/pending,
    // and Compliant counts as passed — these approximate environmental inspection outcomes.
    const envInspectionPassed = facilityCompliant + securityCompliant + medCompliant
    const envInspectionFailed = facilityNonCompliant + securityNonCompliant + medNonCompliant
    const envInspectionPending = facilityPending + securityPending + medPending

    // ─── Build response ───
    const incidentBreakdownArr = Object.entries(incidentBreakdown).map(([type, count]) => ({ type, count }))
    const trainingStatusBreakdownArr = Object.entries(trainingStatusBreakdown).map(([status, count]) => ({ status, count }))
    const genderBreakdownArr = Object.entries(genderBreakdown).map(([gender, count]) => ({ gender, count }))

    return NextResponse.json({
      totalWorkers,
      activeWorkers,
      expiringTrainingsCount: expiringTrainings,
      pendingMedicalCount: pendingMedical,
      openGrievancesCount: openGrievances,
      openIncidentsCount: openIncidents,
      attendanceToday: todayAttendance,
      compliancePct,
      incidentBreakdown: incidentBreakdownArr,
      trainingStatusBreakdown: trainingStatusBreakdownArr,
      genderBreakdown: genderBreakdownArr,
      // New workforce fields
      skilledWorkers,
      unskilledWorkers,
      ageDistribution,
      medicalTestBreakdown: medicalTestBreakdownArr,
      // Camps
      campsPerContractor,
      workforcePerCamp,
      // Compliance breakdown
      complianceCompliant,
      complianceNonCompliant,
      compliancePending,
      // Env inspection
      envInspectionPassed,
      envInspectionFailed,
      envInspectionPending,
      // Vehicle stats
      vehicleStats: {
        total: vehicleTotal,
        active: vehicleActive,
        equipmentStatus,
        inspectionStatus: {
          Passed: inspectionPassed,
          Failed: inspectionFailed,
          Pending: inspectionPending,
        },
        ownership,
        approvalStatus,
      },
    })
  } catch (error) {
    console.error('GET /api/dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}
