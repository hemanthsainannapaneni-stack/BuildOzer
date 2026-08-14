'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, Plus, MessageSquare, ChevronDown, ChevronUp, Clock, AlertTriangle, CheckCircle2, ArrowUpRight, ShieldAlert, X, Camera } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAuthStore, rolePermissions } from '@/lib/auth-store'
import { StatusBadge } from '@/components/shared/status-badge'
import PhotoUploader from '@/components/shared/photo-uploader'
import { format, differenceInDays, parseISO } from 'date-fns'
import { TableExportButton, type ExportColumn } from '@/components/ui/table-export-button'

// ---------- types ----------
interface Grievance {
  id: string
  grievanceNumber: string
  dateRaised: string
  raisedBy: string | null
  raisedByName: string | null
  category: string
  isPOSH: boolean
  description: string
  severity: string
  assignedTo: string | null
  status: string
  resolutionDetails: string | null
  resolutionDate: string | null
  closedBy: string | null
  photos: string | null
  slaDays: number
  createdAt: string
}

interface GrievancesResponse {
  data: Grievance[]
  total: number
  page: number
  limit: number
}

// ---------- helpers ----------
const categoryBadge: Record<string, string> = {
  Wage: 'bg-teal-100 text-teal-800 border-teal-200',
  Safety: 'bg-amber-100 text-amber-800 border-amber-200',
  Harassment: 'bg-red-100 text-red-800 border-red-200',
  Facility: 'bg-teal-100 text-teal-800 border-teal-200',
  Other: 'bg-slate-100 text-slate-700 border-slate-200',
}

const severityClass: Record<string, string> = {
  Low: 'bg-slate-100 text-slate-700 border-slate-200',
  Medium: 'bg-amber-100 text-amber-800 border-amber-200',
  High: 'bg-amber-100 text-amber-800 border-amber-200',
  Critical: 'bg-red-100 text-red-800 border-red-300',
}

function getSLAInfo(dateRaised: string, slaDays: number) {
  const daysElapsed = differenceInDays(new Date(), parseISO(dateRaised))
  const remaining = slaDays - daysElapsed
  return { daysElapsed, remaining, breached: remaining < 0 }
}

