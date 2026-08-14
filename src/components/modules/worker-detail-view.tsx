'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  ArrowLeft,
  Pencil,
  GraduationCap,
  Plus,
  Stethoscope,
  CalendarCheck,
  Shield,
  Wallet,
  HeartPulse,
  Phone,
  User,
  MapPin,
  Briefcase,
  AlertTriangle,
  CreditCard,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import WorkerIdCard from './worker-id-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNavStore } from '@/stores/nav-store'
import { useAuthStore, rolePermissions } from '@/lib/auth-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ---------- types ----------
interface WorkerData {
  id: string
  profilePhotoPath: string | null
  employeeNumber: string
  fullName: string
  dateOfBirth: string
  age: number
  gender: string
  aadhaarNumber: string
  permanentAddress: string
  currentAddress: string | null
  bloodGroup: string
  qualification: string
  qualificationNote: string | null
  zone: string | null
  reportingSupervisor: string | null
  isActive: boolean
  createdAt: string
  designation: { id: string; name: string; category: string }
  contractor: { id: string; name: string; code: string }
  site: { id: string; name: string; code: string } | null
  fitness: {
    id: string
    fitnessStatus: string
    fitnessValidityDate: string | null
    totalExperienceYears: number
    relevantExperienceYears: number
    skillLevel: string
  } | null
  emergencyContacts: {
    id: string
    name: string
    relationship: string
    phone: string
    isPrimary: boolean
  }[]
  nominees: {
    id: string
    name: string
    relationship: string
    idNumber: string | null
    contactNumber: string | null
  }[]
  medicalRecords: {
    id: string
    examinationDate: string
    examinationType: string
    result: string
    nextCheckupDate: string | null
    remarks: string | null
  }[]
  trainingRecords: {
    id: string
    trainingType: string
    trainingTitle: string
    dateConducted: string
    status: string
    validityDate: string | null
  }[]
  insurances: {
    id: string
    policyType: string
    policyNumber: string
    insurerName: string | null
    coverageAmount: number | null
    validityStartDate: string | null
    validityEndDate: string | null
  }[]
}

interface AttendanceRecord {
  id: string
  date: string
  status: string
  shiftTiming: string | null
}

// ---------- helpers ----------
function maskAadhaar(aadhaar: string): string {
  if (!aadhaar || aadhaar.length < 4) return 'XXXX'
  const last4 = aadhaar.slice(-4)
  return `XXXX-XXXX-XXXX-${last4}`
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

const FITNESS_STATUS_CLASS: Record<string, string> = {
  Fit: 'status-valid',
  Unfit: 'status-expired',
  FitWithRestriction: 'status-expiring',
  Pending: 'status-pending',
}

const TRAINING_STATUS_CLASS: Record<string, string> = {
  Valid: 'status-valid',
  ExpiringSoon: 'status-expiring',
  Expired: 'status-expired',
  Pending: 'status-pending',
}

const MEDICAL_RESULT_CLASS: Record<string, string> = {
  Fit: 'status-valid',
  Unfit: 'status-expired',
  Conditional: 'status-expiring',
  Pending: 'status-pending',
}

const ATTENDANCE_STATUS_CLASS: Record<string, string> = {
  Present: 'status-valid',
  HalfDay: 'status-expiring',
  Absent: 'status-expired',
  Leave: 'status-pending',
}

// ---------- skeleton ----------
function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  )
}

// ---------- info row ----------
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-2.5 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground shrink-0 sm:w-40">{label}</span>
      <span className="text-sm font-medium break-all">{value || '—'}</span>
    </div>
  )
}

