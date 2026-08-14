'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import {
  Plus,
  Search,
  Stethoscope,
  FileText,
  AlertTriangle,
  Clock,
  ChevronRight,
  Building2,
  User,
  Trash2,
  CalendarDays,
  X,
  Camera,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore, rolePermissions } from '@/lib/auth-store'
import PhotoUploader from '@/components/shared/photo-uploader'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format, isPast, parseISO } from 'date-fns'
import { TableExportButton, type ExportColumn } from '@/components/ui/table-export-button'

// ---------- types ----------
interface Worker {
  id: string
  employeeNumber: string
  fullName: string
  isActive: boolean
  designation: { name: string }
  site: { name: string } | null
  contractor: { name: string }
}

interface MedicalRecord {
  id: string
  examinationDate: string
  examinationType: string
  examiningDoctor: string | null
  examiningFacility: string | null
  result: string
  previousHealthIssues: string | null
  chronicDiseases: string | null
  chronicDiseaseNotes: string | null
  currentMedications: string | null
  pastSurgeries: string | null
  nextCheckupDate: string | null
  checkupFrequencyMonths: number
  certificatePath: string | null
  photos: string | null
  remarks: string | null
}

interface WorkersResponse {
  data: Worker[]
  total: number
}

interface MedicalFormValues {
  examinationDate: string
  examinationType: string
  examiningDoctor: string
  examiningFacility: string
  result: string
  previousHealthIssues: string
  chronicDiseases: string[]
  chronicDiseaseNotes: string
  medications: { drug: string; dosage: string; frequency: string }[]
  surgeries: { procedure: string; date: string; notes: string }[]
  nextCheckupDate: string
  checkupFrequencyMonths: string
  remarks: string
}

const CHRONIC_OPTIONS = ['Diabetes', 'Hypertension', 'Asthma', 'Cardiac', 'Other']

// ---------- helpers ----------
function resultBadgeClass(result: string) {
  switch (result) {
    case 'Fit': return 'status-valid'
    case 'Unfit': return 'status-expired'
    case 'Conditional': return 'status-expiring'
    case 'Pending': return 'status-pending'
    default: return 'status-pending'
  }
}

function typeBadgeLabel(type: string) {
  switch (type) {
    case 'PreEmployment': return 'Pre-Employment'
    case 'Periodic': return 'Periodic'
    case 'Special': return 'Special'
    default: return type
  }
}

function parseJsonSafe<T>(str: string | null, fallback: T): T {
  if (!str) return fallback
  try { return JSON.parse(str) as T } catch { return fallback }
}

// ---------- skeleton ----------
function WorkerListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

function MedicalCardSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ---------- medication field ----------
function MedicationField({ index, control, remove, total }: {
  index: number
  control: ReturnType<typeof useForm<MedicalFormValues>>['control']
  remove: (index: number) => void
  total: number
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">Drug Name</Label>
          <Input
            {...control.register(`medications.${index}.drug`)}
            placeholder="e.g. Metformin"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Dosage</Label>
          <Input
            {...control.register(`medications.${index}.dosage`)}
            placeholder="e.g. 500mg"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Frequency</Label>
          <Input
            {...control.register(`medications.${index}.frequency`)}
            placeholder="e.g. Twice daily"
            className="h-8 text-sm"
          />
        </div>
      </div>
      {total > 1 && (
        <Button type="button" variant="ghost" size="icon" className="mt-4 h-8 w-8 text-destructive" onClick={() => remove(index)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

// ---------- surgery field ----------
function SurgeryField({ index, control, remove, total }: {
  index: number
  control: ReturnType<typeof useForm<MedicalFormValues>>['control']
  remove: (index: number) => void
  total: number
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">Procedure</Label>
          <Input
            {...control.register(`surgeries.${index}.procedure`)}
            placeholder="e.g. Appendix removal"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Date</Label>
          <Input
            type="date"
            {...control.register(`surgeries.${index}.date`)}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Notes</Label>
          <Input
            {...control.register(`surgeries.${index}.notes`)}
            placeholder="Any notes"
            className="h-8 text-sm"
          />
        </div>
      </div>
      {total > 1 && (
        <Button type="button" variant="ghost" size="icon" className="mt-4 h-8 w-8 text-destructive" onClick={() => remove(index)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

// ---------- add medical dialog ----------
function AddMedicalDialog({ workerId, workerName, open, onOpenChange }: {
  workerId: string
  workerName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<MedicalFormValues>({
    defaultValues: {
      examinationDate: format(new Date(), 'yyyy-MM-dd'),
      examinationType: 'PreEmployment',
      examiningDoctor: '',
      examiningFacility: '',
      result: 'Pending',
      previousHealthIssues: '',
      chronicDiseases: [],
      chronicDiseaseNotes: '',
      medications: [{ drug: '', dosage: '', frequency: '' }],
      surgeries: [{ procedure: '', date: '', notes: '' }],
      nextCheckupDate: '',
      checkupFrequencyMonths: '12',
      remarks: '',
    },
  })

  const { fields: medFields, append: appendMed, remove: removeMed } = useFieldArray({ control, name: 'medications' })
  const { fields: surgFields, append: appendSurg, remove: removeSurg } = useFieldArray({ control, name: 'surgeries' })

  const [formPhotos, setFormPhotos] = useState<string[]>([])

  const selectedChronic = watch('chronicDiseases') || []

  const mutation = useMutation({
    mutationFn: async (data: MedicalFormValues) => {
      const medications = data.medications.filter(m => m.drug.trim())
      const surgeries = data.surgeries.filter(s => s.procedure.trim())
      const chronicNotes = data.chronicDiseases.includes('Other') ? data.chronicDiseaseNotes : null

      return fetch(`/api/workers/${workerId}/medical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examinationDate: data.examinationDate,
          examinationType: data.examinationType,
          examiningDoctor: data.examiningDoctor || null,
          examiningFacility: data.examiningFacility || null,
          result: data.result,
          previousHealthIssues: data.previousHealthIssues || null,
          chronicDiseases: data.chronicDiseases.length > 0 ? JSON.stringify(data.chronicDiseases) : null,
          chronicDiseaseNotes: chronicNotes,
          currentMedications: medications.length > 0 ? JSON.stringify(medications) : null,
          pastSurgeries: surgeries.length > 0 ? JSON.stringify(surgeries) : null,
          nextCheckupDate: data.nextCheckupDate || null,
          checkupFrequencyMonths: parseInt(data.checkupFrequencyMonths, 10) || 12,
          remarks: data.remarks || null,
          photos: formPhotos.length > 0 ? JSON.stringify(formPhotos) : null,
        }),
      }).then(r => r.json())
    },
    onSuccess: () => {
      toast.success('Medical record added successfully')
      queryClient.invalidateQueries({ queryKey: ['worker-medical', workerId] })
      reset()
      setFormPhotos([])
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to add medical record')
    },
  })

  const onSubmit = (data: MedicalFormValues) => mutation.mutate(data)

  const toggleChronic = (value: string) => {
    const current = selectedChronic
    if (current.includes(value)) {
      setValue('chronicDiseases', current.filter((v) => v !== value))
    } else {
      setValue('chronicDiseases', [...current, value])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-[#0d9488]" />
            Add Medical Record — {workerName}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Examination Date *</Label>
              <Input type="date" {...register('examinationDate', { required: true })} className="mt-1" />
              {errors.examinationDate && <p className="text-xs text-destructive mt-1">Required</p>}
            </div>
            <div>
              <Label>Type</Label>
              <Select defaultValue="PreEmployment" onValueChange={(v) => setValue('examinationType', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PreEmployment">Pre-Employment</SelectItem>
                  <SelectItem value="Periodic">Periodic</SelectItem>
                  <SelectItem value="Special">Special</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Examining Doctor</Label>
              <Input placeholder="Dr. ..." {...register('examiningDoctor')} className="mt-1" />
            </div>
            <div>
              <Label>Facility</Label>
              <Input placeholder="Hospital / Clinic name" {...register('examiningFacility')} className="mt-1" />
            </div>
            <div>
              <Label>Result</Label>
              <Select defaultValue="Pending" onValueChange={(v) => setValue('result', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fit">Fit</SelectItem>
                  <SelectItem value="Unfit">Unfit</SelectItem>
                  <SelectItem value="Conditional">Conditional</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Health Details */}
          <div>
            <Label>Previous Health Issues</Label>
            <Textarea placeholder="Any previous health conditions..." {...register('previousHealthIssues')} className="mt-1" />
          </div>

          <div>
            <Label className="mb-2 block">Chronic Diseases</Label>
            <div className="flex flex-wrap gap-3">
              {CHRONIC_OPTIONS.map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedChronic.includes(option)}
                    onCheckedChange={() => toggleChronic(option)}
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
            {selectedChronic.includes('Other') && (
              <Input
                placeholder="Specify other chronic conditions"
                {...register('chronicDiseaseNotes')}
                className="mt-2"
              />
            )}
          </div>

          <Separator />

          {/* Current Medications */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Current Medications</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendMed({ drug: '', dosage: '', frequency: '' })}
              >
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {medFields.map((field, index) => (
                <MedicationField key={field.id} index={index} control={control} remove={removeMed} total={medFields.length} />
              ))}
            </div>
          </div>

          <Separator />

          {/* Past Surgeries */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Past Surgeries</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendSurg({ procedure: '', date: '', notes: '' })}
              >
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {surgFields.map((field, index) => (
                <SurgeryField key={field.id} index={index} control={control} remove={removeSurg} total={surgFields.length} />
              ))}
            </div>
          </div>

          <Separator />

          {/* Next Checkup */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Next Checkup Date</Label>
              <Input type="date" {...register('nextCheckupDate')} className="mt-1" />
            </div>
            <div>
              <Label>Checkup Frequency</Label>
              <Select defaultValue="12" onValueChange={(v) => setValue('checkupFrequencyMonths', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Months</SelectItem>
                  <SelectItem value="6">6 Months</SelectItem>
                  <SelectItem value="12">12 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <Label>Remarks</Label>
            <Textarea placeholder="Additional remarks..." {...register('remarks')} className="mt-1" />
          </div>

          <PhotoUploader photos={formPhotos} onPhotosChange={setFormPhotos} maxPhotos={3} label="Examination Photos" />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              type="submit"
              className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Saving...' : 'Add Record'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------- main component ----------
export default function MedicalView() {
  const role = useAuthStore((s) => s.role)
  const perms = rolePermissions[role]

  const [search, setSearch] = useState('')
  const [resultFilter, setResultFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const hasActiveFilter = !!(search || resultFilter || typeFilter)
  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setResultFilter('')
    setTypeFilter('')
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Fetch workers
  const { data: workersResp, isLoading: workersLoading } = useQuery<WorkersResponse>({
    queryKey: ['workers-medical', debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '100' })
      if (debouncedSearch) params.set('search', debouncedSearch)
      return fetch(`/api/workers?${params.toString()}`).then((r) => r.json())
    },
  })
  const workers = workersResp?.data ?? []

  // Fetch medical for selected worker
  const { data: medicalResp, isLoading: medicalLoading } = useQuery<{ data: MedicalRecord[] }>({
    queryKey: ['worker-medical', selectedWorkerId],
    queryFn: () => fetch(`/api/workers/${selectedWorkerId}/medical`).then((r) => r.json()),
    enabled: !!selectedWorkerId,
  })
  const medicalRecords = medicalResp?.data ?? []

  const selectedWorker = useMemo(
    () => workers.find((w) => w.id === selectedWorkerId) ?? null,
    [workers, selectedWorkerId]
  )

  // Filter medical records
  const filteredRecords = useMemo(() => {
    return medicalRecords.filter((r) => {
      if (resultFilter && r.result !== resultFilter) return false
      if (typeFilter && r.examinationType !== typeFilter) return false
      return true
    })
  }, [medicalRecords, resultFilter, typeFilter])

  const handleSelectWorker = useCallback((id: string) => {
    setSelectedWorkerId((prev) => (prev === id ? null : id))
  }, [])

  // ---------- export columns ----------
  const workerExportColumns: ExportColumn<Worker>[] = [
    { key: 'fullName', header: 'Full Name' },
    { key: 'employeeNumber', header: 'Employee Number' },
    { key: 'designation', header: 'Designation', accessor: (w) => w.designation?.name || '' },
    { key: 'site', header: 'Site', accessor: (w) => w.site?.name || '' },
    { key: 'contractor', header: 'Contractor', accessor: (w) => w.contractor?.name || '' },
    { key: 'isActive', header: 'Active', accessor: (w) => (w.isActive ? 'Yes' : 'No') },
  ]

  const medicalExportColumns: ExportColumn<MedicalRecord>[] = [
    { key: 'workerName', header: 'Worker Name', accessor: () => selectedWorker?.fullName || '' },
    { key: 'employeeNumber', header: 'Employee Number', accessor: () => selectedWorker?.employeeNumber || '' },
    {
      key: 'examinationDate',
      header: 'Examination Date',
      accessor: (r) => format(parseISO(r.examinationDate), 'dd MMM yyyy'),
    },
    {
      key: 'examinationType',
      header: 'Type',
      accessor: (r) => typeBadgeLabel(r.examinationType),
    },
    { key: 'result', header: 'Result' },
    { key: 'examiningDoctor', header: 'Examining Doctor', accessor: (r) => r.examiningDoctor || '' },
    { key: 'examiningFacility', header: 'Examining Facility', accessor: (r) => r.examiningFacility || '' },
    {
      key: 'nextCheckupDate',
      header: 'Next Checkup Date',
      accessor: (r) => (r.nextCheckupDate ? format(parseISO(r.nextCheckupDate), 'dd MMM yyyy') : ''),
    },
    { key: 'checkupFrequencyMonths', header: 'Checkup Frequency (Months)' },
    {
      key: 'chronicDiseases',
      header: 'Chronic Diseases',
      accessor: (r) => parseJsonSafe<string[]>(r.chronicDiseases, []).join(', '),
    },
    { key: 'remarks', header: 'Remarks', accessor: (r) => r.remarks || '' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Medical Records</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage health examinations across all workers
          </p>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Worker List */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Workers</CardTitle>
              <TableExportButton
                rows={workers}
                columns={workerExportColumns}
                filename="medical_workers"
                variant="outline"
                size="sm"
              />
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search workers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px] lg:h-[600px]">
              {workersLoading ? (
                <div className="p-4"><WorkerListSkeleton /></div>
              ) : workers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <User className="h-10 w-10 mb-2 opacity-40" />
                  <p className="text-sm">No workers found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {workers.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => handleSelectWorker(w.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors',
                        selectedWorkerId === w.id && 'bg-[#0d9488]/10 border-r-2 border-[#0d9488]'
                      )}
                    >
                      <div className="h-9 w-9 rounded-full bg-[#0d9488]/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-[#0d9488]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{w.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {w.employeeNumber} · {w.designation.name}
                        </p>
                      </div>
                      <ChevronRight className={cn(
                        'h-4 w-4 text-muted-foreground transition-transform',
                        selectedWorkerId === w.id && 'text-[#0d9488]'
                      )} />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Panel: Medical Records */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedWorker ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Stethoscope className="h-14 w-14 mb-3 opacity-30" />
                <p className="text-base font-medium">Select a worker</p>
                <p className="text-sm mt-1">Choose a worker from the list to view their medical records</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Selected worker header */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#0d9488]/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-[#0d9488]" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{selectedWorker.fullName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedWorker.employeeNumber} · {selectedWorker.designation.name}
                          {selectedWorker.site ? ` · ${selectedWorker.site.name}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TableExportButton
                        rows={filteredRecords}
                        columns={medicalExportColumns}
                        filename="medical_records"
                        variant="outline"
                        size="default"
                      />
                      {perms.canEdit && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => toast.info('Import medical records — coming soon')}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Import</span>
                          </Button>
                          <Button
                            className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
                            onClick={() => setDialogOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Record
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Filters for medical records */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={resultFilter} onValueChange={(v) => setResultFilter(v === '__all__' ? '' : v)}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Result" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Results</SelectItem>
                    <SelectItem value="Fit">Fit</SelectItem>
                    <SelectItem value="Unfit">Unfit</SelectItem>
                    <SelectItem value="Conditional">Conditional</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === '__all__' ? '' : v)}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Exam Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Types</SelectItem>
                    <SelectItem value="PreEmployment">Pre-Employment</SelectItem>
                    <SelectItem value="Periodic">Periodic</SelectItem>
                    <SelectItem value="Special">Special</SelectItem>
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

              {/* Medical records list */}
              {medicalLoading ? (
                <MedicalCardSkeleton />
              ) : filteredRecords.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-base font-medium">No medical records</p>
                    <p className="text-sm mt-1">
                      {resultFilter || typeFilter ? 'Try adjusting your filters' : 'No records found for this worker'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredRecords.map((record) => {
                    const chronicList = parseJsonSafe<string[]>(record.chronicDiseases, [])
                    const isPastDue = record.nextCheckupDate && isPast(parseISO(record.nextCheckupDate))
                    return (
                      <Card key={record.id} className="card-hover">
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">
                                {format(parseISO(record.examinationDate), 'dd MMM yyyy')}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {typeBadgeLabel(record.examinationType)}
                              </Badge>
                              <Badge variant="outline" className={cn('text-xs', resultBadgeClass(record.result))}>
                                {record.result}
                              </Badge>
                            </div>
                            {isPastDue && (
                              <Badge className="bg-red-100 text-red-700 text-xs border-0">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Checkup Overdue
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            {record.examiningDoctor && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Stethoscope className="h-3.5 w-3.5" />
                                <span>Dr. {record.examiningDoctor}</span>
                              </div>
                            )}
                            {record.examiningFacility && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Building2 className="h-3.5 w-3.5" />
                                <span>{record.examiningFacility}</span>
                              </div>
                            )}
                            {record.nextCheckupDate && (
                              <div className={cn(
                                'flex items-center gap-2',
                                isPastDue ? 'text-red-600 font-medium' : 'text-muted-foreground'
                              )}>
                                <CalendarDays className="h-3.5 w-3.5" />
                                <span>Next: {format(parseISO(record.nextCheckupDate), 'dd MMM yyyy')}</span>
                              </div>
                            )}
                            {record.checkupFrequencyMonths && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                <span>Every {record.checkupFrequencyMonths} months</span>
                              </div>
                            )}
                          </div>

                          {chronicList.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {chronicList.map((d) => (
                                <Badge key={d} variant="outline" className="text-xs border-amber-300 text-amber-700">
                                  {d}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {record.photos && (() => {
                            try {
                              const recordPhotos = JSON.parse(record.photos) as string[]
                              if (recordPhotos.length === 0) return null
                              return (
                                <div className="mt-3">
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                                    <Camera className="h-3 w-3" />
                                    <span>Examination Photos ({recordPhotos.length})</span>
                                  </div>
                                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                                    {recordPhotos.map((photo, idx) => (
                                      <div key={idx} className="aspect-square rounded-md overflow-hidden border bg-muted">
                                        <img src={photo} alt={`Exam photo ${idx + 1}`} className="w-full h-full object-cover" />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            } catch { return null }
                          })()}

                          {record.remarks && (
                            <p className="mt-3 text-sm text-muted-foreground italic">
                              &ldquo;{record.remarks}&rdquo;
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Medical Dialog */}
      {selectedWorker && (
        <AddMedicalDialog
          workerId={selectedWorker.id}
          workerName={selectedWorker.fullName}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  )
}
