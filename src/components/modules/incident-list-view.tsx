'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, AlertTriangle, ShieldCheck, Ban, ShieldAlert, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useNavStore } from '@/stores/nav-store'
import { useAuthStore, rolePermissions } from '@/lib/auth-store'
import { useSort } from '@/lib/use-sort'
import { SortableHeader } from '@/components/shared/sortable-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { format } from 'date-fns'
import { TablePagination } from '@/components/shared/table-pagination'
import { TableExportButton, type ExportColumn } from '@/components/ui/table-export-button'

// ---------- types ----------
interface Incident {
  id: string
  incidentNumber: string
  incidentType: string
  date: string
  locationOnSite: string | null
  description: string
  severity: string
  status: string
  isDeath: boolean
  workers: { id: string }[]
  _count: { followUps: number }
  contractor: { id: string; name: string } | null
  site: { id: string; name: string } | null
}

interface IncidentsResponse {
  data: Incident[]
  total: number
  page: number
  limit: number
}

// ---------- helpers ----------
const typeBadgeClass: Record<string, string> = {
  FireInjury: 'bg-red-100 text-red-800 border-red-200',
  MinorInjury: 'bg-amber-100 text-amber-800 border-amber-200',
  MajorFatalInjury: 'bg-red-100 text-red-800 border-red-300',
  Death: 'bg-red-900 text-white border-red-800',
}

const typeLabels: Record<string, string> = {
  FireInjury: 'Fire Injury',
  MinorInjury: 'Minor Injury',
  MajorFatalInjury: 'Major/Fatal Injury',
  Death: 'Death',
}

const severityClass: Record<string, string> = {
  Low: 'bg-slate-100 text-slate-700 border-slate-200',
  Medium: 'bg-amber-100 text-amber-800 border-amber-200',
  High: 'bg-amber-100 text-amber-800 border-amber-200',
  Critical: 'bg-red-100 text-red-800 border-red-300',
}

// ---------- skeleton ----------
function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  )
}

