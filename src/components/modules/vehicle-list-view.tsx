'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Truck, CheckCircle2, Wrench, CircleSlash, X, FileSpreadsheet, Upload, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useNavStore } from '@/stores/nav-store'
import { useAuthStore, rolePermissions } from '@/lib/auth-store'
import { useSort } from '@/lib/use-sort'
import { TablePagination } from '@/components/shared/table-pagination'
import { SortableHeader } from '@/components/shared/sortable-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { TableExportButton, type ExportColumn } from '@/components/ui/table-export-button'
import { format, isPast, parseISO } from 'date-fns'
import { toast } from 'sonner'

// ---------- types ----------
interface Vehicle {
  id: string
  vehicleNumber: string
  vehicleType: string
  owner: string
  condition: string
  lastInspectionDate: string | null
  nextInspectionDue: string | null
  driver: { id: string; fullName: string; employeeNumber: string } | null
  contractor: { id: string; name: string } | null
  site: { id: string; name: string } | null
  _count: { documents: number }
}

interface VehiclesResponse {
  data: Vehicle[]
  total: number
  page: number
  limit: number
}

// ---------- export helpers ----------
const vehicleConditionLabels: Record<string, string> = {
  Fit: 'Fit',
  NeedsRepair: 'Needs Repair',
  Grounded: 'Grounded',
  FitWithRestriction: 'Fit w/ Restriction',
}

const vehicleExportColumns: ExportColumn<Vehicle>[] = [
  { key: 'vehicleNumber', header: 'Vehicle Number' },
  { key: 'vehicleType', header: 'Type' },
  { key: 'owner', header: 'Owner' },
  { key: 'condition', header: 'Condition', accessor: (v) => vehicleConditionLabels[v.condition] || v.condition },
  {
    key: 'nextInspection',
    header: 'Next Inspection',
    accessor: (v) => {
      if (!v.nextInspectionDue) return ''
      const dt = parseISO(v.nextInspectionDue)
      const overdue = isPast(dt)
      return `${format(dt, 'dd MMM yyyy')}${overdue ? ' (Overdue)' : ''}`
    },
  },
  { key: 'driver', header: 'Driver', accessor: (v) => v.driver?.fullName || '' },
  { key: 'documents', header: 'Docs', accessor: (v) => v._count?.documents ?? 0 },
]

// ---------- skeleton ----------
function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  )
}

