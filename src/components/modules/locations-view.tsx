'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus, MapPin, Building2, Users, Pencil, Trash2, X, Loader2, Home, ShieldCheck, AlertTriangle, Search,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { TableExportButton, type ExportColumn } from '@/components/ui/table-export-button'
import { useSort } from '@/lib/use-sort'
import { SortableHeader } from '@/components/shared/sortable-header'
import { cn } from '@/lib/utils'

// ==================== TYPES ====================

interface Contractor {
  id: string
  name: string
  code: string
  isActive: boolean
}

interface Site {
  id: string
  name: string
  code: string
  contractorId?: string | null
  isActive: boolean
}

interface Camp {
  id: string
  name: string
  contractorId: string
  siteId: string
  address?: string | null
  capacity?: number | null
  currentOccupancy?: number | null
  isActive: boolean
  contractor: { id: string; name: string; code: string }
  site: { id: string; name: string; code: string }
  _count: { workers: number }
}

interface WorkerRow {
  id: string
  employeeNumber: string
  fullName: string
  gender: string
  bloodGroup: string
  uanNumber: string | null
  isActive: boolean
  policeRecords: string
  designation: { id: string; name: string }
  site: { id: string; name: string } | null
}

// ==================== HELPERS ====================

function complianceFor(camp: Camp): { label: string; className: string } {
  if (camp.capacity == null || camp.capacity <= 0) {
    return { label: 'N/A', className: 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300' }
  }
  const pct = Math.round((camp._count.workers / camp.capacity) * 100)
  if (pct <= 100) return { label: 'Compliant', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' }
  if (pct <= 120) return { label: 'At Capacity', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
  return { label: 'Overcrowded', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
}

function occupancyPct(camp: Camp): number | null {
  if (camp.capacity == null || camp.capacity <= 0) return null
  return Math.round((camp._count.workers / camp.capacity) * 100)
}

// ==================== EXPORT COLUMNS ====================

const campExportColumns: ExportColumn<Camp>[] = [
  { key: 'name', header: 'Camp Name' },
  { key: 'contractor', header: 'Contractor', accessor: (c) => c.contractor?.name || '' },
  { key: 'site', header: 'Project Name', accessor: (c) => c.site?.name || '' },
  { key: 'workers', header: 'Total Workers', accessor: (c) => c._count?.workers ?? 0 },
  { key: 'capacity', header: 'Camp Capacity', accessor: (c) => c.capacity ?? '' },
  { key: 'occupancy', header: 'Occupancy(%)', accessor: (c) => occupancyPct(c) ?? '' },
  { key: 'status', header: 'Camp Status', accessor: (c) => (c.isActive ? 'Active' : 'Inactive') },
  { key: 'compliance', header: 'Compliance', accessor: (c) => complianceFor(c).label },
]

// ==================== MAIN VIEW ====================

export default function LocationsView() {
  const queryClient = useQueryClient()

  const [addOpen, setAddOpen] = useState(false)
  const [editingCamp, setEditingCamp] = useState<Camp | null>(null)
  const [deleteCamp, setDeleteCamp] = useState<Camp | null>(null)
  const [workersCamp, setWorkersCamp] = useState<Camp | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [contractorFilter, setContractorFilter] = useState('')
  const [siteFilter, setSiteFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearch(value)
    const t = setTimeout(() => setDebouncedSearch(value), 300)
    return () => clearTimeout(t)
  }

  const { data: camps = [], isLoading: campsLoading } = useQuery<Camp[]>({
    queryKey: ['labour-camps-all'],
    queryFn: () => fetch('/api/labour-camps?all=true').then((r) => r.json()),
  })

  const { data: contractors = [] } = useQuery<Contractor[]>({
    queryKey: ['contractors'],
    queryFn: () => fetch('/api/contractors').then((r) => r.json()),
  })

  const { data: sites = [] } = useQuery<Site[]>({
    queryKey: ['locations-sites'],
    queryFn: () => fetch('/api/sites').then((r) => r.json()),
  })

  // Apply filters + sorting
  const filteredCamps = useMemo(() => {
    return camps.filter((c) => {
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase()
        if (!c.name.toLowerCase().includes(q) && !c.contractor?.name?.toLowerCase().includes(q) && !c.site?.name?.toLowerCase().includes(q)) return false
      }
      if (contractorFilter && c.contractorId !== contractorFilter) return false
      if (siteFilter && c.siteId !== siteFilter) return false
      if (statusFilter === 'active' && !c.isActive) return false
      if (statusFilter === 'inactive' && c.isActive) return false
      return true
    })
  }, [camps, debouncedSearch, contractorFilter, siteFilter, statusFilter])

  const flatCamps = filteredCamps.map((c) => ({
    ...c,
    'contractor.name': c.contractor?.name ?? '',
    'site.name': c.site?.name ?? '',
    'name': c.name,
  })) as (Camp & Record<string, unknown>)[]
  const { sorted, sortKey, sortDir, toggleSort } = useSort(flatCamps)

  const hasActiveFilter = !!(search || contractorFilter || siteFilter || statusFilter)
  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setContractorFilter('')
    setSiteFilter('')
    setStatusFilter('')
  }

  const activeCamps = camps.filter((c) => c.isActive).length
  const totalWorkers = camps.reduce((s, c) => s + c._count.workers, 0)
  const totalCapacity = camps.reduce((s, c) => s + (c.capacity ?? 0), 0)

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/labour-camps?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete camp')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Location deleted')
      queryClient.invalidateQueries({ queryKey: ['labour-camps-all'] })
      setDeleteCamp(null)
    },
    onError: () => toast.error('Failed to delete location'),
  })

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-6rem)] overflow-hidden">
      {/* ====== Page Header ====== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Locations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage labour camps across contractors and projects.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs">
            <Home className="h-3.5 w-3.5 text-teal-600" />
            <span className="text-muted-foreground">Camps</span>
            <span className="font-semibold">{activeCamps}<span className="text-muted-foreground font-normal">/{camps.length}</span></span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs">
            <Users className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-muted-foreground">Workers</span>
            <span className="font-semibold">{totalWorkers}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5 text-indigo-600" />
            <span className="text-muted-foreground">Capacity</span>
            <span className="font-semibold">{totalCapacity}</span>
          </div>
          <TableExportButton
            rows={camps}
            columns={campExportColumns}
            filename="camps"
            variant="outline"
            size="default"
          />
          <Button
            size="sm"
            className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
            onClick={() => { setEditingCamp(null); setAddOpen(true) }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add New Location
          </Button>
        </div>
      </div>

      {/* ====== Filter Bar ====== */}
      <Card className="shrink-0 py-0">
        <CardContent className="px-3 py-2">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by camp name, contractor, or project..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={contractorFilter} onValueChange={setContractorFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Contractor" />
              </SelectTrigger>
              <SelectContent>
                {contractors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                className="bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200"
                onClick={() => clearFilters()}
              >
                Clear <X className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ====== Camps Table ====== */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
          {campsLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <MapPin className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-base font-medium">No locations found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters, or click "Add New Location".</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">S.No</TableHead>
                      <SortableHeader column="name" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="text-xs">Camp Name</SortableHeader>
                      <SortableHeader column="contractor.name" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="text-xs">Contractor</SortableHeader>
                      <SortableHeader column="site.name" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} className="text-xs">Project Name</SortableHeader>
                      <TableHead className="text-xs text-center">Total Workers</TableHead>
                      <TableHead className="text-xs text-center">Camp Capacity</TableHead>
                      <TableHead className="text-xs text-center">Occupancy(%)</TableHead>
                      <TableHead className="text-xs text-center">Camp Status</TableHead>
                      <TableHead className="text-xs text-center">Compliance</TableHead>
                      <TableHead className="text-xs text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((camp, index) => {
                      const comp = complianceFor(camp)
                      const pct = occupancyPct(camp)
                      return (
                        <TableRow key={camp.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="text-sm font-medium">{camp.name}</TableCell>
                          <TableCell className="text-sm">{camp.contractor?.name || '—'}</TableCell>
                          <TableCell className="text-sm">{camp.site?.name || '—'}</TableCell>
                          <TableCell className="text-center">
                            <button
                              className="inline-flex items-center gap-1 text-sm font-semibold text-[#0d9488] hover:underline disabled:opacity-50 disabled:no-underline"
                              onClick={() => setWorkersCamp(camp)}
                              disabled={camp._count.workers === 0}
                              title={camp._count.workers === 0 ? 'No workers assigned' : 'View workers'}
                            >
                              <Users className="h-3.5 w-3.5" />
                              {camp._count.workers}
                            </button>
                          </TableCell>
                          <TableCell className="text-center text-sm">{camp.capacity ?? '—'}</TableCell>
                          <TableCell className="text-center text-sm">
                            {pct == null ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <span className={pct > 100 ? 'font-semibold text-red-600' : 'font-medium'}>{pct}%</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              camp.isActive
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {camp.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${comp.className}`}>
                              {comp.label === 'Compliant' && <ShieldCheck className="h-3 w-3" />}
                              {comp.label === 'Overcrowded' && <AlertTriangle className="h-3 w-3" />}
                              {comp.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost" size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => { setEditingCamp(camp); setAddOpen(true) }}
                                title="Edit"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost" size="sm"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => setDeleteCamp(camp)}
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y">
                {sorted.map((camp) => {
                  const comp = complianceFor(camp)
                  const pct = occupancyPct(camp)
                  return (
                    <div key={camp.id} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{camp.name}</p>
                          <p className="text-xs text-muted-foreground">{camp.contractor?.name} · {camp.site?.name}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingCamp(camp); setAddOpen(true) }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteCamp(camp)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-md bg-muted/50 p-1.5">
                          <p className="text-muted-foreground">Workers</p>
                          <button
                            className="font-semibold text-[#0d9488] disabled:opacity-50"
                            onClick={() => setWorkersCamp(camp)}
                            disabled={camp._count.workers === 0}
                          >
                            {camp._count.workers}
                          </button>
                        </div>
                        <div className="rounded-md bg-muted/50 p-1.5">
                          <p className="text-muted-foreground">Capacity</p>
                          <p className="font-semibold">{camp.capacity ?? '—'}</p>
                        </div>
                        <div className="rounded-md bg-muted/50 p-1.5">
                          <p className="text-muted-foreground">Occupancy</p>
                          <p className={`font-semibold ${pct != null && pct > 100 ? 'text-red-600' : ''}`}>{pct == null ? '—' : `${pct}%`}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          camp.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {camp.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${comp.className}`}>
                          {comp.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ====== Add / Edit Location Dialog ====== */}
      {addOpen && (
        <AddLocationDialog
          key={editingCamp?.id ?? 'new'}
          open={addOpen}
          onOpenChange={(open) => { setAddOpen(open); if (!open) setEditingCamp(null) }}
          editingCamp={editingCamp}
          contractors={contractors}
          sites={sites}
          existingCampNames={camps.map((c) => c.name)}
        />
      )}

      {/* ====== Workers Detail Dialog ====== */}
      <WorkersDetailDialog camp={workersCamp} onOpenChange={(open) => !open && setWorkersCamp(null)} />

      {/* ====== Delete Confirmation ====== */}
      <AlertDialog open={!!deleteCamp} onOpenChange={(open) => !open && setDeleteCamp(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteCamp?.name}</strong>? This will deactivate the camp. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteCamp && deleteMutation.mutate(deleteCamp.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ==================== ADD / EDIT LOCATION DIALOG ====================

function AddLocationDialog({
  open,
  onOpenChange,
  editingCamp,
  contractors,
  sites,
  existingCampNames,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingCamp: Camp | null
  contractors: Contractor[]
  sites: Site[]
  existingCampNames: string[]
}) {
  const queryClient = useQueryClient()
  const isEdit = !!editingCamp

  // Initialise form state from editingCamp on mount (the parent remounts this
  // component via a key whenever the dialog opens for add/edit, so these
  // initialisers run fresh each time).
  const [contractorId, setContractorId] = useState(editingCamp?.contractorId || '')
  const [siteId, setSiteId] = useState(editingCamp?.siteId || '')
  const [campName, setCampName] = useState(editingCamp?.name || '')
  const [capacity, setCapacity] = useState(editingCamp?.capacity != null ? String(editingCamp.capacity) : '')
  const [address, setAddress] = useState(editingCamp?.address || '')
  const [isActive, setIsActive] = useState(editingCamp?.isActive ?? true)

  // Extra camp-name options added via the "+" button (local only)
  const [extraCampNames, setExtraCampNames] = useState<string[]>([])
  const [contractorDialogOpen, setContractorDialogOpen] = useState(false)
  const [siteDialogOpen, setSiteDialogOpen] = useState(false)
  const [campNameDialogOpen, setCampNameDialogOpen] = useState(false)

  const allCampNames = useMemo(() => {
    const set = new Set([...existingCampNames, ...extraCampNames])
    return Array.from(set).sort()
  }, [existingCampNames, extraCampNames])

  const mutation = useMutation({
    mutationFn: async (body: { name: string; contractorId: string; siteId: string; capacity?: number; address?: string; isActive?: boolean }) => {
      if (isEdit && editingCamp) {
        const res = await fetch('/api/labour-camps', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingCamp.id,
            name: body.name,
            capacity: body.capacity,
            address: body.address,
            isActive: body.isActive,
          }),
        })
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to update location') }
        return res.json()
      }
      const res = await fetch('/api/labour-camps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to create location') }
      return res.json()
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Location updated' : 'Location created')
      queryClient.invalidateQueries({ queryKey: ['labour-camps-all'] })
      onOpenChange(false)
    },
    onError: (err: Error) => toast.error(err.message || 'Operation failed'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!contractorId) { toast.error('Please select a contractor'); return }
    if (!siteId) { toast.error('Please select a project'); return }
    if (!campName.trim()) { toast.error('Please enter or select a camp name'); return }
    mutation.mutate({
      name: campName.trim(),
      contractorId,
      siteId,
      capacity: capacity ? Number(capacity) : undefined,
      address: address.trim() || undefined,
      isActive: isEdit ? isActive : undefined,
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Location' : 'Add New Location'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'Update camp details.' : 'Select a contractor, project and camp name to create a location. Use the + button to add new entries.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-1">
            {/* Contractor dropdown + add new */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Contractor *</Label>
              <div className="flex items-center gap-2">
                <Select value={contractorId} onValueChange={setContractorId} disabled={isEdit}>
                  <SelectTrigger className="h-9 text-sm flex-1">
                    <SelectValue placeholder="Select contractor" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractors.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 border-[#0d9488]/40 text-[#0d9488] hover:bg-[#0d9488]/10"
                  onClick={() => setContractorDialogOpen(true)}
                  title="Add new contractor"
                  disabled={isEdit}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Camp Name dropdown + add new */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Camp Name *</Label>
              <div className="flex items-center gap-2">
                <Select value={campName} onValueChange={setCampName}>
                  <SelectTrigger className="h-9 text-sm flex-1">
                    <SelectValue placeholder="Select or add camp name" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCampNames.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 border-[#0d9488]/40 text-[#0d9488] hover:bg-[#0d9488]/10"
                  onClick={() => setCampNameDialogOpen(true)}
                  title="Add new camp name"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Project Name dropdown + add new */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Project Name *</Label>
              <div className="flex items-center gap-2">
                <Select value={siteId} onValueChange={setSiteId} disabled={isEdit}>
                  <SelectTrigger className="h-9 text-sm flex-1">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 border-[#0d9488]/40 text-[#0d9488] hover:bg-[#0d9488]/10"
                  onClick={() => setSiteDialogOpen(true)}
                  title="Add new project"
                  disabled={isEdit}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Capacity + Address */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Camp Capacity</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 50"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Address</Label>
                <Input
                  placeholder="Optional"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Active/Inactive toggle (only shown in edit mode) */}
            {isEdit && (
              <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                <div>
                  <Label className="text-xs font-semibold">Camp Status</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Toggle to activate or deactivate this camp</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs font-medium', isActive ? 'text-emerald-600' : 'text-red-600')}>
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                  <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" size="sm" className="bg-[#0d9488] hover:bg-[#0f766e] text-white" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create Location'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sub-dialogs for the "+" buttons (conditionally rendered so they
          mount fresh — with empty fields — each time they open). */}
      {contractorDialogOpen && (
        <QuickContractorDialog
          open={contractorDialogOpen}
          onOpenChange={setContractorDialogOpen}
          onCreated={(c) => { setContractorId(c.id); queryClient.invalidateQueries({ queryKey: ['contractors'] }) }}
        />
      )}
      {siteDialogOpen && (
        <QuickSiteDialog
          open={siteDialogOpen}
          onOpenChange={setSiteDialogOpen}
          contractors={contractors}
          preselectedContractorId={contractorId}
          onCreated={(s) => { setSiteId(s.id); queryClient.invalidateQueries({ queryKey: ['locations-sites'] }) }}
        />
      )}
      {campNameDialogOpen && (
        <QuickCampNameDialog
          open={campNameDialogOpen}
          onOpenChange={setCampNameDialogOpen}
          existingNames={allCampNames}
          onCreated={(name) => { setExtraCampNames((prev) => [...prev, name]); setCampName(name) }}
        />
      )}
    </>
  )
}

// ==================== QUICK CONTRACTOR DIALOG (for + button) ====================

function QuickContractorDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (c: Contractor) => void
}) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (body: { name: string; code: string }) => {
      const res = await fetch('/api/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to create contractor') }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success('Contractor created')
      queryClient.invalidateQueries({ queryKey: ['contractors'] })
      onCreated(data)
      onOpenChange(false)
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create contractor'),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add New Contractor</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim() || !code.trim()) { toast.error('Name and Code are required'); return }
          mutation.mutate({ name: name.trim(), code: code.trim().toUpperCase() })
        }} className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Name *</Label>
            <Input placeholder="Contractor name" value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Code *</Label>
            <Input placeholder="e.g. ABC" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="h-9 text-sm font-mono" />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-[#0d9488] hover:bg-[#0f766e] text-white" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ==================== QUICK SITE DIALOG (for + button) ====================

function QuickSiteDialog({
  open,
  onOpenChange,
  contractors,
  preselectedContractorId,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractors: Contractor[]
  preselectedContractorId: string
  onCreated: (s: Site) => void
}) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [contractorId, setContractorId] = useState(preselectedContractorId || '')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (body: { name: string; code: string; contractorId?: string }) => {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to create project') }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success('Project created')
      queryClient.invalidateQueries({ queryKey: ['locations-sites'] })
      onCreated(data)
      onOpenChange(false)
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create project'),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim() || !code.trim()) { toast.error('Project Name and Code are required'); return }
          mutation.mutate({ name: name.trim(), code: code.trim().toUpperCase(), contractorId: contractorId || undefined })
        }} className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Project Name *</Label>
            <Input placeholder="e.g. Tower A Construction" value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Code *</Label>
            <Input placeholder="e.g. TWR-A" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="h-9 text-sm font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Contractor</Label>
            <Select value={contractorId} onValueChange={setContractorId}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select contractor" /></SelectTrigger>
              <SelectContent>
                {contractors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-[#0d9488] hover:bg-[#0f766e] text-white" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ==================== QUICK CAMP NAME DIALOG (for + button) ====================

function QuickCampNameDialog({
  open,
  onOpenChange,
  existingNames,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingNames: string[]
  onCreated: (name: string) => void
}) {
  const [name, setName] = useState('')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add New Camp Name</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault()
          const trimmed = name.trim()
          if (!trimmed) { toast.error('Camp name is required'); return }
          if (existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
            toast.error('A camp with this name already exists')
            return
          }
          onCreated(trimmed)
          onOpenChange(false)
        }} className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Camp Name *</Label>
            <Input placeholder="e.g. Block A" value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" autoFocus />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-[#0d9488] hover:bg-[#0f766e] text-white">Add</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ==================== WORKERS DETAIL DIALOG ====================

function WorkersDetailDialog({
  camp,
  onOpenChange,
}: {
  camp: Camp | null
  onOpenChange: (open: boolean) => void
}) {
  const open = !!camp
  const { data, isLoading } = useQuery<{ data: WorkerRow[]; total: number }>({
    queryKey: ['camp-workers', camp?.id],
    queryFn: () => fetch(`/api/workers?labourCampId=${camp!.id}&limit=100`).then((r) => r.json()),
    enabled: !!camp,
  })

  const workers = data?.data ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#0d9488]" />
            Workers at {camp?.name}
          </DialogTitle>
          <DialogDescription>
            {camp?.contractor?.name} · {camp?.site?.name} · {data?.total ?? 0} worker{(data?.total ?? 0) !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : workers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">No workers assigned to this camp.</p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="text-xs">Employee No.</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Designation</TableHead>
                  <TableHead className="text-xs">Gender</TableHead>
                  <TableHead className="text-xs">Blood Group</TableHead>
                  <TableHead className="text-xs">UAN</TableHead>
                  <TableHead className="text-xs">Site</TableHead>
                  <TableHead className="text-xs">Police Records</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="text-xs font-mono">{w.employeeNumber}</TableCell>
                    <TableCell className="text-sm font-medium">{w.fullName}</TableCell>
                    <TableCell className="text-xs">{w.designation?.name || '—'}</TableCell>
                    <TableCell className="text-xs">{w.gender}</TableCell>
                    <TableCell className="text-xs">{w.bloodGroup}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{w.uanNumber ?? '—'}</TableCell>
                    <TableCell className="text-xs">{w.site?.name ?? '—'}</TableCell>
                    <TableCell className="text-xs">{w.policeRecords || 'Not Updated'}</TableCell>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
