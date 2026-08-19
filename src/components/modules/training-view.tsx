'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller, useWatch } from 'react-hook-form'
import {
  Plus,
  Search,
  GraduationCap,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Clock,
  Users,
  FileText,
  X,
  Award,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore, rolePermissions } from '@/lib/auth-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format, parseISO, isPast, differenceInDays } from 'date-fns'
import TrainingCertificate from '@/components/shared/training-certificate'
import WorkerMultiSelect from '@/components/shared/worker-multi-select'
import DateRangeFilter from '@/components/shared/date-range-filter'
import { useSort } from '@/lib/use-sort'
import { SortableHeader } from '@/components/shared/sortable-header'
import { TablePagination } from '@/components/shared/table-pagination'
import { TableExportButton, type ExportColumn } from '@/components/ui/table-export-button'

// ---------- types ----------
interface Worker {
  id: string
  employeeNumber: string
  fullName: string
  isActive: boolean
  designation: { name: string }
  contractor?: { name: string } | null
  /** "Project" in the UI — workers are tagged to one site. */
  site?: { id: string; name: string } | null
}

interface Site {
  id: string
  name: string
  code: string
}

interface WorkersResponse {
  data: Worker[]
  total: number
}

interface TrainingRecord {
  id: string
  workerId: string
  trainingType: string
  trainingTitle: string
  dateConducted: string
  durationHours: number
  trainerName: string | null
  trainerCredentials: string | null
  trainingAgency: string | null
  certificateNumber: string | null
  validityDate: string | null
  status: string
  isCompleted: boolean
  remarks: string | null
  worker?: { fullName: string }
}

interface TrainingFormValues {
  siteId: string
  workerIds: string[]
  trainingType: string
  trainingTitle: string
  dateConducted: string
  durationHours: string
  trainerName: string
  trainerCredentials: string
  trainingAgency: string
  certificateNumber: string
  validityDate: string
  isCompleted: boolean
  remarks: string
}

// ---------- helpers ----------
function trainingTypeColor(type: string): string {
  switch (type) {
    case 'SafetyInduction': return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400'
    case 'JobSpecific': return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400'
    case 'POSH': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
    case 'Special': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
    case 'MockDrill': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    default: return 'bg-slate-100 text-slate-800'
  }
}

function trainingTypeLabel(type: string): string {
  switch (type) {
    case 'SafetyInduction': return 'Safety Induction'
    case 'JobSpecific': return 'Job Specific'
    case 'POSH': return 'POSH'
    case 'Special': return 'Special'
    case 'MockDrill': return 'Mock Drill'
    default: return type
  }
}

function generateCertificateNumber(records: TrainingRecord[], currentIndex: number): string {
  // Find how many records share the same dateConducted with index <= currentIndex
  const currentDate = records[currentIndex]?.dateConducted
  if (!currentDate) return `TRN-${format(new Date(), 'yyyyMMdd')}-0001`
  const dateStr = format(parseISO(currentDate), 'yyyyMMdd')
  // Count records with same date that appear before this one
  let seq = 0
  for (let i = 0; i <= currentIndex; i++) {
    if (records[i].dateConducted === currentDate) seq++
  }
  return `TRN-${dateStr}-${String(seq).padStart(4, '0')}`
}

/** Local calendar day (yyyy-MM-dd) of a stored timestamp — what the table shows. */
function localDay(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'Valid': return 'status-valid'
    case 'ExpiringSoon': return 'status-expiring'
    case 'Expired': return 'status-expired'
    default: return 'status-pending'
  }
}

