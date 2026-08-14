'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, UserPlus, ChevronLeft, ChevronRight, Users, FileSpreadsheet, Eye, X, Printer, UserX, UserCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import BulkImportDialog from './bulk-import-dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useNavStore } from '@/stores/nav-store'
import { useAuthStore, rolePermissions } from '@/lib/auth-store'
import { useSort } from '@/lib/use-sort'
import { SortableHeader } from '@/components/shared/sortable-header'
import { TableExportButton, type ExportColumn } from '@/components/ui/table-export-button'
import WorkerIdCard from './worker-id-card'

// ---------- types ----------
interface WorkerCardData {
  id: string
  profilePhotoPath: string | null
  employeeNumber: string
  fullName: string
  dateOfBirth: string
  age: number
  gender: string
  aadhaarNumber: string
  permanentAddress: string
  bloodGroup: string
  qualification: string
  zone: string | null
  uanNumber: string | null
  designation: { id: string; name: string; category: string }
  contractor: { id: string; name: string; code: string }
  site: { id: string; name: string; code: string } | null
  emergencyContacts: { id: string; name: string; relationship: string; phone: string; isPrimary: boolean }[]
}

interface Worker {
  id: string
  profilePhotoPath: string | null
  employeeNumber: string
  fullName: string
  gender: string
  bloodGroup: string
  uanNumber: string | null
  isActive: boolean
  designation: { id: string; name: string; category: string }
  site: { id: string; name: string; code: string } | null
  contractor: { id: string; name: string; code: string }
  labourCamp: { id: string; name: string } | null
  policeRecords: string
  nativeState: string | null
}

interface Designation {
  id: string
  name: string
}

interface Site {
  id: string
  name: string
  code: string
}

interface WorkersResponse {
  data: Worker[]
  total: number
  page: number
  limit: number
}

// ---------- export columns ----------
const workerExportColumns: ExportColumn<Worker>[] = [
  { key: 'employeeNumber', header: 'Employee No.' },
  { key: 'fullName', header: 'Worker Name' },
  { key: 'designation', header: 'Designation', accessor: (w) => w.designation?.name ?? '' },
  { key: 'gender', header: 'Gender' },
  { key: 'bloodGroup', header: 'Blood Group' },
  { key: 'uanNumber', header: 'UAN', accessor: (w) => w.uanNumber ?? '' },
  { key: 'site', header: 'Site / Zone', accessor: (w) => w.site?.name ?? '' },
  { key: 'labourCamp', header: 'Camp', accessor: (w) => w.labourCamp?.name ?? '' },
  { key: 'policeRecords', header: 'Police Records', accessor: (w) => w.policeRecords || 'Not Updated' },
  { key: 'status', header: 'Status', accessor: (w) => (w.isActive ? 'Active' : 'Inactive') },
]

// ---------- skeleton ----------
function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-36 flex-1" />
          <Skeleton className="h-4 w-24 hidden sm:block" />
          <Skeleton className="h-4 w-16 hidden md:block" />
          <Skeleton className="h-4 w-16 hidden md:block" />
          <Skeleton className="h-4 w-20 hidden lg:block" />
          <Skeleton className="h-4 w-20 hidden lg:block" />
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  )
}

