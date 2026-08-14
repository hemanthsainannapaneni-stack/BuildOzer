'use client'

import { useState, useCallback, useRef, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Warehouse, Shield, Heart, Building2, Camera, X, ZoomIn,
  CheckCircle2, XCircle, AlertTriangle, CalendarDays,
  User, Image as ImageIcon, Pencil, Upload, ClipboardCheck, Plus,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore, rolePermissions } from '@/lib/auth-store'
import { StatusBadge } from '@/components/shared/status-badge'
import { TableExportButton, type ExportColumn } from '@/components/ui/table-export-button'
import { format, parseISO } from 'date-fns'

// ===================== TYPES =====================

interface ComplianceItem {
  id: string
  siteId: string
  item: string
  status: string
  lastInspectionDate: string | null
  inspector: string | null
  remarks: string | null
  photos: string | null
  records: string | null
  usageDetails: string | null
  compliancePct?: number | null
  details?: string | null
}

interface SiteInfo {
  id: string
  name: string
  code: string
}

interface ComplianceData {
  facilities: ComplianceItem[]
  securityItems: ComplianceItem[]
  medInfraItems: ComplianceItem[]
  totals?: {
    facilities: { total: number; compliant: number }
    security: { total: number; compliant: number }
    medInfra: { total: number; compliant: number }
  }
}

// ===================== CONSTANTS =====================

const FACILITY_ITEMS = [
  'Transport', 'Rest/Shelter', 'Water', 'Food', 'Cleanliness',
  'Washrooms', 'Safety Tools', 'Waste Disposal', 'Fire Safety', 'CCTV', 'Theft Prevention',
]

const SECURITY_ITEMS = [
  'PPE Compliance', 'Barricading', 'Excavation Safety', 'Fatal Accident Prevention', 'Sign Boards',
]

const MED_INFRA_ITEMS = [
  'Medical Room', 'First Aid', 'Ambulance', 'Emergency Contacts',
]

const STATUS_OPTIONS = [
  { value: 'Compliant', label: 'Available', color: 'text-emerald-600' },
  { value: 'NonCompliant', label: 'Not Available', color: 'text-red-600' },
  { value: 'Pending', label: 'Needs Repair', color: 'text-amber-600' },
]

// ===================== HELPERS =====================

function parseJSON<T>(str: string | null, fallback: T): T {
  if (!str) return fallback
  try { return JSON.parse(str) } catch { return fallback }
}

function statusToAvailability(status: string): { label: string; variant: 'green' | 'red' | 'amber'; icon: typeof CheckCircle2 } {
  if (status === 'Compliant') return { label: 'Available', variant: 'green', icon: CheckCircle2 }
  if (status === 'NonCompliant') return { label: 'Not Available', variant: 'red', icon: XCircle }
  return { label: 'Needs Repair', variant: 'amber', icon: AlertTriangle }
}

// ---------- export columns ----------
const complianceExportColumns: ExportColumn<ComplianceItem>[] = [
  { key: 'item', header: 'Item' },
  {
    key: 'status',
    header: 'Status',
    accessor: (i) => statusToAvailability(i.status).label,
  },
  {
    key: 'lastInspectionDate',
    header: 'Last Inspection Date',
    accessor: (i) =>
      i.lastInspectionDate ? format(parseISO(i.lastInspectionDate), 'yyyy-MM-dd') : 'Not inspected',
  },
  { key: 'inspector', header: 'Inspector', accessor: (i) => i.inspector ?? 'Not assigned' },
  { key: 'remarks', header: 'Remarks', accessor: (i) => i.remarks ?? '' },
  {
    key: 'photoCount',
    header: 'Photos',
    accessor: (i) => parseJSON<string[]>(i.photos, []).length,
  },
]

function computeScore(items: ComplianceItem[]) {
  if (items.length === 0) return 100
  const compliant = items.filter((i) => i.status === 'Compliant').length
  return Math.round((compliant / items.length) * 100)
}

function getScoreColor(pct: number) {
  if (pct >= 80) return 'text-emerald-600'
  if (pct >= 50) return 'text-amber-600'
  return 'text-red-600'
}

