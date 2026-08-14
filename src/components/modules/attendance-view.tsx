'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  CalendarDays,
  Users,
  UserCheck,
  UserX,
  Clock,
  Coffee,
  CheckCircle2,
  Loader2,
  ClipboardCheck,
  CheckSquare,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
  DialogDescription,
  DialogFooter,
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
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAuthStore, rolePermissions } from '@/lib/auth-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { TableExportButton, type ExportColumn } from '@/components/ui/table-export-button'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  isSunday,
  parseISO,
} from 'date-fns'

// ---------- types ----------
interface Worker {
  id: string
  employeeNumber: string
  fullName: string
  isActive: boolean
  designation: { name: string }
}

interface WorkersResponse {
  data: Worker[]
  total: number
}

interface AttendanceRecord {
  id: string
  workerId: string
  date: string
  status: string
  shiftTiming: string | null
  remarks: string | null
}

interface Contractor {
  id: string
  name: string
  code: string
}

interface DialogWorker extends Worker {
  contractorId: string
  siteId: string | null
  contractor: { id: string; name: string; code: string }
  site: { id: string; name: string; code: string } | null
}

const STATUS_OPTIONS = [
  { value: 'Present', label: 'Present', color: 'text-emerald-700' },
  { value: 'Absent', label: 'Absent', color: 'text-red-700' },
  { value: 'HalfDay', label: 'Half Day', color: 'text-amber-700' },
  { value: 'Leave', label: 'Leave', color: 'text-slate-500' },
  { value: 'Holiday', label: 'Holiday', color: 'text-purple-600' },
] as const

type AttendanceStatus = 'Present' | 'Absent' | 'HalfDay' | 'Leave' | 'Holiday'

// ---------- helpers ----------
function statusCellClass(status: string | null, isSundayDay: boolean) {
  if (isSundayDay) return 'bg-muted/30 text-muted-foreground'
  switch (status) {
    case 'Present': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
    case 'Absent': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    case 'HalfDay': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
    case 'Leave': return 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'
    default: return 'text-muted-foreground'
  }
}

function statusLetter(status: string | null, isSundayDay: boolean) {
  if (isSundayDay) return '—'
  switch (status) {
    case 'Present': return 'P'
    case 'Absent': return 'A'
    case 'HalfDay': return 'H'
    case 'Leave': return 'L'
    default: return '—'
  }
}

function dayName(dayIndex: number): string {
  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  return days[dayIndex] ?? ''
}

