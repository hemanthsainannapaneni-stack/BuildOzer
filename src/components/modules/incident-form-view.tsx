'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Plus, X, Search as SearchIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useNavStore } from '@/stores/nav-store'
import PhotoUploader from '@/components/shared/photo-uploader'

// ---------- types ----------
interface WorkerOption {
  id: string
  fullName: string
  employeeNumber: string
}

interface ContractorOption { id: string; name: string }
interface SiteOption { id: string; name: string }

interface WorkerEntry {
  workerId: string
  workerName: string
  injuryDesc: string
}

// ---------- main ----------
export default function IncidentFormView() {
  const goBack = useNavStore((s) => s.goBack)
  const setPage = useNavStore((s) => s.setPage)

  // Form state
  const [incidentType, setIncidentType] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [locationOnSite, setLocationOnSite] = useState('')
  const [description, setDescription] = useState('')
  const [rootCause, setRootCause] = useState('')
  const [immediateAction, setImmediateAction] = useState('')
  const [firstResponder, setFirstResponder] = useState('')
  const [hospitalReferred, setHospitalReferred] = useState('')
  const [severity, setSeverity] = useState('Medium')
  const [contractorId, setContractorId] = useState('')
  const [siteId, setSiteId] = useState('')
  const [workers, setWorkers] = useState<WorkerEntry[]>([])
  const [photos, setPhotos] = useState<string[]>([])

  // Death-specific
  const [policeFIRReference, setPoliceFIRReference] = useState('')
  const [employerNotifiedAt, setEmployerNotifiedAt] = useState('')
  const [compensationStatus, setCompensationStatus] = useState('')
  const [familyNotified, setFamilyNotified] = useState(false)

  // Worker search
  const [workerSearch, setWorkerSearch] = useState('')
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isDeath = incidentType === 'Death'

  // Fetch options
  const { data: workersList } = useQuery<WorkerOption[]>({
    queryKey: ['workers-select'],
    queryFn: () => fetch('/api/workers?limit=100').then((r) => r.json()).then((d: { data: WorkerOption[] }) => d.data),
  })
  const { data: contractors } = useQuery<ContractorOption[]>({
    queryKey: ['contractors'],
    queryFn: () => fetch('/api/contractors').then((r) => r.json()),
  })
  const { data: sites } = useQuery<SiteOption[]>({
    queryKey: ['sites'],
    queryFn: () => fetch('/api/sites').then((r) => r.json()),
  })

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowWorkerDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredWorkers = (workersList || []).filter(
    (w) =>
      !workers.some((ew) => ew.workerId === w.id) &&
      (w.fullName.toLowerCase().includes(workerSearch.toLowerCase()) ||
        w.employeeNumber.toLowerCase().includes(workerSearch.toLowerCase()))
  )

  const addWorker = (w: WorkerOption) => {
    setWorkers([...workers, { workerId: w.id, workerName: w.fullName, injuryDesc: '' }])
    setWorkerSearch('')
    setShowWorkerDropdown(false)
  }

  const removeWorker = (idx: number) => {
    setWorkers(workers.filter((_, i) => i !== idx))
  }

  const updateInjuryDesc = (idx: number, desc: string) => {
    const updated = [...workers]
    updated[idx] = { ...updated[idx], injuryDesc: desc }
    setWorkers(updated)
  }

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (data) => {
 toast.success('Incident logged successfully')
      if (data?.data?.id) {
        setPage('incident-detail', { id: data.data.id })
      } else {
        goBack()
      }
    },
    onError: () => toast.error('Failed to log incident'),
  })

  const handleSubmit = () => {
    if (!incidentType || !date || !description || !locationOnSite) {
      toast.error('Please fill in all required fields (Type, Date, Location, Description)')
      return
    }
    const body: Record<string, unknown> = {
      incidentType, date, time: time || null, locationOnSite, description,
      rootCause: rootCause || null, immediateAction: immediateAction || null,
      firstResponder: firstResponder || null, hospitalReferred: hospitalReferred || null,
      severity, contractorId: contractorId || null, siteId: siteId || null,
      photoPaths: photos.length > 0 ? JSON.stringify(photos) : null,
      isDeath,
      workers: workers.map((w) => ({
        workerId: w.workerId || null,
        workerName: w.workerName || null,
        injuryDesc: w.injuryDesc || null,
      })),
    }
    if (isDeath) {
      body.policeFIRReference = policeFIRReference || null
      body.employerNotifiedAt = employerNotifiedAt || null
      body.compensationStatus = compensationStatus || null
      body.familyNotified = familyNotified
    }
    createMutation.mutate(body)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={goBack}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <h1 className="text-xl font-bold tracking-tight">Log New Incident</h1>
      </div>

      {/* Incident Details */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Incident Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Incident Type *</Label>
              <Select value={incidentType} onValueChange={setIncidentType}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FireInjury">Fire Injury</SelectItem>
                  <SelectItem value="MinorInjury">Minor Injury</SelectItem>
                  <SelectItem value="MajorFatalInjury">Major/Fatal Injury</SelectItem>
                  <SelectItem value="Death">Death</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" className="mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Time (HH:mm)</Label>
              <Input className="mt-1" placeholder="e.g. 14:30" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div>
              <Label>Location on Site *</Label>
              <Input className="mt-1" value={locationOnSite} onChange={(e) => setLocationOnSite(e.target.value)} placeholder="e.g. Block A, Floor 3" />
            </div>
          </div>
          <div>
            <Label>Description *</Label>
            <Textarea className="mt-1" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the incident in detail..." />
          </div>
          <div>
            <Label>Root Cause</Label>
            <Textarea className="mt-1" rows={2} value={rootCause} onChange={(e) => setRootCause(e.target.value)} placeholder="What caused the incident?" />
          </div>
          <div>
            <Label>Immediate Action Taken</Label>
            <Textarea className="mt-1" rows={2} value={immediateAction} onChange={(e) => setImmediateAction(e.target.value)} placeholder="What immediate actions were taken?" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>First Responder</Label>
              <Input className="mt-1" value={firstResponder} onChange={(e) => setFirstResponder(e.target.value)} />
            </div>
            <div>
              <Label>Hospital Referred</Label>
              <Input className="mt-1" value={hospitalReferred} onChange={(e) => setHospitalReferred(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Severity & Assignment */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Severity & Assignment</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contractor</Label>
              <Select value={contractorId} onValueChange={setContractorId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {contractors?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Site</Label>
              <Select value={siteId} onValueChange={setSiteId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {sites?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workers Involved */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Workers Involved</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Search to add worker */}
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search worker by name or employee number..."
                value={workerSearch}
                onChange={(e) => { setWorkerSearch(e.target.value); setShowWorkerDropdown(true) }}
                onFocus={() => setShowWorkerDropdown(true)}
              />
            </div>
            {showWorkerDropdown && filteredWorkers.length > 0 && (
              <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                {filteredWorkers.slice(0, 10).map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                    onClick={() => addWorker(w)}
                  >
                    <span className="font-medium">{w.fullName}</span>
                    <span className="text-muted-foreground ml-2">{w.employeeNumber}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Added workers list */}
          {workers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No workers added yet. Search and click to add.</p>
          ) : (
            <div className="space-y-3">
              {workers.map((w, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{w.workerName}</p>
                    <Input
                      className="mt-2"
                      placeholder="Injury description..."
                      value={w.injuryDesc}
                      onChange={(e) => updateInjuryDesc(idx, e.target.value)}
                    />
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0 text-red-500 hover:text-red-700" onClick={() => removeWorker(idx)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Death-Specific Fields */}
      {isDeath && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-red-700">⚠ Death Case — Additional Required Fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Police FIR Reference</Label>
                <Input className="mt-1" value={policeFIRReference} onChange={(e) => setPoliceFIRReference(e.target.value)} />
              </div>
              <div>
                <Label>Employer Notified At</Label>
                <Input type="datetime-local" className="mt-1" value={employerNotifiedAt} onChange={(e) => setEmployerNotifiedAt(e.target.value)} />
              </div>
              <div>
                <Label>Compensation Status</Label>
                <Select value={compensationStatus} onValueChange={setCompensationStatus}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NotApplicable">Not Applicable</SelectItem>
                    <SelectItem value="Initiated">Initiated</SelectItem>
                    <SelectItem value="InProgress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox checked={familyNotified} onCheckedChange={(v) => setFamilyNotified(!!v)} id="family-notified" />
                <Label htmlFor="family-notified" className="cursor-pointer">Family Notified</Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photos */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Photos</CardTitle></CardHeader>
        <CardContent>
          <PhotoUploader photos={photos} onPhotosChange={setPhotos} maxPhotos={5} label="Incident Photos" />
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-3">
        <Button
          className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
          disabled={createMutation.isPending}
          onClick={handleSubmit}
        >
          {createMutation.isPending ? 'Saving...' : 'Log Incident'}
        </Button>
        <Button variant="outline" onClick={goBack}>Cancel</Button>
      </div>
    </div>
  )
}