// ---------- main ----------
export default function WorkerListView() {
  const setPage = useNavStore((s) => s.setPage)
  const openWorkerForm = useNavStore((s) => s.openWorkerForm)
  const role = useAuthStore((s) => s.role)
  const perms = rolePermissions[role]

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [designationId, setDesignationId] = useState('')
  const [gender, setGender] = useState('')
  const [siteId, setSiteId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPageNum] = useState(1)
  const [importOpen, setImportOpen] = useState(false)
  const [idCardOpen, setIdCardOpen] = useState(false)
  const [idCardWorker, setIdCardWorker] = useState<WorkerCardData | null>(null)
  const [idCardLoading, setIdCardLoading] = useState(false)
  const limit = 20
  const queryClient = useQueryClient()

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearch(value)
    const t = setTimeout(() => {
      setDebouncedSearch(value)
      setPageNum(1)
    }, 300)
    return () => clearTimeout(t)
  }

  // Fetch filter options
  const { data: designations } = useQuery<Designation[]>({
    queryKey: ['designations'],
    queryFn: () => fetch('/api/designations').then((r) => r.json()),
  })

  const { data: sites } = useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: () => fetch('/api/sites').then((r) => r.json()),
  })

  // Fetch workers
  const queryParams = new URLSearchParams()
  if (debouncedSearch) queryParams.set('search', debouncedSearch)
  if (designationId) queryParams.set('designationId', designationId)
  if (gender) queryParams.set('gender', gender)
  if (siteId) queryParams.set('siteId', siteId)
  if (statusFilter) queryParams.set('status', statusFilter)
  queryParams.set('page', String(page))
  queryParams.set('limit', String(limit))

  const { data, isLoading } = useQuery<WorkersResponse>({
    queryKey: ['workers', debouncedSearch, designationId, gender, siteId, statusFilter, page],
    queryFn: () => fetch(`/api/workers?${queryParams.toString()}`).then((r) => r.json()),
  })

  const workers = data?.data ?? []
  const total = data?.total ?? 0

  const flatWorkers = workers.map(w => ({
    ...w,
    'designation.name': w.designation?.name,
    'contractor.name': w.contractor?.name,
    'site.name': w.site?.name,
    'labourCamp.name': w.labourCamp?.name,
  })) as (Worker & Record<string, unknown>)[]
  const { sorted, sortKey, sortDir, toggleSort } = useSort(flatWorkers)
  const totalPages = Math.max(1, Math.ceil(total / limit))

  // ID Card
  const handleOpenIdCard = async (workerId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setIdCardLoading(true)
    setIdCardOpen(true)
    try {
      const resp = await fetch(`/api/workers/${workerId}`)
      const json = await resp.json()
      setIdCardWorker(json.data ?? json)
    } catch {
      setIdCardWorker(null)
    } finally {
      setIdCardLoading(false)
    }
  }

  const handlePrintIdCard = () => window.print()

  const handleCloseIdCard = () => {
    setIdCardOpen(false)
    setIdCardWorker(null)
  }

  // Toggle Active/Inactive
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const handleToggleActive = async (workerId: string, currentActive: boolean, workerName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const action = currentActive ? 'deactivate' : 'reactivate'
    if (!confirm(`Are you sure you want to ${action} ${workerName}?`)) return
    setTogglingId(workerId)
    try {
      const res = await fetch(`/api/workers/${workerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(`${workerName} marked as ${currentActive ? 'Inactive' : 'Active'}`)
      queryClient.invalidateQueries({ queryKey: ['workers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } catch {
      toast.error('Failed to update worker status')
    } finally {
      setTogglingId(null)
    }
  }

  // Clear filters
  const hasActiveFilter = !!(search || designationId || gender || siteId || statusFilter)
  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setDesignationId('')
    setGender('')
    setSiteId('')
    setStatusFilter('')
    setPageNum(1)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPageNum(newPage)
    }
  }

  // Page number buttons (show max 5 around current)
  const getPageNumbers = () => {
    const pages: number[] = []
    const start = Math.max(1, page - 2)
    const end = Math.min(totalPages, page + 2)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  return (
    <div className="flex flex-col gap-6 h-full overflow-hidden">
      {/* ====== Page Header ====== */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workforce Register</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading
              ? 'Loading workers...'
              : `${total} worker${total !== 1 ? 's' : ''} registered`}
          </p>
        </div>
        <div className="flex items-center gap-2">
            <TableExportButton
              rows={sorted}
              columns={workerExportColumns}
              filename="workforce_register"
              variant="outline"
              size="default"
            />
            {perms.canEdit && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setImportOpen(true)}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Import Excel</span>
                  <span className="sm:hidden">Import</span>
                </Button>
                <Button
                  className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
                  onClick={() => openWorkerForm()}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Register Worker</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </>
            )}
          </div>
      </div>

      {/* ====== Filter Bar ====== */}
      <Card className="shrink-0 py-0">
        <CardContent className="px-3 py-2">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or employee number..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={designationId} onValueChange={(v) => { setDesignationId(v); setPageNum(1) }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Designation" />
              </SelectTrigger>
              <SelectContent>
                {designations?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={gender} onValueChange={(v) => { setGender(v); setPageNum(1) }}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={siteId} onValueChange={(v) => { setSiteId(v); setPageNum(1) }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Site" />
              </SelectTrigger>
              <SelectContent>
                {sites?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPageNum(1) }}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
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

      {/* ====== Table (Desktop) / Cards (Mobile) ====== */}
      <div className="flex-1 min-h-0 flex flex-col">
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardContent className="flex-1 min-h-0 overflow-y-auto p-0">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton />
            </div>
          ) : workers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-base font-medium">No workers found</p>
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
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="w-36">Employee No.</TableHead>
                      <SortableHeader column="fullName" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Name</SortableHeader>
                      <SortableHeader column="designation.name" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="w-36">Designation</SortableHeader>
                      <TableHead className="w-20">Gender</TableHead>
                      <TableHead className="w-24">Blood Group</TableHead>
                      <TableHead className="w-36">UAN</TableHead>
                      <SortableHeader column="site.name" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="w-40">Site / Zone</SortableHeader>
                      <SortableHeader column="labourCamp.name" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="w-40">Camp</SortableHeader>
                      <TableHead className="w-32">Police Records</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      {(role === 'ADMIN' || role === 'HR_COORDINATOR') && <TableHead className="w-24">Actions</TableHead>}
                      <TableHead className="w-20">ID Card</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((w, index) => (
                      <TableRow
                        key={w.id}
                        className={`cursor-pointer hover:bg-muted/50 transition-colors ${!w.isActive ? 'opacity-60' : ''}`}
                        onClick={() => setPage('worker-detail', { id: w.id })}
                      >
                        <TableCell className="text-muted-foreground text-xs">{index + 1}</TableCell>
                        <TableCell>
                          {w.profilePhotoPath && w.profilePhotoPath.startsWith('data:') ? (
                            <img src={w.profilePhotoPath} alt={w.fullName} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#0d9488] text-white flex items-center justify-center text-xs font-bold">
                              {w.fullName.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {w.employeeNumber}
                        </TableCell>
                        <TableCell className="font-medium">{w.fullName}</TableCell>
                        <TableCell>{w.designation.name}</TableCell>
                        <TableCell>{w.gender}</TableCell>
                        <TableCell>{w.bloodGroup}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {w.uanNumber ?? '—'}
                        </TableCell>
                        <TableCell>
                          {w.site?.name ?? '—'}
                        </TableCell>
                        <TableCell>
                          {w.labourCamp?.name ?? '—'}
                        </TableCell>
                        <TableCell>
                          <select
                            className="text-xs border rounded px-1.5 py-1 bg-transparent w-full"
                            value={w.policeRecords || 'Not Updated'}
                            onClick={(e) => e.stopPropagation()}
                            onChange={async (e) => {
                              e.stopPropagation()
                              const val = e.target.value
                              try {
                                const res = await fetch(`/api/workers/${w.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ policeRecords: val }),
                                })
                                if (res.ok) {
                                  toast.success(`${w.fullName}: Police Records updated`)
                                  queryClient.invalidateQueries({ queryKey: ['workers'] })
                                }
                              } catch { toast.error('Failed to update') }
                            }}
                          >
                            <option value="Updated">Updated</option>
                            <option value="Not Updated">Not Updated</option>
                            <option value="Not Applicable">Not Applicable</option>
                          </select>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={w.isActive
                              ? 'status-valid border-emerald-300 dark:border-emerald-700'
                              : 'status-expired border-red-300 dark:border-red-700'
                            }
                          >
                            {w.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        {(role === 'ADMIN' || role === 'HR_COORDINATOR') && (
                          <TableCell>
                            <Button
                              variant="outline"
                              size="icon"
                              className={`h-7 w-7 ${w.isActive ? 'text-red-500 hover:bg-red-50 hover:text-red-600 border-red-200' : 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 border-emerald-200'}`}
                              title={w.isActive ? 'Mark Inactive' : 'Mark Active'}
                              disabled={togglingId === w.id}
                              onClick={(e) => handleToggleActive(w.id, w.isActive, w.fullName, e)}
                            >
                              {togglingId === w.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : w.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                            </Button>
                          </TableCell>
                        )}
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 text-xs font-semibold text-[#0d9488] border-[#0d9488]/30 hover:bg-[#0d9488]/10"
                            onClick={(e) => handleOpenIdCard(w.id, e)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y overflow-y-auto">
                {workers.map((w) => (
                  <div
                    key={w.id}
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${!w.isActive ? 'opacity-60' : ''}`}
                    onClick={() => setPage('worker-detail', { id: w.id })}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{w.fullName}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs font-semibold text-[#0d9488] border-[#0d9488]/30 hover:bg-[#0d9488]/10 shrink-0"
                            onClick={(e) => handleOpenIdCard(w.id, e)}
                          >
                            <Eye className="h-3 w-3 mr-0.5" />
                            View
                          </Button>
                          {(role === 'ADMIN' || role === 'HR_COORDINATOR') && (
                            <Button
                              variant="outline"
                              size="icon"
                              className={`h-6 w-6 shrink-0 ${w.isActive ? 'text-red-500 hover:bg-red-50 border-red-200' : 'text-emerald-500 hover:bg-emerald-50 border-emerald-200'}`}
                              title={w.isActive ? 'Mark Inactive' : 'Mark Active'}
                              disabled={togglingId === w.id}
                              onClick={(e) => handleToggleActive(w.id, w.isActive, w.fullName, e)}
                            >
                              {togglingId === w.id ? <Loader2 className="h-3 w-3 animate-spin" /> : w.isActive ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {w.employeeNumber}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={w.isActive
                          ? 'status-valid border-emerald-300 dark:border-emerald-700'
                          : 'status-expired border-red-300 dark:border-red-700'
                        }
                      >
                        {w.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                      <span>{w.designation.name}</span>
                      <span>{w.gender}</span>
                      <span>{w.bloodGroup}</span>
                      <span>{w.site?.name ?? 'No Site'}</span>
                      {w.labourCamp?.name && <span>{w.labourCamp.name}</span>}
                    </div>
                    {w.uanNumber && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        UAN: {w.uanNumber}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ====== Pagination ====== */}
      {totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous</span>
            </Button>
            {getPageNumbers().map((p) => (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="sm"
                className={p === page ? 'bg-[#0d9488] hover:bg-[#0f766e] text-white' : ''}
                onClick={() => handlePageChange(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next</span>
            </Button>
          </div>
        </div>
      )}
      </div>

      {/* ====== ID Card Dialog ====== */}
      <Dialog open={idCardOpen} onOpenChange={(open) => { if (!open) handleCloseIdCard() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Worker ID Card</DialogTitle>
          </DialogHeader>
          {idCardLoading ? (
            <div className="flex items-center justify-center py-12">
              <Skeleton className="h-64 w-full max-w-xs rounded-xl" />
            </div>
          ) : idCardWorker ? (
            <WorkerIdCard worker={idCardWorker} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Failed to load worker data.</p>
          )}
          <div className="flex justify-end gap-2 no-print">
            <Button variant="outline" onClick={handlePrintIdCard}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={handleCloseIdCard}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ====== Bulk Import Dialog ====== */}
      <BulkImportDialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open)
          if (!open) queryClient.invalidateQueries({ queryKey: ['workers'] })
        }}
      />
    </div>
  )
}
