'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  X,
  Search as SearchIcon,
  AlertTriangle,
  ShieldAlert,
  Users,
  Camera,
  Check,
  FileText,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useNavStore } from '@/stores/nav-store'
import PhotoUploader from '@/components/shared/photo-uploader'

// ---------- types ----------
interface WorkerOption {
  id: string
  fullName: string
  employeeNumber: string
}

interface ContractorOption {
  id: string
  name: string
}

interface SiteOption {
  id: string
  name: string
}

interface WorkerEntry {
  workerId: string
  workerName: string
  injuryDesc: string
}

// ---------- wizard step definitions ----------
interface StepDef {
  id: number
  title: string
  description: string
  icon: typeof FileText
}

const STEPS: StepDef[] = [
  {
    id: 0,
    title: 'Incident Details',
    description: 'What happened, when, and where',
    icon: AlertTriangle,
  },
  {
    id: 1,
    title: 'Severity & Assignment',
    description: 'Severity, contractor, site, response',
    icon: ShieldAlert,
  },
  {
    id: 2,
    title: 'Workers Involved',
    description: 'Search and add affected workers',
    icon: Users,
  },
  {
    id: 3,
    title: 'Photos & Additional',
    description: 'Photo evidence, death-case fields',
    icon: Camera,
  },
]

// ---------- outer dialog (controls open state) ----------
export default function IncidentFormDialog() {
  const open = useNavStore((s) => s.incidentFormDialogOpen)
  const closeIncidentForm = useNavStore((s) => s.closeIncidentForm)

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) closeIncidentForm()
      }}
    >
      <DialogContent
        className="max-w-[calc(100%-1rem)] sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Only mount the inner wizard when open, with a fresh key each open
            so all form state resets cleanly (avoids setState-in-effect) */}
        {open && <IncidentFormWizard key="incident-wizard" onClose={closeIncidentForm} />}
      </DialogContent>
    </Dialog>
  )
}