// ---------- main ----------
export default function IncidentListView() {
  const navigateTo = useNavStore((s) => s.setPage)
  const openIncidentForm = useNavStore((s) => s.openIncidentForm)
  const role = useAuthStore((s) => s.role)
  const perms = rolePermissions[role]

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [incidentType, setIncidentType] = useState('')
  const [severity, setSeverity] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const hasActiveFilter = !!(search || incidentType || severity || status)
  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setIncidentType('')
    setSeverity('')
    setStatus('')
    setPage(1)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
    const t = setTimeout(() => setDebouncedSearch(value), 300)
    return () => clearTimeout(t)
  }

  const queryParams = new URLSearchParams()
  if (debouncedSearch) queryParams.set('search', debouncedSearch)
  if (incidentType) queryParams.set('incidentType', incidentType)
  if (severity) queryParams.set('severity', severity)
  if (status) queryParams.set('status', status)
  queryParams.set('limit', '100')

  const { data, isLoading } = useQuery<IncidentsResponse>({
    queryKey: ['incidents', debouncedSearch, incidentType, severity, status],
    queryFn: () => fetch(`/api/incidents?${queryParams.toString()}`).then((r) => r.json()),
  })

  const incidents = data?.data ?? []
  const total = data?.total ?? 0

  const { sorted, sortKey, sortDir, toggleSort } = useSort(incidents as (Incident & Record<string, unknown>)[])
  const displayData = sorted
  const totalPages = Math.max(1, Math.ceil(displayData.length / PAGE_SIZE))
  const pagedData = displayData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openCount = incidents.filter((i) => i.status === 'Open').length
  const invCount = incidents.filter((i) => i.status === 'UnderInvestigation').length
  const closedCount = incidents.filter((i) => i.status === 'Closed').length

  // ---------- export columns ----------
  const exportColumns: ExportColumn<Incident>[] = [
    { key: 'incidentNumber', header: 'Incident No.' },
    {
      key: 'incidentType',
      header: 'Type',
      accessor: (r) => typeLabels[r.incidentType] || r.incidentType,
    },
    {
      key: 'date',
      header: 'Date',
      accessor: (r) => format(new Date(r.date), 'dd MMM yyyy'),
    },
    {
      key: 'location',
      header: 'Location',
      accessor: (r) => r.locationOnSite || '',
    },
    { key: 'severity', header: 'Severity' },
    {
      key: 'status',
      header: 'Status',
      accessor: (r) => (r.status === 'UnderInvestigation' ? 'Under Investigation' : r.status),
    },
    {
      key: 'workers',
      header: 'Workers',
      accessor: (r) => r.workers?.length ?? 0,
    },
  ]

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-6rem)] overflow-hidden">
      {/* ====== Header ====== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Incident Register</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? 'Loading...' : `${total} incident${total !== 1 ? 's' : ''} recorded`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TableExportButton
            rows={displayData as Incident[]}
            columns={exportColumns}
            filename="incidents"
            variant="outline"
            size="default"
          />
          {perms.canEdit && (
            <Button
              className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
              onClick={() => openIncidentForm()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Log New Incident
            </Button>
          )}
        </div>
      </div>

      {/* ====== Summary Cards ====== */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          <Card className="bg-teal-50 text-teal-700 border-teal-200 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99]">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Total Incidents</p>
                  <p className="text-xl font-bold tracking-tight mt-1">{total}</p>
                </div>
                <div className="rounded-xl p-2 shrink-0 bg-teal-100 text-teal-600">
                  <ShieldAlert className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 text-emerald-700 border-emerald-200 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99]">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Open</p>
                  <p className="text-xl font-bold tracking-tight mt-1 text-emerald-700">{openCount}</p>
                </div>
                <div className="rounded-xl p-2 shrink-0 bg-emerald-100 text-emerald-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 text-amber-700 border-amber-200 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99]">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Under Investigation</p>
                  <p className="text-xl font-bold tracking-tight mt-1 text-amber-700">{invCount}</p>
                </div>
                <div className="rounded-xl p-2 shrink-0 bg-amber-100 text-amber-600">
                  <ShieldAlert className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-50 text-slate-700 border-slate-200 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99]">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Closed</p>
                  <p className="text-xl font-bold tracking-tight mt-1 text-slate-700">{closedCount}</p>
                </div>
                <div className="rounded-xl p-2 shrink-0 bg-slate-100 text-slate-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ====== Filters ====== */}
      <Card className="py-0 shrink-0">
        <CardContent className="px-3 py-2">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search incident number or description..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={incidentType} onValueChange={(v) => { setIncidentType(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FireInjury">Fire Injury</SelectItem>
                <SelectItem value="MinorInjury">Minor Injury</SelectItem>
                <SelectItem value="MajorFatalInjury">Major/Fatal Injury</SelectItem>
                <SelectItem value="Death">Death</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="UnderInvestigation">Under Investigation</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
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

      {/* ====== Table / Cards ====== */}
      <div className="flex-1 min-h-0 flex flex-col">
        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
            {isLoading ? (
              <div className="p-4"><TableSkeleton /></div>
            ) : incidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ShieldAlert className="h-12 w-12 mb-3 opacity-40" />
                <p className="text-base font-medium">No incidents found</p>
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background">
                      <TableRow>
                        <TableHead className="w-12">S.No</TableHead>
                        <SortableHeader column="incidentNumber" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="w-32">Incident No.</SortableHeader>
                        <TableHead className="w-36">Type</TableHead>
                        <SortableHeader column="date" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="w-28">Date</SortableHeader>
                        <TableHead>Location</TableHead>
                        <SortableHeader column="severity" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="w-24">Severity</SortableHeader>
                        <SortableHeader column="status" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="w-36">Status</SortableHeader>
                        <TableHead className="w-20">Workers</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedData.map((inc, index) => (
                        <TableRow
                          key={inc.id}
                          className={`cursor-pointer hover:bg-muted/50 transition-colors ${inc.isDeath ? 'border-l-4 border-l-red-600' : ''}`}
                          onClick={() => navigateTo('incident-detail', { id: inc.id })}
                        >
                          <TableCell className="text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + index + 1}</TableCell>
                        <TableCell className="font-mono text-sm font-medium">
                          {inc.incidentNumber}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={typeBadgeClass[inc.incidentType] || ''}>
                            {typeLabels[inc.incidentType] || inc.incidentType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(inc.date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="text-sm max-w-40 truncate">
                          {inc.locationOnSite || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={severityClass[inc.severity] || ''}>
                            {inc.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={inc.status} />
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {inc.workers?.length ?? 0}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y flex-1 min-h-0 overflow-y-auto">
                  {pagedData.map((inc) => (
                    <div
                      key={inc.id}
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${inc.isDeath ? 'border-l-4 border-l-red-600' : ''}`}
                      onClick={() => navigateTo('incident-detail', { id: inc.id })}
                    >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-medium">{inc.incidentNumber}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {format(new Date(inc.date), 'dd MMM yyyy')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className={typeBadgeClass[inc.incidentType] || ''}>
                          {typeLabels[inc.incidentType] || inc.incidentType}
                        </Badge>
                        <StatusBadge status={inc.status} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                      <span>{inc.locationOnSite || 'No location'}</span>
                      <span>{inc.workers?.length ?? 0} worker(s)</span>
                      <Badge variant="outline" className={severityClass[inc.severity] || ''}>
                        {inc.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <TablePagination page={page} totalPages={totalPages} total={displayData.length} onPageChange={setPage} pageSize={PAGE_SIZE} />
      </div>
    </div>
  )
}