function getScoreProgressColor(pct: number) {
  if (pct >= 80) return '[&>div]:bg-emerald-500'
  if (pct >= 50) return '[&>div]:bg-amber-500'
  return '[&>div]:bg-red-500'
}

function availBadgeClasses(variant: 'green' | 'red' | 'amber') {
  if (variant === 'green') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  if (variant === 'red') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
}

function cardBorderColor(variant: 'green' | 'red' | 'amber') {
  if (variant === 'green') return 'border-l-emerald-500'
  if (variant === 'red') return 'border-l-red-500'
  return 'border-l-amber-500'
}

// ===================== MAIN COMPONENT =====================

export default function ComplianceView() {
  const role = useAuthStore((s) => s.role)
  const perms = rolePermissions[role]
  const queryClient = useQueryClient()

  const [selectedSiteId, setSelectedSiteId] = useState<string>('')
  const [updateDialog, setUpdateDialog] = useState<{
    open: boolean
    type: string
    itemId: string
    itemName: string
    currentStatus: string
    currentInspector: string
    currentRemarks: string
  }>({ open: false, type: '', itemId: '', itemName: '', currentStatus: '', currentInspector: '', currentRemarks: '' })
  const [photoDialog, setPhotoDialog] = useState<{ open: boolean; photos: string[]; index: number }>({
    open: false, photos: [], index: 0,
  })

  // Fetch sites for selector
  const { data: sites, isLoading: sitesLoading } = useQuery<SiteInfo[]>({
    queryKey: ['compliance-sites'],
    queryFn: () => fetch('/api/sites').then((r) => r.json()),
  })

  // Fetch compliance data — always fetches (all sites when no selection, specific site when selected)
  const currentSiteId = selectedSiteId

  const { data: complianceData, isLoading: dataLoading } = useQuery<ComplianceData & { aggregated?: boolean }>({
    queryKey: ['compliance-data', currentSiteId],
    queryFn: () => fetch(`/api/compliance${currentSiteId ? `?siteId=${currentSiteId}` : ''}`).then((r) => r.json()),
  })

  const isAggregated = !currentSiteId && complianceData?.aggregated !== false
  const facilities = complianceData?.facilities ?? []
  const securityItems = complianceData?.securityItems ?? []
  const medInfraItems = complianceData?.medInfraItems ?? []

  // Use totals for aggregated mode, computeScore for per-site
  const t = complianceData?.totals
  const facilityScore = t ? Math.round((t.facilities.compliant / Math.max(t.facilities.total, 1)) * 100) : computeScore(facilities)
  const securityScore = t ? Math.round((t.security.compliant / Math.max(t.security.total, 1)) * 100) : computeScore(securityItems)
  const medScore = t ? Math.round((t.medInfra.compliant / Math.max(t.medInfra.total, 1)) * 100) : computeScore(medInfraItems)
  const overallScore = t
    ? Math.round(((t.facilities.compliant + t.security.compliant + t.medInfra.compliant) / Math.max(t.facilities.total + t.security.total + t.medInfra.total, 1)) * 100)
    : Math.round((facilityScore + securityScore + medScore) / 3)

  const handleOpenUpdate = useCallback((item: ComplianceItem, type: string) => {
    setUpdateDialog({
      open: true,
      type,
      itemId: item.id,
      itemName: item.item,
      currentStatus: item.status,
      currentInspector: item.inspector || '',
      currentRemarks: item.remarks || '',
    })
  }, [])

  const handleOpenPhoto = useCallback((photos: string[], index: number) => {
    setPhotoDialog({ open: true, photos, index })
  }, [])

  return (
    <div className="space-y-3">
      {/* ====== Header ====== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Site Compliance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor and manage site facilities, security, and medical infrastructure
          </p>
        </div>
      </div>

      {/* ====== 4 Stat Tiles (Overall + 3 sections) ====== */}
      {sitesLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Overall Compliance */}
          <Card className="border-l-4 border-l-[#0d9488] shadow-sm">
            <CardContent className="p-2">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-teal-100 p-1.5 shrink-0">
                  <ClipboardCheck className="h-3.5 w-3.5 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 truncate">Overall</p>
                  <p className={`text-lg font-bold tracking-tight ${getScoreColor(overallScore)}`}>{overallScore}%</p>
                </div>
              </div>
              <Progress value={overallScore} className={`h-1.5 mt-1 ${getScoreProgressColor(overallScore)}`} />
            </CardContent>
          </Card>
          {/* Site Facilities */}
          <Card className="border-l-4 border-l-teal-500 shadow-sm">
            <CardContent className="p-2">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-teal-100 p-1.5 shrink-0">
                  <Warehouse className="h-3.5 w-3.5 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 truncate">Facilities</p>
                  <p className={`text-lg font-bold tracking-tight ${getScoreColor(facilityScore)}`}>{facilityScore}%</p>
                </div>
              </div>
              <Progress value={facilityScore} className={`h-1.5 mt-1 ${getScoreProgressColor(facilityScore)}`} />
            </CardContent>
          </Card>
          {/* Site Security */}
          <Card className="border-l-4 border-l-emerald-500 shadow-sm">
            <CardContent className="p-2">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-emerald-100 p-1.5 shrink-0">
                  <Shield className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 truncate">Security</p>
                  <p className={`text-lg font-bold tracking-tight ${getScoreColor(securityScore)}`}>{securityScore}%</p>
                </div>
              </div>
              <Progress value={securityScore} className={`h-1.5 mt-1 ${getScoreProgressColor(securityScore)}`} />
            </CardContent>
          </Card>
          {/* Medical Infrastructure */}
          <Card className="border-l-4 border-l-amber-500 shadow-sm">
            <CardContent className="p-2">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-amber-100 p-1.5 shrink-0">
                  <Heart className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 truncate">Medical</p>
                  <p className={`text-lg font-bold tracking-tight ${getScoreColor(medScore)}`}>{medScore}%</p>
                </div>
              </div>
              <Progress value={medScore} className={`h-1.5 mt-1 ${getScoreProgressColor(medScore)}`} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ====== Site Selector (below tiles) ====== */}
      {sites && sites.length > 0 && (
        <Card className="py-0">
          <CardContent className="px-3 py-2">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <Label className="whitespace-nowrap font-medium">Site</Label>
              <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Select a site" /></SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSiteId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200"
                  onClick={() => setSelectedSiteId('')}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ====== Main Tabs Content ====== */}
      {dataLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="facilities" className="w-full">
          {isAggregated && (
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Segments</span>
            </div>
          )}
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex h-auto p-1 mt-1">
            <TabsTrigger value="facilities" className="gap-1.5 text-xs sm:text-sm">
              <Warehouse className="h-4 w-4" />
              <span className="hidden xs:inline">Site Facilities</span>
              <span className="xs:hidden">Facilities</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5 text-xs sm:text-sm">
              <Shield className="h-4 w-4" />
              <span className="hidden xs:inline">Site Security</span>
              <span className="xs:hidden">Security</span>
            </TabsTrigger>
            <TabsTrigger value="medinfra" className="gap-1.5 text-xs sm:text-sm">
              <Heart className="h-4 w-4" />
              <span className="hidden xs:inline">Medical Infra</span>
              <span className="xs:hidden">Medical</span>
            </TabsTrigger>
          </TabsList>

          {/* ===== TAB: Site Facilities ===== */}
          <TabsContent value="facilities" className="mt-1">
            <CategorySummary
              items={facilities}
              label="Site Facilities"
              total={FACILITY_ITEMS.length}
              action={
                <div className="flex items-center gap-2">
                  {perms.canEdit && !isAggregated && (
                    <Button
                      size="sm"
                      className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
                      onClick={() => toast.info('Add new facility item — coming soon')}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Add New</span>
                    </Button>
                  )}
                  <TableExportButton
                    rows={facilities}
                    columns={complianceExportColumns}
                    filename="site_compliance_facilities"
                    variant="outline"
                    size="default"
                  />
                </div>
              }
            />
            <ItemGrid
              items={facilities}
              type="facility"
              canEdit={perms.canEdit && !isAggregated}
              isAggregated={isAggregated}
              onUpdate={handleOpenUpdate}
              onPhotoView={handleOpenPhoto}
            />
          </TabsContent>

          {/* ===== TAB: Site Security ===== */}
          <TabsContent value="security" className="mt-1">
            <CategorySummary
              items={securityItems}
              label="Site Security"
              total={SECURITY_ITEMS.length}
              action={
                <div className="flex items-center gap-2">
                  {perms.canEdit && !isAggregated && (
                    <Button
                      size="sm"
                      className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
                      onClick={() => toast.info('Add new security item — coming soon')}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Add New</span>
                    </Button>
                  )}
                  <TableExportButton
                    rows={securityItems}
                    columns={complianceExportColumns}
                    filename="site_compliance_security"
                    variant="outline"
                    size="default"
                  />
                </div>
              }
            />
            <ItemGrid
              items={securityItems}
              type="security"
              canEdit={perms.canEdit && !isAggregated}
              isAggregated={isAggregated}
              onUpdate={handleOpenUpdate}
              onPhotoView={handleOpenPhoto}
            />
          </TabsContent>

          {/* ===== TAB: Medical Infrastructure ===== */}
          <TabsContent value="medinfra" className="mt-1">
            <CategorySummary
              items={medInfraItems}
              label="Medical Infrastructure"
              total={MED_INFRA_ITEMS.length}
              action={
                <div className="flex items-center gap-2">
                  {perms.canEdit && !isAggregated && (
                    <Button
                      size="sm"
                      className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
                      onClick={() => toast.info('Add new medical infra item — coming soon')}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Add New</span>
                    </Button>
                  )}
                  <TableExportButton
                    rows={medInfraItems}
                    columns={complianceExportColumns}
                    filename="site_compliance_medical_infrastructure"
                    variant="outline"
                    size="default"
                  />
                </div>
              }
            />
            <ItemGrid
              items={medInfraItems}
              type="medinfra"
              canEdit={perms.canEdit && !isAggregated}
              isAggregated={isAggregated}
              onUpdate={handleOpenUpdate}
              onPhotoView={handleOpenPhoto}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* ====== Update Status Dialog ====== */}
      {updateDialog.open && (
        <UpdateStatusDialog
          key={updateDialog.itemId}
          dialogState={updateDialog}
          onClose={() => setUpdateDialog((d) => ({ ...d, open: false }))}
          queryClient={queryClient}
        />
      )}

      {/* ====== Photo Viewer Dialog ====== */}
      {photoDialog.open && (
        <PhotoViewerDialog
          key={`${photoDialog.photos.length}-${photoDialog.index}`}
          dialogState={photoDialog}
          onClose={() => setPhotoDialog((d) => ({ ...d, open: false }))}
        />
      )}
    </div>
  )
}