// ---------- main ----------
export default function VehicleListView() {
  const setPage = useNavStore((s) => s.setPage)
  const role = useAuthStore((s) => s.role)
  const perms = rolePermissions[role]
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [condition, setCondition] = useState('')

  const [pageNum, setPageNum] = useState(1)
  const PAGE_SIZE = 15

  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newVehicleNumber, setNewVehicleNumber] = useState('')
  const [newVehicleType, setNewVehicleType] = useState('')
  const [newOwner, setNewOwner] = useState('Contractor')
  const [newCondition, setNewCondition] = useState('Fit')
  const [newDriverId, setNewDriverId] = useState('')
  const [newDocumentName, setNewDocumentName] = useState('')

  // Import dialog state
  const [importOpen, setImportOpen] = useState(false)

  // Fetch drivers (workers) for the driver dropdown
  const { data: driversData } = useQuery<{ data: { id: string; fullName: string; employeeNumber: string }[] }>({
    queryKey: ['vehicles-drivers'],
    queryFn: () => fetch('/api/workers?limit=100').then((r) => r.json()),
  })
  const drivers = driversData?.data ?? []

  const hasActiveFilter = !!(search || vehicleType || condition)
  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setVehicleType('')
    setCondition('')
    setPageNum(1)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPageNum(1)
    const t = setTimeout(() => setDebouncedSearch(value), 300)
    return () => clearTimeout(t)
  }

  const queryParams = new URLSearchParams()
  if (debouncedSearch) queryParams.set('search', debouncedSearch)
  if (vehicleType) queryParams.set('vehicleType', vehicleType)
  if (condition) queryParams.set('condition', condition)
  queryParams.set('limit', '100')

  const { data, isLoading } = useQuery<VehiclesResponse>({
    queryKey: ['vehicles', debouncedSearch, vehicleType, condition],
    queryFn: () => fetch(`/api/vehicles?${queryParams.toString()}`).then((r) => r.json()),
  })

  const addMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch('/api/vehicles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => {
      toast.success('Item added successfully')
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setAddDialogOpen(false)
      setNewVehicleNumber('')
      setNewVehicleType('')
      setNewOwner('Contractor')
      setNewCondition('Fit')
      setNewDriverId('')
      setNewDocumentName('')
    },
    onError: () => toast.error('Failed to add item'),
  })

  const vehicles = data?.data ?? []
  const total = data?.total ?? 0

  const { sorted, sortKey, sortDir, toggleSort } = useSort(vehicles as (Vehicle & Record<string, unknown>)[])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pagedData = sorted.slice((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE)

  const fitCount = vehicles.filter((v) => v.condition === 'Fit').length
  const repairCount = vehicles.filter((v) => v.condition === 'NeedsRepair').length
  const groundedCount = vehicles.filter((v) => v.condition === 'Grounded').length

  const handleAdd = () => {
    if (!newVehicleNumber || !newVehicleType) {
      toast.error('Vehicle number and type are required')
      return
    }
    addMutation.mutate({
      vehicleNumber: newVehicleNumber,
      vehicleType: newVehicleType,
      owner: newOwner || 'Contractor',
      condition: newCondition,
      driverId: newDriverId || undefined,
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setNewDocumentName(file.name)
      toast.info(`Selected: ${file.name}`)
    }
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-6rem)] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Machinery & Vehicles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? 'Loading...' : `${total} item${total !== 1 ? 's' : ''} registered`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TableExportButton
            rows={sorted}
            columns={vehicleExportColumns}
            filename="vehicles"
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
                <span className="hidden sm:inline">Import</span>
              </Button>
              <Button className="bg-[#0d9488] hover:bg-[#0f766e] text-white" onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-teal-50 text-teal-700 border-teal-200 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99]">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Total</p>
                  <p className="text-xl font-bold tracking-tight mt-1">{total}</p>
                </div>
                <div className="rounded-xl p-2 shrink-0 bg-teal-100 text-teal-600">
                  <Truck className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 text-emerald-700 border-emerald-200 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99]">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Fit</p>
                  <p className="text-xl font-bold tracking-tight mt-1 text-emerald-700">{fitCount}</p>
                </div>
                <div className="rounded-xl p-2 shrink-0 bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 text-amber-700 border-amber-200 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99]">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Needs Repair</p>
                  <p className="text-xl font-bold tracking-tight mt-1 text-amber-700">{repairCount}</p>
                </div>
                <div className="rounded-xl p-2 shrink-0 bg-amber-100 text-amber-600">
                  <Wrench className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-rose-50 text-rose-700 border-rose-200 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99]">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Grounded</p>
                  <p className="text-xl font-bold tracking-tight mt-1 text-rose-700">{groundedCount}</p>
                </div>
                <div className="rounded-xl p-2 shrink-0 bg-rose-100 text-rose-600">
                  <CircleSlash className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="shrink-0 py-0">
        <CardContent className="px-3 py-2">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by vehicle number..." value={search} onChange={(e) => handleSearchChange(e.target.value)} className="pl-9" />
            </div>
            <Select value={vehicleType} onValueChange={(v) => { setVehicleType(v); setPageNum(1) }}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Dumper">Dumper</SelectItem>
                <SelectItem value="JCB">JCB</SelectItem>
                <SelectItem value="Crane">Crane</SelectItem>
                <SelectItem value="Tanker">Tanker</SelectItem>
                <SelectItem value="Passenger">Passenger</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={condition} onValueChange={(v) => { setCondition(v); setPageNum(1) }}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Condition" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Fit">Fit</SelectItem>
                <SelectItem value="NeedsRepair">Needs Repair</SelectItem>
                <SelectItem value="Grounded">Grounded</SelectItem>
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

      {/* Table / Cards */}
      <div className="flex-1 min-h-0 flex flex-col">
      <Card className="flex-1 min-h-0">
        <CardContent className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-4"><TableSkeleton /></div>
          ) : vehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Truck className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-base font-medium">No items found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead className="w-12">S.No</TableHead>
                      <SortableHeader column="vehicleNumber" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Vehicle Number</SortableHeader>
                      <SortableHeader column="vehicleType" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="w-28">Type</SortableHeader>
                      <TableHead className="w-28">Owner</TableHead>
                      <SortableHeader column="condition" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="w-32">Condition</SortableHeader>
                      <TableHead className="w-36">Next Inspection</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead className="w-20">Docs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedData.map((v, index) => {
                      const inspectionPast = v.nextInspectionDue && isPast(parseISO(v.nextInspectionDue))
                      return (
                        <TableRow
                          key={v.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setPage('vehicle-detail', { id: v.id })}
                        >
                        <TableCell className="text-muted-foreground text-xs">{index + 1}</TableCell>
                          <TableCell className="font-mono text-sm font-medium">{v.vehicleNumber}</TableCell>
                          <TableCell className="text-sm">{v.vehicleType}</TableCell>
                          <TableCell className="text-sm">{v.owner}</TableCell>
                          <TableCell><StatusBadge status={v.condition} /></TableCell>
                          <TableCell>
                            {v.nextInspectionDue ? (
                              <span className={`text-sm ${inspectionPast ? 'text-red-600 font-medium' : ''}`}>
                                {format(parseISO(v.nextInspectionDue), 'dd MMM yyyy')}
                                {inspectionPast && ' (Overdue)'}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{v.driver?.fullName || '—'}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{v._count.documents}</Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y flex-1 min-h-0 overflow-y-auto">
                {pagedData.map((v) => {
                  const inspectionPast = v.nextInspectionDue && isPast(parseISO(v.nextInspectionDue))
                  return (
                    <div
                      key={v.id}
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setPage('vehicle-detail', { id: v.id })}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-medium">{v.vehicleNumber}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{v.vehicleType} · {v.owner}</p>
                        </div>
                        <StatusBadge status={v.condition} />
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                        <span>Driver: {v.driver?.fullName || '—'}</span>
                        <span>{v._count.documents} doc(s)</span>
                        {v.nextInspectionDue && (
                          <span className={inspectionPast ? 'text-red-600 font-medium' : ''}>
                            Insp: {format(parseISO(v.nextInspectionDue), 'dd MMM yyyy')}
                            {inspectionPast && ' ⚠'}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <TablePagination page={pageNum} totalPages={totalPages} total={sorted.length} onPageChange={setPageNum} pageSize={PAGE_SIZE} />
      </div>

      {/* Add Item Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Machinery / Vehicle</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Vehicle / Equipment Number *</Label>
                <Input className="mt-1" placeholder="e.g. AP-28-BJ-1234" value={newVehicleNumber} onChange={(e) => setNewVehicleNumber(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Type *</Label>
                <Select value={newVehicleType} onValueChange={setNewVehicleType}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dumper">Dumper</SelectItem>
                    <SelectItem value="JCB">JCB</SelectItem>
                    <SelectItem value="Crane">Crane</SelectItem>
                    <SelectItem value="Tanker">Tanker</SelectItem>
                    <SelectItem value="Passenger">Passenger</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Ownership</Label>
                <Select value={newOwner} onValueChange={setNewOwner}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select ownership" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Contractor">Own (Contractor)</SelectItem>
                    <SelectItem value="Rented">Rented</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Condition</Label>
                <Select value={newCondition} onValueChange={setNewCondition}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select condition" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fit">Fit</SelectItem>
                    <SelectItem value="NeedsRepair">Needs Repair</SelectItem>
                    <SelectItem value="Grounded">Grounded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Driver</Label>
              <Select value={newDriverId} onValueChange={setNewDriverId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select driver (optional)" /></SelectTrigger>
                <SelectContent>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.fullName} ({d.employeeNumber})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Document Attachment</Label>
              <div className="mt-1 border-2 border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:border-teal-400 hover:bg-teal-50/30 transition-colors cursor-pointer relative">
                {newDocumentName ? (
                  <div className="flex items-center gap-2 text-sm text-teal-700">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">{newDocumentName}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 ml-1"
                      onClick={(e) => { e.stopPropagation(); setNewDocumentName('') }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground text-center">
                      Click to upload or drag and drop<br />
                      <span className="text-[10px]">RC, Insurance, Fitness Certificate, etc. (PDF/JPG/PNG up to 5MB)</span>
                    </p>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleFileChange}
                  id="vehicle-document-upload"
                />
                <label htmlFor="vehicle-document-upload" className="absolute inset-0 cursor-pointer" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="bg-[#0d9488] hover:bg-[#0f766e] text-white" disabled={addMutation.isPending} onClick={handleAdd}>
                {addMutation.isPending ? 'Adding...' : 'Add Vehicle'}
              </Button>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog (placeholder) */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Import Vehicles</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Upload an Excel file with vehicle data. The file should have columns for Vehicle Number, Type, Owner, Condition, and Driver.
            </p>
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center gap-2 relative">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-xs text-muted-foreground text-center">Click to upload Excel (.xlsx) file</p>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    toast.info(`Import feature coming soon. Selected: ${file.name}`)
                  }
                }}
                id="vehicle-import-upload"
              />
              <label htmlFor="vehicle-import-upload" className="absolute inset-0 cursor-pointer" />
            </div>
            <div className="flex gap-2 pt-2 justify-end">
              <Button variant="outline" onClick={() => setImportOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
