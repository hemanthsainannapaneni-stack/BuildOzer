'use client'

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Search, Plus, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle,
  FlaskConical, TrendingUp, ArrowUpCircle, ArrowDownCircle, ShieldAlert, FileText, X, Camera,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useAuthStore, rolePermissions } from '@/lib/auth-store'
import { useSort } from '@/lib/use-sort'
import { SortableHeader } from '@/components/shared/sortable-header'
import PhotoUploader from '@/components/shared/photo-uploader'
import { TablePagination } from '@/components/shared/table-pagination'
import { TableExportButton, type ExportColumn } from '@/components/ui/table-export-button'
import { format, parseISO } from 'date-fns'

// ---------- types ----------
interface HazardousMaterial {
  id: string
  materialName: string
  category: string
  hazardClassification: string | null
  msdsUploadPath: string | null
  photos: string | null
  storageLicenseNumber: string | null
  storageLicenseExpiry: string | null
  quantityCurrent: number
  quantityMaxPermissible: number
  unit: string
  storageLocation: string | null
  storageConditionCompliant: boolean
  handlingResponsiblePerson: string | null
  emergencyProcedureRef: string | null
  siteId: string | null
  site: { id: string; name: string; code: string } | null
  _count: { transactions: number }
}

interface MaterialTransaction {
  id: string
  transactionType: string
  quantity: number
  runningBalance: number
  date: string
  remarks: string | null
}

interface HazardousDetail extends HazardousMaterial {
  transactions: MaterialTransaction[]
}

interface HazardousListResponse {
  data: HazardousMaterial[]
  total: number
  page: number
  limit: number
}

// ---------- helpers ----------
const categoryBadge: Record<string, string> = {
  General: 'bg-slate-100 text-slate-700 border-slate-200',
  Hazardous: 'bg-amber-100 text-amber-800 border-amber-200',
  Chemical: 'bg-purple-100 text-purple-800 border-purple-200',
}

const hazardBadge: Record<string, string> = {
  Flammable: 'bg-red-100 text-red-800 border-red-200',
  Corrosive: 'bg-amber-100 text-amber-800 border-amber-200',
  Toxic: 'bg-purple-100 text-purple-800 border-purple-200',
  Radioactive: 'bg-red-100 text-red-900 border-red-300',
  Oxidizer: 'bg-orange-100 text-orange-800 border-orange-200',
}

