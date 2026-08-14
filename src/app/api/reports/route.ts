import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/reports
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') || 'workforce'
    const format = searchParams.get('format') || 'json'
    const siteId = searchParams.get('siteId') || undefined
    const contractorId = searchParams.get('contractorId') || undefined
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined
    const designationId = searchParams.get('designationId') || undefined
    const gender = searchParams.get('gender') || undefined
    const bloodGroup = searchParams.get('bloodGroup') || undefined
    const status = searchParams.get('status') || undefined
    const activeStatus = searchParams.get('activeStatus') || undefined
    const trainingType = searchParams.get('trainingType') || undefined
    const examType = searchParams.get('examType') || undefined
    const incidentType = searchParams.get('incidentType') || undefined
    const severity = searchParams.get('severity') || undefined
    const vehicleType = searchParams.get('vehicleType') || undefined
    const vehicleCondition = searchParams.get('condition') || undefined
    const vehicleOwner = searchParams.get('owner') || undefined
    const shift = searchParams.get('shift') || undefined
    const certStatus = searchParams.get('certStatus') || undefined
    const certExpiryFrom = searchParams.get('certExpiryFrom') || undefined
    const certExpiryTo = searchParams.get('certExpiryTo') || undefined
    const medicalResult = searchParams.get('medicalResult') || undefined

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const skip = (page - 1) * limit

    // Date range helper
    const dateFilter: Record<string, unknown> = {}
    if (dateFrom) {
      dateFilter.gte = new Date(dateFrom)
    }
    if (dateTo) {
      dateFilter.lte = new Date(dateTo)
    }

    let data: unknown[] = []
    let total = 0
    let columns: string[] = []

    switch (category) {
      case 'workforce': {
        const where: Record<string, unknown> = {}
        if (siteId) where.siteId = siteId
        if (contractorId) where.contractorId = contractorId
        if (designationId) where.designationId = designationId
        if (gender) where.gender = gender
        if (bloodGroup) where.bloodGroup = bloodGroup
        if (activeStatus === 'active') where.isActive = true
        else if (activeStatus === 'inactive') where.isActive = false

        const [workers, count] = await Promise.all([
          db.worker.findMany({
            where,
            skip,
            take: limit,
            select: {
              id: true,
              employeeNumber: true,
              fullName: true,
              gender: true,
              dateOfBirth: true,
              age: true,
              bloodGroup: true,
              aadhaarNumber: true,
              uanNumber: true,
              qualification: true,
              permanentAddress: true,
              isActive: true,
              createdAt: true,
              designation: { select: { name: true, category: true } },
              contractor: { select: { name: true } },
              site: { select: { name: true } },
              labourCamp: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
          }),
          db.worker.count({ where }),
        ])

        data = workers
        total = count
        columns = [
          'Employee No.', 'Full Name', 'Gender', 'Date of Birth', 'Age',
          'Blood Group', 'Aadhaar No.', 'UAN No.', 'Qualification',
          'Designation', 'Contractor', 'Site', 'Labour Camp', 'Status', 'Registered On',
        ]
        break
      }

      case 'attendance': {
        const where: Record<string, unknown> = {}
        if (siteId) {
          where.worker = { ...where.worker as Record<string, unknown>, siteId }
        }
        if (status) where.status = status
        if (shift) where.shiftTiming = { contains: shift }
        if (dateFrom || dateTo) where.date = dateFilter

        const [records, count] = await Promise.all([
          db.attendance.findMany({
            where,
            skip,
            take: limit,
            select: {
              id: true,
              date: true,
              status: true,
              shiftTiming: true,
              isBiometric: true,
              overtimeHours: true,
              remarks: true,
              createdAt: true,
              worker: {
                select: {
                  employeeNumber: true,
                  fullName: true,
                  designation: { select: { name: true } },
                  contractor: { select: { name: true } },
                  site: { select: { name: true } },
                },
              },
            },
            orderBy: { date: 'desc' },
          }),
          db.attendance.count({ where }),
        ])

        data = records
        total = count
        columns = [
          'Date', 'Employee No.', 'Worker Name', 'Designation',
          'Contractor', 'Site', 'Status', 'Shift', 'Biometric',
          'OT Hours', 'Remarks',
        ]
        break
      }

      case 'training': {
        const where: Record<string, unknown> = {}
        if (siteId) {
          where.worker = { ...where.worker as Record<string, unknown>, siteId }
        }
        if (contractorId) {
          where.worker = { ...where.worker as Record<string, unknown>, contractorId }
        }
        if (trainingType) where.trainingType = trainingType
        if (certStatus) where.status = certStatus
        if (dateFrom || dateTo) where.dateConducted = dateFilter
        if (certExpiryFrom || certExpiryTo) {
          const certFilter: Record<string, unknown> = {}
          if (certExpiryFrom) certFilter.gte = new Date(certExpiryFrom)
          if (certExpiryTo) certFilter.lte = new Date(certExpiryTo)
          where.validityDate = certFilter
        }

        const [records, count] = await Promise.all([
          db.trainingRecord.findMany({
            where,
            skip,
            take: limit,
            select: {
              id: true,
              trainingType: true,
              trainingTitle: true,
              dateConducted: true,
              durationHours: true,
              trainerName: true,
              trainingAgency: true,
              certificateNumber: true,
              validityDate: true,
              status: true,
              isCompleted: true,
              remarks: true,
              createdAt: true,
              worker: {
                select: {
                  employeeNumber: true,
                  fullName: true,
                  designation: { select: { name: true } },
                  contractor: { select: { name: true } },
                  site: { select: { name: true } },
                },
              },
            },
            orderBy: { dateConducted: 'desc' },
          }),
          db.trainingRecord.count({ where }),
        ])

        data = records
        total = count
        columns = [
          'Training Title', 'Type', 'Date Conducted', 'Duration (hrs)',
          'Trainer', 'Agency', 'Certificate No.', 'Valid Until',
          'Status', 'Completed',
          'Employee No.', 'Worker Name', 'Designation', 'Contractor', 'Site',
        ]
        break
      }

      case 'medical': {
        const where: Record<string, unknown> = {}
        if (siteId) {
          where.worker = { ...where.worker as Record<string, unknown>, siteId }
        }
        if (contractorId) {
          where.worker = { ...where.worker as Record<string, unknown>, contractorId }
        }
        if (medicalResult) where.result = medicalResult
        if (examType) where.examinationType = examType
        if (dateFrom || dateTo) where.examinationDate = dateFilter

        const [records, count] = await Promise.all([
          db.medicalRecord.findMany({
            where,
            skip,
            take: limit,
            select: {
              id: true,
              examinationDate: true,
              examinationType: true,
              examiningDoctor: true,
              examiningFacility: true,
              result: true,
              nextCheckupDate: true,
              checkupFrequencyMonths: true,
              remarks: true,
              createdAt: true,
              worker: {
                select: {
                  employeeNumber: true,
                  fullName: true,
                  gender: true,
                  bloodGroup: true,
                  designation: { select: { name: true } },
                  contractor: { select: { name: true } },
                  site: { select: { name: true } },
                },
              },
            },
            orderBy: { examinationDate: 'desc' },
          }),
          db.medicalRecord.count({ where }),
        ])

        data = records
        total = count
        columns = [
          'Exam Date', 'Exam Type', 'Doctor', 'Facility', 'Result',
          'Next Checkup', 'Frequency (months)', 'Remarks',
          'Employee No.', 'Worker Name', 'Gender', 'Blood Group',
          'Designation', 'Contractor', 'Site',
        ]
        break
      }

      case 'incidents': {
        const where: Record<string, unknown> = {}
        if (siteId) where.siteId = siteId
        if (contractorId) where.contractorId = contractorId
        if (incidentType) where.incidentType = incidentType
        if (severity) where.severity = severity
        if (status) where.status = status
        if (dateFrom || dateTo) where.date = dateFilter

        const [records, count] = await Promise.all([
          db.incident.findMany({
            where,
            skip,
            take: limit,
            select: {
              id: true,
              incidentNumber: true,
              incidentType: true,
              date: true,
              time: true,
              locationOnSite: true,
              description: true,
              severity: true,
              status: true,
              isDeath: true,
              hospitalReferred: true,
              policeFIRReference: true,
              compensationStatus: true,
              createdAt: true,
              contractor: { select: { name: true } },
              site: { select: { name: true } },
              workers: { select: { workerName: true, injuryDesc: true } },
            },
            orderBy: { date: 'desc' },
          }),
          db.incident.count({ where }),
        ])

        data = records
        total = count
        columns = [
          'Incident No.', 'Type', 'Date', 'Time', 'Location',
          'Description', 'Severity', 'Status', 'Fatal?',
          'Hospital', 'FIR Ref.', 'Compensation',
          'Contractor', 'Site', 'Involved Workers',
        ]
        break
      }

      case 'vehicles': {
        const where: Record<string, unknown> = {}
        if (siteId) where.siteId = siteId
        if (contractorId) where.contractorId = contractorId
        if (vehicleType) where.vehicleType = vehicleType
        if (vehicleCondition) where.condition = vehicleCondition
        if (vehicleOwner) where.owner = vehicleOwner

        const [records, count] = await Promise.all([
          db.vehicle.findMany({
            where,
            skip,
            take: limit,
            select: {
              id: true,
              vehicleNumber: true,
              vehicleType: true,
              make: true,
              model: true,
              year: true,
              owner: true,
              condition: true,
              insuranceNumber: true,
              insuranceExpiry: true,
              pollutionCertNumber: true,
              pollutionCertExpiry: true,
              fitnessCertExpiry: true,
              roadTaxExpiry: true,
              lastInspectionDate: true,
              nextInspectionDue: true,
              registrationDate: true,
              engineNumber: true,
              chassisNumber: true,
              fuelType: true,
              seatingCapacity: true,
              isActive: true,
              createdAt: true,
              contractor: { select: { name: true } },
              site: { select: { name: true } },
              driver: { select: { fullName: true, employeeNumber: true } },
            },
            orderBy: { createdAt: 'desc' },
          }),
          db.vehicle.count({ where }),
        ])

        data = records
        total = count
        columns = [
          'Vehicle No.', 'Type', 'Make', 'Model', 'Year', 'Owner', 'Condition',
          'Insurance No.', 'Insurance Expiry', 'PUC No.', 'PUC Expiry',
          'Fitness Cert Expiry', 'Road Tax Expiry',
          'Last Inspection', 'Next Inspection Due', 'Registration Date',
          'Engine No.', 'Chassis No.', 'Fuel Type', 'Seating Capacity',
          'Active', 'Driver Name', 'Driver Emp. No.', 'Driver Phone',
          'Contractor', 'Site',
        ]
        break
      }

      case 'legal': {
        const where: Record<string, unknown> = {}
        if (contractorId) where.contractorId = contractorId
        if (status) where.status = status
        if (dateFrom || dateTo) {
          const expiryFilter: Record<string, unknown> = {}
          if (dateFrom) expiryFilter.gte = new Date(dateFrom)
          if (dateTo) expiryFilter.lte = new Date(dateTo)
          where.expiryDate = expiryFilter
        }

        const [records, count] = await Promise.all([
          db.legalCompliance.findMany({
            where,
            skip,
            take: limit,
            select: {
              id: true,
              complianceType: true,
              licenseNumber: true,
              issuingAuthority: true,
              issueDate: true,
              expiryDate: true,
              renewalReminderDays: true,
              status: true,
              remarks: true,
              createdAt: true,
              contractor: { select: { name: true } },
            },
            orderBy: { expiryDate: 'asc' },
          }),
          db.legalCompliance.count({ where }),
        ])

        data = records
        total = count
        columns = [
          'Compliance Type', 'License No.', 'Authority',
          'Issue Date', 'Expiry Date', 'Reminder (days)',
          'Status', 'Remarks', 'Contractor',
        ]
        break
      }

      case 'compliance': {
        const siteWhere: Record<string, unknown> = {}
        if (siteId) siteWhere.siteId = siteId
        if (status) siteWhere.status = status

        const [facilities, secItems, medItems] = await Promise.all([
          db.siteFacility.findMany({
            where: siteWhere,
            select: {
              id: true,
              item: true,
              status: true,
              lastInspectionDate: true,
              inspector: true,
              remarks: true,
              createdAt: true,
              site: { select: { name: true } },
            },
          }),
          db.siteSecurityItem.findMany({
            where: siteWhere,
            select: {
              id: true,
              item: true,
              status: true,
              compliancePct: true,
              lastInspectionDate: true,
              inspector: true,
              remarks: true,
              createdAt: true,
              site: { select: { name: true } },
            },
          }),
          db.medInfraItem.findMany({
            where: siteWhere,
            select: {
              id: true,
              item: true,
              status: true,
              lastInspectionDate: true,
              inspector: true,
              remarks: true,
              createdAt: true,
              site: { select: { name: true } },
            },
          }),
        ])

        data = [
          ...facilities.map((f) => ({ ...f, category: 'Facility' })),
          ...secItems.map((s) => ({ ...s, category: 'Security' })),
          ...medItems.map((m) => ({ ...m, category: 'Medical Infrastructure' })),
        ]
        total = data.length
        columns = [
          'Category', 'Item', 'Status', 'Compliance %',
          'Last Inspection', 'Inspector', 'Remarks', 'Site',
        ]
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    // CSV export
    if (format === 'csv') {
      const csvRows: string[] = []
      csvRows.push(columns.map(c => `"${c}"`).join(','))

      for (const row of data as Record<string, unknown>[]) {
        const values = columns.map((col, idx) => {
          let value = ''
          // Try to extract the value based on column name
          if (idx === 0 && category === 'compliance') {
            value = String((row as Record<string, unknown>).category ?? '')
          } else {
            value = extractValue(row, col, category)
          }
          // Escape for CSV
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        })
        csvRows.push(values.join(','))
      }

      const csvContent = csvRows.join('\n')
      const filename = `report_${category}_${new Date().toISOString().slice(0, 10)}.csv`

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    return NextResponse.json({ data, total, page, limit, columns })
  } catch (error) {
    console.error('GET /api/reports error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

// Helper to extract a value from a data row based on column name
function extractValue(row: Record<string, unknown>, column: string, _category: string): string {
  const value = getColumnValue(row, column)
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') {
    // For related objects, try to get name
    if ('name' in value) return String((value as { name: unknown }).name ?? '')
    return JSON.stringify(value)
  }
  // Format dates
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    try {
      return new Date(value).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    } catch {
      return value
    }
  }
  return String(value)
}

function getColumnValue(row: Record<string, unknown>, column: string): unknown {
  // Map column names to data field paths
  const colMap: Record<string, string> = {
    'Employee No.': 'employeeNumber',
    'Full Name': 'fullName',
    'Name': 'fullName',
    'Worker Name': 'worker.fullName',
    'Gender': 'gender',
    'Date of Birth': 'dateOfBirth',
    'DOB': 'dateOfBirth',
    'Age': 'age',
    'Blood Group': 'bloodGroup',
    'Aadhaar No.': 'aadhaarNumber',
    'UAN No.': 'uanNumber',
    'Qualification': 'qualification',
    'Designation': 'designation.name',
    'Contractor': 'contractor.name',
    'Site': 'site.name',
    'Labour Camp': 'labourCamp.name',
    'Status': 'status',
    'Registered On': 'createdAt',
    'Date': 'date',
    'Shift': 'shiftTiming',
    'Biometric': 'isBiometric',
    'OT Hours': 'overtimeHours',
    'Remarks': 'remarks',
    'Training Title': 'trainingTitle',
    'Type': 'trainingType',
    'Exam Type': 'examinationType',
    'Doctor': 'examiningDoctor',
    'Facility': 'examiningFacility',
    'Result': 'result',
    'Next Checkup': 'nextCheckupDate',
    'Frequency (months)': 'checkupFrequencyMonths',
    'Duration (hrs)': 'durationHours',
    'Trainer': 'trainerName',
    'Agency': 'trainingAgency',
    'Certificate No.': 'certificateNumber',
    'Valid Until': 'validityDate',
    'Completed': 'isCompleted',
    'Incident No.': 'incidentNumber',
    'Time': 'time',
    'Location': 'locationOnSite',
    'Description': 'description',
    'Severity': 'severity',
    'Fatal?': 'isDeath',
    'Hospital': 'hospitalReferred',
    'FIR Ref.': 'policeFIRReference',
    'Compensation': 'compensationStatus',
    'Involved Workers': 'workers',
    'Vehicle No.': 'vehicleNumber',
    'Vehicle Type': 'vehicleType',
    'Make': 'make',
    'Model': 'model',
    'Year': 'year',
    'Owner': 'owner',
    'Condition': 'condition',
    'Insurance No.': 'insuranceNumber',
    'Insurance Expiry': 'insuranceExpiry',
    'PUC No.': 'pollutionCertNumber',
    'PUC Expiry': 'pollutionCertExpiry',
    'Fitness Cert Expiry': 'fitnessCertExpiry',
    'Road Tax Expiry': 'roadTaxExpiry',
    'Last Inspection': 'lastInspectionDate',
    'Next Inspection Due': 'nextInspectionDue',
    'Registration Date': 'registrationDate',
    'Engine No.': 'engineNumber',
    'Chassis No.': 'chassisNumber',
    'Fuel Type': 'fuelType',
    'Seating Capacity': 'seatingCapacity',
    'Active': 'isActive',
    'Driver Name': 'driver.fullName',
    'Driver Emp. No.': 'driver.employeeNumber',
    'Driver Phone': 'driver.phone',
    'Compliance Type': 'complianceType',
    'License No.': 'licenseNumber',
    'Authority': 'issuingAuthority',
    'Issue Date': 'issueDate',
    'Expiry Date': 'expiryDate',
    'Reminder (days)': 'renewalReminderDays',
    'Compliance %': 'compliancePct',
    'Item': 'item',
    'Inspector': 'inspector',
    'Category': 'category',
  }

  const field = colMap[column]
  if (!field) return ''

  // Handle nested fields like 'worker.fullName'
  const parts = field.split('.')
  let current: unknown = row
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return ''
    }
  }
  return current
}
