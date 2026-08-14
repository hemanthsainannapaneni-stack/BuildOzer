'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, MapPin, ChevronDown, ChevronRight, Building2, Users,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { TableExportButton, type ExportColumn } from '@/components/ui/table-export-button'

// ==================== TYPES ====================

interface Contractor {
  id: string
  name: string
  code: string
  gstNumber?: string | null
  address?: string | null
  phone?: string | null
  isActive: boolean
}

interface Site {
  id: string
  name: string
  code: string
  address?: string | null
  contractorId?: string | null
  contractor: { id: string; name: string; code: string } | null
  isActive: boolean
}

interface LabourCamp {
  id: string
  name: string
  contractorId: string
  siteId: string
  address?: string | null
  capacity?: number | null
  currentOccupancy?: number | null
  contractor: { id: string; name: string }
  site: { id: string; name: string }
  isActive: boolean
}

interface DeleteTarget {
  type: 'contractor' | 'site' | 'camp'
  id: string
  name: string
}

// ==================== EXPORT COLUMNS ====================

const siteExportColumns = (campCounts: Record<string, number>): ExportColumn<Site>[] => [
  { key: 'sno', header: 'S.No', accessor: (_r, idx) => idx + 1 },
  { key: 'name', header: 'Project Name' },
  { key: 'code', header: 'Code' },
  { key: 'contractor', header: 'Contractor', accessor: (s) => s.contractor?.name || '—' },
  { key: 'camps', header: 'Labour Camps', accessor: (s) => campCounts[s.id] || 0 },
  { key: 'status', header: 'Status', accessor: (s) => (s.isActive ? 'Active' : 'Inactive') },
]

const campExportColumns: ExportColumn<LabourCamp>[] = [
  { key: 'name', header: 'Camp Name' },
  { key: 'address', header: 'Address', accessor: (c) => c.address || '—' },
  { key: 'capacity', header: 'Capacity', accessor: (c) => (c.capacity ?? '—') },
  { key: 'occupancy', header: 'Occupancy', accessor: (c) => (c.currentOccupancy ?? '—') },
]

// ==================== MAIN COMPONENT ====================