// ---------- inner wizard (fresh mount each open) ----------
function IncidentFormWizard({ onClose }: { onClose: () => void }) {
  const setPage = useNavStore((s) => s.setPage)
  const queryClient = useQueryClient()

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [validating, setValidating] = useState(false)

  // Form state (mirrors incident-form-view.tsx)
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
    queryFn: () =>
      fetch('/api/workers?limit=100')
        .then((r) => r.json())
        .then((d: { data: WorkerOption[] }) => d.data),
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
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
      if (data?.data?.id) {
        setPage('incident-detail', { id: data.data.id })
      }
    },
    onError: () => toast.error('Failed to log incident'),
  })

  // ---------- step validation ----------
  const validateStep = (step: number): boolean => {
    if (step === 0) {
      if (!incidentType || !date || !description || !locationOnSite) {
        toast.error('Please fill in all required fields (Type, Date, Location, Description)')
        return false
      }
    }
    return true
  }

  const goNext = () => {
    setValidating(true)
    if (!validateStep(currentStep)) {
      setValidating(false)
      return
    }
    setDirection(1)
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1))
    setValidating(false)
  }

  const goPrev = () => {
    setDirection(-1)
    setCurrentStep((s) => Math.max(s - 1, 0))
  }

  const goToStep = (target: number) => {
    if (target === currentStep) return
    if (target < currentStep) {
      setDirection(-1)
      setCurrentStep(target)
      return
    }
    // Forward: validate all intermediate steps
    for (let i = currentStep; i < target; i++) {
      if (!validateStep(i)) return
    }
    setDirection(1)
    setCurrentStep(target)
  }

  const handleFinalSubmit = () => {
    if (!validateStep(0)) return
    const body: Record<string, unknown> = {
      incidentType,
      date,
      time: time || null,
      locationOnSite,
      description,
      rootCause: rootCause || null,
      immediateAction: immediateAction || null,
      firstResponder: firstResponder || null,
      hospitalReferred: hospitalReferred || null,
      severity,
      contractorId: contractorId || null,
      siteId: siteId || null,
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

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
  }

  return (
    <>
      {/* Header (sticky) */}
      <DialogHeader className="px-5 py-4 border-b shrink-0">
        <DialogTitle className="text-base font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          Log New Incident
        </DialogTitle>
        <DialogDescription className="text-xs">
          Complete each step. Click Next to continue, or jump to any step from the stepper.
        </DialogDescription>
      </DialogHeader>

      {/* Stepper (sticky, desktop) */}
      <div className="hidden sm:flex shrink-0 items-center justify-between px-5 py-3 border-b bg-muted/30">
        {STEPS.map((step, idx) => {
          const Icon = step.icon
          const isComplete = idx < currentStep
          const isActive = idx === currentStep
          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => goToStep(idx)}
                className="flex items-center gap-2 group/step"
              >
                <span
                  className={`flex items-center justify-center h-8 w-8 rounded-full border-2 transition-all ${
                    isComplete
                      ? 'bg-[#0d9488] border-[#0d9488] text-white'
                      : isActive
                      ? 'border-[#0d9488] text-[#0d9488] ring-2 ring-[#0d9488]/30'
                      : 'border-muted-foreground/30 text-muted-foreground/50 group-hover/step:border-muted-foreground/60'
                  }`}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <div className="text-left">
                  <p
                    className={`text-xs font-medium leading-tight ${
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {step.title}
                  </p>
                </div>
              </button>
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-px mx-2 ${
                    idx < currentStep ? 'bg-[#0d9488]' : 'bg-muted-foreground/20'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Stepper (compact, mobile) */}
      <div className="sm:hidden shrink-0 px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center h-7 w-7 rounded-full bg-[#0d9488] text-white text-xs font-semibold">
              {currentStep + 1}
            </span>
            <p className="text-sm font-medium">{STEPS[currentStep].title}</p>
          </div>
          <span className="text-xs text-muted-foreground">
            Step {currentStep + 1} of {STEPS.length}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted-foreground/20 overflow-hidden">
          <div
            className="h-full bg-[#0d9488] transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content (scrollable) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            {/* STEP 1: Incident Details */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Incident Type *</Label>
                    <Select value={incidentType} onValueChange={setIncidentType}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
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
              </div>
            )}

            {/* STEP 2: Severity & Assignment */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Severity</Label>
                    <Select value={severity} onValueChange={setSeverity}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
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
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {contractors?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Site</Label>
                    <Select value={siteId} onValueChange={setSiteId}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {sites?.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
              </div>
            )}

            {/* STEP 3: Workers Involved */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="relative" ref={dropdownRef}>
                  <Label>Search worker by name or employee number</Label>
                  <div className="relative mt-1">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Search worker..."
                      value={workerSearch}
                      onChange={(e) => {
                        setWorkerSearch(e.target.value)
                        setShowWorkerDropdown(true)
                      }}
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
                {workers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                    No workers added yet. Search and click to add.
                  </p>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-red-500 hover:text-red-700"
                          onClick={() => removeWorker(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: Photos & Additional (death-specific) */}
            {currentStep === 3 && (
              <div className="space-y-5">
                {isDeath && (
                  <div className="space-y-4 p-4 rounded-lg border-2 border-red-200 bg-red-50/40">
                    <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Death Case — Additional Required Fields
                    </p>
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
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NotApplicable">Not Applicable</SelectItem>
                            <SelectItem value="Initiated">Initiated</SelectItem>
                            <SelectItem value="InProgress">In Progress</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <Checkbox
                          checked={familyNotified}
                          onCheckedChange={(v) => setFamilyNotified(!!v)}
                          id="family-notified"
                        />
                        <Label htmlFor="family-notified" className="cursor-pointer">
                          Family Notified
                        </Label>
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <PhotoUploader
                    photos={photos}
                    onPhotosChange={setPhotos}
                    maxPhotos={5}
                    label="Incident Photos"
                  />
                </div>
                <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Ready to submit?</p>
                  Review the incident details. The incident will be logged and you will be taken to the incident detail page.
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer (sticky) */}
      <div className="shrink-0 border-t bg-background/95 backdrop-blur px-5 py-3 flex items-center justify-between gap-2">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={currentStep === 0}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <span className="text-xs text-muted-foreground">
          Step {currentStep + 1} of {STEPS.length}
        </span>
        {currentStep < STEPS.length - 1 ? (
          <Button
            className="bg-[#0d9488] hover:bg-[#0f766e] text-white gap-1"
            onClick={goNext}
            disabled={validating}
          >
            <span className="hidden sm:inline">Next</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            className="bg-[#0d9488] hover:bg-[#0f766e] text-white gap-1"
            onClick={handleFinalSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Saving...' : 'Log Incident'}
          </Button>
        )}
      </div>
    </>
  )
}
