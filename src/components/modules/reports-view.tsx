'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Users,
  CalendarCheck,
  GraduationCap,
  HeartPulse,
  AlertTriangle,
  Truck,
  Scale,
  ClipboardCheck,
  ArrowLeft,
  Download,
  Search,
  X,
  FileBarChart,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldAlert,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useNavStore } from '@/stores/nav-store'
import { useSort } from '@/lib/use-sort'
import { SortableHeader } from '@/components/shared/sortable-header'
import { TableExportButton, type ExportColumn } from '@/components/ui/table-export-button'

// ---------- types ----------
type ReportCategory =
  | 'workforce'
  | 'attendance'
  | 'training'
  | 'medical'
  | 'incidents'
  | 'vehicles'
  | 'legal'
  | 'compliance'
  | 'police_intimation'

interface CategoryConfig {
  id: ReportCategory
  label: string
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: 'workforce',
    label: 'Workforce',
    description: 'Worker register, UAN/PF details',
    icon: Users,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
  },
  {
    id: 'attendance',
    label: 'Attendance',
    description: 'Daily/monthly attendance',
    icon: CalendarCheck,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    id: 'training',
    label: 'Training',
    description: 'Training records, expiry alerts',
    icon: GraduationCap,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  {
    id: 'medical',
    label: 'Medical',
    description: 'Medical examination records',
    icon: HeartPulse,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
  },
  {
    id: 'incidents',
    label: 'Incidents',
    description: 'Incident reports',
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  {
    id: 'vehicles',
    label: 'Vehicles',
    description: 'Vehicle/machinery status',
    icon: Truck,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
  },
  {
    id: 'legal',
    label: 'Legal',
    description: 'Compliance/license status',
    icon: Scale,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  {
    id: 'compliance',
    label: 'Site Compliance',
    description: 'Facility/security/medical compliance',
    icon: ClipboardCheck,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  {
    id: 'police_intimation',
    label: 'AP Police Intimation',
    description: 'Out-of-state workers for police verification',
    icon: ShieldAlert,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
]

interface ReportsResponse {
  data: Record<string, unknown>[]
  total: number
  page: number
  limit: number
  columns: string[]
}

// ---------- helpers ----------
function formatDate(value: unknown): string {
  if (!value) return '—'
  if (typeof value !== 'string') return String(value)
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch {
    return value
  }
}

function formatValue(value: unknown, col: string): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') {
    if (col.toLowerCase().includes('date') || col.toLowerCase().includes('until') || col.toLowerCase().includes('due') || col.toLowerCase().includes('on') || col === 'Date' || col === 'DOB') {
      return formatDate(value)
    }
    return value
  }
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (typeof v === 'object' && v !== null && 'name' in v) return String((v as { name: string }).name)
        return String(v)
      })
      .join(', ')
  }
  if (typeof value === 'object' && 'name' in value) {
    return String((value as { name: string }).name)
  }
  return JSON.stringify(value)
}

// Column name → data field mapping (module scope for reuse)
const COL_MAP: Record<string, string> = {
  'Employee No.': 'employeeNumber',
  'Full Name': 'fullName',
  'Worker Name': 'worker.fullName',
  'Gender': 'gender',
  'Date of Birth': 'dateOfBirth',
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

function getColumnValue(row: Record<string, unknown>, column: string): unknown {
  const field = COL_MAP[column] ?? column.toLowerCase()
  const parts = field.split('.')
  let current: unknown = row
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part]
    } else {
      current = null
      break
    }
  }
  // Fallback: try column name directly (for police intimation etc.)
  if (current === null && column in row) {
    return row[column]
  }
  return current
}

