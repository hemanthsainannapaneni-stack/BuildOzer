'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Loader2, HeartPulse, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
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
const FITNESS_STATUSES = ['Fit', 'Unfit', 'FitWithRestriction', 'Pending'] as const
const SKILL_LEVELS = ['Skilled', 'SemiSkilled', 'Unskilled'] as const

const FITNESS_LABELS: Record<string, string> = {
  Fit: 'Fit',
  Unfit: 'Unfit',
  FitWithRestriction: 'Fit with Restriction',
  Pending: 'Pending',
}

// ---------- schema ----------
const fitnessSchema = z.object({
  fitnessStatus: z.string().min(1, 'Fitness status is required'),
  fitnessValidityDate: z.string().optional(),
  totalExperienceYears: z.coerce.number().min(0).default(0),
  relevantExperienceYears: z.coerce.number().min(0).default(0),
  relevantExperienceDesc: z.string().optional(),
  priorEmployer: z.string().optional(),
  skillLevel: z.string().min(1, 'Skill level is required'),
})

type FitnessFormValues = z.infer<typeof fitnessSchema>

// ---------- types ----------
interface FitnessData {
  id: string
  fitnessStatus: string
  fitnessValidityDate: string | null
  totalExperienceYears: number
  relevantExperienceYears: number
  relevantExperienceDesc: string | null
  priorEmployer: string | null
  skillLevel: string
}

// ---------- main ----------
export default function WorkerFitnessView() {
  const { pageParams, goBack } = useNavStore()
  const workerId = pageParams.id as string
  const queryClient = useQueryClient()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<FitnessFormValues>({
    resolver: zodResolver(fitnessSchema),
    defaultValues: {
      fitnessStatus: 'Pending',
      fitnessValidityDate: '',
      totalExperienceYears: 0,
      relevantExperienceYears: 0,
      relevantExperienceDesc: '',
      priorEmployer: '',
      skillLevel: 'Unskilled',
    },
  })

  // Fetch existing fitness
  const { data, isLoading } = useQuery<{ data: FitnessData | null }>({
    queryKey: ['worker-fitness', workerId],
    queryFn: () => fetch(`/api/workers/${workerId}/fitness`).then((r) => r.json()),
    enabled: !!workerId,
  })

  // Populate form
  useEffect(() => {
    if (data?.data) {
      const f = data.data
      form.reset({
        fitnessStatus: f.fitnessStatus ?? 'Pending',
        fitnessValidityDate: f.fitnessValidityDate?.slice(0, 10) ?? '',
        totalExperienceYears: f.totalExperienceYears ?? 0,
        relevantExperienceYears: f.relevantExperienceYears ?? 0,
        relevantExperienceDesc: f.relevantExperienceDesc ?? '',
        priorEmployer: f.priorEmployer ?? '',
        skillLevel: f.skillLevel ?? 'Unskilled',
      })
    }
  }, [data, form])

  const mutation = useMutation({
    mutationFn: async (values: FitnessFormValues) => {
      const res = await fetch(`/api/workers/${workerId}/fitness`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to save fitness record')
      return result
    },
    onSuccess: () => {
      toast.success('Fitness & experience record saved successfully')
      queryClient.invalidateQueries({ queryKey: ['worker-fitness', workerId] })
      queryClient.invalidateQueries({ queryKey: ['worker', workerId] })
      goBack()
    },
    onError: (err) => {
      toast.error(err.message || 'Something went wrong')
    },
    onSettled: () => {
      setSubmitting(false)
    },
  })

  const onSubmit = (values: FitnessFormValues) => {
    setSubmitting(true)
    mutation.mutate(values)
  }

  if (!workerId) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>No worker ID provided</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-6 w-52" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ====== Header ====== */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="shrink-0" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fitness & Experience</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Record worker fitness status and work experience
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* ====== Fitness Status & Certificate ====== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-[#0d9488]" />
                Fitness Assessment
              </CardTitle>
              <CardDescription>
                Current fitness status and certificate validity
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fitnessStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fitness Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FITNESS_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {FITNESS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fitnessValidityDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certificate Validity Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ====== Experience Details ====== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Experience Details</CardTitle>
              <CardDescription>
                Total and relevant field experience in years
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="totalExperienceYears"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Experience (years)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="e.g. 10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="relevantExperienceYears"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relevant Field Experience (years)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="e.g. 5"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="relevantExperienceDesc"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Relevant Experience Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe relevant work experience, skills used, etc."
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
                name="priorEmployer"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Prior Employer / Site</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Previous employer name or site"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ====== Skill Level ====== */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Skill Classification</CardTitle>
              <CardDescription>
                Classify the worker's skill level for wage categorization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="skillLevel"
                render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel>Skill Level *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select skill level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SKILL_LEVELS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s === 'SemiSkilled' ? 'Semi-Skilled' : s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ====== Submit ====== */}
          <div className="flex items-center gap-3 pb-4">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#0d9488] hover:bg-[#0f766e] text-white min-w-40"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Fitness Record
            </Button>
            <Button type="button" variant="outline" onClick={goBack}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
