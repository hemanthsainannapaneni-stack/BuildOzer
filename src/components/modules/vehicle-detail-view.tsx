'use client'

import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Plus, FileText, Trash2, Edit2, CheckCircle2, Clock, Truck, User, MapPin, Building2, Calendar, Wrench, Camera, QrCode, RefreshCw, Loader2, ZoomIn, ImagePlus, Download, Upload, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useNavStore } from '@/stores/nav-store'
import { useAuthStore, rolePermissions } from '@/lib/auth-store'
import { StatusBadge } from '@/components/shared/status-badge'
import { TableExportButton, type ExportColumn } from '@/components/ui/table-export-button'
import { format, isPast, parseISO, differenceInDays } from 'date-fns'

// ---------- types ----------
interface VehicleDoc {
  id: string
  docType: string
  docNumber: string | null
  issueDate: string | null
  expiryDate: string | null
  status: string
  createdAt: string
}

interface VehicleDetail {
  id: string
  vehicleNumber: string
  vehicleType: string
  owner: string
  condition: string
  lastInspectionDate: string | null
  nextInspectionDue: string | null
  isActive: boolean
  photoPath: string | null
  photos: string | null
  currentQR: string | null
  qrGeneratedAt: string | null
  currentQRCode: string | null
  qrCodeHistory: string | null
  contractor: { id: string; name: string } | null
  site: { id: string; name: string } | null
  driver: { id: string; fullName: string; employeeNumber: string } | null
  documents: VehicleDoc[]
}

interface WorkerOption {
  id: string
  fullName: string
  employeeNumber: string
}

interface QRResponse {
  currentQR: string | null
  qrGeneratedAt: string | null
  vehicleNumber: string
}

// ---------- helpers ----------
function getDocExpiryClass(expiryDate: string | null): string {
  if (!expiryDate) return ''
  const days = differenceInDays(parseISO(expiryDate), new Date())
  if (days < 0) return 'text-red-600 font-medium'
  if (days <= 30) return 'text-amber-600 font-medium'
  return ''
}