function getStatusBadge(value: string): React.ReactNode {
  if (!value) return null
  const lower = value.toLowerCase()
  if (lower === 'active' || lower === 'valid' || lower === 'compliant' || lower === 'fit' || lower === 'present') {
    return <Badge variant="outline" className="status-valid border-emerald-300 dark:border-emerald-700">{value}</Badge>
  }
  if (lower === 'inactive' || lower === 'expired' || lower === 'noncompliant' || lower === 'unfit' || lower === 'absent') {
    return <Badge variant="outline" className="status-expired border-red-300 dark:border-red-700">{value}</Badge>
  }
  if (lower === 'expiringsoon' || lower === 'grounded' || lower === 'conditional' || lower === 'halfday' || lower === 'leave') {
    return <Badge variant="outline" className="border-amber-300 dark:border-amber-700 text-amber-700">{value}</Badge>
  }
  if (lower === 'open' || lower === 'pending' || lower === 'needsrepair') {
    return <Badge variant="outline" className="border-orange-300 dark:border-orange-700 text-orange-700">{value}</Badge>
  }
  return value
}

// ---------- main ----------
export default function ReportsView() {
  const setPage = useNavStore((s) => s.setPage)

  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [siteId, setSiteId] = useState('')
  const [contractorId, setContractorId] = useState('')
  const [page, setPageNum] = useState(1)
  const [generating, setGenerating] = useState(false)

  // Category-specific filters
  const [designationId, setDesignationId] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [bloodGroupFilter, setBloodGroupFilter] = useState('')
  const [activeStatus, setActiveStatus] = useState('')
  const [attendanceStatus, setAttendanceStatus] = useState('')
  const [shiftFilter, setShiftFilter] = useState('')
  const [trainingType, setTrainingType] = useState('')
  const [certStatus, setCertStatus] = useState('')
  const [certExpiryFrom, setCertExpiryFrom] = useState('')
  const [certExpiryTo, setCertExpiryTo] = useState('')
  const [medicalResult, setMedicalResult] = useState('')
  const [examType, setExamType] = useState('')
  const [incidentType, setIncidentType] = useState('')
  const [severity, setSeverity] = useState('')
  const [incidentStatus, setIncidentStatus] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [vehicleCondition, setVehicleCondition] = useState('')
  const [vehicleOwner, setVehicleOwner] = useState('')
  const [legalStatus, setLegalStatus] = useState('')
  const [complianceStatus, setComplianceStatus] = useState('')

  const limit = 50

  // Fetch dropdown data
  const { data: sites } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['sites'],
    queryFn: () => fetch('/api/sites').then((r) => r.json()),
  })

  const { data: contractors } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['contractors'],
    queryFn: () => fetch('/api/contractors').then((r) => r.json()),
  })

  const { data: designations } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['designations'],
    queryFn: () => fetch('/api/designations').then((r) => r.json()),
  })

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    params.set('category', selectedCategory || 'workforce')
    params.set('page', String(page))
    params.set('limit', String(limit))

    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    if (siteId) params.set('siteId', siteId)
    if (contractorId) params.set('contractorId', contractorId)
    if (designationId) params.set('designationId', designationId)
    if (genderFilter) params.set('gender', genderFilter)
    if (bloodGroupFilter) params.set('bloodGroup', bloodGroupFilter)
    if (activeStatus) params.set('activeStatus', activeStatus)
    if (attendanceStatus) params.set('status', attendanceStatus)
    if (shiftFilter) params.set('shift', shiftFilter)
    if (trainingType) params.set('trainingType', trainingType)
    if (certStatus) params.set('certStatus', certStatus)
    if (certExpiryFrom) params.set('certExpiryFrom', certExpiryFrom)
    if (certExpiryTo) params.set('certExpiryTo', certExpiryTo)
    if (medicalResult) params.set('medicalResult', medicalResult)
    if (examType) params.set('examType', examType)
    if (incidentType) params.set('incidentType', incidentType)
    if (severity) params.set('severity', severity)
    if (incidentStatus) params.set('status', incidentStatus)
    if (vehicleType) params.set('vehicleType', vehicleType)
    if (vehicleCondition) params.set('condition', vehicleCondition)
    if (vehicleOwner) params.set('owner', vehicleOwner)
    if (legalStatus) params.set('status', legalStatus)
    if (complianceStatus) params.set('status', complianceStatus)

    return params
  }, [
    selectedCategory, page, limit, dateFrom, dateTo, siteId, contractorId,
    designationId, genderFilter, bloodGroupFilter, activeStatus,
    attendanceStatus, shiftFilter, trainingType, certStatus,
    certExpiryFrom, certExpiryTo, medicalResult, examType,
    incidentType, severity, incidentStatus, vehicleType,
    vehicleCondition, vehicleOwner, legalStatus, complianceStatus,
  ])

  // Fetch report data
  const isPoliceIntimation = selectedCategory === 'police_intimation'

  const { data, isLoading } = useQuery<ReportsResponse>({
    queryKey: ['reports', queryParams.toString()],
    queryFn: () => fetch(`/api/reports?${queryParams.toString()}`).then((r) => r.json()),
    enabled: !!selectedCategory && !isPoliceIntimation,
  })

  // Special query for police intimation
  const policeColumns = ['Employee No.', 'Name', 'Native State', 'Aadhaar (Masked)', 'Gender', 'DOB', 'Address', 'Contractor', 'Site', 'Emergency Phone']
  const { data: policeData, isLoading: policeLoading } = useQuery<{ data: Record<string, unknown>[]; total: number }>({
    queryKey: ['other-state-workers-report'],
    queryFn: () => fetch('/api/workers/other-state').then((r) => r.json()).then((res) => ({
      data: res.data.map((w: Record<string, unknown>) => ({
        'Employee No.': w.employeeNumber,
        'Name': w.fullName,
        'Native State': w.nativeState,
        'Aadhaar (Masked)': w.aadhaarNumber,
        'Gender': w.gender,
        'DOB': w.dateOfBirth ? new Date(w.dateOfBirth as string).toLocaleDateString('en-IN') : '—',
        'Address': w.permanentAddress,
        'Contractor': w.contractorName,
        'Site': w.siteName,
        'Emergency Phone': w.emergencyPhone ?? '—',
        id: w.id,
      })),
      total: res.total,
      columns: policeColumns,
      page: 1,
      limit: 500,
    })),
    enabled: isPoliceIntimation,
  })

  const effectiveData = isPoliceIntimation ? policeData : data
  const rows = effectiveData?.data ?? []
  const columns = (effectiveData as ReportsResponse)?.columns ?? []
  const total = effectiveData?.total ?? 0
  const effectiveIsLoading = isPoliceIntimation ? policeLoading : isLoading
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const flatRows = isPoliceIntimation
    ? rows
    : rows.map((row: Record<string, unknown>) => {
        const flat: Record<string, unknown> = { ...row }
        for (const col of columns) {
          const field = COL_MAP[col] ?? col.toLowerCase()
          if (field.includes('.')) {
            const parts = field.split('.')
            let current: unknown = row
            for (const part of parts) {
              if (current && typeof current === 'object' && part in current) {
                current = (current as Record<string, unknown>)[part]
              } else {
                current = null
                break
              }
            }
            flat[col] = current
          }
        }
        return flat
      })
  const { sorted, sortKey, sortDir, toggleSort } = useSort(flatRows)

  // CSV Export
  const handleExportCSV = useCallback(async () => {
    setGenerating(true)
    try {
      if (isPoliceIntimation) {
        // Direct CSV from police data
        if (rows.length === 0) return
        const headers = policeColumns
        const csvRows = rows.map((row) =>
          headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
        )
        const csv = [headers.join(','), ...csvRows].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `police_intimation_${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        return
      }
      const exportParams = new URLSearchParams(queryParams)
      exportParams.set('format', 'csv')
      exportParams.set('limit', '500')
      exportParams.set('page', '1')

      const response = await fetch(`/api/reports?${exportParams.toString()}`)
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report_${selectedCategory}_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Fallback: generate CSV from current data
      if (columns.length > 0 && rows.length > 0) {
        const csvRows: string[] = []
        csvRows.push(columns.map((c) => `"${c}"`).join(','))
        for (const row of rows) {
          const values = columns.map((col) => {
            const val = getColumnValue(row, col)
            const str = val === null || val === undefined ? '' : formatValue(val, col)
            return `"${str.replace(/"/g, '""')}"`
          })
          csvRows.push(values.join(','))
        }
        const csvContent = csvRows.join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `report_${selectedCategory}_${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } finally {
      setGenerating(false)
    }
  }, [queryParams, selectedCategory, columns, rows, isPoliceIntimation, policeColumns])

  // Reset all filters
  const resetFilters = () => {
    setDateFrom('')
    setDateTo('')
    setSiteId('')
    setContractorId('')
    setDesignationId('')
    setGenderFilter('')
    setBloodGroupFilter('')
    setActiveStatus('')
    setAttendanceStatus('')
    setShiftFilter('')
    setTrainingType('')
    setCertStatus('')
    setCertExpiryFrom('')
    setCertExpiryTo('')
    setMedicalResult('')
    setExamType('')
    setIncidentType('')
    setSeverity('')
    setIncidentStatus('')
    setVehicleType('')
    setVehicleCondition('')
    setVehicleOwner('')
    setLegalStatus('')
    setComplianceStatus('')
    setPageNum(1)
  }

  // Clear category and go back
  const handleBack = () => {
    setSelectedCategory(null)
    resetFilters()
  }

  const hasFilters = !!(dateFrom || dateTo || siteId || contractorId ||
    designationId || genderFilter || bloodGroupFilter || activeStatus ||
    attendanceStatus || shiftFilter || trainingType || certStatus ||
    medicalResult || examType || incidentType || severity ||
    incidentStatus || vehicleType || vehicleCondition || vehicleOwner ||
    legalStatus || complianceStatus)

  // Render category-specific filters
  const renderSpecificFilters = () => {
    if (!selectedCategory) return null

    switch (selectedCategory) {
      case 'workforce':
        return (
          <>
            <Select value={designationId} onValueChange={(v) => { setDesignationId(v); setPageNum(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Designation" />
              </SelectTrigger>
              <SelectContent>
                {designations?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={genderFilter} onValueChange={(v) => { setGenderFilter(v); setPageNum(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={bloodGroupFilter} onValueChange={(v) => { setBloodGroupFilter(v); setPageNum(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Blood Group" />
              </SelectTrigger>
              <SelectContent>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activeStatus} onValueChange={(v) => { setActiveStatus(v); setPageNum(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </>
        )

      case 'attendance':
        return (
          <>
            <Select value={attendanceStatus} onValueChange={(v) => { setAttendanceStatus(v); setPageNum(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Present">Present</SelectItem>
                <SelectItem value="Absent">Absent</SelectItem>
                <SelectItem value="HalfDay">Half Day</SelectItem>
                <SelectItem value="Leave">Leave</SelectItem>
              </SelectContent>
            </Select>
            <Select value={shiftFilter} onValueChange={(v) => { setShiftFilter(v); setPageNum(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6AM-2PM">6AM - 2PM</SelectItem>
                <SelectItem value="2PM-10PM">2PM - 10PM</SelectItem>
                <SelectItem value="10PM-6AM">10PM - 6AM</SelectItem>
              </SelectContent>
            </Select>
          </>
        )

      case 'training':
        return (
          <>
            <Select value={trainingType} onValueChange={(v) => { setTrainingType(v); setPageNum(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Training Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="JobSpecific">Job Specific</SelectItem>
                <SelectItem value="SafetyInduction">Safety Induction</SelectItem>
                <SelectItem value="POSH">POSH</SelectItem>
                <SelectItem value="Special">Special</SelectItem>
                <SelectItem value="MockDrill">Mock Drill</SelectItem>
              </SelectContent>
            </Select>
            <Select value={certStatus} onValueChange={(v) => { setCertStatus(v); setPageNum(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Certificate Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Valid">Valid</SelectItem>
                <SelectItem value="ExpiringSoon">Expiring Soon</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="Cert. Expiry From"
              value={certExpiryFrom}
              onChange={(e) => { setCertExpiryFrom(e.target.value); setPageNum(1) }}
              className="w-full sm:w-auto"
            />
            <Input
              type="date"
              placeholder="Cert. Expiry To"
              value={certExpiryTo}
              onChange={(e) => { setCertExpiryTo(e.target.value); setPageNum(1) }}
              className="w-full sm:w-auto"
            />
          </>
        )

      case 'medical':
        return (
          <>
            <Select value={medicalResult} onValueChange={(v) => { setMedicalResult(v); setPageNum(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Fit">Fit</SelectItem>
                <SelectItem value="Unfit">Unfit</SelectItem>
                <SelectItem value="Conditional">Conditional</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={examType} onValueChange={(v) => { setExamType(v); setPageNum(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Examination Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PreEmployment">Pre-Employment</SelectItem>
                <SelectItem value="Periodic">Periodic</SelectItem>
                <SelectItem value="Special">Special</SelectItem>
              </SelectContent>
            </Select>
          </>
        )

      case 'incidents':
        return (
          <>
            <Select value={incidentType} onValueChange={(v) => { setIncidentType(v); setPageNum(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Incident Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FireInjury">Fire Injury</SelectItem>
                <SelectItem value="MinorInjury">Minor Injury</SelectItem>
                <SelectItem value="MajorFatalInjury">Major/Fatal Injury</SelectItem>
                <SelectItem value="Death">Death</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={(v) => { setSeverity(v); setPageNum(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={incidentStatus} onValueChange={(v) => { setIncidentStatus(v); setPageNum(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="UnderInvestigation">Under Investigation</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </>
        )

      case 'vehicles':
        return (
          <>
            <Select value={vehicleType} onValueChange={(v) => { setVehicleType(v); setPageNum(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Vehicle Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dumper">Dumper</SelectItem>
                <SelectItem value="JCB">JCB</SelectItem>
                <SelectItem value="Crane">Crane</SelectItem>
                <SelectItem value="Tanker">Tanker</SelectItem>
                <SelectItem value="Passenger">Passenger</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={vehicleCondition} onValueChange={(v) => { setVehicleCondition(v); setPageNum(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Fit">Fit</SelectItem>
                <SelectItem value="NeedsRepair">Needs Repair</SelectItem>
                <SelectItem value="Grounded">Grounded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={vehicleOwner} onValueChange={(v) => { setVehicleOwner(v); setPageNum(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Contractor">Contractor</SelectItem>
                <SelectItem value="Rented">Rented</SelectItem>
              </SelectContent>
            </Select>
          </>
        )

      case 'legal':
        return (
          <Select value={legalStatus} onValueChange={(v) => { setLegalStatus(v); setPageNum(1) }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Valid">Valid</SelectItem>
              <SelectItem value="ExpiringSoon">Expiring Soon</SelectItem>
              <SelectItem value="Expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        )

      case 'compliance':
        return (
          <Select value={complianceStatus} onValueChange={(v) => { setComplianceStatus(v); setPageNum(1) }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Compliant">Compliant</SelectItem>
              <SelectItem value="NonCompliant">Non-Compliant</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        )

      case 'police_intimation':
        return (
          <p className="text-sm text-muted-foreground col-span-full">
            This report lists all active workers from states other than Andhra Pradesh for police verification. No additional filters available.
          </p>
        )

      default:
        return null
    }
  }

  // Get visible columns for desktop (max 8)
  const visibleColumns = isPoliceIntimation ? columns : columns.slice(0, 8)

  // Export columns matching the visible table columns
  const reportExportColumns = useMemo<ExportColumn<Record<string, unknown>>[]>(
    () =>
      visibleColumns.map((col) => ({
        key: col,
        header: col,
        accessor: (row: Record<string, unknown>) => formatValue(getColumnValue(row, col), col),
      })),
    [visibleColumns]
  )

  // ---------- category selection view ----------
  if (!selectedCategory) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate and view reports across all modules
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => (
            <Card
              key={cat.id}
              className={`cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] border ${cat.borderColor}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <CardContent className="p-5">
                <div className={`w-10 h-10 rounded-lg ${cat.bgColor} flex items-center justify-center mb-3`}>
                  <cat.icon className={`h-5 w-5 ${cat.color}`} />
                </div>
                <h3 className="font-semibold text-sm">{cat.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // ---------- report results view ----------
  const currentCat = CATEGORIES.find((c) => c.id === selectedCategory)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" className="shrink-0" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div className="flex items-center gap-2">
          {currentCat && (
            <>
              <div className={`w-8 h-8 rounded-lg ${currentCat.bgColor} flex items-center justify-center`}>
                <currentCat.icon className={`h-4 w-4 ${currentCat.color}`} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{currentCat.label} Report</h1>
            </>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {!isPoliceIntimation && (
      <Card className="py-0">
        <CardContent className="px-3 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select value={siteId} onValueChange={(v) => { setSiteId(v); setPageNum(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Site" />
              </SelectTrigger>
              <SelectContent>
                {sites?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={contractorId} onValueChange={(v) => { setContractorId(v); setPageNum(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Contractor" />
              </SelectTrigger>
              <SelectContent>
                {contractors?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="From date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPageNum(1) }}
            />
            <Input
              type="date"
              placeholder="To date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPageNum(1) }}
            />
          </div>
          {selectedCategory && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 pt-3 border-t">
              {renderSpecificFilters()}
            </div>
          )}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExportCSV}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export CSV
            </Button>
            {hasFilters && (
              <Button
                variant="outline"
                size="sm"
                className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                onClick={(e) => { e.stopPropagation(); resetFilters() }}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Results */}
      <Card>
        <CardContent className="p-0">
          {effectiveIsLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-40" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileBarChart className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-base font-medium">No records found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              {/* Result count + Export */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {total} record{total !== 1 ? 's' : ''} found
                  </p>
                  {columns.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({columns.length} columns)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <TableExportButton
                    rows={sorted as Record<string, unknown>[]}
                    columns={reportExportColumns}
                    filename={`report_${selectedCategory}`}
                    variant="outline"
                    size="sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleExportCSV}
                    disabled={generating}
                  >
                    {generating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Export CSV
                  </Button>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto max-h-[calc(100vh-12rem)] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead className="w-12">S.No</TableHead>
                      {visibleColumns.map((col) => (
                        <SortableHeader key={col} column={col} sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="whitespace-nowrap text-xs">
                          {col}
                        </SortableHeader>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((row, idx) => (
                      <TableRow key={String(row.id ?? idx)} className="hover:bg-muted/50">
                        <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                        {visibleColumns.map((col) => {
                          const val = getColumnValue(row, col)
                          const formatted = formatValue(val, col)
                          // Show status badges for status columns
                          const isStatusCol = col.toLowerCase() === 'status' || col === 'Result' || col === 'Condition' || col === 'Severity'
                          return (
                            <TableCell key={col} className="text-xs whitespace-nowrap">
                              {isStatusCol ? getStatusBadge(String(formatted)) : formatted}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y max-h-[60vh] overflow-y-auto">
                {rows.map((row, idx) => (
                  <div key={String(row.id ?? idx)} className="p-4">
                    <div className="space-y-2">
                      {/* First row: key identifiers */}
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">
                          {formatValue(getColumnValue(row, columns[0] || ''), columns[0] || '')}
                        </p>
                        {columns.some((c) => c.toLowerCase() === 'status') && (
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {formatValue(getColumnValue(row, 'Status'), 'Status')}
                          </Badge>
                        )}
                      </div>
                      {/* Remaining fields as detail lines */}
                      <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                        {columns.slice(1).map((col) => (
                          <div key={col} className="truncate">
                            <span className="font-medium text-foreground/60">{col}:</span>{' '}
                            {formatValue(getColumnValue(row, col), col)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPageNum(page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                      const start = Math.max(1, page - 2)
                      const p = start + i
                      if (p > totalPages) return null
                      return (
                        <Button
                          key={p}
                          variant={p === page ? 'default' : 'outline'}
                          size="sm"
                          className={p === page ? 'bg-[#0d9488] hover:bg-[#0f766e] text-white' : ''}
                          onClick={() => setPageNum(p)}
                        >
                          {p}
                        </Button>
                      )
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPageNum(page + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
