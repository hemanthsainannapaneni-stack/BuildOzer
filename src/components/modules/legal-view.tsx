'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Search, Plus, Scale, CheckCircle2, AlertTriangle, XCircle,
  Clock, FileCheck, Edit2, Trash2, ShieldAlert, X, FileSpreadsheet,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
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
import { StatusBadge } from '@/components/shared/status-badge'
import { TablePagination } from '@/components/shared/table-pagination'
import { format, differenceInDays, parseISO } from 'date-fns'
import { TableExportButton, type ExportColumn } from '@/components/ui/table-export-button'

// ---------- types ----------
interface LegalCompliance {
  id: string
  contractorId: string
  contractor: { id: string; name: string; code: string }
  complianceType: string
  licenseNumber: string | null
  issuingAuthority: string | null
  issueDate: string | null
  expiryDate: string | null
  renewalReminderDays: number
  status: string
  remarks: string | null
  createdAt: string
}

interface LegalListResponse {
  data: LegalCompliance[]
  total: number
  page: number
  limit: number
}

// ---------- helpers ----------
const typeLabels: Record<string, string> = {
  LabourLicense: 'Labour License',
  BOCW: 'BOCW Registration',
  ContractLabour: 'Contract Labour (R&A) Act',
  StatutoryRegister: 'Statutory Register',
}

const typeBadge: Record<string, string> = {
  LabourLicense: 'bg-teal-100 text-teal-800 border-teal-200',
  BOCW: 'bg-teal-100 text-teal-800 border-teal-200',
  ContractLabour: 'bg-purple-100 text-purple-800 border-purple-200',
  StatutoryRegister: 'bg-slate-100 text-slate-700 border-slate-200',
}

function getExpiryInfo(expiryDate: string | null) {
  if (!expiryDate) return { daysLeft: Infinity, isExpired: false, isExpiring: false }
  const daysLeft = differenceInDays(parseISO(expiryDate), new Date())
  return { daysLeft, isExpired: daysLeft < 0, isExpiring: daysLeft >= 0 && daysLeft < 60 }
}