// ===================== CATEGORY SUMMARY BAR =====================

function CategorySummary({ items, label, total, action }: { items: ComplianceItem[]; label: string; total: number; action?: ReactNode }) {
  const available = items.filter((i) => i.status === 'Compliant').length
  const needsRepair = items.filter((i) => i.status === 'Pending').length
  const notAvailable = items.filter((i) => i.status === 'NonCompliant').length
  const pct = items.length === 0 ? 100 : Math.round((available / total) * 100)

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 p-4 rounded-xl border bg-muted/30">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{label}</span>
            <span className="text-sm text-muted-foreground">
              <span className="font-medium text-emerald-600">{available}</span> of {total} available
            </span>
          </div>
          <Progress value={pct} className={`h-2 mt-2 ${getScoreProgressColor(pct)}`} />
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs shrink-0">
        <span className="flex items-center gap-1 text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" /> {available}
        </span>
        <span className="flex items-center gap-1 text-amber-600">
          <AlertTriangle className="h-3.5 w-3.5" /> {needsRepair}
        </span>
        <span className="flex items-center gap-1 text-red-600">
          <XCircle className="h-3.5 w-3.5" /> {notAvailable}
        </span>
        {action && <div className="ml-1">{action}</div>}
      </div>
    </div>
  )
}