// ---------- main ----------
export default function GrievanceView() {
  const role = useAuthStore((s) => s.role)
  const perms = rolePermissions[role]
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('')
  const [severity, setSeverity] = useState('')
  const [status, setStatus] = useState('')
  const [poshOnly, setPoshOnly] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const hasActiveFilter = !!(search || category || severity || status || poshOnly)
  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setCategory('')
    setSeverity('')
    setStatus('')
    setPoshOnly(false)
  }

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formCategory, setFormCategory] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formSeverity, setFormSeverity] = useState('Medium')
  const [formRaisedByName, setFormRaisedByName] = useState('')
  const [formAnonymous, setFormAnonymous] = useState(false)
  const [formIsPOSH, setFormIsPOSH] = useState(false)
  const [formAssignedTo, setFormAssignedTo] = useState('')
  const [formPhotos, setFormPhotos] = useState<string[]>([])

  // Resolve/Escalate
  const [actionId, setActionId] = useState<string | null>(null)
  const [actionType, setActionType] = useState('')
  const [resolutionText, setResolutionText] = useState('')

  const handleSearchChange = (value: string) => {
    setSearch(value)
    const t = setTimeout(() => setDebouncedSearch(value), 300)
    return () => clearTimeout(t)
  }

  const queryParams = new URLSearchParams()
  if (debouncedSearch) queryParams.set('search', debouncedSearch)
  if (category) queryParams.set('category', category)
  if (severity) queryParams.set('severity', severity)
  if (status) queryParams.set('status', status)
  queryParams.set('limit', '100')

  const { data, isLoading } = useQuery<GrievancesResponse>({
    queryKey: ['grievances', debouncedSearch, category, severity, status],
    queryFn: () => fetch(`/api/grievances?${queryParams.toString()}`).then((r) => r.json()),
  })

  const grievances = useMemo(() => {
    let list = data?.data ?? []
    if (poshOnly) list = list.filter((g) => g.isPOSH)
    return list
  }, [data?.data, poshOnly])

  const total = data?.total ?? 0
  const openCount = grievances.filter((g) => g.status === 'Open').length
  const progressCount = grievances.filter((g) => g.status === 'InProgress').length
  const resolvedCount = grievances.filter((g) => g.status === 'Resolved').length
  const escalatedCount = grievances.filter((g) => g.status === 'Escalated').length

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch('/api/grievances', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => {
      toast.success('Grievance raised successfully')
      queryClient.invalidateQueries({ queryKey: ['grievances'] })
      setDialogOpen(false)
      setFormCategory(''); setFormDescription(''); setFormSeverity('Medium')
      setFormRaisedByName(''); setFormAnonymous(false); setFormIsPOSH(false); setFormAssignedTo('')
      setFormPhotos([])
    },
    onError: () => toast.error('Failed to raise grievance'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      fetch(`/api/grievances/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => {
      toast.success('Grievance updated')
      queryClient.invalidateQueries({ queryKey: ['grievances'] })
      setActionId(null); setActionType(''); setResolutionText('')
    },
    onError: () => toast.error('Failed to update grievance'),
  })

  const handleCreate = () => {
    if (!formCategory || !formDescription) {
      toast.error('Category and Description are required')
      return
    }
    createMutation.mutate({
      category: formCategory,
      description: formDescription,
      severity: formSeverity,
      raisedByName: formAnonymous ? null : (formRaisedByName || null),
      isPOSH: formIsPOSH,
      assignedTo: formAssignedTo || null,
      photoPaths: formPhotos.length > 0 ? JSON.stringify(formPhotos) : null,
      photos: formPhotos.length > 0 ? JSON.stringify(formPhotos) : null,
    })
  }

  const handleAction = (id: string, type: string) => {
    const body: Record<string, unknown> = { status: type }
    if (type === 'Resolved' && resolutionText) body.resolutionDetails = resolutionText
    if (type === 'InProgress' && resolutionText) body.resolutionDetails = resolutionText
    updateMutation.mutate({ id, body })
  }

  // ---------- export columns ----------
  const exportColumns: ExportColumn<Grievance>[] = [
    { key: 'grievanceNumber', header: 'Grievance No.' },
    { key: 'isPOSH', header: 'POSH', accessor: (r) => (r.isPOSH ? 'Yes' : 'No') },
    { key: 'category', header: 'Category' },
    { key: 'severity', header: 'Severity' },
    { key: 'status', header: 'Status' },
    { key: 'description', header: 'Description' },
    { key: 'raisedByName', header: 'Raised By', accessor: (r) => r.raisedByName || 'Anonymous' },
    {
      key: 'dateRaised',
      header: 'Date Raised',
      accessor: (r) => format(parseISO(r.dateRaised), 'dd MMM yyyy'),
    },
    { key: 'assignedTo', header: 'Assigned To', accessor: (r) => r.assignedTo || 'Unassigned' },
    { key: 'slaDays', header: 'SLA (Days)' },
    {
      key: 'resolutionDate',
      header: 'Resolution Date',
      accessor: (r) => (r.resolutionDate ? format(parseISO(r.resolutionDate), 'dd MMM yyyy') : ''),
    },
    { key: 'resolutionDetails', header: 'Resolution Details', accessor: (r) => r.resolutionDetails || '' },
  ]

  return (
    <div className="space-y-6">
      {/* ====== Header ====== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grievance Redressal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? 'Loading...' : `${total} grievance${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TableExportButton
            rows={grievances}
            columns={exportColumns}
            filename="grievances"
            variant="outline"
            size="default"
          />
          {perms.canEdit && (
            <Button className="bg-[#0d9488] hover:bg-[#0f766e] text-white" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Raise Grievance
            </Button>
          )}
        </div>
      </div>

      {/* ====== Summary Cards ====== */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: total, icon: MessageSquare, valueColor: 'text-teal-700', bg: 'bg-teal-50 text-teal-700 border-teal-200', iconStyle: 'bg-teal-100 text-teal-600' },
            { label: 'Open', value: openCount, icon: AlertTriangle, valueColor: 'text-emerald-700', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', iconStyle: 'bg-emerald-100 text-emerald-600' },
            { label: 'In Progress', value: progressCount, icon: Clock, valueColor: 'text-amber-700', bg: 'bg-amber-50 text-amber-700 border-amber-200', iconStyle: 'bg-amber-100 text-amber-600' },
            { label: 'Resolved', value: resolvedCount, icon: CheckCircle2, valueColor: 'text-slate-700', bg: 'bg-slate-50 text-slate-700 border-slate-200', iconStyle: 'bg-slate-100 text-slate-600' },
            { label: 'Escalated', value: escalatedCount, icon: ArrowUpRight, valueColor: 'text-rose-700', bg: 'bg-rose-50 text-rose-700 border-rose-200', iconStyle: 'bg-rose-100 text-rose-600' },
          ].map((c) => (
            <Card key={c.label} className={`${c.bg} transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99]`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">{c.label}</p>
                    <p className={`text-xl font-bold tracking-tight mt-1 ${c.valueColor}`}>{c.value}</p>
                  </div>
                  <div className={`rounded-xl p-2 shrink-0 ${c.iconStyle}`}>
                    <c.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ====== Filters ====== */}
      <Card className="py-0">
        <CardContent className="px-3 py-2">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by number, description, or name..." value={search} onChange={(e) => handleSearchChange(e.target.value)} className="pl-9" />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Wage">Wage</SelectItem>
                <SelectItem value="Safety">Safety</SelectItem>
                <SelectItem value="Harassment">Harassment</SelectItem>
                <SelectItem value="Facility">Facility</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="InProgress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox checked={poshOnly} onCheckedChange={(v) => setPoshOnly(!!v)} id="posh-toggle" />
              <Label htmlFor="posh-toggle" className="text-sm whitespace-nowrap cursor-pointer">POSH Only</Label>
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

      {/* ====== List ====== */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : grievances.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-base font-medium">No grievances found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          grievances.map((g) => {
            const sla = getSLAInfo(g.dateRaised, g.slaDays)
            const isExpanded = expandedId === g.id
            const isActioning = actionId === g.id

            return (
              <Card key={g.id} className={`overflow-hidden transition-colors ${g.isPOSH ? 'border-purple-200' : ''}`}>
                <CardContent className="p-0">
                  {/* Summary Row */}
                  <div
                    className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : g.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium">{g.grievanceNumber}</span>
                        {g.isPOSH && <Badge className="bg-purple-100 text-purple-800 border-purple-200">POSH</Badge>}
                        <Badge variant="outline" className={categoryBadge[g.category] || ''}>{g.category}</Badge>
                        <StatusBadge status={g.status} />
                        {sla.breached && (
                          <Badge className="bg-red-100 text-red-700 border-red-200">SLA BREACHED</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{g.description}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        <span>Raised: {g.raisedByName || 'Anonymous'}</span>
                        <span>{format(parseISO(g.dateRaised), 'dd MMM yyyy')}</span>
                        <Badge variant="outline" className={severityClass[g.severity] || ''}>{g.severity}</Badge>
                        {!sla.breached ? (
                          <span className={sla.remaining <= 2 ? 'text-amber-600 font-medium' : ''}>
                            ⏱ {sla.remaining} day{sla.remaining !== 1 ? 's' : ''} remaining
                          </span>
                        ) : (
                          <span className="text-red-600 font-medium">⏱ {Math.abs(sla.remaining)} days overdue</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 mt-1">
                      {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="border-t px-4 py-4 bg-muted/20 space-y-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Full Description</p>
                        <p className="text-sm whitespace-pre-wrap">{g.description}</p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div><p className="text-xs text-muted-foreground">Category</p><p className="font-medium mt-0.5">{g.category}</p></div>
                        <div><p className="text-xs text-muted-foreground">Raised By</p><p className="font-medium mt-0.5">{g.raisedByName || 'Anonymous'}</p></div>
                        <div><p className="text-xs text-muted-foreground">Assigned To</p><p className="font-medium mt-0.5">{g.assignedTo || 'Unassigned'}</p></div>
                        <div><p className="text-xs text-muted-foreground">SLA</p><p className={`font-medium mt-0.5 ${sla.breached ? 'text-red-600' : ''}`}>{g.slaDays} days{sla.breached ? ' (BREACHED)' : ''}</p></div>
                      </div>

                      {g.resolutionDetails && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Resolution Details</p>
                          <p className="text-sm whitespace-pre-wrap bg-emerald-50 rounded-lg p-3 border border-emerald-100">{g.resolutionDetails}</p>
                        </div>
                      )}
                      {g.resolutionDate && (
                        <p className="text-xs text-muted-foreground">Resolved on: {format(parseISO(g.resolutionDate), 'dd MMM yyyy')}</p>
                      )}

                      {g.photos && (() => {
                        try {
                          const gPhotos = JSON.parse(g.photos) as string[]
                          if (gPhotos.length === 0) return null
                          return (
                            <div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                                <Camera className="h-3 w-3" />
                                <span>Evidence Photos ({gPhotos.length})</span>
                              </div>
                              <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                                {gPhotos.map((photo, idx) => (
                                  <div key={idx} className="aspect-square rounded-md overflow-hidden border bg-muted">
                                    <img src={photo} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        } catch { return null }
                      })()}

                      {/* Actions for editors */}
                      {perms.canEdit && g.status !== 'Resolved' && (
                        <>
                          <Separator />
                          {isActioning ? (
                            <div className="space-y-3">
                              <Textarea
                                placeholder={actionType === 'Resolved' ? 'Resolution details...' : 'Notes (optional)...'}
                                value={resolutionText}
                                onChange={(e) => setResolutionText(e.target.value)}
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <Button size="sm" className="bg-[#0d9488] hover:bg-[#0f766e] text-white" onClick={() => handleAction(g.id, actionType)}>
                                  Confirm {actionType === 'Resolved' ? 'Resolution' : actionType === 'Escalated' ? 'Escalation' : 'Update'}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => { setActionId(null); setResolutionText('') }}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {g.status === 'Open' && (
                                <Button size="sm" variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => { setActionId(g.id); setActionType('InProgress') }}>
                                  Start Investigation
                                </Button>
                              )}
                              <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => { setActionId(g.id); setActionType('Resolved') }}>
                                Mark Resolved
                              </Button>
                              <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => { setActionId(g.id); setActionType('Escalated') }}>
                                Escalate
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* ====== Raise Grievance Dialog ====== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Raise Grievance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Category *</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Wage">Wage</SelectItem>
                  <SelectItem value="Safety">Safety</SelectItem>
                  <SelectItem value="Harassment">Harassment</SelectItem>
                  <SelectItem value="Facility">Facility</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea className="mt-1" rows={4} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Describe the grievance in detail..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Severity</Label>
                <Select value={formSeverity} onValueChange={setFormSeverity}>
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
                <Label>Assigned To</Label>
                <Select value={formAssignedTo} onValueChange={setFormAssignedTo}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SafetyOfficer">Safety Officer</SelectItem>
                    <SelectItem value="PMC">PMC</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox checked={formAnonymous} onCheckedChange={(v) => setFormAnonymous(!!v)} id="anonymous" />
                <Label htmlFor="anonymous" className="cursor-pointer text-sm">Anonymous</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={formIsPOSH} onCheckedChange={(v) => setFormIsPOSH(!!v)} id="posh" />
                <Label htmlFor="posh" className="cursor-pointer text-sm">POSH Case</Label>
              </div>
            </div>
            {formIsPOSH && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">POSH (Prevention of Sexual Harassment) cases are treated with strict confidentiality. Only authorized personnel will have access to these records.</p>
              </div>
            )}
            {!formAnonymous && (
              <div>
                <Label>Raised By (Name)</Label>
                <Input className="mt-1" value={formRaisedByName} onChange={(e) => setFormRaisedByName(e.target.value)} placeholder="Worker name" />
              </div>
            )}
            <PhotoUploader photos={formPhotos} onPhotosChange={setFormPhotos} maxPhotos={5} label="Grievance Photos" />
            <div className="flex gap-2 pt-2">
              <Button className="bg-[#0d9488] hover:bg-[#0f766e] text-white" disabled={createMutation.isPending} onClick={handleCreate}>
                {createMutation.isPending ? 'Submitting...' : 'Submit Grievance'}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