// ---------- main ----------
export default function LegalView() {
  const role = useAuthStore((s) => s.role)
  const perms = rolePermissions[role]
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [complianceType, setComplianceType] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  const hasActiveFilter = !!(search || complianceType || statusFilter)
  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setComplianceType('')
    setStatusFilter('')
    setPage(1)
  }

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  // Form
  const [formType, setFormType] = useState('')
  const [formContractor, setFormContractor] = useState('')
  const [formLicenseNo, setFormLicenseNo] = useState('')
  const [formAuthority, setFormAuthority] = useState('')
  const [formIssueDate, setFormIssueDate] = useState('')
  const [formExpiryDate, setFormExpiryDate] = useState('')
  const [formReminderDays, setFormReminderDays] = useState('30')
  const [formRemarks, setFormRemarks] = useState('')

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
    const t = setTimeout(() => setDebouncedSearch(value), 300)
    return () => clearTimeout(t)
  }

  // Build query params
  const queryParams = new URLSearchParams()
  if (debouncedSearch) queryParams.set('search', debouncedSearch)
  if (complianceType) queryParams.set('complianceType', complianceType)
  if (statusFilter) queryParams.set('status', statusFilter)
  queryParams.set('limit', '100')

  // Fetch legal records
  const { data, isLoading } = useQuery<LegalListResponse>({
    queryKey: ['legal', debouncedSearch, complianceType, statusFilter],
    queryFn: () => fetch(`/api/legal?${queryParams.toString()}`).then((r) => r.json()),
  })

  // Fetch contractors for dropdown
  const { data: contractorsData } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['contractors'],
    queryFn: () => fetch('/api/contractors').then((r) => r.json()),
  })

  const records = data?.data ?? []
  const total = data?.total ?? 0

  const { sorted, sortKey, sortDir, toggleSort } = useSort(records as (LegalCompliance & Record<string, unknown>)[])
  const sortedData = sorted
  const totalPages = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE))
  const pagedData = sortedData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Summary stats
  const validCount = useMemo(() => records.filter((r) => r.status === 'Valid').length, [records])
  const expiringCount = useMemo(() => records.filter((r) => r.status === 'ExpiringSoon' || (r.expiryDate && getExpiryInfo(r.expiryDate).isExpiring && r.status === 'Valid')).length, [records])
  const expiredCount = useMemo(() => records.filter((r) => r.status === 'Expired' || (r.expiryDate && getExpiryInfo(r.expiryDate).isExpired)).length, [records])

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: ({ body, method, id }: { body: Record<string, unknown>; method: string; id?: string }) => {
      const url = id ? `/api/legal/${id}` : '/api/legal'
      return fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json())
    },
    onSuccess: () => {
      toast.success(editId ? 'Compliance record updated' : 'Compliance record added')
      queryClient.invalidateQueries({ queryKey: ['legal'] })
      setDialogOpen(false)
      resetForm()
      setEditId(null)
    },
    onError: () => toast.error('Failed to save compliance record'),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/legal/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      toast.success('Record deleted')
      queryClient.invalidateQueries({ queryKey: ['legal'] })
    },
    onError: () => toast.error('Failed to delete record'),
  })

  const resetForm = () => {
    setFormType('')
    setFormContractor('')
    setFormLicenseNo('')
    setFormAuthority('')
    setFormIssueDate('')
    setFormExpiryDate('')
    setFormReminderDays('30')
    setFormRemarks('')
  }

  const openEdit = (record: LegalCompliance) => {
    setEditId(record.id)
    setFormType(record.complianceType)
    setFormContractor(record.contractorId)
    setFormLicenseNo(record.licenseNumber || '')
    setFormAuthority(record.issuingAuthority || '')
    setFormIssueDate(record.issueDate ? format(parseISO(record.issueDate), 'yyyy-MM-dd') : '')
    setFormExpiryDate(record.expiryDate ? format(parseISO(record.expiryDate), 'yyyy-MM-dd') : '')
    setFormReminderDays(String(record.renewalReminderDays))
    setFormRemarks(record.remarks || '')
    setDialogOpen(true)
  }

  const openCreate = () => {
    resetForm()
    setEditId(null)
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!formType) {
      toast.error('Compliance Type is required')
      return
    }

    const body: Record<string, unknown> = {
      complianceType: formType,
      contractorId: formContractor || null,
      licenseNumber: formLicenseNo || null,
      issuingAuthority: formAuthority || null,
      issueDate: formIssueDate ? new Date(formIssueDate).toISOString() : null,
      expiryDate: formExpiryDate ? new Date(formExpiryDate).toISOString() : null,
      renewalReminderDays: parseInt(formReminderDays) || 30,
      remarks: formRemarks || null,
    }

    if (editId) {
      saveMutation.mutate({ body, method: 'PUT', id: editId })
    } else {
      saveMutation.mutate({ body, method: 'POST' })
    }
  }

  // ---------- export columns ----------
  const exportColumns: ExportColumn<LegalCompliance>[] = [
    {
      key: 'complianceType',
      header: 'Type',
      accessor: (r) => typeLabels[r.complianceType] || r.complianceType,
    },
    { key: 'licenseNumber', header: 'License Number', accessor: (r) => r.licenseNumber || '' },
    { key: 'issuingAuthority', header: 'Issuing Authority', accessor: (r) => r.issuingAuthority || '' },
    {
      key: 'issueDate',
      header: 'Issue Date',
      accessor: (r) => (r.issueDate ? format(parseISO(r.issueDate), 'dd MMM yyyy') : ''),
    },
    {
      key: 'expiryDate',
      header: 'Expiry Date',
      accessor: (r) => (r.expiryDate ? format(parseISO(r.expiryDate), 'dd MMM yyyy') : ''),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (r) => {
        const expiry = getExpiryInfo(r.expiryDate)
        if (expiry.isExpired) return 'Expired'
        if (expiry.isExpiring) return 'Expiring Soon'
        return r.status === 'ExpiringSoon' ? 'Expiring Soon' : r.status
      },
    },
    {
      key: 'renewalReminder',
      header: 'Renewal Reminder',
      accessor: (r) => {
        if (!r.expiryDate) return ''
        const expiry = getExpiryInfo(r.expiryDate)
        return expiry.isExpired
          ? `${Math.abs(expiry.daysLeft)} days overdue`
          : `${expiry.daysLeft} days`
      },
    },
  ]
  if (role === 'ADMIN') {
    exportColumns.push({
      key: 'contractor',
      header: 'Contractor',
      accessor: (r) => r.contractor?.name || '',
    })
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-6rem)] overflow-hidden">
      {/* ====== Header ====== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Legal & Statutory Compliance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? 'Loading...' : `${total} record${total !== 1 ? 's' : ''} tracked`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TableExportButton
            rows={sortedData as LegalCompliance[]}
            columns={exportColumns}
            filename="legal_cases"
            variant="outline"
            size="default"
          />
          {perms.canEdit && (
            <>
              <Button
                variant="outline"
                onClick={() => toast.info('Import legal compliance records — coming soon')}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Import</span>
              </Button>
              <Button className="bg-[#0d9488] hover:bg-[#0f766e] text-white" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Compliance
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ====== Summary Cards ====== */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          {[
            { label: 'Total Records', value: total, icon: Scale, valueColor: 'text-teal-700', bg: 'bg-teal-50 text-teal-700 border-teal-200', iconStyle: 'bg-teal-100 text-teal-600' },
            { label: 'Valid', value: validCount, icon: CheckCircle2, valueColor: 'text-emerald-700', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', iconStyle: 'bg-emerald-100 text-emerald-600' },
            { label: 'Expiring Soon', value: expiringCount, icon: Clock, valueColor: 'text-amber-700', bg: 'bg-amber-50 text-amber-700 border-amber-200', iconStyle: 'bg-amber-100 text-amber-600' },
            { label: 'Expired', value: expiredCount, icon: XCircle, valueColor: 'text-rose-700', bg: 'bg-rose-50 text-rose-700 border-rose-200', iconStyle: 'bg-rose-100 text-rose-600' },
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
      <Card className="py-0 shrink-0">
        <CardContent className="px-3 py-2">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by license number, authority..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={complianceType} onValueChange={(v) => { setComplianceType(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Compliance Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LabourLicense">Labour License</SelectItem>
                <SelectItem value="BOCW">BOCW Registration</SelectItem>
                <SelectItem value="ContractLabour">Contract Labour (R&A) Act</SelectItem>
                <SelectItem value="StatutoryRegister">Statutory Register</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Valid">Valid</SelectItem>
                <SelectItem value="ExpiringSoon">Expiring Soon</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
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
        </CardContent>
      </Card>

      {/* ====== Table ====== */}
      {isLoading ? (
        <div className="flex-1 min-h-0 flex items-start justify-center pt-8">
          <div className="space-y-3 w-full max-w-3xl px-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        </div>
      ) : sortedData.length === 0 ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-muted-foreground">
          <FileCheck className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-base font-medium">No compliance records found</p>
          <p className="text-sm mt-1">Add records to start tracking</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto flex-1 min-h-0">
            <Card className="flex-1 min-h-0">
              <CardContent className="p-0 overflow-hidden">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead className="w-12">S.No</TableHead>
                      <SortableHeader column="complianceType" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Type</SortableHeader>
                      <SortableHeader column="licenseNumber" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>License Number</SortableHeader>
                      <TableHead>Issuing Authority</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <SortableHeader column="expiryDate" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Expiry Date</SortableHeader>
                      <SortableHeader column="status" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort}>Status</SortableHeader>
                      <TableHead>Renewal Reminder</TableHead>
                      <TableHead>Actions</TableHead>
                      {role === 'ADMIN' && <TableHead>Contractor</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedData.map((r, index) => {
                      const expiry = getExpiryInfo(r.expiryDate)
                      const isWarning = expiry.isExpiring || expiry.isExpired

                      return (
                        <TableRow key={r.id} className={isWarning ? 'bg-amber-50/50' : ''}>
                          <TableCell className="text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + index + 1}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={typeBadge[r.complianceType] || ''}>
                              {typeLabels[r.complianceType] || r.complianceType}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{r.licenseNumber || '—'}</TableCell>
                          <TableCell className="text-sm">{r.issuingAuthority || '—'}</TableCell>
                          <TableCell className="text-sm">
                            {r.issueDate ? format(parseISO(r.issueDate), 'dd MMM yyyy') : '—'}
                          </TableCell>
                          <TableCell>
                            {r.expiryDate ? (
                              <div className="flex items-center gap-1.5">
                                {expiry.isExpired && <AlertTriangle className="h-3 w-3 text-red-600" />}
                                <span className={`text-sm ${expiry.isExpired ? 'text-red-600 font-medium' : expiry.isExpiring ? 'text-amber-600 font-medium' : ''}`}>
                                  {format(parseISO(r.expiryDate), 'dd MMM yyyy')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              status={expiry.isExpired ? 'Expired' : expiry.isExpiring ? 'ExpiringSoon' : r.status}
                            />
                          </TableCell>
                          <TableCell>
                            <span className={`text-sm ${expiry.daysLeft <= 7 && expiry.daysLeft > 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                              {r.expiryDate
                                ? expiry.isExpired
                                  ? `${Math.abs(expiry.daysLeft)} days overdue`
                                  : `${expiry.daysLeft} days`
                                : '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {perms.canEdit && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {perms.canEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-500 hover:text-red-700"
                                  onClick={() => deleteMutation.mutate(r.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          {role === 'ADMIN' && (
                            <TableCell className="text-sm">{r.contractor?.name || '—'}</TableCell>
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden flex-1 min-h-0 overflow-y-auto space-y-3">
            {pagedData.map((r) => {
              const expiry = getExpiryInfo(r.expiryDate)
              const isWarning = expiry.isExpiring || expiry.isExpired

              return (
                <Card key={r.id} className={isWarning ? 'border-amber-200' : ''}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={typeBadge[r.complianceType] || ''}>
                          {typeLabels[r.complianceType] || r.complianceType}
                        </Badge>
                        <StatusBadge
                          status={expiry.isExpired ? 'Expired' : expiry.isExpiring ? 'ExpiringSoon' : r.status}
                        />
                        {expiry.isExpired && (
                          <Badge className="bg-red-100 text-red-700 border-red-200">OVERDUE</Badge>
                        )}
                      </div>
                      {perms.canEdit && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => openEdit(r)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">License Number</p>
                        <p className="font-mono font-medium mt-0.5">{r.licenseNumber || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Authority</p>
                        <p className="mt-0.5">{r.issuingAuthority || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Issue Date</p>
                        <p className="mt-0.5">{r.issueDate ? format(parseISO(r.issueDate), 'dd MMM yyyy') : '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Expiry Date</p>
                        <p className={`mt-0.5 font-medium ${expiry.isExpired ? 'text-red-600' : expiry.isExpiring ? 'text-amber-600' : ''}`}>
                          {r.expiryDate ? format(parseISO(r.expiryDate), 'dd MMM yyyy') : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                      <span>
                        {r.expiryDate
                          ? expiry.isExpired
                            ? `${Math.abs(expiry.daysLeft)} days overdue`
                            : `${expiry.daysLeft} days remaining`
                          : 'No expiry set'}
                      </span>
                      <span>Reminder: {r.renewalReminderDays} days</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <TablePagination page={page} totalPages={totalPages} total={sortedData.length} onPageChange={setPage} pageSize={PAGE_SIZE} />
        </div>
      )}

      {/* ====== Add/Edit Dialog ====== */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) { resetForm(); setEditId(null) }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Compliance Record' : 'Add Compliance Record'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Compliance Type *</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LabourLicense">Labour License</SelectItem>
                    <SelectItem value="BOCW">BOCW Registration</SelectItem>
                    <SelectItem value="ContractLabour">Contract Labour (R&A) Act</SelectItem>
                    <SelectItem value="StatutoryRegister">Statutory Register</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contractor</Label>
                <Select value={formContractor} onValueChange={setFormContractor}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select contractor" /></SelectTrigger>
                  <SelectContent>
                    {contractorsData?.data?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>License Number</Label>
                <Input className="mt-1" value={formLicenseNo} onChange={(e) => setFormLicenseNo(e.target.value)} placeholder="e.g. LAB-2025-001" />
              </div>
              <div>
                <Label>Issuing Authority</Label>
                <Input className="mt-1" value={formAuthority} onChange={(e) => setFormAuthority(e.target.value)} placeholder="e.g. Labour Department" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Issue Date</Label>
                <Input type="date" className="mt-1" value={formIssueDate} onChange={(e) => setFormIssueDate(e.target.value)} />
              </div>
              <div>
                <Label>Expiry Date</Label>
                <Input type="date" className="mt-1" value={formExpiryDate} onChange={(e) => setFormExpiryDate(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Renewal Reminder (Days Before Expiry)</Label>
              <Input type="number" className="mt-1 max-w-32" value={formReminderDays} onChange={(e) => setFormReminderDays(e.target.value)} min="1" max="365" />
            </div>

            <div>
              <Label>Remarks</Label>
              <Textarea className="mt-1" rows={2} value={formRemarks} onChange={(e) => setFormRemarks(e.target.value)} placeholder="Additional notes..." />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
                disabled={saveMutation.isPending}
                onClick={handleSave}
              >
                {saveMutation.isPending ? 'Saving...' : editId ? 'Update Record' : 'Add Record'}
              </Button>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); setEditId(null) }}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