// ---------- main ----------
export default function WorkerDetailView() {
  const { pageParams, setPage, goBack } = useNavStore()
  const openWorkerForm = useNavStore((s) => s.openWorkerForm)
  const workerId = pageParams.id as string
  const role = useAuthStore((s) => s.role)
  const perms = rolePermissions[role]

  const { data, isLoading, error } = useQuery<{ data: WorkerData }>({
    queryKey: ['worker', workerId],
    queryFn: () => fetch(`/api/workers/${workerId}`).then((r) => {
      if (!r.ok) throw new Error('Worker not found')
      return r.json()
    }),
    enabled: !!workerId,
  })

  const [idCardOpen, setIdCardOpen] = useState(false)

  // Attendance for last 7 days
  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 6)
  const attendanceMonth = sevenDaysAgo.toISOString().slice(0, 7)

  const { data: attendanceData } = useQuery<{ data: AttendanceRecord[] }>({
    queryKey: ['worker-attendance', workerId, attendanceMonth],
    queryFn: () =>
      fetch(`/api/workers/${workerId}/attendance?month=${attendanceMonth}`).then((r) => r.json()),
    enabled: !!workerId,
  })

  const attendanceRecords = attendanceData?.data ?? []
  // Filter last 7 days
  const last7Attendance = attendanceRecords.filter((a) => {
    const d = new Date(a.date)
    return d >= sevenDaysAgo && d <= today
  })

  if (!workerId) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>No worker ID provided</p>
      </div>
    )
  }

  if (isLoading) return <DetailSkeleton />

  if (error || !data?.data) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Failed to load worker</p>
        <p className="text-sm mt-1">The worker may not exist or data could not be loaded</p>
        <Button variant="outline" className="mt-4" onClick={goBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    )
  }

  const w = data.data

  return (
    <div className="space-y-6">
      {/* ====== Header ====== */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button variant="outline" size="icon" className="shrink-0" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        {w.profilePhotoPath && w.profilePhotoPath.startsWith('data:') ? (
          <img
            src={w.profilePhotoPath}
            alt={w.fullName}
            className="w-20 h-20 rounded-full object-cover border-2 border-[#0d9488] shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-[#0d9488] text-white flex items-center justify-center text-2xl font-bold shrink-0">
            {w.fullName.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight truncate">{w.fullName}</h1>
            <Badge variant="outline" className="font-mono text-xs shrink-0">
              {w.employeeNumber}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                'shrink-0',
                w.isActive
                  ? 'status-valid border-emerald-300 dark:border-emerald-700'
                  : 'status-expired border-red-300 dark:border-red-700'
              )}
            >
              {w.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {w.designation.name} &middot; {w.contractor.name}
            {w.site ? ` &middot; ${w.site.name}` : ''}
          </p>
        </div>
      </div>

      {/* ====== Personal Info Card ====== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-[#0d9488]" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="md:pr-6">
              <InfoRow label="Date of Birth" value={formatDate(w.dateOfBirth)} />
              <InfoRow label="Age" value={`${w.age} years`} />
              <InfoRow label="Gender" value={w.gender} />
              <InfoRow label="Blood Group" value={w.bloodGroup} />
              <InfoRow
                label="Aadhaar Number"
                value={perms.canViewAadhaar ? w.aadhaarNumber : maskAadhaar(w.aadhaarNumber)}
              />
            </div>
            <div className="md:pl-6">
              <InfoRow label="Qualification" value={w.qualification} />
              {w.qualificationNote && (
                <InfoRow label="Qualification Note" value={w.qualificationNote} />
              )}
              <InfoRow label="Permanent Address" value={w.permanentAddress} />
              <InfoRow label="Current / Site Address" value={w.currentAddress} />
              <InfoRow label="Zone" value={w.zone} />
              <InfoRow label="Reporting Supervisor" value={w.reportingSupervisor} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ====== Emergency Contacts Card ====== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4 text-red-500" />
            Emergency Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {w.emergencyContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No emergency contacts on record</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {w.emergencyContacts.map((ec) => (
                <div
                  key={ec.id}
                  className={cn(
                    'rounded-lg border p-4',
                    ec.isPrimary && 'border-[#0d9488] bg-teal-50/50 dark:bg-teal-900/10'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{ec.name}</p>
                    {ec.isPrimary && (
                      <Badge className="bg-[#0d9488] text-white text-[10px] px-1.5 py-0">
                        Primary
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{ec.relationship}</p>
                  <p className="text-sm font-mono mt-1.5">{ec.phone}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ====== Nominee Card ====== */}
      {w.nominees.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#0d9488]" />
              Nominee Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {w.nominees.map((n) => (
                <div key={n.id} className="rounded-lg border p-4 space-y-1.5">
                  <p className="font-medium text-sm">{n.name}</p>
                  <p className="text-xs text-muted-foreground">{n.relationship}</p>
                  {n.idNumber && (
                    <p className="text-xs text-muted-foreground">
                      ID: <span className="font-mono">{n.idNumber}</span>
                    </p>
                  )}
                  {n.contactNumber && (
                    <p className="text-xs text-muted-foreground">
                      Contact: <span className="font-mono">{n.contactNumber}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ====== Tabs Section ====== */}
      <Tabs defaultValue="fitness" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="fitness" className="text-xs sm:text-sm flex-1 min-w-0">
            <HeartPulse className="h-4 w-4 mr-1.5 hidden sm:inline" />
            Fitness & Experience
          </TabsTrigger>
          <TabsTrigger value="medical" className="text-xs sm:text-sm flex-1 min-w-0">
            <Stethoscope className="h-4 w-4 mr-1.5 hidden sm:inline" />
            Medical Records
          </TabsTrigger>
          <TabsTrigger value="training" className="text-xs sm:text-sm flex-1 min-w-0">
            <GraduationCap className="h-4 w-4 mr-1.5 hidden sm:inline" />
            Training Records
          </TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs sm:text-sm flex-1 min-w-0">
            <CalendarCheck className="h-4 w-4 mr-1.5 hidden sm:inline" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="insurance" className="text-xs sm:text-sm flex-1 min-w-0">
            <Shield className="h-4 w-4 mr-1.5 hidden sm:inline" />
            Insurance
          </TabsTrigger>
          <TabsTrigger value="wages" className="text-xs sm:text-sm flex-1 min-w-0">
            <Wallet className="h-4 w-4 mr-1.5 hidden sm:inline" />
            Wages
          </TabsTrigger>
        </TabsList>

        {/* ====== Fitness & Experience Tab ====== */}
        <TabsContent value="fitness">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Fitness & Experience</CardTitle>
                {perms.canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage('worker-fitness', { id: w.id })}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit Fitness
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {w.fitness ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Fitness Status</p>
                    <Badge className={FITNESS_STATUS_CLASS[w.fitness.fitnessStatus] ?? 'status-pending'}>
                      {w.fitness.fitnessStatus === 'FitWithRestriction'
                        ? 'Fit w/ Restriction'
                        : w.fitness.fitnessStatus}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Skill Level</p>
                    <p className="text-sm font-medium">{w.fitness.skillLevel}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Experience</p>
                    <p className="text-sm font-medium">{w.fitness.totalExperienceYears} years</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Relevant Experience</p>
                    <p className="text-sm font-medium">{w.fitness.relevantExperienceYears} years</p>
                  </div>
                  <div className="space-y-1 col-span-2 sm:col-span-4">
                    <p className="text-xs text-muted-foreground">Fitness Certificate Validity</p>
                    <p className="text-sm font-medium">{formatDate(w.fitness.fitnessValidityDate)}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <HeartPulse className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No fitness record on file</p>
                  {perms.canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setPage('worker-fitness', { id: w.id })}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add Fitness Record
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== Medical Records Tab ====== */}
        <TabsContent value="medical">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Medical Records</CardTitle>
            </CardHeader>
            <CardContent>
              {w.medicalRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Stethoscope className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No medical records on file</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {w.medicalRecords.map((m) => (
                    <div
                      key={m.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg border"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{m.examinationType}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(m.examinationDate)}</p>
                      </div>
                      <Badge className={MEDICAL_RESULT_CLASS[m.result] ?? 'status-pending'}>
                        {m.result}
                      </Badge>
                      {m.nextCheckupDate && (
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          Next: {formatDate(m.nextCheckupDate)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== Training Records Tab ====== */}
        <TabsContent value="training">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Training Records</CardTitle>
            </CardHeader>
            <CardContent>
              {w.trainingRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No training records on file</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {w.trainingRecords.map((t) => (
                    <div
                      key={t.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg border"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {t.trainingType}
                          </Badge>
                          <p className="text-sm font-medium truncate">{t.trainingTitle}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(t.dateConducted)}
                        </p>
                      </div>
                      <Badge className={TRAINING_STATUS_CLASS[t.status] ?? 'status-pending'}>
                        {t.status === 'ExpiringSoon' ? 'Expiring' : t.status}
                      </Badge>
                      {t.validityDate && (
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          Valid till: {formatDate(t.validityDate)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== Attendance Tab ====== */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Attendance (Last 7 Days)</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info('Navigate to the Attendance module to mark attendance')}
                >
                  <CalendarCheck className="h-3.5 w-3.5 mr-1.5" />
                  Mark Attendance
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {last7Attendance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No attendance records for the last 7 days</p>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-2">
                  {last7Attendance.map((a) => {
                    const dayName = new Date(a.date).toLocaleDateString('en-IN', { weekday: 'short' })
                    const dayNum = new Date(a.date).getDate()
                    return (
                      <div key={a.id} className="text-center space-y-1.5">
                        <p className="text-xs text-muted-foreground">{dayName}</p>
                        <p className="text-sm font-medium">{dayNum}</p>
                        <Badge
                          className={cn(
                            'text-[10px] px-1.5 py-0',
                            ATTENDANCE_STATUS_CLASS[a.status] ?? 'status-pending'
                          )}
                        >
                          {a.status === 'HalfDay' ? '½ Day' : a.status}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== Insurance Tab ====== */}
        <TabsContent value="insurance">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Insurance Policies</CardTitle>
            </CardHeader>
            <CardContent>
              {w.insurances.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No insurance records on file</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {w.insurances.map((ins) => (
                    <div
                      key={ins.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-3 rounded-lg border"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            {ins.policyType}
                          </Badge>
                          <p className="text-sm font-medium font-mono truncate">{ins.policyNumber}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {ins.insurerName ?? 'Unknown insurer'}
                        </p>
                      </div>
                      {ins.coverageAmount != null && (
                        <p className="text-sm font-medium">{formatCurrency(ins.coverageAmount)}</p>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {formatDate(ins.validityStartDate)} — {formatDate(ins.validityEndDate)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== Wages Tab ====== */}
        <TabsContent value="wages">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Wage Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Wage records are managed via the Payroll module</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ====== Action Buttons ====== */}
      {perms.canEdit && (
        <div className="flex flex-wrap gap-3 pb-4">
          <Button
            variant="outline"
            onClick={() => openWorkerForm(w.id)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit Worker
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.info('Navigate to Training module to add training records')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Training
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.info('Navigate to Medical module to add medical records')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Medical Record
          </Button>
          <Button
            variant="outline"
            onClick={() => setIdCardOpen(true)}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            ID Card
          </Button>
        </div>
      )}

      {/* ====== ID Card Dialog ====== */}
      <Dialog open={idCardOpen} onOpenChange={setIdCardOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Worker ID Card</DialogTitle>
          </DialogHeader>
          <WorkerIdCard worker={w} />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => window.print()}
            >
              Print Card
            </Button>
            <Button
              variant="outline"
              onClick={() => setIdCardOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