// ---------- Mark Attendance Dialog ----------
function MarkAttendanceDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [contractorId, setContractorId] = useState<string>('all')
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [workerStatuses, setWorkerStatuses] = useState<Record<string, AttendanceStatus>>({})
  const [selectedWorkers, setSelectedWorkers] = useState<Set<string>>(new Set())

  // Fetch contractors
  const { data: contractors = [], isLoading: contractorsLoading } = useQuery<Contractor[]>({
    queryKey: ['contractors-list'],
    queryFn: () => fetch('/api/contractors').then((r) => r.json()),
  })

  // Fetch workers for selected contractor
  const { data: workersData, isLoading: workersLoading } = useQuery<{
    data: DialogWorker[]
    total: number
  }>({
    queryKey: ['dialog-workers', contractorId],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '200', status: 'active' })
      if (contractorId !== 'all') params.set('contractorId', contractorId)
      return fetch(`/api/workers?${params}`).then((r) => r.json())
    },
  })
  const dialogWorkers = workersData?.data ?? []

  // Fetch existing attendance for the selected date
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const { data: existingAttendance = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['dialog-attendance', dateStr, contractorId],
    queryFn: async () => {
      const resp = await fetch(`/api/attendance?date=${dateStr}${contractorId !== 'all' ? `&contractorId=${contractorId}` : ''}`)
      const json = await resp.json()
      return json.data ?? []
    },
    enabled: dialogWorkers.length > 0,
  })

  // Compute initial statuses from existing attendance (no setState in effect)
  const attendanceStatusMap = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {}
    for (const record of existingAttendance) {
      map[record.workerId] = record.status as AttendanceStatus
    }
    return map
  }, [existingAttendance])

  // Merge user overrides with attendance data
  const effectiveStatuses = useMemo(
    () => ({ ...attendanceStatusMap, ...workerStatuses }),
    [attendanceStatusMap, workerStatuses]
  )

  const handleContractorChange = (value: string) => {
    setContractorId(value)
    setSelectedWorkers(new Set())
    setWorkerStatuses({})
  }

  const handleStatusChange = (workerId: string, status: AttendanceStatus) => {
    setWorkerStatuses((prev) => ({ ...prev, [workerId]: status }))
  }

  const handleSelectAll = () => {
    if (selectedWorkers.size === dialogWorkers.length) {
      setSelectedWorkers(new Set())
    } else {
      setSelectedWorkers(new Set(dialogWorkers.map((w) => w.id)))
    }
  }

  const handleMarkAllPresent = () => {
    const newStatuses = { ...workerStatuses }
    const targets = selectedWorkers.size > 0 ? selectedWorkers : new Set(dialogWorkers.map((w) => w.id))
    for (const id of targets) {
      newStatuses[id] = 'Present'
    }
    setWorkerStatuses(newStatuses)
    if (selectedWorkers.size === 0) {
      setSelectedWorkers(new Set(dialogWorkers.map((w) => w.id)))
    }
  }

  const handleMarkAllAbsent = () => {
    const newStatuses = { ...workerStatuses }
    const targets = selectedWorkers.size > 0 ? selectedWorkers : new Set(dialogWorkers.map((w) => w.id))
    for (const id of targets) {
      newStatuses[id] = 'Absent'
    }
    setWorkerStatuses(newStatuses)
    if (selectedWorkers.size === 0) {
      setSelectedWorkers(new Set(dialogWorkers.map((w) => w.id)))
    }
  }

  const handleToggleWorkerSelection = (workerId: string) => {
    setSelectedWorkers((prev) => {
      const next = new Set(prev)
      if (next.has(workerId)) {
        next.delete(workerId)
      } else {
        next.add(workerId)
      }
      return next
    })
  }

  // Save attendance mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const records = dialogWorkers
        .filter((w) => effectiveStatuses[w.id])
        .map((w) => ({
          workerId: w.id,
          status: effectiveStatuses[w.id],
        }))
      if (records.length === 0) throw new Error('No attendance to save')
      return fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, records }),
      }).then((r) => {
        if (!r.ok) throw new Error('Failed to save attendance')
        return r.json()
      })
    },
    onSuccess: (data) => {
      toast.success(`Attendance saved for ${data.saved} worker(s)`)
      queryClient.invalidateQueries({ queryKey: ['attendance-month'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onOpenChange(false)
      setWorkerStatuses({})
      setSelectedWorkers(new Set())
    },
    onError: () => {
      toast.error('Failed to save attendance')
    },
  })

  const hasChanges = Object.keys(effectiveStatuses).length > 0
  const isAllSelected = dialogWorkers.length > 0 && selectedWorkers.size === dialogWorkers.length
  const isSomeSelected = selectedWorkers.size > 0 && !isAllSelected

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-teal-600" />
            Mark Attendance
          </DialogTitle>
          <DialogDescription>
            Select a date and contractor, then mark attendance for each worker.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Date Picker */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Date</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {format(selectedDate, 'EEEE, dd MMM yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => { if (d) { setSelectedDate(d); setDatePickerOpen(false) } }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Contractor Filter */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Contractor</Label>
              {contractorsLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={contractorId} onValueChange={handleContractorChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Contractors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Contractors</SelectItem>
                    {contractors.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Bulk Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={isAllSelected ? 'default' : 'outline'}
              className={cn(isAllSelected && 'bg-teal-600 hover:bg-teal-700 text-white')}
              onClick={handleSelectAll}
              disabled={dialogWorkers.length === 0}
            >
              <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              onClick={handleMarkAllPresent}
              disabled={dialogWorkers.length === 0 || saveMutation.isPending}
            >
              <UserCheck className="h-3.5 w-3.5 mr-1.5" />
              Mark All as Present
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-700 border-red-300 hover:bg-red-50"
              onClick={handleMarkAllAbsent}
              disabled={dialogWorkers.length === 0 || saveMutation.isPending}
            >
              <UserX className="h-3.5 w-3.5 mr-1.5" />
              Mark All as Absent
            </Button>
            {selectedWorkers.size > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {selectedWorkers.size} selected
              </Badge>
            )}
          </div>

          {/* Workers Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[calc(100vh-12rem)] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Worker Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Emp. No.</TableHead>
                    <TableHead className="hidden md:table-cell">Designation</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workersLoading || contractorsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-28 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : dialogWorkers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No active workers found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    dialogWorkers.map((w) => {
                      const currentStatus = effectiveStatuses[w.id]
                      const isSelected = selectedWorkers.has(w.id)
                      return (
                        <TableRow
                          key={w.id}
                          className={cn(isSelected && 'bg-teal-50/50')}
                        >
                          <TableCell>
                            <button
                              type="button"
                              className={cn(
                                'h-4 w-4 rounded border flex items-center justify-center transition-colors',
                                isSelected
                                  ? 'bg-teal-600 border-teal-600 text-white'
                                  : 'border-gray-300 hover:border-teal-400'
                              )}
                              onClick={() => handleToggleWorkerSelection(w.id)}
                              aria-label={`Select ${w.fullName}`}
                            >
                              {isSelected && <CheckSquare className="h-3 w-3" />}
                            </button>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{w.fullName}</p>
                              <p className="text-xs text-muted-foreground sm:hidden font-mono">{w.employeeNumber}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className="text-xs font-mono text-muted-foreground">{w.employeeNumber}</span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm text-muted-foreground">{w.designation.name}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Select
                              value={currentStatus || ''}
                              onValueChange={(val) => handleStatusChange(w.id, val as AttendanceStatus)}
                            >
                              <SelectTrigger className="w-[130px] justify-end">
                                <SelectValue placeholder="Not Marked" />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    <span className={opt.color}>{opt.label}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => saveMutation.mutate()}
            disabled={!hasChanges || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Save Attendance
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- skeleton ----------
function AttendanceTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4">
          <Skeleton className="h-4 w-36" />
          <div className="flex gap-1">
            {Array.from({ length: 10 }).map((_, j) => (
              <Skeleton key={j} className="h-7 w-7" />
            ))}
          </div>
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  )
}

// ---------- main component ----------
export default function AttendanceView() {
  const role = useAuthStore((s) => s.role)
  const perms = rolePermissions[role]
  const queryClient = useQueryClient()

  const today = new Date()
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(today))
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [mode, setMode] = useState<'grid' | 'quick' | 'day'>('day')
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [markDialogOpen, setMarkDialogOpen] = useState(false)

  const monthStr = format(viewMonth, 'yyyy-MM')
  const monthLabel = format(viewMonth, 'MMMM yyyy')

  // Fetch active workers
  const { data: workersResp, isLoading: workersLoading } = useQuery<WorkersResponse>({
    queryKey: ['workers-attendance'],
    queryFn: () => fetch('/api/workers?limit=100&status=active').then((r) => r.json()),
  })
  const workers = workersResp?.data ?? []

  // Fetch attendance for all workers for the month
  const { data: attendanceMap, isLoading: attendanceLoading } = useQuery<Record<string, AttendanceRecord[]>>({
    queryKey: ['attendance-month', monthStr, workers.map(w => w.id).join(',')],
    queryFn: async () => {
      const map: Record<string, AttendanceRecord[]> = {}
      await Promise.all(
        workers.map(async (w) => {
          try {
            const resp = await fetch(`/api/workers/${w.id}/attendance?month=${monthStr}`)
            const json = await resp.json()
            map[w.id] = json.data ?? []
          } catch {
            map[w.id] = []
          }
        })
      )
      return map
    },
    enabled: workers.length > 0,
  })

  // Days of the month
  const daysInMonth = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) }),
    [viewMonth]
  )

  const isLoading = workersLoading || attendanceLoading

  // Get attendance status for a worker on a specific date
  const getStatusForDate = useCallback((
    workerId: string,
    date: Date
  ): string | null => {
    const records = attendanceMap?.[workerId] ?? []
    const found = records.find((r) => {
      const rDate = parseISO(r.date)
      return isSameDay(rDate, date)
    })
    return found?.status ?? null
  }, [attendanceMap])

  // Compute summary for a worker
  const workerSummary = useCallback((workerId: string) => {
    const records = attendanceMap?.[workerId] ?? []
    let present = 0
    let absent = 0
    let halfDay = 0
    daysInMonth.forEach((day) => {
      if (isSunday(day)) return
      const status = getStatusForDate(workerId, day)
      if (status === 'Present') present++
      else if (status === 'Absent') absent++
      else if (status === 'HalfDay') halfDay++
    })
    return { present, absent, halfDay }
  }, [attendanceMap, daysInMonth, getStatusForDate])

  // Overall summary
  const overallSummary = useMemo(() => {
    let totalPresent = 0
    let totalAbsent = 0
    let totalHalfDay = 0
    let totalExpected = 0

    workers.forEach((w) => {
      const s = workerSummary(w.id)
      totalPresent += s.present
      totalAbsent += s.absent
      totalHalfDay += s.halfDay
      // Count non-Sunday days
      const nonSunDays = daysInMonth.filter((d) => !isSunday(d)).length
      totalExpected += nonSunDays
    })

    const attendancePct = totalExpected > 0
      ? Math.round(((totalPresent + totalHalfDay * 0.5) / totalExpected) * 100)
      : 0

    return { totalPresent, totalAbsent, totalHalfDay, totalExpected, attendancePct }
  }, [workers, workerSummary, daysInMonth])

  // Quick mark attendance mutation
  const markMutation = useMutation({
    mutationFn: async ({ workerId, date, status }: { workerId: string; date: string; status: string }) => {
      return fetch(`/api/workers/${workerId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, status }),
      }).then((r) => r.json())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-month'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: () => {
      toast.error('Failed to mark attendance')
    },
  })

  const handleQuickMark = (workerId: string, status: string) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    markMutation.mutate({ workerId, date: dateStr, status })
  }

  // Bulk mark attendance mutation
  const bulkMarkMutation = useMutation({
    mutationFn: async (status: string) => {
      return fetch('/api/workers/bulk-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: format(selectedDate, 'yyyy-MM-dd'), status }),
      }).then((r) => r.json())
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-month'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(`Marked ${data.marked} workers successfully`)
    },
    onError: () => {
      toast.error('Failed to mark bulk attendance')
    },
  })

  // Grid cell click: cycle through statuses
  const handleGridCellClick = useCallback((workerId: string, day: Date) => {
    if (!perms.canEdit) return
    const currentStatus = getStatusForDate(workerId, day)
    // Cycle: null → Present → Absent → HalfDay → Leave → Present → ...
    const statusCycle = ['Present', 'Absent', 'HalfDay', 'Leave']
    let nextStatus: string
    if (!currentStatus) {
      nextStatus = 'Present'
    } else {
      const currentIndex = statusCycle.indexOf(currentStatus)
      if (currentIndex === -1) {
        nextStatus = 'Present'
      } else {
        nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length]
      }
    }
    const dateStr = format(day, 'yyyy-MM-dd')
    markMutation.mutate({ workerId, date: dateStr, status: nextStatus })
  }, [perms.canEdit, getStatusForDate, markMutation])

  const handlePrevMonth = () => {
    const newDate = new Date(viewMonth)
    newDate.setMonth(newDate.getMonth() - 1)
    setViewMonth(newDate)
  }

  const handleNextMonth = () => {
    const newDate = new Date(viewMonth)
    newDate.setMonth(newDate.getMonth() + 1)
    setViewMonth(newDate)
  }

  // CSV Export
  const handleExportCSV = () => {
    const header = ['Worker Name', 'Employee No.', ...daysInMonth.map(d => format(d, 'dd MMM')), 'Present', 'Absent', 'Half Days']
    const rows = workers.map(w => {
      const summary = workerSummary(w.id)
      return [
        w.fullName,
        w.employeeNumber,
        ...daysInMonth.map(d => {
          if (isSunday(d)) return 'SUN'
          return statusLetter(getStatusForDate(w.id, d), false)
        }),
        summary.present,
        summary.absent,
        summary.halfDay,
      ]
    })

    const csvContent = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `attendance-${monthStr}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported successfully')
  }

  // Export columns for the monthly attendance grid (dynamic per month)
  const attendanceExportColumns = useMemo<ExportColumn<Worker>[]>(() => {
    const cols: ExportColumn<Worker>[] = [
      { key: 'fullName', header: 'Worker Name' },
      { key: 'employeeNumber', header: 'Employee No.' },
    ]
    daysInMonth.forEach((d) => {
      const dayKey = `day_${format(d, 'dd')}`
      cols.push({
        key: dayKey,
        header: format(d, 'dd MMM'),
        accessor: (row) => (isSunday(d) ? 'SUN' : statusLetter(getStatusForDate(row.id, d), false)),
      })
    })
    cols.push(
      { key: 'present', header: 'Present', accessor: (row) => workerSummary(row.id).present },
      { key: 'absent', header: 'Absent', accessor: (row) => workerSummary(row.id).absent },
      { key: 'halfDay', header: 'Half Days', accessor: (row) => workerSummary(row.id).halfDay },
    )
    return cols
  }, [daysInMonth, getStatusForDate, workerSummary])

  // Check if selectedDate is in current view month
  const isSameMonth = format(selectedDate, 'yyyy-MM') === monthStr

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Register</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(today, 'EEEE, dd MMMM yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TableExportButton
            rows={workers}
            columns={attendanceExportColumns}
            filename="attendance_records"
            sheetName={`Attendance ${monthStr}`}
            variant="outline"
            size="default"
          />
          {perms.canEdit && (
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => setMarkDialogOpen(true)}
            >
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Mark Attendance
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Month Navigator */}
        <Card className="flex-1">
          <CardContent className="p-3 flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#0d9488]" />
              <span className="font-semibold text-sm sm:text-base">{monthLabel}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Date Picker */}
        <Card>
          <CardContent className="p-3">
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  {format(selectedDate, 'dd MMM yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => { if (d) { setSelectedDate(d); setViewMonth(startOfMonth(d)); setDatePickerOpen(false) } }}
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {/* Mode Toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={mode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            className={cn(mode === 'grid' && 'bg-[#0d9488] hover:bg-[#0f766e] text-white')}
            onClick={() => setMode('grid')}
          >
            Month View
          </Button>
          <Button
            variant={mode === 'quick' ? 'default' : 'ghost'}
            size="sm"
            className={cn(mode === 'quick' && 'bg-[#0d9488] hover:bg-[#0f766e] text-white')}
            onClick={() => setMode('quick')}
          >
            Quick Mark
          </Button>
          <Button
            variant={mode === 'day' ? 'default' : 'ghost'}
            size="sm"
            className={cn(mode === 'day' && 'bg-[#0d9488] hover:bg-[#0f766e] text-white')}
            onClick={() => setMode('day')}
          >
            Day View
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card className="h-full bg-teal-50 text-teal-700 border-teal-200 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99]">
            <CardContent className="p-3 h-full flex items-center gap-2">
              <div className="rounded-xl p-2 shrink-0 bg-teal-100 text-teal-600 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold tracking-tight tabular-nums leading-tight">{workers.length}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 truncate">Workers</p>
              </div>
            </CardContent>
          </Card>
          <Card className="h-full bg-emerald-50 text-emerald-700 border-emerald-200 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99]">
            <CardContent className="p-3 h-full flex items-center gap-2">
              <div className="rounded-xl p-2 shrink-0 bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <UserCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold tracking-tight tabular-nums leading-tight text-emerald-700">{overallSummary.totalPresent}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 truncate">Present</p>
              </div>
            </CardContent>
          </Card>
          <Card className="h-full bg-rose-50 text-rose-700 border-rose-200 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99]">
            <CardContent className="p-3 h-full flex items-center gap-2">
              <div className="rounded-xl p-2 shrink-0 bg-rose-100 text-rose-600 flex items-center justify-center">
                <UserX className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold tracking-tight tabular-nums leading-tight text-rose-700">{overallSummary.totalAbsent}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 truncate">Absent</p>
              </div>
            </CardContent>
          </Card>
          <Card className="h-full bg-amber-50 text-amber-700 border-amber-200 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99]">
            <CardContent className="p-3 h-full flex items-center gap-2">
              <div className="rounded-xl p-2 shrink-0 bg-amber-100 text-amber-600 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold tracking-tight tabular-nums leading-tight text-amber-700">{overallSummary.totalHalfDay}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 truncate">Half Days</p>
              </div>
            </CardContent>
          </Card>
          <Card className="h-full bg-slate-50 text-slate-700 border-slate-200 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99]">
            <CardContent className="p-3 h-full flex items-center gap-2">
              <div className="rounded-xl p-2 shrink-0 bg-slate-100 text-slate-600 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold tracking-tight tabular-nums leading-tight text-slate-700">{overallSummary.attendancePct}%</p>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 truncate">Attendance %</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* GRID MODE: Monthly Grid */}
      {mode === 'grid' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[calc(100vh-12rem)] overflow-y-auto">
              {isLoading ? (
                <div className="p-4"><AttendanceTableSkeleton /></div>
              ) : workers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Users className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-base font-medium">No active workers</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead className="sticky left-0 bg-card z-10 min-w-[160px]">Worker</TableHead>
                      {daysInMonth.map((day) => (
                        <TableHead
                          key={day.toISOString()}
                          className={cn(
                            'text-center min-w-[32px] px-1 text-xs',
                            isSunday(day) && 'text-muted-foreground/50'
                          )}
                        >
                          <div>{format(day, 'dd')}</div>
                          <div className="text-[10px] font-normal">{dayName(getDay(day))}</div>
                        </TableHead>
                      ))}
                      <TableHead className="text-center bg-emerald-50 dark:bg-emerald-900/10">P</TableHead>
                      <TableHead className="text-center bg-red-50 dark:bg-red-900/10">A</TableHead>
                      <TableHead className="text-center bg-amber-50 dark:bg-amber-900/10">H</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workers.map((w) => {
                      const summary = workerSummary(w.id)
                      return (
                        <TableRow key={w.id}>
                          <TableCell className="sticky left-0 bg-card z-10">
                            <div>
                              <p className="font-medium text-sm">{w.fullName}</p>
                              <p className="text-xs text-muted-foreground font-mono">{w.employeeNumber}</p>
                            </div>
                          </TableCell>
                          {daysInMonth.map((day) => {
                            const status = getStatusForDate(w.id, day)
                            const sunday = isSunday(day)
                            return (
                              <TableCell
                                key={day.toISOString()}
                                className={cn(
                                  'text-center p-1',
                                  statusCellClass(status, sunday),
                                  !sunday && perms.canEdit && 'cursor-pointer hover:ring-2 hover:ring-[#0d9488]/40 transition-all'
                                )}
                                onClick={() => handleGridCellClick(w.id, day)}
                              >
                                <span className="text-xs font-medium">
                                  {statusLetter(status, sunday)}
                                </span>
                              </TableCell>
                            )
                          })}
                          <TableCell className="text-center bg-emerald-50 dark:bg-emerald-900/10">
                            <span className="text-sm font-semibold text-emerald-700">{summary.present}</span>
                          </TableCell>
                          <TableCell className="text-center bg-red-50 dark:bg-red-900/10">
                            <span className="text-sm font-semibold text-red-700">{summary.absent}</span>
                          </TableCell>
                          <TableCell className="text-center bg-amber-50 dark:bg-amber-900/10">
                            <span className="text-sm font-semibold text-amber-700">{summary.halfDay}</span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* DAY VIEW MODE */}
      {mode === 'day' && (
        <TooltipProvider>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#0d9488]" />
                Attendance for {format(selectedDate, 'EEEE, dd MMM yyyy')}
                {isSunday(selectedDate) && (
                  <Badge variant="outline" className="status-pending text-xs">Sunday</Badge>
                )}
              </CardTitle>
            </CardHeader>
            {/* Day Summary Row */}
            {isSameMonth && !isLoading && workers.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 px-6 pb-3">
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">
                  <UserCheck className="h-3 w-3 mr-1" />
                  {workers.filter(w => getStatusForDate(w.id, selectedDate) === 'Present').length} Present
                </Badge>
                <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0">
                  <UserX className="h-3 w-3 mr-1" />
                  {workers.filter(w => getStatusForDate(w.id, selectedDate) === 'Absent').length} Absent
                </Badge>
                <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-0">
                  <Coffee className="h-3 w-3 mr-1" />
                  {workers.filter(w => getStatusForDate(w.id, selectedDate) === 'Leave').length} Leave
                </Badge>
                <Badge variant="outline" className="text-muted-foreground">
                  {workers.filter(w => !getStatusForDate(w.id, selectedDate)).length} Not Marked
                </Badge>
              </div>
            )}
            {/* Bulk Actions for editors */}
            {perms.canEdit && (
              <div className="flex flex-wrap items-center gap-2 px-6 pb-3">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => bulkMarkMutation.mutate('Present')}
                  disabled={bulkMarkMutation.isPending || markMutation.isPending}
                >
                  {bulkMarkMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Mark All Present
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => bulkMarkMutation.mutate('Absent')}
                  disabled={bulkMarkMutation.isPending || markMutation.isPending}
                >
                  {bulkMarkMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <UserX className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Mark All Absent
                </Button>
                <Button
                  size="sm"
                  className="bg-slate-600 hover:bg-slate-700 text-white"
                  onClick={() => bulkMarkMutation.mutate('Leave')}
                  disabled={bulkMarkMutation.isPending || markMutation.isPending}
                >
                  {bulkMarkMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Coffee className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Mark All Leave
                </Button>
              </div>
            )}
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              ) : workers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm">No active workers</p>
                </div>
              ) : !isSameMonth ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CalendarDays className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm">Selected date is not in the current view month</p>
                  <p className="text-xs text-muted-foreground mt-1">Use the month navigator to switch to the correct month</p>
                </div>
              ) : (
                <div className="divide-y max-h-[calc(100vh-12rem)] overflow-y-auto">
                  {workers.map((w) => {
                    const currentStatus = getStatusForDate(w.id, selectedDate)
                    let badgeClass = 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    let badgeLabel = 'Not Marked'
                    if (currentStatus === 'Present') {
                      badgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                      badgeLabel = 'P'
                    } else if (currentStatus === 'Absent') {
                      badgeClass = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      badgeLabel = 'A'
                    } else if (currentStatus === 'HalfDay') {
                      badgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                      badgeLabel = 'H'
                    } else if (currentStatus === 'Leave') {
                      badgeClass = 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'
                      badgeLabel = 'L'
                    }
                    return (
                      <div
                        key={w.id}
                        className="flex items-center justify-between p-3 sm:px-4 gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{w.fullName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{w.employeeNumber} · {w.designation.name}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn('inline-flex items-center justify-center h-7 min-w-[28px] px-2 rounded-md text-xs font-semibold', badgeClass)}>
                            {badgeLabel}
                          </span>
                          {perms.canEdit && (
                            <div className="flex items-center gap-0.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant={currentStatus === 'Present' ? 'default' : 'ghost'}
                                    className={cn(
                                      'h-7 w-7',
                                      currentStatus === 'Present'
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                        : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                                    )}
                                    onClick={() => handleQuickMark(w.id, 'Present')}
                                    disabled={markMutation.isPending}
                                  >
                                    <UserCheck className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Present</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant={currentStatus === 'Absent' ? 'default' : 'ghost'}
                                    className={cn(
                                      'h-7 w-7',
                                      currentStatus === 'Absent'
                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                        : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                                    )}
                                    onClick={() => handleQuickMark(w.id, 'Absent')}
                                    disabled={markMutation.isPending}
                                  >
                                    <UserX className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Absent</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant={currentStatus === 'HalfDay' ? 'default' : 'ghost'}
                                    className={cn(
                                      'h-7 w-7',
                                      currentStatus === 'HalfDay'
                                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                        : 'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
                                    )}
                                    onClick={() => handleQuickMark(w.id, 'HalfDay')}
                                    disabled={markMutation.isPending}
                                  >
                                    <Clock className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Half Day</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant={currentStatus === 'Leave' ? 'default' : 'ghost'}
                                    className={cn(
                                      'h-7 w-7',
                                      currentStatus === 'Leave'
                                        ? 'bg-slate-600 hover:bg-slate-700 text-white'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                    )}
                                    onClick={() => handleQuickMark(w.id, 'Leave')}
                                    disabled={markMutation.isPending}
                                  >
                                    <Coffee className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Leave</TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TooltipProvider>
      )}

      {/* QUICK MARK MODE */}
      {mode === 'quick' && perms.canEdit && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#0d9488]" />
                Marking attendance for {format(selectedDate, 'EEEE, dd MMM yyyy')}
                {isSunday(selectedDate) && (
                  <Badge variant="outline" className="status-pending text-xs">Sunday</Badge>
                )}
              </CardTitle>
            </CardHeader>
            {/* Bulk Action Toolbar */}
            <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => bulkMarkMutation.mutate('Present')}
                disabled={bulkMarkMutation.isPending || markMutation.isPending}
              >
                {bulkMarkMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                )}
                Mark All Present
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => bulkMarkMutation.mutate('Absent')}
                disabled={bulkMarkMutation.isPending || markMutation.isPending}
              >
                {bulkMarkMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <UserX className="h-3.5 w-3.5 mr-1.5" />
                )}
                Mark All Absent
              </Button>
              <Button
                size="sm"
                className="bg-slate-600 hover:bg-slate-700 text-white"
                onClick={() => bulkMarkMutation.mutate('Leave')}
                disabled={bulkMarkMutation.isPending || markMutation.isPending}
              >
                {bulkMarkMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Coffee className="h-3.5 w-3.5 mr-1.5" />
                )}
                Mark All Leave
              </Button>
            </div>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-5 w-40" />
                      <div className="flex gap-2">
                        <Skeleton className="h-9 w-20" />
                        <Skeleton className="h-9 w-20" />
                        <Skeleton className="h-9 w-20" />
                        <Skeleton className="h-9 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : workers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm">No active workers</p>
                </div>
              ) : (
                <div className="divide-y max-h-[calc(100vh-12rem)] overflow-y-auto">
                  {workers.map((w) => {
                    const currentStatus = isSameMonth
                      ? getStatusForDate(w.id, selectedDate)
                      : null
                    return (
                      <div
                        key={w.id}
                        className="flex items-center justify-between p-3 sm:px-4 gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{w.fullName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{w.employeeNumber}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant={currentStatus === 'Present' ? 'default' : 'outline'}
                            className={cn(
                              'h-8 w-20',
                              currentStatus === 'Present'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'text-emerald-600 border-emerald-300 hover:bg-emerald-50'
                            )}
                            onClick={() => handleQuickMark(w.id, 'Present')}
                            disabled={markMutation.isPending}
                          >
                            <UserCheck className="h-3.5 w-3.5 mr-1" />
                            Present
                          </Button>
                          <Button
                            size="sm"
                            variant={currentStatus === 'Absent' ? 'default' : 'outline'}
                            className={cn(
                              'h-8 w-16',
                              currentStatus === 'Absent'
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'text-red-600 border-red-300 hover:bg-red-50'
                            )}
                            onClick={() => handleQuickMark(w.id, 'Absent')}
                            disabled={markMutation.isPending}
                          >
                            <UserX className="h-3.5 w-3.5 mr-1" />
                            Absent
                          </Button>
                          <Button
                            size="sm"
                            variant={currentStatus === 'HalfDay' ? 'default' : 'outline'}
                            className={cn(
                              'h-8 w-20',
                              currentStatus === 'HalfDay'
                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                : 'text-amber-600 border-amber-300 hover:bg-amber-50'
                            )}
                            onClick={() => handleQuickMark(w.id, 'HalfDay')}
                            disabled={markMutation.isPending}
                          >
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            Half Day
                          </Button>
                          <Button
                            size="sm"
                            variant={currentStatus === 'Leave' ? 'default' : 'outline'}
                            className={cn(
                              'h-8 w-16',
                              currentStatus === 'Leave'
                                ? 'bg-slate-600 hover:bg-slate-700 text-white'
                                : 'text-slate-500 border-slate-300 hover:bg-slate-50'
                            )}
                            onClick={() => handleQuickMark(w.id, 'Leave')}
                            disabled={markMutation.isPending}
                          >
                            <Coffee className="h-3.5 w-3.5 mr-1" />
                            Leave
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mark Attendance Dialog */}
      <MarkAttendanceDialog open={markDialogOpen} onOpenChange={setMarkDialogOpen} />
    </div>
  )
}