function getProgressColor(pct: number) {
  if (pct > 80) return 'bg-red-500'
  if (pct >= 60) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function getProgressLabel(pct: number) {
  if (pct > 100) return 'text-red-600 font-bold'
  if (pct > 80) return 'text-red-600 font-medium'
  if (pct >= 60) return 'text-amber-600 font-medium'
  return 'text-emerald-600'
}

// ---------- export columns ----------
const materialExportColumns: ExportColumn<HazardousMaterial>[] = [
  { key: 'materialName', header: 'Material Name' },
  { key: 'category', header: 'Category' },
  {
    key: 'hazardClassification',
    header: 'Hazard Class',
    accessor: (m) => m.hazardClassification ?? '—',
  },
  { key: 'quantityCurrent', header: 'Current Quantity', accessor: (m) => m.quantityCurrent },
  { key: 'quantityMaxPermissible', header: 'Max Permissible Quantity', accessor: (m) => m.quantityMaxPermissible },
  {
    key: 'utilizationPct',
    header: 'Utilization %',
    accessor: (m) =>
      m.quantityMaxPermissible > 0
        ? Math.round((m.quantityCurrent / m.quantityMaxPermissible) * 100)
        : 0,
  },
  { key: 'unit', header: 'Unit' },
  { key: 'storageLocation', header: 'Storage Location', accessor: (m) => m.storageLocation ?? '—' },
  {
    key: 'storageConditionCompliant',
    header: 'Storage Compliant',
    accessor: (m) => (m.storageConditionCompliant ? 'Yes' : 'No'),
  },
  {
    key: 'handlingResponsiblePerson',
    header: 'Handler',
    accessor: (m) => m.handlingResponsiblePerson ?? '—',
  },
  { key: 'site', header: 'Site', accessor: (m) => m.site?.name ?? '—' },
]

// ---------- main ----------
export default function HazardousView() {
  const role = useAuthStore((s) => s.role)
  const perms = rolePermissions[role]
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const hasActiveFilter = !!search
  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setPage(1)
  }

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [txnDialogOpen, setTxnDialogOpen] = useState(false)
  const [txnMaterialId, setTxnMaterialId] = useState<string | null>(null)

  // Add material form
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('General')
  const [formHazard, setFormHazard] = useState('')
  const [formLicenseNo, setFormLicenseNo] = useState('')
  const [formMaxQty, setFormMaxQty] = useState('')
  const [formUnit, setFormUnit] = useState('KG')
  const [formLocation, setFormLocation] = useState('')
  const [formHandler, setFormHandler] = useState('')
  const [formEmergency, setFormEmergency] = useState('')
  const [formPhotos, setFormPhotos] = useState<string[]>([])

  // Transaction form
  const [txnType, setTxnType] = useState('In')
  const [txnQty, setTxnQty] = useState('')
  const [txnRemarks, setTxnRemarks] = useState('')

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
    const t = setTimeout(() => setDebouncedSearch(value), 300)
    return () => clearTimeout(t)
  }

  // Fetch list
  const queryParams = new URLSearchParams()
  if (debouncedSearch) queryParams.set('search', debouncedSearch)
  queryParams.set('limit', '100')

  const { data, isLoading } = useQuery<HazardousListResponse>({
    queryKey: ['hazardous', debouncedSearch],
    queryFn: () => fetch(`/api/hazardous?${queryParams.toString()}`).then((r) => r.json()),
  })

  const materials = data?.data ?? []
  const { sorted, sortKey, sortDir, toggleSort } = useSort(materials as (HazardousMaterial & Record<string, unknown>)[])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pagedData = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Fetch detail when expanded
  const { data: detailData, isLoading: detailLoading } = useQuery<{ data: HazardousDetail }>({
    queryKey: ['hazardous-detail', expandedId],
    queryFn: () => fetch(`/api/hazardous/${expandedId}`).then((r) => r.json()),
    enabled: !!expandedId,
  })

  const detail: HazardousDetail | null = detailData?.data ?? null

  // Alert materials: current > 80% of max OR current > max
  const alertMaterials = useMemo(() =>
    materials.filter((m) => m.quantityCurrent > 0.8 * m.quantityMaxPermissible),
    [materials]
  )

  const criticalMaterials = useMemo(() =>
    materials.filter((m) => m.quantityCurrent > m.quantityMaxPermissible),
    [materials]
  )

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch('/api/hazardous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success('Material added successfully')
      queryClient.invalidateQueries({ queryKey: ['hazardous'] })
      setAddDialogOpen(false)
      resetAddForm()
    },
    onError: () => toast.error('Failed to add material'),
  })

  // Transaction mutation
  const txnMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      fetch(`/api/hazardous/${id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success('Transaction recorded successfully')
      queryClient.invalidateQueries({ queryKey: ['hazardous'] })
      queryClient.invalidateQueries({ queryKey: ['hazardous-detail'] })
      setTxnDialogOpen(false)
      setTxnMaterialId(null)
      setTxnType('In')
      setTxnQty('')
      setTxnRemarks('')
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Failed to record transaction'
      toast.error(msg)
    },
  })

  const resetAddForm = () => {
    setFormName('')
    setFormCategory('General')
    setFormHazard('')
    setFormLicenseNo('')
    setFormMaxQty('')
    setFormUnit('KG')
    setFormLocation('')
    setFormHandler('')
    setFormEmergency('')
    setFormPhotos([])
  }

  const handleCreate = () => {
    if (!formName || !formMaxQty) {
      toast.error('Material Name and Max Permissible Qty are required')
      return
    }
    createMutation.mutate({
      materialName: formName,
      category: formCategory,
      hazardClassification: formHazard || null,
      storageLicenseNumber: formLicenseNo || null,
      quantityMaxPermissible: parseFloat(formMaxQty),
      unit: formUnit,
      storageLocation: formLocation || null,
      handlingResponsiblePerson: formHandler || null,
      emergencyProcedureRef: formEmergency || null,
      photoPath: formPhotos.length > 0 ? formPhotos[0] : null,
      photos: formPhotos.length > 0 ? JSON.stringify(formPhotos) : null,
    })
  }

  const handleAddTxn = () => {
    if (!txnMaterialId || !txnQty) {
      toast.error('Quantity is required')
      return
    }
    txnMutation.mutate({
      id: txnMaterialId,
      body: {
        transactionType: txnType,
        quantity: parseFloat(txnQty),
        remarks: txnRemarks || null,
      },
    })
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-6rem)] overflow-hidden">
      {/* ====== Header ====== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hazardous Materials Register</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? 'Loading...' : `${materials.length} material${materials.length !== 1 ? 's' : ''} registered`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TableExportButton
            rows={sorted}
            columns={materialExportColumns}
            filename="hazardous_materials"
            variant="outline"
            size="default"
          />
          {perms.canEdit && (
            <Button className="bg-[#0d9488] hover:bg-[#0f766e] text-white" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Material
            </Button>
          )}
        </div>
      </div>

      {/* ====== Critical Alert Banner ====== */}
      {criticalMaterials.length > 0 && (
        <div className="shrink-0 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
          <ShieldAlert className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">CRITICAL: {criticalMaterials.length} material{criticalMaterials.length !== 1 ? 's' : ''} exceed maximum permissible quantity</p>
            <p className="text-xs text-red-600 mt-1">
              {criticalMaterials.map((m) => m.materialName).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* ====== Warning Banner (Near Limit) ====== */}
      {alertMaterials.length > 0 && criticalMaterials.length === 0 && (
        <div className="shrink-0 flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              Warning: {alertMaterials.length} material{alertMaterials.length !== 1 ? 's' : ''} above 80% of maximum limit
            </p>
            <p className="text-xs text-amber-600 mt-1">
              {alertMaterials.map((m) => m.materialName).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* ====== Search ====== */}
      <Card className="py-0 shrink-0">
        <CardContent className="px-3 py-2">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by material name or hazard class..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
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

      {/* ====== Materials Table (Desktop) ====== */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FlaskConical className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-base font-medium">No hazardous materials found</p>
          <p className="text-sm mt-1">Add materials to start tracking</p>
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto flex-1 min-h-0">
              <Card className="flex-1 min-h-0">
                <CardContent className="p-0 overflow-hidden">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="w-12">S.No</TableHead>
                      <SortableHeader column="materialName" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Material Name</SortableHeader>
                      <SortableHeader column="category" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Category</SortableHeader>
                      <SortableHeader column="hazardClassification" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Hazard Class</SortableHeader>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Utilization</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Storage Location</TableHead>
                      <TableHead>Compliant</TableHead>
                      <TableHead>Handler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedData.map((m, index) => {
                      const pct = m.quantityMaxPermissible > 0
                        ? (m.quantityCurrent / m.quantityMaxPermissible) * 100
                        : 0
                      const isExpanded = expandedId === m.id
                      const isCritical = m.quantityCurrent > m.quantityMaxPermissible

                      return (
                        <React.Fragment key={m.id}>
                          <TableRow
                            className={`cursor-pointer hover:bg-muted/30 transition-colors ${isCritical ? 'bg-red-50/50' : ''}`}
                            onClick={() => setExpandedId(isExpanded ? null : m.id)}
                          >
                            <TableCell>
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + index + 1}</TableCell>
                            <TableCell className="font-medium">{m.materialName}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={categoryBadge[m.category] || ''}>
                                {m.category}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {m.hazardClassification ? (
                                <Badge variant="outline" className={hazardBadge[m.hazardClassification] || 'bg-slate-100 text-slate-700'}>
                                  {m.hazardClassification}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <span className={`text-sm font-medium ${getProgressLabel(pct)}`}>
                                  {m.quantityCurrent} / {m.quantityMaxPermissible}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="w-28">
                              <div className="space-y-1">
                                <Progress
                                  value={Math.min(pct, 100)}
                                  className="h-2"
                                />
                                <span className={`text-xs ${getProgressLabel(pct)}`}>
                                  {pct.toFixed(0)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{m.unit}</TableCell>
                            <TableCell className="text-sm">{m.storageLocation || '—'}</TableCell>
                            <TableCell>
                              {m.storageConditionCompliant ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{m.handlingResponsiblePerson || '—'}</TableCell>
                          </TableRow>
                          {/* Expanded Detail */}
                          {isExpanded && (
                            <TableRow key={`${m.id}-detail`}>
                              <TableCell colSpan={11} className="bg-muted/30 p-0">
                                <HazardousDetailSection
                                  detail={detail}
                                  loading={detailLoading}
                                  materialId={m.id}
                                  pct={pct}
                                  isCritical={isCritical}
                                  canEdit={perms.canEdit}
                                  onAddTxn={() => {
                                    setTxnMaterialId(m.id)
                                    setTxnDialogOpen(true)
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
                </CardContent>
              </Card>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden flex-1 min-h-0 overflow-y-auto space-y-3">
              {pagedData.map((m) => {
              const pct = m.quantityMaxPermissible > 0
                ? (m.quantityCurrent / m.quantityMaxPermissible) * 100
                : 0
              const isExpanded = expandedId === m.id
              const isCritical = m.quantityCurrent > m.quantityMaxPermissible

              return (
                <Card key={m.id} className={`overflow-hidden ${isCritical ? 'border-red-200' : ''}`}>
                  <CardContent className="p-0">
                    <div
                      className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : m.id)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="font-medium">{m.materialName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={categoryBadge[m.category] || ''}>{m.category}</Badge>
                            {m.hazardClassification && (
                              <Badge variant="outline" className={hazardBadge[m.hazardClassification] || ''}>
                                {m.hazardClassification}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {m.storageConditionCompliant
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            : <XCircle className="h-4 w-4 text-red-600" />
                          }
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-medium ${getProgressLabel(pct)}`}>
                            {m.quantityCurrent} / {m.quantityMaxPermissible} {m.unit}
                          </span>
                          <span className={`text-xs ${getProgressLabel(pct)}`}>{pct.toFixed(0)}%</span>
                        </div>
                        <Progress value={Math.min(pct, 100)} className="h-2" />
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{m.storageLocation || 'No location'}</span>
                        <span>{m.handlingResponsiblePerson || 'No handler'}</span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t bg-muted/20">
                        <HazardousDetailSection
                          detail={detail}
                          loading={detailLoading}
                          materialId={m.id}
                          pct={pct}
                          isCritical={isCritical}
                          canEdit={perms.canEdit}
                          onAddTxn={() => {
                            setTxnMaterialId(m.id)
                            setTxnDialogOpen(true)
                          }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <TablePagination page={page} totalPages={totalPages} total={sorted.length} onPageChange={setPage} pageSize={PAGE_SIZE} />
        </div>
        </>
      )}

      {/* ====== Add Material Dialog ====== */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Hazardous Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Material Name *</Label>
              <Input className="mt-1" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Acetone, Sulphuric Acid" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Hazardous">Hazardous</SelectItem>
                    <SelectItem value="Chemical">Chemical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Hazard Classification</Label>
                <Select value={formHazard} onValueChange={setFormHazard}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Flammable">Flammable</SelectItem>
                    <SelectItem value="Corrosive">Corrosive</SelectItem>
                    <SelectItem value="Toxic">Toxic</SelectItem>
                    <SelectItem value="Radioactive">Radioactive</SelectItem>
                    <SelectItem value="Oxidizer">Oxidizer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Storage License Number</Label>
              <Input className="mt-1" value={formLicenseNo} onChange={(e) => setFormLicenseNo(e.target.value)} placeholder="e.g. HAZ-LIC-2025-001" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Max Permissible Qty *</Label>
                <Input type="number" className="mt-1" value={formMaxQty} onChange={(e) => setFormMaxQty(e.target.value)} placeholder="e.g. 500" min="1" />
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={formUnit} onValueChange={setFormUnit}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KG">KG</SelectItem>
                    <SelectItem value="L">L (Litres)</SelectItem>
                    <SelectItem value="Litres">Litres</SelectItem>
                    <SelectItem value="Units">Units</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Storage Location</Label>
                <Input className="mt-1" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder="e.g. Zone A, Shed 3" />
              </div>
              <div>
                <Label>Handling Person</Label>
                <Input className="mt-1" value={formHandler} onChange={(e) => setFormHandler(e.target.value)} placeholder="Name of responsible person" />
              </div>
            </div>
            <div>
              <Label>Emergency Procedure Reference</Label>
              <Textarea className="mt-1" rows={2} value={formEmergency} onChange={(e) => setFormEmergency(e.target.value)} placeholder="Reference to emergency procedures..." />
            </div>
            <PhotoUploader photos={formPhotos} onPhotosChange={setFormPhotos} maxPhotos={5} label="Storage & Labeling Photos" />
            <div className="flex gap-2 pt-2">
              <Button
                className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
                disabled={createMutation.isPending}
                onClick={handleCreate}
              >
                {createMutation.isPending ? 'Adding...' : 'Add Material'}
              </Button>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ====== Add Transaction Dialog ====== */}
      <Dialog open={txnDialogOpen} onOpenChange={setTxnDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Type *</Label>
              <div className="flex gap-3 mt-2">
                <Button
                  type="button"
                  variant={txnType === 'In' ? 'default' : 'outline'}
                  className={txnType === 'In' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                  onClick={() => setTxnType('In')}
                >
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  Stock In
                </Button>
                <Button
                  type="button"
                  variant={txnType === 'Out' ? 'default' : 'outline'}
                  className={txnType === 'Out' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                  onClick={() => setTxnType('Out')}
                >
                  <ArrowDownCircle className="h-4 w-4 mr-2" />
                  Stock Out
                </Button>
              </div>
            </div>
            <div>
              <Label>Quantity *</Label>
              <Input type="number" className="mt-1" value={txnQty} onChange={(e) => setTxnQty(e.target.value)} placeholder="Enter quantity" min="1" />
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea className="mt-1" rows={2} value={txnRemarks} onChange={(e) => setTxnRemarks(e.target.value)} placeholder="Reason for transaction..." />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className={txnType === 'In' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
                disabled={txnMutation.isPending}
                onClick={handleAddTxn}
              >
                {txnMutation.isPending ? 'Recording...' : 'Record Transaction'}
              </Button>
              <Button variant="outline" onClick={() => setTxnDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------- Detail Sub-component ----------
function HazardousDetailSection({
  detail,
  loading,
  materialId,
  pct,
  isCritical,
  canEdit,
  onAddTxn,
}: {
  detail: HazardousDetail | null
  loading: boolean
  materialId: string
  pct: number
  isCritical: boolean
  canEdit: boolean
  onAddTxn: () => void
}) {
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    )
  }

  if (!detail) return null

  const txnExportColumns: ExportColumn<MaterialTransaction>[] = [
    {
      key: 'date',
      header: 'Date',
      accessor: (t) => format(parseISO(t.date), 'yyyy-MM-dd HH:mm'),
    },
    { key: 'transactionType', header: 'Type', accessor: (t) => t.transactionType },
    { key: 'quantity', header: 'Quantity', accessor: (t) => t.quantity },
    { key: 'unit', header: 'Unit', accessor: () => detail.unit },
    { key: 'runningBalance', header: 'Running Balance', accessor: (t) => t.runningBalance },
    { key: 'remarks', header: 'Remarks', accessor: (t) => t.remarks ?? '' },
  ]
  const txnFilename = `hazardous_transactions_${detail.materialName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`

  return (
    <div className="p-4 space-y-4">
      {isCritical && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
          <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-800">
            CRITICAL: Current quantity ({detail.quantityCurrent}) exceeds maximum permissible ({detail.quantityMaxPermissible})
          </p>
        </div>
      )}

      {/* Full Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Storage License</p>
          <p className="text-sm font-medium mt-0.5">{detail.storageLicenseNumber || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">License Expiry</p>
          <p className={`text-sm font-medium mt-0.5 ${detail.storageLicenseExpiry && new Date(detail.storageLicenseExpiry) < new Date() ? 'text-red-600' : ''}`}>
            {detail.storageLicenseExpiry ? format(parseISO(detail.storageLicenseExpiry), 'dd MMM yyyy') : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Storage Location</p>
          <p className="text-sm font-medium mt-0.5">{detail.storageLocation || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Storage Compliant</p>
          <div className="flex items-center gap-1.5 mt-1">
            {detail.storageConditionCompliant ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-sm text-emerald-600 font-medium">Yes</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600 font-medium">No</span>
              </>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">MSDS Reference</p>
          <div className="flex items-center gap-1.5 mt-1">
            {detail.msdsUploadPath ? (
              <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700">
                <FileText className="h-3 w-3 mr-1" /> Uploaded
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">Not uploaded</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Site</p>
          <p className="text-sm font-medium mt-0.5">{detail.site?.name || '—'}</p>
        </div>
      </div>

      {/* Emergency Procedure */}
      {detail.emergencyProcedureRef && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-xs text-amber-700 font-medium mb-1">Emergency Procedure Reference</p>
          <p className="text-sm text-amber-900 whitespace-pre-wrap">{detail.emergencyProcedureRef}</p>
        </div>
      )}

      {/* Storage & Labeling Photos */}
      {detail.photos && (() => {
        try {
          const detailPhotos = JSON.parse(detail.photos) as string[]
          if (detailPhotos.length === 0) return null
          return (
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                <Camera className="h-3 w-3" />
                <span>Storage & Labeling Photos ({detailPhotos.length})</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                {detailPhotos.map((photo, idx) => (
                  <div key={idx} className="aspect-square rounded-md overflow-hidden border bg-muted">
                    <img src={photo} alt={`Material photo ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )
        } catch { return null }
      })()}

      <Separator />

      {/* Transaction Log */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Transaction Log ({detail.transactions.length})
          </h4>
          {canEdit && (
            <Button size="sm" variant="outline" className="text-xs" onClick={onAddTxn}>
              <Plus className="h-3 w-3 mr-1" />
              Add Transaction
            </Button>
          )}
          <TableExportButton
            rows={detail.transactions}
            columns={txnExportColumns}
            filename={txnFilename}
            variant="outline"
            size="sm"
          />
        </div>
        {detail.transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No transactions recorded yet</p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2">
            {detail.transactions.map((txn) => (
              <div
                key={txn.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  txn.transactionType === 'In'
                    ? 'bg-emerald-50/50 border-emerald-100'
                    : 'bg-red-50/50 border-red-100'
                }`}
              >
                {txn.transactionType === 'In' ? (
                  <ArrowUpCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <ArrowDownCircle className="h-4 w-4 text-red-600 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        txn.transactionType === 'In'
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-red-100 text-red-700 border-red-200'
                      }
                    >
                      {txn.transactionType}
                    </Badge>
                    <span className="text-sm font-medium">{txn.quantity} {detail.unit}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(txn.date), 'dd MMM yyyy HH:mm')}
                    </span>
                  </div>
                  {txn.remarks && <p className="text-xs text-muted-foreground mt-1 truncate">{txn.remarks}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className={`text-sm font-semibold ${
                    txn.runningBalance > detail.quantityMaxPermissible ? 'text-red-600' :
                    txn.runningBalance > 0.8 * detail.quantityMaxPermissible ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {txn.runningBalance}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