function parsePhotos(photosJson: string | null): string[] {
  if (!photosJson) return []
  try {
    const parsed = JSON.parse(photosJson)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const MAX_PHOTOS = 5

// ---------- export helpers ----------
function formatDocStatus(status: string): string {
  const map: Record<string, string> = {
    Valid: 'Valid',
    ExpiringSoon: 'Expiring Soon',
    Expired: 'Expired',
    Pending: 'Pending',
    FitWithRestriction: 'Fit w/ Restriction',
    UnderInvestigation: 'Under Investigation',
    InProgress: 'In Progress',
    NonCompliant: 'Non-Compliant',
    SemiSkilled: 'Semi-Skilled',
    NeedsRepair: 'Needs Repair',
  }
  return map[status] || status.replace(/([A-Z])/g, ' $1').trim()
}

const vehicleDocExportColumns: ExportColumn<VehicleDoc>[] = [
  { key: 'docType', header: 'Doc Type' },
  { key: 'docNumber', header: 'Number', accessor: (d) => d.docNumber || '' },
  { key: 'issueDate', header: 'Issue Date', accessor: (d) => (d.issueDate ? format(parseISO(d.issueDate), 'dd MMM yyyy') : '') },
  { key: 'expiryDate', header: 'Expiry Date', accessor: (d) => (d.expiryDate ? format(parseISO(d.expiryDate), 'dd MMM yyyy') : '') },
  { key: 'status', header: 'Status', accessor: (d) => formatDocStatus(d.status) },
]

// ---------- main ----------
export default function VehicleDetailView() {
  const pageParams = useNavStore((s) => s.pageParams)
  const goBack = useNavStore((s) => s.goBack)
  const setPage = useNavStore((s) => s.setPage)
  const role = useAuthStore((s) => s.role)
  const perms = rolePermissions[role]
  const queryClient = useQueryClient()
  const id = pageParams.id

  // Document dialog
  const [docDialogOpen, setDocDialogOpen] = useState(false)
  const [docType, setDocType] = useState('')
  const [docNumber, setDocNumber] = useState('')
  const [docIssueDate, setDocIssueDate] = useState('')
  const [docExpiryDate, setDocExpiryDate] = useState('')
  const [docFileName, setDocFileName] = useState('')

  // Edit mode
  const [isEditing, setIsEditing] = useState(false)
  const [editCondition, setEditCondition] = useState('')
  const [editNextInspection, setEditNextInspection] = useState('')
  const [editDriverId, setEditDriverId] = useState('')

  // Photo upload (single profile photo)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  // Multi-photo gallery
  const photosInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)

  // QR Code
  const [qrDialogOpen, setQrDialogOpen] = useState(false)

  const { data, isLoading } = useQuery<{ data: VehicleDetail }>({
    queryKey: ['vehicle', id],
    queryFn: () => fetch(`/api/vehicles/${id}`).then((r) => r.json()),
    enabled: !!id,
  })
  const vehicle = data?.data

  // Parsed photos
  const photos = parsePhotos(vehicle?.photos ?? null)

  const { data: workersData } = useQuery<{ data: WorkerOption[] }>({
    queryKey: ['workers-select'],
    queryFn: () => fetch('/api/workers?limit=100').then((r) => r.json()),
  })
  const workers = workersData?.data ?? []

  const addDocMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch(`/api/vehicles/${id}/documents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => {
      toast.success('Document added')
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] })
      setDocDialogOpen(false)
      setDocType(''); setDocNumber(''); setDocIssueDate(''); setDocExpiryDate(''); setDocFileName('')
    },
    onError: () => toast.error('Failed to add document'),
  })

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) =>
      fetch(`/api/vehicles/${id}/documents?docId=${docId}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      toast.success('Document removed')
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] })
    },
    onError: () => toast.error('Failed to remove document'),
  })

  const updateVehicleMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch(`/api/vehicles/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => {
      toast.success('Vehicle updated')
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] })
      setIsEditing(false)
    },
    onError: () => toast.error('Failed to update vehicle'),
  })

  // Single photo upload handler
  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingPhoto(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result as string
        await updateVehicleMutation.mutateAsync({ photoPath: base64 })
        toast.success('Photo updated')
        setIsUploadingPhoto(false)
      }
      reader.onerror = () => {
        toast.error('Failed to read file')
        setIsUploadingPhoto(false)
      }
      reader.readAsDataURL(file)
    } catch {
      toast.error('Failed to upload photo')
      setIsUploadingPhoto(false)
    }
    e.target.value = ''
  }, [updateVehicleMutation])

  // Multi-photo upload handler
  const handlePhotosUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const currentPhotos = parsePhotos(vehicle?.photos ?? null)
    const remaining = MAX_PHOTOS - currentPhotos.length
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_PHOTOS} photos allowed`)
      e.target.value = ''
      return
    }

    const toProcess = files.slice(0, remaining)
    setIsUploadingPhotos(true)

    try {
      const newPhotos: string[] = []
      for (const file of toProcess) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        newPhotos.push(dataUrl)
      }

      const updatedPhotos = [...currentPhotos, ...newPhotos]
      await updateVehicleMutation.mutateAsync({ photos: JSON.stringify(updatedPhotos) })
      toast.success(`${newPhotos.length} photo${newPhotos.length > 1 ? 's' : ''} added`)
    } catch {
      toast.error('Failed to upload photos')
    }
    setIsUploadingPhotos(false)
    e.target.value = ''
  }, [vehicle, updateVehicleMutation])

  // Delete individual photo
  const handleDeletePhoto = useCallback(async (index: number) => {
    const currentPhotos = parsePhotos(vehicle?.photos ?? null)
    const updated = currentPhotos.filter((_, i) => i !== index)
    await updateVehicleMutation.mutateAsync({ photos: JSON.stringify(updated) })
    toast.success('Photo removed')
  }, [vehicle, updateVehicleMutation])

  // QR Code generation via API
  const generateQRMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/vehicles/${id}/qr`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to generate QR')
      return res.json() as Promise<{ data: QRResponse }>
    },
    onSuccess: () => {
      toast.success('QR code generated')
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] })
    },
    onError: () => toast.error('Failed to generate QR code'),
  })

  const handleGenerateQR = useCallback(() => {
    generateQRMutation.mutate()
  }, [generateQRMutation])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-56" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!vehicle) {
    return <div className="text-center py-20 text-muted-foreground">Vehicle not found</div>
  }

  const handleAddDoc = () => {
    if (!docType) { toast.error('Document type is required'); return }
    addDocMutation.mutate({
      docType,
      docNumber: docNumber || null,
      issueDate: docIssueDate || null,
      expiryDate: docExpiryDate || null,
    })
  }

  const handleSaveEdit = () => {
    const body: Record<string, unknown> = { condition: editCondition }
    if (editNextInspection) body.nextInspectionDue = editNextInspection
    if (editDriverId) body.driverId = editDriverId
    else body.driverId = null
    updateVehicleMutation.mutate(body)
  }

  const inspectionPast = vehicle.nextInspectionDue && isPast(parseISO(vehicle.nextInspectionDue))
  const typeLabel = vehicle.vehicleType || 'Vehicle'
  const hasRealQR = !!vehicle.currentQR

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight font-mono">{vehicle.vehicleNumber}</h1>
          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">{vehicle.vehicleType}</Badge>
          <StatusBadge status={vehicle.condition} size="md" />
        </div>
      </div>

      {/* Photo + Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Photo Card */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-4 w-4 text-teal-600" /> Photo
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {vehicle.photoPath ? (
              <div className="relative group w-full">
                <img
                  src={vehicle.photoPath}
                  alt={`${vehicle.vehicleNumber} photo`}
                  className="w-full aspect-square object-cover rounded-xl border border-border"
                />
                {perms.canEdit && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white"
                  >
                    <Camera className="h-8 w-8" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!perms.canEdit || isUploadingPhoto}
                className="w-full aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-teal-500/50 hover:bg-teal-50/50 dark:hover:bg-teal-900/10 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground cursor-pointer disabled:cursor-not-allowed"
              >
                {isUploadingPhoto ? (
                  <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
                ) : (
                  <Camera className="h-10 w-10" />
                )}
                <span className="text-sm">{isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            {vehicle.photoPath && perms.canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={isUploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploadingPhoto ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Camera className="h-3.5 w-3.5 mr-1" />}
                {isUploadingPhoto ? 'Uploading...' : 'Change Photo'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Vehicle Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4 text-teal-600" /> {typeLabel} Information
              </CardTitle>
              {perms.canEdit && !isEditing && (
                <Button size="sm" variant="outline" onClick={() => {
                  setEditCondition(vehicle.condition)
                  setEditNextInspection(vehicle.nextInspectionDue ? format(parseISO(vehicle.nextInspectionDue), 'yyyy-MM-dd') : '')
                  setEditDriverId(vehicle.driver?.id || '')
                  setIsEditing(true)
                }}>
                  <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isEditing ? (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">Condition</Label>
                  <Select value={editCondition} onValueChange={setEditCondition}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fit">Fit</SelectItem>
                      <SelectItem value="NeedsRepair">Needs Repair</SelectItem>
                      <SelectItem value="Grounded">Grounded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Next Inspection Due</Label>
                  <Input type="date" className="mt-1" value={editNextInspection} onChange={(e) => setEditNextInspection(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Driver</Label>
                  <Select value={editDriverId} onValueChange={setEditDriverId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select driver" /></SelectTrigger>
                    <SelectContent>
                      {workers.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.fullName} ({w.employeeNumber})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button size="sm" className="bg-[#0d9488] hover:bg-[#0f766e] text-white" disabled={updateVehicleMutation.isPending} onClick={handleSaveEdit}>
                    {updateVehicleMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <Truck className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div><p className="text-xs text-muted-foreground">Vehicle Number</p><p className="text-sm font-medium mt-0.5 font-mono">{vehicle.vehicleNumber}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <Wrench className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div><p className="text-xs text-muted-foreground">Type</p><p className="text-sm font-medium mt-0.5">{vehicle.vehicleType}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div><p className="text-xs text-muted-foreground">Owner</p><p className="text-sm font-medium mt-0.5">{vehicle.owner}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div><p className="text-xs text-muted-foreground">Condition</p><StatusBadge status={vehicle.condition} /></div>
                </div>
                <Separator className="sm:col-span-2" />
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div><p className="text-xs text-muted-foreground">Last Inspection</p><p className="text-sm font-medium mt-0.5">{vehicle.lastInspectionDate ? format(parseISO(vehicle.lastInspectionDate), 'dd MMM yyyy') : '—'}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className={`h-4 w-4 mt-0.5 shrink-0 ${inspectionPast ? 'text-red-500' : 'text-muted-foreground'}`} />
                  <div><p className="text-xs text-muted-foreground">Next Inspection Due</p><p className={`text-sm font-medium mt-0.5 ${inspectionPast ? 'text-red-600' : ''}`}>{vehicle.nextInspectionDue ? format(parseISO(vehicle.nextInspectionDue), 'dd MMM yyyy') : '—'}{inspectionPast && ' (Overdue!)'}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Driver</p>
                    {vehicle.driver ? (
                      <button type="button" className="text-sm font-medium mt-0.5 text-teal-600 hover:underline" onClick={() => setPage('worker-detail', { id: vehicle.driver.id })}>
                        {vehicle.driver.fullName} <span className="text-muted-foreground font-mono text-xs">({vehicle.driver.employeeNumber})</span>
                      </button>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-0.5">No driver assigned</p>
                    )}
                  </div>
                </div>
                {vehicle.contractor && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div><p className="text-xs text-muted-foreground">Contractor</p><p className="text-sm font-medium mt-0.5">{vehicle.contractor.name}</p></div>
                  </div>
                )}
                {vehicle.site && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div><p className="text-xs text-muted-foreground">Site</p><p className="text-sm font-medium mt-0.5">{vehicle.site.name}</p></div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Photos Gallery Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ImagePlus className="h-4 w-4 text-teal-600" /> Photos ({photos.length}/{MAX_PHOTOS})
            </CardTitle>
            {perms.canEdit && photos.length < MAX_PHOTOS && (
              <Button
                size="sm"
                variant="outline"
                disabled={isUploadingPhotos || updateVehicleMutation.isPending}
                onClick={() => photosInputRef.current?.click()}
              >
                {isUploadingPhotos ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                {isUploadingPhotos ? 'Uploading...' : 'Add Photos'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <input
            ref={photosInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotosUpload}
          />
          {photos.length === 0 ? (
            <button
              type="button"
              onClick={() => photosInputRef.current?.click()}
              disabled={!perms.canEdit || isUploadingPhotos || photos.length >= MAX_PHOTOS}
              className="w-full h-40 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-teal-500/50 hover:bg-teal-50/50 dark:hover:bg-teal-900/10 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground cursor-pointer disabled:cursor-not-allowed"
            >
              {isUploadingPhotos ? (
                <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
              ) : (
                <ImagePlus className="h-10 w-10" />
              )}
              <span className="text-sm">{isUploadingPhotos ? 'Uploading...' : `Upload up to ${MAX_PHOTOS} photos`}</span>
              <span className="text-xs text-muted-foreground/60">Click to browse files</span>
            </button>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-border">
                  <img
                    src={photo}
                    alt={`${vehicle.vehicleNumber} photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {perms.canEdit && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); handleDeletePhoto(idx) }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {perms.canEdit && photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => photosInputRef.current?.click()}
                  disabled={isUploadingPhotos || updateVehicleMutation.isPending}
                  className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-teal-500/50 hover:bg-teal-50/50 dark:hover:bg-teal-900/10 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground cursor-pointer disabled:cursor-not-allowed"
                >
                  {isUploadingPhotos ? <Loader2 className="h-6 w-6 animate-spin text-teal-500" /> : <Plus className="h-6 w-6" />}
                  <span className="text-xs">Add</span>
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="h-4 w-4 text-teal-600" /> QR Code
            </CardTitle>
            {perms.canEdit && (
              <Button
                size="sm"
                variant="outline"
                disabled={generateQRMutation.isPending}
                onClick={handleGenerateQR}
              >
                {generateQRMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                {generateQRMutation.isPending ? 'Generating...' : hasRealQR ? 'Regenerate QR' : 'Generate QR'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {hasRealQR && vehicle.currentQR ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <button
                type="button"
                onClick={() => setQrDialogOpen(true)}
                className="group relative cursor-pointer"
              >
                <img
                  src={vehicle.currentQR}
                  alt="Vehicle QR Code"
                  className="w-36 h-36 rounded-xl border border-border p-2 bg-white object-contain group-hover:shadow-md transition-shadow"
                />
                <div className="absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="h-6 w-6 text-white" />
                </div>
              </button>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Vehicle</p>
                  <p className="text-sm font-medium font-mono">{vehicle.vehicleNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="text-sm font-medium">{vehicle.vehicleType}</p>
                </div>
                {vehicle.qrGeneratedAt && (
                  <div>
                    <p className="text-xs text-muted-foreground">Generated At</p>
                    <p className="text-sm font-medium">{format(parseISO(vehicle.qrGeneratedAt), 'dd MMM yyyy, hh:mm a')}</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setQrDialogOpen(true)}
                >
                  <ZoomIn className="h-3.5 w-3.5 mr-1" /> View QR
                </Button>
                <a
                  href={vehicle.currentQR}
                  download={`qr-${vehicle.vehicleNumber}.png`}
                  className="block"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" /> Download QR
                  </Button>
                </a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <QrCode className="h-12 w-12 mb-2 opacity-40" />
              <p className="text-sm">No QR code generated yet</p>
              {perms.canEdit && (
                <Button
                  size="sm"
                  className="mt-3 bg-[#0d9488] hover:bg-[#0f766e] text-white"
                  disabled={generateQRMutation.isPending}
                  onClick={handleGenerateQR}
                >
                  {generateQRMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                  Generate QR Code
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-teal-600" /> Documents ({vehicle.documents.length})</CardTitle>
            <div className="flex items-center gap-2">
              <TableExportButton
                rows={vehicle.documents}
                columns={vehicleDocExportColumns}
                filename="vehicle_documents"
                variant="outline"
                size="default"
              />
              {perms.canEdit && (
                <Button size="sm" className="bg-[#0d9488] hover:bg-[#0f766e] text-white" onClick={() => setDocDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Document
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {vehicle.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded for this {vehicle.vehicleType.toLowerCase()}</p>
          ) : (
            <div className="overflow-x-auto max-h-[calc(100vh-12rem)] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead className="w-12">S.No</TableHead>
                    <TableHead>Doc Type</TableHead>
                    <TableHead>Number</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                    {perms.canEdit && <TableHead className="w-16">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicle.documents.map((doc, idx) => (
                    <TableRow key={doc.id}>
                      <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{doc.docType}</TableCell>
                      <TableCell className="font-mono text-sm">{doc.docNumber || '—'}</TableCell>
                      <TableCell className="text-sm">{doc.issueDate ? format(parseISO(doc.issueDate), 'dd MMM yyyy') : '—'}</TableCell>
                      <TableCell className={`text-sm ${getDocExpiryClass(doc.expiryDate)}`}>
                        {doc.expiryDate ? format(parseISO(doc.expiryDate), 'dd MMM yyyy') : '—'}
                      </TableCell>
                      <TableCell><StatusBadge status={doc.status} /></TableCell>
                      {perms.canEdit && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              if (confirm('Delete this document?')) deleteDocMutation.mutate(doc.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Document Dialog */}
      <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add {typeLabel} Document</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Document Type *</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RC">RC (Registration Certificate)</SelectItem>
                  <SelectItem value="Fitness">Fitness Certificate</SelectItem>
                  <SelectItem value="Insurance">Insurance</SelectItem>
                  <SelectItem value="PUC">PUC</SelectItem>
                  <SelectItem value="Permit">Permit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Document Number</Label>
              <Input className="mt-1" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="e.g. MH-12-AB-1234" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Issue Date</Label>
                <Input type="date" className="mt-1" value={docIssueDate} onChange={(e) => setDocIssueDate(e.target.value)} />
              </div>
              <div>
                <Label>Expiry Date</Label>
                <Input type="date" className="mt-1" value={docExpiryDate} onChange={(e) => setDocExpiryDate(e.target.value)} />
              </div>
            </div>
            {/* Document upload area */}
            <div>
              <Label>Document Upload</Label>
              <div className="mt-1 border-2 border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:border-teal-400 hover:bg-teal-50/30 transition-colors cursor-pointer relative">
                {docFileName ? (
                  <div className="flex items-center gap-2 text-sm text-teal-700">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">{docFileName}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 ml-1"
                      onClick={(e) => { e.stopPropagation(); setDocFileName('') }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground text-center">
                      Click to upload document<br />
                      <span className="text-[10px]">PDF, JPG, PNG up to 5MB</span>
                    </p>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setDocFileName(file.name)
                      toast.info(`Selected: ${file.name}`)
                    }
                  }}
                  id="vehicle-doc-upload"
                />
                <label htmlFor="vehicle-doc-upload" className="absolute inset-0 cursor-pointer" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="bg-[#0d9488] hover:bg-[#0f766e] text-white" disabled={addDocMutation.isPending} onClick={handleAddDoc}>
                {addDocMutation.isPending ? 'Saving...' : 'Add Document'}
              </Button>
              <Button variant="outline" onClick={() => setDocDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code View Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-teal-600" /> QR Code — {vehicle.vehicleNumber}
            </DialogTitle>
          </DialogHeader>
          {vehicle.currentQR && (
            <div className="flex flex-col items-center gap-4 py-4">
              <img
                src={vehicle.currentQR}
                alt="Vehicle QR Code"
                className="w-64 h-64 rounded-2xl border border-border p-3 bg-white object-contain shadow-sm"
              />
              <div className="text-center space-y-1">
                <p className="font-mono font-bold text-sm">{vehicle.vehicleNumber}</p>
                <p className="text-xs text-muted-foreground">{vehicle.vehicleType}</p>
                {vehicle.qrGeneratedAt && (
                  <p className="text-xs text-muted-foreground">Generated: {format(parseISO(vehicle.qrGeneratedAt), 'dd MMM yyyy, hh:mm a')}</p>
                )}
              </div>
              <a
                href={vehicle.currentQR}
                download={`qr-${vehicle.vehicleNumber}.png`}
                className="block"
              >
                <Button variant="outline" size="sm">
                  <Download className="h-3.5 w-3.5 mr-1" /> Download QR
                </Button>
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
