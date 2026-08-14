'use client'

import React, { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Plus,
  Trash2,
  AlertTriangle,
  Camera,
  X,
  Check,
  User,
  Contact,
  Briefcase,
  Phone,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useNavStore } from '@/stores/nav-store'
import { toast } from 'sonner'

// ---------- constants ----------
const GENDERS = ['Male', 'Female', 'Other'] as const
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const
const QUALIFICATIONS = ['Below 10th', '10th', '12th', 'ITI', 'Diploma', 'Graduate', 'Other'] as const

// ---------- schema ----------
const emergencyContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  phone: z.string().min(1, 'Phone is required'),
  isPrimary: z.boolean().default(false),
})

const nomineeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  idNumber: z.string().optional(),
  contactNumber: z.string().optional(),
})

const workerFormSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.string().min(1, 'Gender is required'),
  bloodGroup: z.string().min(1, 'Blood group is required'),
  qualification: z.string().min(1, 'Qualification is required'),
  qualificationNote: z.string().optional(),
  aadhaarNumber: z
    .string()
    .min(1, 'Aadhaar number is required')
    .regex(/^\d{12}$/, 'Must be exactly 12 digits'),
  permanentAddress: z.string().min(1, 'Permanent address is required'),
  currentAddress: z.string().optional(),
  contractorId: z.string().min(1, 'Contractor is required'),
  siteId: z.string().optional(),
  designationId: z.string().min(1, 'Designation is required'),
  zone: z.string().optional(),
  reportingSupervisor: z.string().optional(),
  uanNumber: z.string().optional(),
  emergencyContacts: z
    .array(emergencyContactSchema)
    .min(1, 'At least one emergency contact is required'),
  nominees: z.array(nomineeSchema).optional(),
}).refine(
  (data) => {
    if (!data.dateOfBirth) return true
    const dob = new Date(data.dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const m = today.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
    return age >= 18 && age <= 55
  },
  { message: 'Age must be between 18 and 55 years', path: ['dateOfBirth'] },
)

type WorkerFormValues = z.infer<typeof workerFormSchema>

// ---------- types ----------
interface Contractor {
  id: string
  name: string
  code: string
}
interface Designation {
  id: string
  name: string
}
interface Site {
  id: string
  name: string
}
interface WorkerData {
  id: string
  profilePhotoPath: string | null
  fullName: string
  dateOfBirth: string
  gender: string
  bloodGroup: string
  qualification: string
  qualificationNote: string | null
  aadhaarNumber: string
  permanentAddress: string
  currentAddress: string | null
  contractorId: string
  siteId: string | null
  designationId: string
  zone: string | null
  reportingSupervisor: string | null
  uanNumber: string | null
  emergencyContacts: { id: string; name: string; relationship: string; phone: string; isPrimary: boolean }[]
  nominees: { id: string; name: string; relationship: string; idNumber: string | null; contactNumber: string | null }[]
}

// ---------- wizard step definitions ----------
interface StepDef {
  id: number
  title: string
  description: string
  icon: typeof User
  /** field names validated when leaving this step */
  fields: (keyof WorkerFormValues | `emergencyContacts`)[]
}

const STEPS: StepDef[] = [
  {
    id: 0,
    title: 'Personal Information',
    description: 'Basic identity and demographic details',
    icon: User,
    fields: ['fullName', 'dateOfBirth', 'gender', 'bloodGroup', 'qualification'],
  },
  {
    id: 1,
    title: 'Contact Information',
    description: 'Aadhaar and address details',
    icon: Contact,
    fields: ['aadhaarNumber', 'permanentAddress'],
  },
  {
    id: 2,
    title: 'Assignment',
    description: 'Contractor, site, and role assignment',
    icon: Briefcase,
    fields: ['contractorId', 'designationId'],
  },
  {
    id: 3,
    title: 'Emergency Contacts',
    description: 'At least one contact is required',
    icon: Phone,
    fields: ['emergencyContacts'],
  },
  {
    id: 4,
    title: 'Nominee Details',
    description: 'Optional — for insurance and PF nominations',
    icon: Users,
    fields: [],
  },
]

// ---------- inner wizard ----------
interface InnerProps {
  editId: string | null
  onClose: () => void
}

function WorkerFormDialogInner({ editId, onClose }: InnerProps) {
  const isEdit = !!editId
  const setPage = useNavStore((s) => s.setPage)

  const queryClient = useQueryClient()
  const [submitting, setSubmitting] = useState(false)
  const [userPhoto, setUserPhoto] = useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Wizard step state
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [validating, setValidating] = useState(false)

  // Fetch dropdown data
  const { data: contractors } = useQuery<Contractor[]>({
    queryKey: ['contractors'],
    queryFn: () => fetch('/api/contractors').then((r) => r.json()),
  })

  const { data: designations } = useQuery<Designation[]>({
    queryKey: ['designations'],
    queryFn: () => fetch('/api/designations').then((r) => r.json()),
  })

  const { data: sites } = useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: () => fetch('/api/sites').then((r) => r.json()),
  })

  // Fetch existing worker for edit
  const { data: existingWorker, isLoading: isLoadingWorker } = useQuery<{
    data: WorkerData
  }>({
    queryKey: ['worker', editId],
    queryFn: () => fetch(`/api/workers/${editId}`).then((r) => r.json()),
    enabled: isEdit,
  })

  const form = useForm<WorkerFormValues>({
    resolver: zodResolver(workerFormSchema),
    defaultValues: {
      fullName: '',
      dateOfBirth: '',
      gender: '',
      bloodGroup: '',
      qualification: '',
      qualificationNote: '',
      aadhaarNumber: '',
      permanentAddress: '',
      currentAddress: '',
      contractorId: '',
      siteId: '',
      designationId: '',
      zone: '',
      reportingSupervisor: '',
      uanNumber: '',
      emergencyContacts: [{ name: '', relationship: '', phone: '', isPrimary: true }],
      nominees: [],
    },
  })

  const { fields: ecFields, append: appendEc, remove: removeEc } = useFieldArray({
    control: form.control,
    name: 'emergencyContacts',
  })

  const { fields: nomFields, append: appendNom, remove: removeNom } = useFieldArray({
    control: form.control,
    name: 'nominees',
  })

  // Derive photo: user-uploaded takes priority, else existing from DB
  const photoDataUrl =
    userPhoto ||
    (isEdit && existingWorker?.data?.profilePhotoPath ? existingWorker.data.profilePhotoPath : null)

  // Populate form when editing
  useEffect(() => {
    if (existingWorker?.data && isEdit) {
      const w = existingWorker.data
      form.reset({
        fullName: w.fullName,
        dateOfBirth: w.dateOfBirth?.slice(0, 10) ?? '',
        gender: w.gender,
        bloodGroup: w.bloodGroup,
        qualification: w.qualification,
        qualificationNote: w.qualificationNote ?? '',
        aadhaarNumber: w.aadhaarNumber,
        permanentAddress: w.permanentAddress,
        currentAddress: w.currentAddress ?? '',
        contractorId: w.contractorId,
        siteId: w.siteId ?? '',
        designationId: w.designationId,
        zone: w.zone ?? '',
        reportingSupervisor: w.reportingSupervisor ?? '',
        uanNumber: w.uanNumber ?? '',
        emergencyContacts:
          w.emergencyContacts.length > 0
            ? w.emergencyContacts.map((ec) => ({
                name: ec.name,
                relationship: ec.relationship,
                phone: ec.phone,
                isPrimary: ec.isPrimary,
              }))
            : [{ name: '', relationship: '', phone: '', isPrimary: true }],
        nominees: w.nominees.map((n) => ({
          name: n.name,
          relationship: n.relationship,
          idNumber: n.idNumber ?? '',
          contactNumber: n.contactNumber ?? '',
        })),
      })
    }
  }, [existingWorker, isEdit, form])

  const mutation = useMutation({
    mutationFn: async (values: WorkerFormValues) => {
      const url = isEdit ? `/api/workers/${editId}` : '/api/workers'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, profilePhotoPath: photoDataUrl || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save worker')
      return data
    },
    onSuccess: (data) => {
      toast.success(isEdit ? 'Worker updated successfully' : 'Worker registered successfully')
      queryClient.invalidateQueries({ queryKey: ['workers'] })
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['worker', editId] })
      }
      const workerId = isEdit ? editId : data?.data?.id
      // Close the dialog first, then navigate to the worker detail page so the
      // user can see the result (works for both new + edit modes).
      onClose()
      if (workerId) {
        setPage('worker-detail', { id: workerId })
      }
    },
    onError: (err) => {
      toast.error(err.message || 'Something went wrong')
    },
    onSettled: () => {
      setSubmitting(false)
    },
  })

  const onSubmit = (values: WorkerFormValues) => {
    setSubmitting(true)
    mutation.mutate(values)
  }

  // ---------- wizard navigation ----------
  const validateStep = async (step: number): Promise<boolean> => {
    const stepDef = STEPS[step]
    if (!stepDef || stepDef.fields.length === 0) return true
    setValidating(true)
    const result = await form.trigger(stepDef.fields as (keyof WorkerFormValues)[])
    setValidating(false)
    return result
  }

  const goNext = async () => {
    const ok = await validateStep(currentStep)
    if (!ok) {
      toast.error('Please complete the required fields before continuing')
      return
    }
    if (currentStep < STEPS.length - 1) {
      setDirection(1)
      setCurrentStep((s) => s + 1)
    }
  }

  const goPrev = () => {
    if (currentStep > 0) {
      setDirection(-1)
      setCurrentStep((s) => s - 1)
    }
  }

  const goToStep = async (step: number) => {
    if (step === currentStep) return
    // Only allow jumping forward if all steps up to `step` are valid
    if (step > currentStep) {
      for (let i = currentStep; i < step; i++) {
        const ok = await validateStep(i)
        if (!ok) {
          // stop at the first invalid step
          setDirection(1)
          setCurrentStep(i)
          toast.error('Please complete the required fields before skipping ahead')
          return
        }
      }
    }
    setDirection(step > currentStep ? 1 : -1)
    setCurrentStep(step)
  }

  const handleFinalSubmit = async () => {
    const ok = await validateStep(currentStep)
    if (!ok) {
      toast.error('Please review this step before submitting')
      return
    }
    await form.handleSubmit(onSubmit)()
  }

  const slideVariants = {
    enter: (dir: 1 | -1) => ({
      x: dir > 0 ? 40 : -40,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: 1 | -1) => ({
      x: dir > 0 ? -40 : 40,
      opacity: 0,
    }),
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ====== Wizard Stepper (sticky top, inside dialog) ====== */}
      <div className="shrink-0 px-6 py-4 border-b bg-background">
        {/* Desktop stepper */}
        <div className="hidden sm:flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const Icon = step.icon
            const isComplete = currentStep > step.id
            const isActive = currentStep === step.id
            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => goToStep(step.id)}
                  className="flex flex-col items-center gap-1.5 group flex-1 min-w-0"
                  aria-label={`Step ${step.id + 1}: ${step.title}`}
                >
                  <div
                    className={[
                      'flex items-center justify-center h-10 w-10 rounded-full border-2 transition-all duration-200 shrink-0',
                      isComplete
                        ? 'bg-primary border-primary text-primary-foreground'
                        : isActive
                          ? 'border-primary text-primary bg-primary/10 ring-4 ring-primary/10'
                          : 'border-muted-foreground/30 text-muted-foreground/60 bg-background group-hover:border-muted-foreground/50',
                    ].join(' ')}
                  >
                    {isComplete ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-4.5 w-4.5" />
                    )}
                  </div>
                  <span
                    className={[
                      'text-xs font-medium text-center leading-tight transition-colors',
                      isActive
                        ? 'text-foreground'
                        : isComplete
                          ? 'text-muted-foreground'
                          : 'text-muted-foreground/60',
                    ].join(' ')}
                  >
                    {step.title}
                  </span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 mx-2 -mt-6 relative">
                    <div className="absolute inset-0 bg-muted-foreground/20 rounded-full" />
                    <div
                      className={[
                        'absolute inset-y-0 left-0 rounded-full transition-all duration-300',
                        currentStep > step.id ? 'bg-primary w-full' : 'w-0',
                      ].join(' ')}
                    />
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>

        {/* Mobile stepper (compact) — visible inside the 420px mobile frame */}
        <div className="sm:hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                {currentStep + 1}
              </div>
              <span className="text-sm font-medium">
                {STEPS[currentStep].title}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Step {currentStep + 1} of {STEPS.length}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted-foreground/20 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ====== Scrollable Step Content ====== */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Loading state for edit mode while existing worker is fetched */}
        {isEdit && isLoadingWorker ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()}>
              {/* ====== Step Content (animated) ====== */}
              <div className="overflow-hidden">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentStep}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  >
                    {/* ====== Step 0: Personal Information ====== */}
                    {currentStep === 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Personal Information</CardTitle>
                          <CardDescription>Basic identity and demographic details</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Photo Upload */}
                          <div className="sm:col-span-2 flex flex-col items-center gap-2 mb-2">
                            <div
                              className="relative w-[72px] h-[72px] rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted/30 flex items-center justify-center cursor-pointer overflow-hidden group"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              {photoDataUrl ? (
                                <img
                                  src={photoDataUrl}
                                  alt="Profile"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
                                  <Camera className="h-5 w-5 opacity-60" />
                                  <span className="text-[9px]">Add Photo</span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Camera className="h-4 w-4 text-white" />
                              </div>
                            </div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="capture=image,image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                if (file.size > 5 * 1024 * 1024) {
                                  toast.error('Photo must be less than 5MB')
                                  return
                                }
                                const reader = new FileReader()
                                reader.onload = () => {
                                  setUserPhoto(reader.result as string)
                                }
                                reader.readAsDataURL(file)
                              }}
                            />
                            {photoDataUrl && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-red-500 h-7 text-xs"
                                onClick={() => {
                                  setUserPhoto(null)
                                  if (fileInputRef.current) fileInputRef.current.value = ''
                                }}
                              >
                                <X className="h-3.5 w-3.5 mr-1" />
                                Remove Photo
                              </Button>
                            )}
                          </div>

                          <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                              <FormItem className="sm:col-span-2">
                                <FormLabel>Full Name *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter full name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="dateOfBirth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date of Birth *</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="gender"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Gender *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {GENDERS.map((g) => (
                                      <SelectItem key={g} value={g}>{g}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="bloodGroup"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Blood Group *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select blood group" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {BLOOD_GROUPS.map((bg) => (
                                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="qualification"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Qualification *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select qualification" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {QUALIFICATIONS.map((q) => (
                                      <SelectItem key={q} value={q}>{q}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="qualificationNote"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Qualification Note</FormLabel>
                                <FormControl>
                                  <Input placeholder="Additional details" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    )}

                    {/* ====== Step 1: Contact Information ====== */}
                    {currentStep === 1 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Contact Information</CardTitle>
                          <CardDescription>Aadhaar and address details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="aadhaarNumber"
                            render={({ field }) => (
                              <FormItem className="max-w-xs">
                                <FormLabel>Aadhaar Number *</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="12-digit number"
                                    maxLength={12}
                                    {...field}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/\D/g, '')
                                      field.onChange(val)
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="permanentAddress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Permanent Address *</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Full permanent address"
                                    rows={3}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="currentAddress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Current / Site Address</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Current residential or site address"
                                    rows={3}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    )}

                    {/* ====== Step 2: Assignment ====== */}
                    {currentStep === 2 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Assignment</CardTitle>
                          <CardDescription>Contractor, site, and role assignment</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="contractorId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Contractor *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select contractor" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {contractors?.map((c) => (
                                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="siteId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Site</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select site" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {sites?.map((s) => (
                                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="designationId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Designation *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select designation" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {designations?.map((d) => (
                                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="zone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Zone / Block</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g. Zone A, Block 3" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="uanNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>UAN Number (PF)</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter Universal Account Number" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="reportingSupervisor"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Reporting Supervisor</FormLabel>
                                <FormControl>
                                  <Input placeholder="Supervisor name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    )}

                    {/* ====== Step 3: Emergency Contacts ====== */}
                    {currentStep === 3 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <CardTitle className="text-base">Emergency Contacts</CardTitle>
                              <CardDescription>At least one contact is required</CardDescription>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                appendEc({ name: '', relationship: '', phone: '', isPrimary: false })
                              }
                            >
                              <Plus className="h-3.5 w-3.5 mr-1.5" />
                              Add Contact
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {ecFields.map((field, index) => (
                            <div
                              key={field.id}
                              className="rounded-lg border p-4 space-y-3 relative"
                            >
                              {ecFields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-red-500"
                                  onClick={() => removeEc(index)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span className="sr-only">Remove contact</span>
                                </Button>
                              )}

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <FormField
                                  control={form.control}
                                  name={`emergencyContacts.${index}.name`}
                                  render={({ field: f }) => (
                                    <FormItem>
                                      <FormLabel>Name *</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Contact name" {...f} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`emergencyContacts.${index}.relationship`}
                                  render={({ field: f }) => (
                                    <FormItem>
                                      <FormLabel>Relationship *</FormLabel>
                                      <FormControl>
                                        <Input placeholder="e.g. Spouse, Father" {...f} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`emergencyContacts.${index}.phone`}
                                  render={({ field: f }) => (
                                    <FormItem>
                                      <FormLabel>Phone *</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Phone number" {...f} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <FormField
                                control={form.control}
                                name={`emergencyContacts.${index}.isPrimary`}
                                render={({ field: f }) => (
                                  <FormItem className="flex items-center gap-2 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={f.value}
                                        onCheckedChange={f.onChange}
                                      />
                                    </FormControl>
                                    <Label className="text-sm font-normal cursor-pointer">Primary contact</Label>
                                  </FormItem>
                                )}
                              />
                            </div>
                          ))}
                          {form.formState.errors.emergencyContacts?.root && (
                            <p className="text-sm text-destructive flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {form.formState.errors.emergencyContacts.root.message}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* ====== Step 4: Nominee Details ====== */}
                    {currentStep === 4 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <CardTitle className="text-base">Nominee Details</CardTitle>
                              <CardDescription>Optional — for insurance and PF nominations</CardDescription>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                appendNom({ name: '', relationship: '', idNumber: '', contactNumber: '' })
                              }
                            >
                              <Plus className="h-3.5 w-3.5 mr-1.5" />
                              Add Nominee
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {nomFields.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
                              <p className="text-sm font-medium">No nominee added</p>
                              <p className="text-xs mt-1">This step is optional. Click &quot;Add Nominee&quot; to add one.</p>
                            </div>
                          ) : (
                            nomFields.map((field, index) => (
                              <div
                                key={field.id}
                                className="rounded-lg border p-4 space-y-3 relative"
                              >
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-red-500"
                                  onClick={() => removeNom(index)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span className="sr-only">Remove nominee</span>
                                </Button>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <FormField
                                    control={form.control}
                                    name={`nominees.${index}.name`}
                                    render={({ field: f }) => (
                                      <FormItem>
                                        <FormLabel>Name *</FormLabel>
                                        <FormControl>
                                          <Input placeholder="Nominee name" {...f} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`nominees.${index}.relationship`}
                                    render={({ field: f }) => (
                                      <FormItem>
                                        <FormLabel>Relationship *</FormLabel>
                                        <FormControl>
                                          <Input placeholder="e.g. Wife, Son" {...f} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`nominees.${index}.idNumber`}
                                    render={({ field: f }) => (
                                      <FormItem>
                                        <FormLabel>ID Number</FormLabel>
                                        <FormControl>
                                          <Input placeholder="Aadhaar or other ID" {...f} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`nominees.${index}.contactNumber`}
                                    render={({ field: f }) => (
                                      <FormItem>
                                        <FormLabel>Contact Number</FormLabel>
                                        <FormControl>
                                          <Input placeholder="Phone number" {...f} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </form>
          </Form>
        )}
      </div>

      {/* ====== Wizard Footer (navigation) — sticky at bottom of dialog ====== */}
      <div className="shrink-0 px-6 py-4 border-t bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={goPrev}
            disabled={currentStep === 0 || validating || submitting}
            className="min-w-28"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {validating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>
              {currentStep + 1} of {STEPS.length}
            </span>
          </div>

          {currentStep < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={goNext}
              disabled={validating}
              className="bg-[#0d9488] hover:bg-[#0f766e] text-white min-w-28"
            >
              {validating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Next
              {!validating && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleFinalSubmit}
              disabled={submitting || validating}
              className="bg-[#0d9488] hover:bg-[#0f766e] text-white min-w-40"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Update Worker' : 'Register Worker'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- dialog wrapper (default export) ----------
export default function WorkerFormDialog() {
  const open = useNavStore((s) => s.workerFormDialogOpen)
  const editId = useNavStore((s) => s.workerFormEditId)
  const closeWorkerForm = useNavStore((s) => s.closeWorkerForm)

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) closeWorkerForm()
      }}
    >
      <DialogContent
        className="max-w-[calc(100%-1rem)] sm:max-w-3xl max-h-[90vh] w-full flex flex-col p-0 gap-0 overflow-hidden"
        showCloseButton
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>{editId ? 'Edit Worker' : 'Register New Worker'}</DialogTitle>
          <DialogDescription>
            {editId
              ? 'Update worker information'
              : 'Fill in the details step by step to register a new worker'}
          </DialogDescription>
        </DialogHeader>

        {/* Conditionally render the wizard so queries/form reset cleanly between opens.
            The key ensures a full remount whenever the target editId changes. */}
        {open && (
          <WorkerFormDialogInner
            key={editId ?? 'new'}
            editId={editId}
            onClose={closeWorkerForm}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