// ---------- export columns ----------
const trainingExportColumns: ExportColumn<TrainingRecord>[] = [
  { key: 'worker', header: 'Worker', accessor: (r) => r.worker?.fullName ?? 'Unknown' },
  { key: 'trainingType', header: 'Type', accessor: (r) => trainingTypeLabel(r.trainingType) },
  { key: 'trainingTitle', header: 'Title' },
  { key: 'dateConducted', header: 'Date', accessor: (r) => {
      try { return format(parseISO(r.dateConducted), 'dd MMM yyyy') } catch { return r.dateConducted }
    } },
  { key: 'durationHours', header: 'Hours', accessor: (r) => r.durationHours },
  { key: 'trainerName', header: 'Trainer', accessor: (r) => r.trainerName ?? '' },
  { key: 'status', header: 'Status', accessor: (r) => (r.status === 'ExpiringSoon' ? 'Expiring' : r.status) },
  { key: 'validityDate', header: 'Validity', accessor: (r) => {
      if (!r.validityDate) return ''
      try { return format(parseISO(r.validityDate), 'dd MMM yyyy') } catch { return r.validityDate }
    } },
]

// ---------- skeleton ----------
function SummarySkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}><CardContent className="p-3"><Skeleton className="h-12 w-full" /></CardContent></Card>
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-36 flex-1" />
          <Skeleton className="h-4 w-20 hidden sm:block" />
          <Skeleton className="h-5 w-16 hidden md:block" />
          <Skeleton className="h-4 w-16 hidden lg:block" />
        </div>
      ))}
    </div>
  )
}

// Radix Select forbids an empty item value, so "no project filter" needs a sentinel.
const ALL_PROJECTS = '__all_projects__'

interface SummaryStats {
  total: number
  valid: number
  expiring: number
  expired: number
}

/** The four summary tiles, which double as the status filter ('' = everything). */
const SUMMARY_CARDS: {
  label: string
  status: string
  icon: typeof GraduationCap
  value: (s: SummaryStats) => number
  cardClass: string
  iconClass: string
  valueClass: string
  ringClass: string
}[] = [
  {
    label: 'Total Trainings',
    status: '',
    icon: GraduationCap,
    value: (s) => s.total,
    cardClass: 'bg-teal-50 text-teal-700 border-teal-200',
    iconClass: 'bg-teal-100 text-teal-600',
    valueClass: '',
    ringClass: 'outline-teal-600',
  },
  {
    label: 'Valid',
    status: 'Valid',
    icon: CheckCircle2,
    value: (s) => s.valid,
    cardClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconClass: 'bg-emerald-100 text-emerald-600',
    valueClass: 'text-emerald-700',
    ringClass: 'outline-emerald-600',
  },
  {
    label: 'Expiring Soon',
    status: 'ExpiringSoon',
    icon: AlertTriangle,
    value: (s) => s.expiring,
    cardClass: 'bg-amber-50 text-amber-700 border-amber-200',
    iconClass: 'bg-amber-100 text-amber-600',
    valueClass: 'text-amber-700',
    ringClass: 'outline-amber-600',
  },
  {
    label: 'Expired',
    status: 'Expired',
    icon: XCircle,
    value: (s) => s.expired,
    cardClass: 'bg-rose-50 text-rose-700 border-rose-200',
    iconClass: 'bg-rose-100 text-rose-600',
    valueClass: 'text-rose-700',
    ringClass: 'outline-rose-600',
  },
]