export function LocationsTab({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const queryClient = useQueryClient()

  // Dialog states
  const [contractorDialogOpen, setContractorDialogOpen] = useState(false)
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null)

  const [siteDialogOpen, setSiteDialogOpen] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)

  const [campDialogOpen, setCampDialogOpen] = useState(false)
  const [editingCamp, setEditingCamp] = useState<LabourCamp | null>(null)
  const [campSiteId, setCampSiteId] = useState<string>('')
  const [campContractorId, setCampContractorId] = useState<string>('')

  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  // ---- Data Fetching ----

  const { data: contractors = [], isLoading: contractorsLoading } = useQuery<Contractor[]>({
    queryKey: ['contractors'],
    queryFn: () => fetch('/api/contractors').then(r => r.json()),
  })

  const { data: sites = [], isLoading: sitesLoading } = useQuery<Site[]>({
    queryKey: ['locations-sites'],
    queryFn: () => fetch('/api/sites').then(r => r.json()),
  })

  const { data: allCamps = [] } = useQuery<LabourCamp[]>({
    queryKey: ['labour-camps-all'],
    queryFn: () => fetch('/api/labour-camps').then(r => r.json()),
  })

  const { data: camps = [], isLoading: campsLoading } = useQuery<LabourCamp[]>({
    queryKey: ['labour-camps', selectedSiteId],
    queryFn: () => selectedSiteId ? fetch(`/api/labour-camps?siteId=${selectedSiteId}`).then(r => r.json()) : [],
    enabled: !!selectedSiteId,
  })

  // Compute camp counts per site
  const campCounts: Record<string, number> = {}
  for (const camp of allCamps) {
    campCounts[camp.siteId] = (campCounts[camp.siteId] || 0) + 1
  }

  const selectedSite = sites.find(s => s.id === selectedSiteId)

  // ---- Helpers ----

  const handleOpenContractorDialog = (contractor: Contractor | null = null) => {
    setEditingContractor(contractor)
    setContractorDialogOpen(true)
  }

  const handleOpenSiteDialog = (site: Site | null = null) => {
    setEditingSite(site)
    setSiteDialogOpen(true)
  }

  const handleOpenCampDialog = (camp: LabourCamp | null = null, siteId: string, contractorId: string) => {
    setEditingCamp(camp)
    setCampSiteId(siteId)
    setCampContractorId(contractorId)
    setCampDialogOpen(true)
  }

  // ---- Delete mutation ----

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      const endpoint = type === 'contractor' ? '/api/contractors' : type === 'site' ? '/api/sites' : '/api/labour-camps'
      const res = await fetch(`${endpoint}?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Failed to delete ${type}`)
      return res.json()
    },
    onSuccess: () => {
      toast.success('Deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['contractors'] })
      queryClient.invalidateQueries({ queryKey: ['locations-sites'] })
      queryClient.invalidateQueries({ queryKey: ['labour-camps'] })
      queryClient.invalidateQueries({ queryKey: ['labour-camps-all'] })
      setDeleteTarget(null)
    },
    onError: () => {
      toast.error('Failed to delete')
    },
  })

  // ---- Render ----

  const isLoading = contractorsLoading || sitesLoading

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      {!hideHeader && (
        <div className="shrink-0 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Locations</h2>
          <div className="flex items-center gap-2">
            <TableExportButton
              rows={sites}
              columns={siteExportColumns(campCounts)}
              filename="sites"
              variant="outline"
              size="sm"
            />
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleOpenContractorDialog()}>
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              Add Contractor
            </Button>
            <Button size="sm" className="h-8 text-xs bg-[#0d9488] hover:bg-[#0f766e] text-white" onClick={() => handleOpenSiteDialog()}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Location
            </Button>
          </div>
        </div>
      )}
      {hideHeader && (
        <div className="shrink-0 flex items-center justify-end gap-2">
          <TableExportButton
            rows={sites}
            columns={siteExportColumns(campCounts)}
            filename="sites"
            variant="outline"
            size="sm"
          />
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleOpenContractorDialog()}>
            <Building2 className="h-3.5 w-3.5 mr-1.5" />
            Add Contractor
          </Button>
          <Button size="sm" className="h-8 text-xs bg-[#0d9488] hover:bg-[#0f766e] text-white" onClick={() => handleOpenSiteDialog()}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Location
          </Button>
        </div>
      )}

      {/* Sites Table */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : sites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <MapPin className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">No locations found</p>
              <p className="text-xs mt-1">Add your first location to get started</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow className="h-8">
                      <TableHead className="w-10 text-xs py-1.5 px-2.5">S.No</TableHead>
                      <TableHead className="text-xs py-1.5 px-2.5">Project Name</TableHead>
                      <TableHead className="text-xs py-1.5 px-2.5 w-24">Code</TableHead>
                      <TableHead className="text-xs py-1.5 px-2.5">Contractor</TableHead>
                      <TableHead className="text-xs py-1.5 px-2.5 w-28">Labour Camps</TableHead>
                      <TableHead className="text-xs py-1.5 px-2.5 w-20">Status</TableHead>
                      <TableHead className="text-xs py-1.5 px-2.5 w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sites.map((site, index) => (
                      <TableRow
                        key={site.id}
                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedSiteId(selectedSiteId === site.id ? null : site.id)}
                      >
                        <TableCell className="text-xs text-muted-foreground py-1.5 px-2.5">
                          {selectedSiteId === site.id ? (
                            <ChevronDown className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-medium py-1.5 px-2.5">{site.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-1.5 px-2.5 font-mono">{site.code}</TableCell>
                        <TableCell className="text-xs py-1.5 px-2.5">{site.contractor?.name || '—'}</TableCell>
                        <TableCell className="text-xs py-1.5 px-2.5">
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {campCounts[site.id] || 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs py-1.5 px-2.5">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            site.isActive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {site.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs py-1.5 px-2.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleOpenSiteDialog(site)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => setDeleteTarget({ type: 'site', id: site.id, name: site.name })}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y">
                {sites.map((site) => (
                  <div
                    key={site.id}
                    className="p-3 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedSiteId(selectedSiteId === site.id ? null : site.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{site.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{site.code}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); handleOpenSiteDialog(site) }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'site', id: site.id, name: site.name }) }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{site.contractor?.name || 'No contractor'}</span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />{campCounts[site.id] || 0} camps
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        site.isActive
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {site.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Labour Camps Sub-Section */}
      {selectedSiteId && selectedSite && (
        <div className="shrink-0 border rounded-lg bg-muted/30">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold">Labour Camps — {selectedSite.name}</span>
              <span className="text-xs text-muted-foreground">({camps.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <TableExportButton
                rows={camps}
                columns={campExportColumns}
                filename="camps"
                variant="outline"
                size="sm"
              />
              <Button
                size="sm"
                className="h-6 text-xs bg-[#0d9488] hover:bg-[#0f766e] text-white px-2"
                onClick={() => handleOpenCampDialog(null, selectedSiteId, selectedSite.contractorId || '')}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Camp
              </Button>
            </div>
          </div>
          {campsLoading ? (
            <div className="p-3 space-y-2">
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-full" />
            </div>
          ) : camps.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No labour camps for this location. Click "Add Camp" to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop camps table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow className="h-8">
                      <TableHead className="text-xs py-1.5 px-2.5">Camp Name</TableHead>
                      <TableHead className="text-xs py-1.5 px-2.5">Address</TableHead>
                      <TableHead className="text-xs py-1.5 px-2.5 w-20">Capacity</TableHead>
                      <TableHead className="text-xs py-1.5 px-2.5 w-20">Occupancy</TableHead>
                      <TableHead className="text-xs py-1.5 px-2.5 w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {camps.map((camp) => (
                      <TableRow key={camp.id} className="hover:bg-muted/50">
                        <TableCell className="text-xs font-medium py-1.5 px-2.5">{camp.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-1.5 px-2.5 max-w-[200px] truncate">{camp.address || '—'}</TableCell>
                        <TableCell className="text-xs py-1.5 px-2.5">{camp.capacity ?? '—'}</TableCell>
                        <TableCell className="text-xs py-1.5 px-2.5">{camp.currentOccupancy ?? '—'}</TableCell>
                        <TableCell className="text-xs py-1.5 px-2.5">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleOpenCampDialog(camp, camp.siteId, camp.contractorId)}>
                              <Pencil className="h-2.5 w-2.5" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => setDeleteTarget({ type: 'camp', id: camp.id, name: camp.name })}
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile camps cards */}
              <div className="sm:hidden divide-y">
                {camps.map((camp) => (
                  <div key={camp.id} className="p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium">{camp.name}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleOpenCampDialog(camp, camp.siteId, camp.contractorId)}>
                          <Pencil className="h-2.5 w-2.5" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => setDeleteTarget({ type: 'camp', id: camp.id, name: camp.name })}
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {camp.address && <span className="truncate max-w-[180px]">{camp.address}</span>}
                      {camp.capacity != null && <span>Capacity: {camp.capacity}</span>}
                      {camp.currentOccupancy != null && <span>Occupancy: {camp.currentOccupancy}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- Dialogs ---- */}

      <ContractorFormDialog
        open={contractorDialogOpen}
        onOpenChange={(open) => { setContractorDialogOpen(open); if (!open) setEditingContractor(null) }}
        editingContractor={editingContractor}
      />

      <SiteFormDialog
        open={siteDialogOpen}
        onOpenChange={(open) => { setSiteDialogOpen(open); if (!open) setEditingSite(null) }}
        editingSite={editingSite}
        contractors={contractors}
      />

      {campDialogOpen && (
        <CampFormDialog
          open={campDialogOpen}
          onOpenChange={(open) => { setCampDialogOpen(open); if (!open) { setEditingCamp(null); setCampSiteId(''); setCampContractorId('') } }}
          editingCamp={editingCamp}
          siteId={campSiteId}
          contractorId={campContractorId}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === 'contractor' ? 'Contractor' : deleteTarget?.type === 'site' ? 'Location' : 'Labour Camp'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteTarget && deleteMutation.mutate({ type: deleteTarget.type, id: deleteTarget.id })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ==================== CONTRACTOR FORM DIALOG ====================

function ContractorFormDialog({
  open,
  onOpenChange,
  editingContractor,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingContractor: Contractor | null
}) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [gstNumber, setGstNumber] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')

  const isEdit = !!editingContractor
  const queryClient = useQueryClient()

  const handleOpenChange = (val: boolean) => {
    if (val && editingContractor) {
      setName(editingContractor.name)
      setCode(editingContractor.code)
      setGstNumber(editingContractor.gstNumber || '')
      setAddress(editingContractor.address || '')
      setPhone(editingContractor.phone || '')
    } else if (val) {
      setName('')
      setCode('')
      setGstNumber('')
      setAddress('')
      setPhone('')
    }
    onOpenChange(val)
  }

  const mutation = useMutation({
    mutationFn: async (body: { name: string; code: string; gstNumber?: string; address?: string; phone?: string }) => {
      if (isEdit && editingContractor) {
        const res = await fetch('/api/contractors', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingContractor.id, ...body }),
        })
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to update contractor') }
        return res.json()
      }
      const res = await fetch('/api/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to create contractor') }
      return res.json()
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Contractor updated' : 'Contractor created')
      queryClient.invalidateQueries({ queryKey: ['contractors'] })
      queryClient.invalidateQueries({ queryKey: ['locations-sites'] })
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Operation failed')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code.trim()) {
      toast.error('Name and Code are required')
      return
    }
    mutation.mutate({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      gstNumber: gstNumber.trim() || undefined,
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Contractor' : 'Add Contractor'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update contractor details.' : 'Create a new contractor.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="c-name" className="text-xs">Name *</Label>
            <Input id="c-name" placeholder="Contractor name" value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-code" className="text-xs">Code *</Label>
            <Input id="c-code" placeholder="e.g. ABC" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="h-8 text-sm font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-gst" className="text-xs">GST Number</Label>
            <Input id="c-gst" placeholder="Optional" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-addr" className="text-xs">Address</Label>
            <Input id="c-addr" placeholder="Optional" value={address} onChange={(e) => setAddress(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-phone" className="text-xs">Phone</Label>
            <Input id="c-phone" placeholder="Optional" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 text-sm" />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-[#0d9488] hover:bg-[#0f766e] text-white" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ==================== SITE FORM DIALOG ====================

function SiteFormDialog({
  open,
  onOpenChange,
  editingSite,
  contractors,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingSite: Site | null
  contractors: Contractor[]
}) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [address, setAddress] = useState('')
  const [contractorId, setContractorId] = useState<string>('')

  const isEdit = !!editingSite
  const queryClient = useQueryClient()

  const handleOpenChange = (val: boolean) => {
    if (val && editingSite) {
      setName(editingSite.name)
      setCode(editingSite.code)
      setAddress(editingSite.address || '')
      setContractorId(editingSite.contractorId || '')
    } else if (val) {
      setName('')
      setCode('')
      setAddress('')
      setContractorId('')
    }
    onOpenChange(val)
  }

  const mutation = useMutation({
    mutationFn: async (body: { name: string; code: string; address?: string; contractorId?: string }) => {
      if (isEdit && editingSite) {
        const res = await fetch('/api/sites', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingSite.id, ...body }),
        })
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to update site') }
        return res.json()
      }
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to create site') }
      return res.json()
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Location updated' : 'Location created')
      queryClient.invalidateQueries({ queryKey: ['locations-sites'] })
      queryClient.invalidateQueries({ queryKey: ['labour-camps-all'] })
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Operation failed')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code.trim()) {
      toast.error('Project Name and Code are required')
      return
    }
    mutation.mutate({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      address: address.trim() || undefined,
      contractorId: contractorId || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Location' : 'Add Location'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update location details.' : 'Create a new project location.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="s-name" className="text-xs">Project Name *</Label>
            <Input id="s-name" placeholder="e.g. Tower A Construction" value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-code" className="text-xs">Code *</Label>
            <Input id="s-code" placeholder="e.g. TWR-A" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="h-8 text-sm font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Contractor</Label>
            <Select value={contractorId} onValueChange={setContractorId}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select contractor" /></SelectTrigger>
              <SelectContent>
                {contractors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-addr" className="text-xs">Address</Label>
            <Input id="s-addr" placeholder="Optional" value={address} onChange={(e) => setAddress(e.target.value)} className="h-8 text-sm" />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-[#0d9488] hover:bg-[#0f766e] text-white" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ==================== LABOUR CAMP FORM DIALOG ====================

function CampFormDialog({
  open,
  onOpenChange,
  editingCamp,
  siteId,
  contractorId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingCamp: LabourCamp | null
  siteId: string
  contractorId: string
}) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [capacity, setCapacity] = useState('')

  const isEdit = !!editingCamp
  const queryClient = useQueryClient()

  const handleOpenChange = (val: boolean) => {
    if (val && editingCamp) {
      setName(editingCamp.name)
      setAddress(editingCamp.address || '')
      setCapacity(editingCamp.capacity != null ? String(editingCamp.capacity) : '')
    } else if (val) {
      setName('')
      setAddress('')
      setCapacity('')
    }
    onOpenChange(val)
  }

  const mutation = useMutation({
    mutationFn: async (body: { name: string; contractorId: string; siteId: string; address?: string; capacity?: number }) => {
      if (isEdit && editingCamp) {
        const res = await fetch('/api/labour-camps', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingCamp.id, name: body.name, address: body.address, capacity: body.capacity }),
        })
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to update camp') }
        return res.json()
      }
      const res = await fetch('/api/labour-camps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to create camp') }
      return res.json()
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Camp updated' : 'Camp created')
      queryClient.invalidateQueries({ queryKey: ['labour-camps'] })
      queryClient.invalidateQueries({ queryKey: ['labour-camps-all'] })
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Operation failed')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Camp Name is required')
      return
    }
    const body = {
      name: name.trim(),
      contractorId,
      siteId,
      address: address.trim() || undefined,
      capacity: capacity ? Number(capacity) : undefined,
    }
    mutation.mutate(body as Parameters<typeof mutation.mutate>[0])
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Labour Camp' : 'Add Labour Camp'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update camp details.' : 'Create a new labour camp for this location.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="lc-name" className="text-xs">Camp Name *</Label>
            <Input id="lc-name" placeholder="e.g. Camp Block A" value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lc-addr" className="text-xs">Address</Label>
            <Input id="lc-addr" placeholder="Optional" value={address} onChange={(e) => setAddress(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lc-cap" className="text-xs">Capacity</Label>
            <Input id="lc-cap" type="number" min="0" placeholder="Optional" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="h-8 text-sm" />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-[#0d9488] hover:bg-[#0f766e] text-white" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