// ===================== ITEM GRID =====================

function ItemGrid({
  items, type, canEdit, isAggregated, onUpdate, onPhotoView,
}: {
  items: ComplianceItem[]
  type: string
  canEdit: boolean
  isAggregated?: boolean
  onUpdate: (item: ComplianceItem, type: string) => void
  onPhotoView: (photos: string[], index: number) => void
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Warehouse className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">No items found</p>
        <p className="text-xs mt-1">Items will appear here once they are created</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((item) => (
        <ChecklistCard
          key={item.id}
          item={item}
          type={type}
          canEdit={canEdit}
          isAggregated={isAggregated}
          onUpdate={() => onUpdate(item, type)}
          onPhotoView={(idx) => onPhotoView(parseJSON<string[]>(item.photos, []), idx)}
        />
      ))}
    </div>
  )
}

// ===================== CHECKLIST CARD =====================

function ChecklistCard({
  item, type, canEdit, isAggregated, onUpdate, onPhotoView,
}: {
  item: ComplianceItem
  type: string
  canEdit: boolean
  isAggregated?: boolean
  onUpdate: () => void
  onPhotoView: (index: number) => void
}) {
  const photos = parseJSON<string[]>(item.photos, [])
  const avail = statusToAvailability(item.status)
  const AvailIcon = avail.icon
  const fileInputRef = useRef<HTMLInputElement>(null)
  const aggData = isAggregated ? (item as any).totalSites ? { total: (item as any).totalSites, compliant: (item as any).compliantSites, nonCompliant: (item as any).nonCompliantSites, pending: (item as any).pendingSites } : null : null

  // Quick photo upload mutation
  const photoMutation = useMutation({
    mutationFn: (updatedPhotos: string[]) =>
      fetch('/api/compliance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, type, photos: updatedPhotos }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success('Photo uploaded')
      queryClient.invalidateQueries({ queryKey: ['compliance-data'] })
    },
    onError: () => toast.error('Failed to upload photo'),
  })
  const queryClient = useQueryClient()

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const file = files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      const updated = [...photos, base64]
      photoMutation.mutate(updated)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [photos, photoMutation])

  return (
    <Card className={`border-l-4 transition-all duration-200 hover:shadow-md overflow-hidden ${cardBorderColor(avail.variant)}`}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-bold text-sm">{item.item}</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${availBadgeClasses(avail.variant)}`}>
              <AvailIcon className="h-3 w-3" />
              {avail.label}
            </span>
          </div>
          <StatusBadge status={item.status} />
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-3">
        {/* Aggregated site count */}
        {aggData && (
          <div className="flex items-center gap-2 text-xs">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{aggData.compliant} of {aggData.total} sites compliant</span>
            {aggData.nonCompliant > 0 && <span className="text-red-600">({aggData.nonCompliant} non-compliant)</span>}
          </div>
        )}

        {/* Details */}
        {!isAggregated && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {item.lastInspectionDate
                ? format(parseISO(item.lastInspectionDate), 'dd MMM yyyy')
                : 'Not inspected'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{item.inspector || 'Not assigned'}</span>
          </div>
        </div>
        )}

        {!isAggregated && item.remarks && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-2.5 py-1.5 line-clamp-2">{item.remarks}</p>
        )}

        {/* Photos row */}
        {!isAggregated && (
        <div className="flex items-center gap-2">
          {photos.length > 0 ? (
            <>
              <div className="flex -space-x-2">
                {photos.slice(0, 3).map((photo, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onPhotoView(idx)}
                    className="relative w-10 h-10 rounded-md overflow-hidden border-2 border-background shadow-sm hover:ring-2 hover:ring-primary/30 transition-all shrink-0"
                  >
                    <img src={photo} alt={`${item.item} photo ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors">
                      <ZoomIn className="h-3.5 w-3.5 text-white opacity-0 hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
              {photos.length > 3 && (
                <button
                  type="button"
                  onClick={() => onPhotoView(3)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  +{photos.length - 3} more
                </button>
              )}
            </>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
              <ImageIcon className="h-3.5 w-3.5" />
              No photos
            </span>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
        </div>
        )}

        {/* Action buttons */}
        {canEdit && (
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              className="bg-[#0d9488] hover:bg-[#0f766e] text-white h-8 text-xs"
              onClick={onUpdate}
            >
              <Pencil className="h-3 w-3 mr-1.5" />
              Update Status
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={photoMutation.isPending}
            >
              <Upload className="h-3 w-3 mr-1.5" />
              {photoMutation.isPending ? 'Uploading...' : 'Add Photo'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ===================== UPDATE STATUS DIALOG =====================

function UpdateStatusDialog({
  dialogState,
  onClose,
  queryClient,
}: {
  dialogState: {
    open: boolean
    type: string
    itemId: string
    itemName: string
    currentStatus: string
    currentInspector: string
    currentRemarks: string
  }
  onClose: () => void
  queryClient: ReturnType<typeof useQueryClient>
}) {
  const [status, setStatus] = useState(dialogState.currentStatus)
  const [inspector, setInspector] = useState(dialogState.currentInspector)
  const [remarks, setRemarks] = useState(dialogState.currentRemarks)
  const [localPhotos, setLocalPhotos] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form resets via key={dialogState.itemId} on parent — no effect needed

  const mutation = useMutation({
    mutationFn: () =>
      fetch('/api/compliance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: dialogState.itemId,
          type: dialogState.type,
          status,
          inspector: inspector || null,
          remarks: remarks || null,
        }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success(`${dialogState.itemName} updated successfully`)
      queryClient.invalidateQueries({ queryKey: ['compliance-data'] })
      onClose()
    },
    onError: () => toast.error('Failed to update item'),
  })

  const handlePhotoAdd = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        setLocalPhotos((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }, [])

  const removePhoto = useCallback((idx: number) => {
    setLocalPhotos((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  return (
    <Dialog open={dialogState.open} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Status</DialogTitle>
          <DialogDescription>
            Update compliance details for <span className="font-medium text-foreground">{dialogState.itemName}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-sm">Availability Status *</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className={opt.color}>● {opt.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Inspector */}
          <div className="space-y-1.5">
            <Label className="text-sm">Inspector Name</Label>
            <Input
              className="h-9"
              value={inspector}
              onChange={(e) => setInspector(e.target.value)}
              placeholder="Name of inspector"
            />
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <Label className="text-sm">Remarks</Label>
            <Textarea
              className="resize-none"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Inspection findings, observations..."
            />
          </div>

          {/* Photo Upload in dialog */}
          <div className="space-y-1.5">
            <Label className="text-sm">Add Photos</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoAdd}
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-3.5 w-3.5 mr-1.5" />
                Choose Photos
              </Button>
              {localPhotos.length > 0 && (
                <span className="text-xs text-muted-foreground">{localPhotos.length} photo{localPhotos.length !== 1 ? 's' : ''} selected</span>
              )}
            </div>
            {localPhotos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {localPhotos.map((photo, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-md overflow-hidden border group">
                    <img src={photo} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-0.5 right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button
              className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ===================== PHOTO VIEWER DIALOG =====================

function PhotoViewerDialog({
  dialogState,
  onClose,
}: {
  dialogState: { open: boolean; photos: string[]; index: number }
  onClose: () => void
}) {
  const [currentIdx, setCurrentIdx] = useState(dialogState.index)

  // Index resets via key={dialogState.index} on parent — no effect needed

  const goPrev = useCallback(() => {
    setCurrentIdx((i) => (i > 0 ? i - 1 : dialogState.photos.length - 1))
  }, [dialogState.photos.length])

  const goNext = useCallback(() => {
    setCurrentIdx((i) => (i < dialogState.photos.length - 1 ? i + 1 : 0))
  }, [dialogState.photos.length])

  if (!dialogState.photos.length) return null

  return (
    <Dialog open={dialogState.open} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-3xl p-2">
        <DialogTitle className="sr-only">Photo Preview</DialogTitle>
        <DialogDescription className="sr-only">
          Photo {currentIdx + 1} of {dialogState.photos.length}
        </DialogDescription>
        <div className="relative">
          <img
            src={dialogState.photos[currentIdx]}
            alt={`Photo ${currentIdx + 1}`}
            className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
          />
          {/* Navigation */}
          {dialogState.photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {dialogState.photos.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-1.5 rounded-full transition-all ${idx === currentIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                  />
                ))}
              </div>
            </>
          )}
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <span className="text-xs text-white bg-black/50 rounded-full px-2 py-0.5">
              {currentIdx + 1} / {dialogState.photos.length}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