// ---------- add training dialog ----------
function AddTrainingDialog({ open, onOpenChange }: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<TrainingFormValues>({
    defaultValues: {
      siteId: '',
      workerIds: [],
      trainingType: 'SafetyInduction',
      trainingTitle: '',
      dateConducted: format(new Date(), 'yyyy-MM-dd'),
      durationHours: '',
      trainerName: '',
      trainerCredentials: '',
      trainingAgency: '',
      certificateNumber: '',
      validityDate: '',
      isCompleted: false,
      remarks: '',
    },
  })

  const selectedWorkerIds = useWatch({ control, name: 'workerIds' }) ?? []
  const selectedSiteId = useWatch({ control, name: 'siteId' }) ?? ''

  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: () => fetch('/api/sites').then((r) => r.json()),
    enabled: open,
  })

  // The workers endpoint caps `limit` at 100, so page through it — otherwise
  // "Select all" would silently only ever cover the first 100 workers.
  const { data: workers = [], isLoading: workersLoading } = useQuery<Worker[]>({
    queryKey: ['workers-select-all'],
    queryFn: async () => {
      const all: Worker[] = []
      let page = 1
      for (;;) {
        const resp: WorkersResponse = await fetch(
          `/api/workers?limit=100&page=${page}`,
        ).then((r) => r.json())
        all.push(...(resp.data ?? []))
        if (all.length >= (resp.total ?? 0) || !resp.data?.length) break
        page++
      }
      return all
    },
    enabled: open,
  })

  const mutation = useMutation({
    mutationFn: async (data: TrainingFormValues) => {
      const status = data.validityDate
        ? isPast(parseISO(data.validityDate))
          ? 'Expired'
          : differenceInDays(parseISO(data.validityDate), new Date()) <= 30
            ? 'ExpiringSoon'
            : 'Valid'
        : 'Valid'

      const payload = {
        trainingType: data.trainingType,
        trainingTitle: data.trainingTitle,
        dateConducted: data.dateConducted,
        durationHours: parseFloat(data.durationHours) || 0,
        trainerName: data.trainerName || null,
        trainerCredentials: data.trainerCredentials || null,
        trainingAgency: data.trainingAgency || null,
        certificateNumber: data.certificateNumber || null,
        validityDate: data.validityDate || null,
        status,
        isCompleted: data.isCompleted,
        remarks: data.remarks || null,
      }

      // One record per selected worker. Settled rather than all-or-nothing so a
      // single bad worker doesn't discard the rest of a 50-worker batch.
      const results = await Promise.allSettled(
        data.workerIds.map(async (workerId) => {
          const res = await fetch(`/api/workers/${workerId}/training`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error(body.error || 'Failed to add training record')
          }
          return res.json()
        }),
      )

      const failed = results.filter((r) => r.status === 'rejected').length
      return { total: data.workerIds.length, failed }
    },
    onSuccess: ({ total, failed }) => {
      const saved = total - failed
      if (failed === 0) {
        toast.success(
          saved === 1
            ? 'Training record added successfully'
            : `Training record added for ${saved} workers`,
        )
      } else if (saved === 0) {
        toast.error(`Failed to add training for all ${total} workers`)
      } else {
        toast.warning(`Added for ${saved} of ${total} workers — ${failed} failed`)
      }
      queryClient.invalidateQueries({ queryKey: ['training-all'] })
      if (saved > 0) {
        reset()
        onOpenChange(false)
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to add training record')
    },
  })

  const onSubmit = (data: TrainingFormValues) => mutation.mutate(data)

  const selectedCount = selectedWorkerIds.length

  const workerCountBySite = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const w of workers) {
      if (w.site?.id) counts[w.site.id] = (counts[w.site.id] ?? 0) + 1
    }
    return counts
  }, [workers])

  // The project is an optional filter — with none picked, every worker is offered.
  const projectWorkers = useMemo(
    () => (selectedSiteId ? workers.filter((w) => w.site?.id === selectedSiteId) : workers),
    [workers, selectedSiteId],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-[#0d9488]" />
            Add Training Record
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Optional — narrows the worker list below to one project */}
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <Label>Project</Label>
              <span className="text-xs text-muted-foreground">
                Optional — narrows the worker list
              </span>
            </div>
            <Controller
              control={control}
              name="siteId"
              render={({ field }) => (
                <Select
                  value={field.value || ALL_PROJECTS}
                  onValueChange={(v) => field.onChange(v === ALL_PROJECTS ? '' : v)}
                >
                  <SelectTrigger className="mt-1 w-full">
                    {/* Explicit children so the trigger shows the name only —
                        otherwise Radix echoes the item's count badge too. */}
                    <SelectValue placeholder="All projects">
                      {sites.find((s) => s.id === field.value)?.name ?? 'All projects'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value={ALL_PROJECTS}>
                      <span className="flex w-full items-center justify-between gap-6">
                        <span>All projects</span>
                        {!workersLoading && (
                          <span className="text-muted-foreground text-xs">
                            {workers.length} workers
                          </span>
                        )}
                      </span>
                    </SelectItem>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex w-full items-center justify-between gap-6">
                          <span>{s.name}</span>
                          {/* Counts come from the worker list; suppress them
                              until it lands so projects don't read as empty. */}
                          {!workersLoading && (
                            <span className="text-muted-foreground text-xs">
                              {workerCountBySite[s.id] ?? 0} workers
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Worker Select — multiple workers get one identical record each */}
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <Label>Workers *</Label>
              <span className="text-xs text-muted-foreground">
                {selectedSiteId
                  ? `${projectWorkers.length} in this project — select all or pick individually`
                  : `${projectWorkers.length} across all projects`}
              </span>
            </div>
            <Controller
              control={control}
              name="workerIds"
              rules={{ validate: (v) => v.length > 0 }}
              render={({ field }) => (
                <WorkerMultiSelect
                  className="mt-1"
                  workers={projectWorkers}
                  value={field.value}
                  onChange={field.onChange}
                  loading={workersLoading}
                />
              )}
            />
            {errors.workerIds && (
              <p className="text-xs text-destructive mt-1">Select at least one worker</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Training Type *</Label>
              <Controller
                control={control}
                name="trainingType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SafetyInduction">Safety Induction</SelectItem>
                      <SelectItem value="JobSpecific">Job Specific</SelectItem>
                      <SelectItem value="POSH">POSH</SelectItem>
                      <SelectItem value="Special">Special</SelectItem>
                      <SelectItem value="MockDrill">Mock Drill</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label>Training Title *</Label>
              <Input
                placeholder="e.g. Fire Safety Training"
                {...register('trainingTitle', { required: true })}
                className="mt-1"
              />
              {errors.trainingTitle && <p className="text-xs text-destructive mt-1">Required</p>}
            </div>
            <div>
              <Label>Date Conducted *</Label>
              <Input type="date" {...register('dateConducted', { required: true })} className="mt-1" />
              {errors.dateConducted && <p className="text-xs text-destructive mt-1">Required</p>}
            </div>
            <div>
              <Label>Duration (hours)</Label>
              <Input type="number" step="0.5" min="0" placeholder="e.g. 4" {...register('durationHours')} className="mt-1" />
            </div>
            <div>
              <Label>Trainer Name</Label>
              <Input placeholder="Trainer name" {...register('trainerName')} className="mt-1" />
            </div>
            <div>
              <Label>Trainer Credentials</Label>
              <Input placeholder="e.g. NEBOSH certified" {...register('trainerCredentials')} className="mt-1" />
            </div>
            <div>
              <Label>Training Agency</Label>
              <Input placeholder="Agency name" {...register('trainingAgency')} className="mt-1" />
            </div>
            <div>
              <Label>Certificate Number</Label>
              <Input placeholder="Certificate #" {...register('certificateNumber')} className="mt-1" />
              {selectedCount > 1 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Applied to all {selectedCount} workers — leave blank to auto-number each.
                </p>
              )}
            </div>
            <div>
              <Label>Validity Date</Label>
              <Input type="date" {...register('validityDate')} className="mt-1" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="isCompleted"
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(!!checked)}
                />
              )}
            />
            <Label className="text-sm">Training Completed</Label>
          </div>

          <div>
            <Label>Remarks</Label>
            <Textarea placeholder="Additional remarks..." {...register('remarks')} className="mt-1" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              type="submit"
              className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? `Saving${selectedCount > 1 ? ` ${selectedCount} records` : ''}...`
                : selectedCount > 1
                  ? `Add Training for ${selectedCount} Workers`
                  : 'Add Training'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface CertificateDialogState {
  open: boolean
  record: TrainingRecord | null
  certNumber: string
}

// ---------- certificate dialog ----------
function CertificateDialog({ state, onClose }: { state: CertificateDialogState; onClose: () => void }) {
  const { data: workersResp } = useQuery<WorkersResponse>({
    queryKey: ['workers-select-cert'],
    queryFn: () => fetch('/api/workers?limit=100').then((r) => r.json()),
    enabled: state.open,
  })
  const workers = workersResp?.data ?? []
  const worker = workers.find((w) => w.id === state.record?.workerId)

  if (!state.open || !state.record) return null

  const r = state.record
  const effectiveCertNumber = r.certificateNumber || state.certNumber

  return (
    <Dialog open={state.open} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#0d9488]" />
            Training Certificate
          </DialogTitle>
        </DialogHeader>
        <TrainingCertificate
          workerName={r.worker?.fullName ?? 'Unknown'}
          employeeNumber={worker?.employeeNumber ?? ''}
          trainingTitle={r.trainingTitle}
          trainingType={r.trainingType}
          dateConducted={r.dateConducted}
          durationHours={r.durationHours}
          trainerName={r.trainerName}
          certificateNumber={effectiveCertNumber}
          validityDate={r.validityDate}
          contractorName={worker?.contractor?.name ?? ''}
          designation={worker?.designation?.name ?? ''}
        />
      </DialogContent>
    </Dialog>
  )
}

// ---------- main component ----------
export default function TrainingView() {
  const role = useAuthStore((s) => s.role)
  const perms = rolePermissions[role]

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  // Opens on "Overall" (no date bound); pick a preset or days to narrow it.
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15
  const [dialogOpen, setDialogOpen] = useState(false)
  const [certDialog, setCertDialog] = useState<CertificateDialogState>({ open: false, record: null, certNumber: '' })

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const hasActiveFilter = !!(search || typeFilter || statusFilter || dateFrom || dateTo)
  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setTypeFilter('')
    setStatusFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  /** The summary cards double as the status filter; '' is "Total Trainings". */
  const selectStatus = (status: string) => {
    setStatusFilter((prev) => (prev === status ? '' : status))
    setPage(1)
  }

  // Fetch all workers
  const { data: workersResp, isLoading: workersLoading } = useQuery<WorkersResponse>({
    queryKey: ['workers-training'],
    queryFn: () => fetch('/api/workers?limit=100').then((r) => r.json()),
  })
  const allWorkers = workersResp?.data ?? []

  // Fetch training records for all workers
  const { data: trainingMap, isLoading: trainingLoading } = useQuery<Record<string, TrainingRecord[]>>({
    queryKey: ['training-all', allWorkers.map(w => w.id).join(',')],
    queryFn: async () => {
      const map: Record<string, TrainingRecord[]> = {}
      await Promise.all(
        allWorkers.map(async (w) => {
          try {
            const resp = await fetch(`/api/workers/${w.id}/training`)
            const json = await resp.json()
            map[w.id] = (json.data ?? []).map((r: TrainingRecord) => ({
              ...r,
              worker: { fullName: w.fullName },
            }))
          } catch {
            map[w.id] = []
          }
        })
      )
      return map
    },
    enabled: allWorkers.length > 0,
  })

  // Flatten all records with worker name
  const allRecords = useMemo(() => {
    if (!trainingMap) return []
    return Object.values(trainingMap).flat()
  }, [trainingMap])

  // Generate cert numbers for records that don't have one
  const certNumberMap = useMemo(() => {
    const map: Record<string, string> = {}
    allRecords.forEach((r, idx) => {
      if (!r.certificateNumber) {
        map[r.id] = generateCertificateNumber(allRecords, idx)
      }
    })
    return map
  }, [allRecords])

  // Everything except the status filter — the summary cards are the status
  // dimension, so their counts describe this set rather than the whole table.
  const recordsBeforeStatus = useMemo(() => {
    return allRecords.filter((r) => {
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase()
        const matchesWorker = r.worker?.fullName.toLowerCase().includes(q)
        const matchesTitle = r.trainingTitle.toLowerCase().includes(q)
        if (!matchesWorker && !matchesTitle) return false
      }
      if (typeFilter && r.trainingType !== typeFilter) return false
      if (dateFrom || dateTo) {
        // dateConducted is a UTC timestamp but the table renders it in local
        // time, so the range must compare the same local date the user sees —
        // slicing the raw ISO string would put a 01 Apr record under 31 Mar.
        const day = localDay(r.dateConducted)
        if (!day) return false
        if (dateFrom && day < dateFrom) return false
        if (dateTo && day > dateTo) return false
      }
      return true
    })
  }, [allRecords, debouncedSearch, typeFilter, dateFrom, dateTo])

  const filteredRecords = useMemo(
    () =>
      statusFilter
        ? recordsBeforeStatus.filter((r) => r.status === statusFilter)
        : recordsBeforeStatus,
    [recordsBeforeStatus, statusFilter],
  )

  // Most recently conducted first until the user picks a column to sort by.
  const flatTrainingRecords = useMemo(
    () =>
      [...filteredRecords]
        .sort((a, b) => b.dateConducted.localeCompare(a.dateConducted))
        .map((r) => ({
          ...r,
          'worker.fullName': r.worker?.fullName ?? '',
        })) as (TrainingRecord & Record<string, unknown>)[],
    [filteredRecords],
  )
  const { sorted, sortKey, sortDir, toggleSort } = useSort(flatTrainingRecords)

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pagedRecords = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Summary stats — reflect the search/type/date filters so the tiles always
  // add up to what the table is showing.
  const summary = useMemo(() => {
    const total = recordsBeforeStatus.length
    const valid = recordsBeforeStatus.filter((r) => r.status === 'Valid').length
    const expiring = recordsBeforeStatus.filter((r) => r.status === 'ExpiringSoon').length
    const expired = recordsBeforeStatus.filter((r) => r.status === 'Expired').length
    return { total, valid, expiring, expired }
  }, [recordsBeforeStatus])

  const isLoading = workersLoading || trainingLoading

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-6rem)] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Training & Certification</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? 'Loading...' : `${summary.total} training record${summary.total !== 1 ? 's' : ''} across all workers`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TableExportButton
            rows={sorted}
            columns={trainingExportColumns}
            filename="training_records"
            variant="outline"
            size="default"
          />
          {perms.canEdit && (
            <Button
              className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Training
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <SummarySkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          {SUMMARY_CARDS.map((card) => {
            const Icon = card.icon
            const isActive = statusFilter === card.status
            return (
              <button
                key={card.label}
                type="button"
                onClick={() => selectStatus(card.status)}
                aria-pressed={isActive}
                title={`Show ${card.label.toLowerCase()}`}
                className="text-left rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0d9488]"
              >
                <Card
                  className={cn(
                    card.cardClass,
                    'cursor-pointer transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99]',
                    // Drawn inside the card — an outward ring/offset is clipped
                    // by the page's overflow-hidden and crowds the sidebar.
                    isActive && `outline-2 -outline-offset-2 shadow-lg ${card.ringClass}`,
                  )}
                >
                  <CardContent className="p-3 flex items-center gap-2">
                    <div className={cn('rounded-xl p-2 shrink-0 flex items-center justify-center', card.iconClass)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-xl font-bold tracking-tight', card.valueClass)}>
                        {card.value(summary)}
                      </p>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 truncate">
                        {card.label}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </button>
            )
          })}
        </div>
      )}

      {/* Active-card context line */}
      {!isLoading && (
        <p className="text-xs text-muted-foreground shrink-0 -mt-1">
          Showing{' '}
          <span className="font-medium text-foreground">
            {SUMMARY_CARDS.find((c) => c.status === statusFilter)?.label ?? 'Total Trainings'}
          </span>{' '}
          — {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}, most recent first
        </p>
      )}

      {/* Filter Bar */}
      <Card className="py-0 shrink-0">
        <CardContent className="px-3 py-2">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by worker name or training title..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter || '__all__'} onValueChange={(v) => { setTypeFilter(v === '__all__' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Training Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Types</SelectItem>
                <SelectItem value="SafetyInduction">Safety Induction</SelectItem>
                <SelectItem value="JobSpecific">Job Specific</SelectItem>
                <SelectItem value="POSH">POSH</SelectItem>
                <SelectItem value="Special">Special</SelectItem>
                <SelectItem value="MockDrill">Mock Drill</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter || '__all__'} onValueChange={(v) => { setStatusFilter(v === '__all__' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Status</SelectItem>
                <SelectItem value="Valid">Valid</SelectItem>
                <SelectItem value="ExpiringSoon">Expiring Soon</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            {/* Date conducted — one calendar, presets plus a custom range */}
            <DateRangeFilter
              from={dateFrom}
              to={dateTo}
              onChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1) }}
              className="w-full sm:w-56"
            />
            {hasActiveFilter && (
              <Button
                variant="outline"
                size="sm"
                className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                onClick={(e) => { e.stopPropagation(); clearFilters() }}
              >
                Clear <X className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table / Cards */}
      <div className="flex-1 min-h-0 flex flex-col">
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardContent className="flex-1 min-h-0 overflow-y-auto p-0">
          {isLoading ? (
            <div className="p-4"><TableSkeleton /></div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-base font-medium">No training records found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead className="w-12">S.No</TableHead>
                      <TableHead className="w-36">Worker</TableHead>
                      <TableHead className="w-32">Type</TableHead>
                      <SortableHeader column="trainingTitle" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Title</SortableHeader>
                      <SortableHeader column="dateConducted" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="w-28">Date</SortableHeader>
                      <TableHead className="w-20">Hours</TableHead>
                      <TableHead className="w-32">Trainer</TableHead>
                      <SortableHeader column="status" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="w-28">Status</SortableHeader>
                      <TableHead className="w-28">Validity</TableHead>
                      <TableHead className="w-16">Certificate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedRecords.map((r, index) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + index + 1}</TableCell>
                        <TableCell className="font-medium text-sm">
                          {r.worker?.fullName ?? 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn('text-xs border-0', trainingTypeColor(r.trainingType))}
                          >
                            {trainingTypeLabel(r.trainingType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{r.trainingTitle}</TableCell>
                        <TableCell className="text-sm">
                          {format(parseISO(r.dateConducted), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.durationHours > 0 ? `${r.durationHours}h` : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.trainerName || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', statusBadgeClass(r.status))}>
                            {r.status === 'ExpiringSoon' ? 'Expiring' : r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.validityDate
                            ? format(parseISO(r.validityDate), 'dd MMM yyyy')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {r.isCompleted && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/20"
                              onClick={() => setCertDialog({ open: true, record: r, certNumber: certNumberMap[r.id] || '' })}
                              title="Download Certificate"
                            >
                              <Award className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile / Tablet Cards */}
              <div className="lg:hidden divide-y">
                {pagedRecords.map((r) => (
                  <div key={r.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{r.trainingTitle}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {r.worker?.fullName} · {format(parseISO(r.dateConducted), 'dd MMM yyyy')}
                          {r.durationHours > 0 ? ` · ${r.durationHours}h` : ''}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn('text-xs shrink-0', statusBadgeClass(r.status))}>
                        {r.status === 'ExpiringSoon' ? 'Expiring' : r.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={cn('text-xs border-0', trainingTypeColor(r.trainingType))}>
                        {trainingTypeLabel(r.trainingType)}
                      </Badge>
                      {r.trainerName && (
                        <span className="text-xs text-muted-foreground">Trainer: {r.trainerName}</span>
                      )}
                      {r.validityDate && (
                        <span className="text-xs text-muted-foreground">
                          Valid till: {format(parseISO(r.validityDate), 'dd MMM yyyy')}
                        </span>
                      )}
                    </div>
                    {r.isCompleted && (
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/20"
                          onClick={() => setCertDialog({ open: true, record: r, certNumber: certNumberMap[r.id] || '' })}
                        >
                          <Award className="h-3.5 w-3.5" />
                          Certificate
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <TablePagination page={page} totalPages={totalPages} total={sorted.length} onPageChange={setPage} pageSize={PAGE_SIZE} />
      </div>

      {/* Add Training Dialog */}
      <AddTrainingDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      {/* Certificate Dialog */}
      <CertificateDialog
        state={certDialog}
        onClose={() => setCertDialog({ open: false, record: null, certNumber: '' })}
      />
    </div>
  )
}
