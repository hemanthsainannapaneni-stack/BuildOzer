'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IdCard, Search, Eye, Users, UserCog, Building2, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import UserIdCard from '@/components/shared/user-id-card'
import { roleLabels, type UserRole } from '@/lib/auth-store'
import { TableExportButton, type ExportColumn } from '@/components/ui/table-export-button'

// ---------- types ----------
interface Worker {
  id: string
  fullName: string
  employeeNumber: string
  gender: string
  bloodGroup: string | null
  profilePhotoPath: string | null
  designation: { id: string; name: string; category: string }
  contractor: { id: string; name: string; code: string }
  site: { id: string; name: string; code: string } | null
}

interface SystemUser {
  id: string
  username: string
  fullName: string
  role: UserRole
  contractorName: string
  isActive: boolean
  lastLogin: string | null
}

interface ContractorsResponse {
  data: { id: string; name: string }[]
}

interface SitesResponse {
  data: { id: string; name: string }[]
}

// ---------- role badge colors ----------
const roleBadgeColors: Record<UserRole, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  SAFETY_OFFICER: 'bg-teal-100 text-teal-800',
  PMC: 'bg-blue-100 text-blue-800',
  HR_COORDINATOR: 'bg-purple-100 text-purple-800',
  LEGAL_ADVISOR: 'bg-amber-100 text-amber-800',
}

// ---------- export columns ----------
const workerIdCardExportColumns: ExportColumn<Worker>[] = [
  { key: 'fullName', header: 'Name' },
  { key: 'employeeNumber', header: 'Emp. No.' },
  { key: 'designation', header: 'Designation', accessor: (w) => w.designation?.name || '' },
  { key: 'contractor', header: 'Contractor', accessor: (w) => w.contractor?.name || '' },
  { key: 'site', header: 'Site', accessor: (w) => w.site?.name || '' },
]

const staffIdCardExportColumns: ExportColumn<SystemUser>[] = [
  { key: 'fullName', header: 'Name' },
  { key: 'username', header: 'Username', accessor: (u) => (u.username ? `@${u.username}` : '') },
  { key: 'role', header: 'Role', accessor: (u) => roleLabels[u.role] || u.role },
  { key: 'contractorName', header: 'Contractor' },
  { key: 'status', header: 'Status', accessor: (u) => (u.isActive ? 'Active' : 'Inactive') },
]

// ---------- Workers Tab ----------
function WorkersTab() {
  const [search, setSearch] = useState('')
  const [contractorFilter, setContractorFilter] = useState('all')
  const [siteFilter, setSiteFilter] = useState('all')
  const [cardDialog, setCardDialog] = useState<Worker | null>(null)

  const { data: workersData, isLoading } = useQuery<{ data: Worker[]; total: number }>({
    queryKey: ['workers-id-cards', search, contractorFilter, siteFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set('limit', '100')
      if (search) params.set('search', search)
      if (contractorFilter !== 'all') params.set('contractorId', contractorFilter)
      if (siteFilter !== 'all') params.set('siteId', siteFilter)
      return fetch(`/api/workers?${params}`).then((r) => r.json())
    },
  })

  const { data: contractorsData } = useQuery<ContractorsResponse>({
    queryKey: ['contractors-select'],
    queryFn: () => fetch('/api/contractors?limit=100').then((r) => r.json()),
  })

  const { data: sitesData } = useQuery<SitesResponse>({
    queryKey: ['sites-select'],
    queryFn: () => fetch('/api/sites?limit=100').then((r) => r.json()),
  })

  const workers = workersData?.data ?? []
  const contractors = contractorsData?.data ?? []
  const sites = sitesData?.data ?? []

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or employee number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={contractorFilter} onValueChange={setContractorFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Contractors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Contractors</SelectItem>
            {contractors.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={siteFilter} onValueChange={setSiteFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Sites" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sites</SelectItem>
            {sites.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <TableExportButton
          rows={workers}
          columns={workerIdCardExportColumns}
          filename="id_cards_workers"
          variant="outline"
          size="default"
          className="shrink-0"
        />
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          Showing {workers.length} worker{workers.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Workers table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-8 w-28" />
                </div>
              ))}
            </div>
          ) : workers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-base font-medium">No workers found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto max-h-[calc(100vh-12rem)] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-32">Emp. No.</TableHead>
                      <TableHead className="w-40">Designation</TableHead>
                      <TableHead>Contractor</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead className="w-32 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workers.map((worker) => (
                      <TableRow key={worker.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">{worker.fullName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">{worker.employeeNumber}</TableCell>
                        <TableCell className="text-sm">{worker.designation.name}</TableCell>
                        <TableCell className="text-sm">{worker.contractor.name}</TableCell>
                        <TableCell className="text-sm">{worker.site?.name || '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setCardDialog(worker)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View ID Card
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y">
                {workers.map((worker) => (
                  <div key={worker.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{worker.fullName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{worker.employeeNumber}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>{worker.designation.name}</span>
                      <span>{worker.contractor.name}</span>
                      <span>{worker.site?.name || '—'}</span>
                    </div>
                    <div className="pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setCardDialog(worker)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View ID Card
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ID Card Dialog */}
      <Dialog open={!!cardDialog} onOpenChange={(open) => !open && setCardDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>ID Card Preview</DialogTitle>
            <DialogDescription>
              {cardDialog?.fullName} — {cardDialog?.designation.name}
            </DialogDescription>
          </DialogHeader>
          {cardDialog && (
            <div className="flex justify-center py-4">
              <UserIdCard
                fullName={cardDialog.fullName}
                role={cardDialog.designation.name}
                contractorName={cardDialog.contractor.name}
                employeeNumber={cardDialog.employeeNumber}
                photo={cardDialog.profilePhotoPath}
                bloodGroup={cardDialog.bloodGroup ?? undefined}
                siteName={cardDialog.site?.name ?? undefined}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------- Staff Tab ----------
function StaffTab() {
  const [search, setSearch] = useState('')
  const [cardDialog, setCardDialog] = useState<SystemUser | null>(null)

  const { data, isLoading } = useQuery<{ data: SystemUser[]; total: number }>({
    queryKey: ['users-id-cards'],
    queryFn: () => fetch('/api/users').then((r) => r.json()),
  })

  const users = data?.data ?? []

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        roleLabels[u.role].toLowerCase().includes(q)
    )
  }, [users, search])

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, username, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <TableExportButton
          rows={filteredUsers}
          columns={staffIdCardExportColumns}
          filename="id_cards_staff"
          variant="outline"
          size="default"
          className="shrink-0"
        />
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredUsers.length} staff member{filteredUsers.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Staff table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-8 w-28" />
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <UserCog className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-base font-medium">No staff members found</p>
              <p className="text-sm mt-1">Try adjusting your search</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto max-h-[calc(100vh-12rem)] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-28">Username</TableHead>
                      <TableHead className="w-40">Role</TableHead>
                      <TableHead>Contractor</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-32 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">{user.fullName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">@{user.username}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeColors[user.role]}`}>
                            {roleLabels[user.role]}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{user.contractorName}</TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'default' : 'secondary'} className={user.isActive ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : ''}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setCardDialog(user)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View ID Card
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      </div>
                      <Badge variant={user.isActive ? 'default' : 'secondary'} className={user.isActive ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : ''}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeColors[user.role]}`}>
                        {roleLabels[user.role]}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">{user.contractorName}</div>
                    <div className="pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setCardDialog(user)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View ID Card
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Staff ID Card Dialog */}
      <Dialog open={!!cardDialog} onOpenChange={(open) => !open && setCardDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Staff ID Card Preview</DialogTitle>
            <DialogDescription>
              {cardDialog?.fullName} — {cardDialog ? roleLabels[cardDialog.role] : ''}
            </DialogDescription>
          </DialogHeader>
          {cardDialog && (
            <div className="flex justify-center py-4">
              <UserIdCard
                fullName={cardDialog.fullName}
                role={roleLabels[cardDialog.role]}
                contractorName={cardDialog.contractorName === 'All Contractors' ? 'Clove Technologies' : cardDialog.contractorName}
                employeeNumber={cardDialog.username}
                siteName={cardDialog.role === 'ADMIN' ? 'All Sites' : undefined}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------- Main Component ----------
export default function IdCardsView() {
  const [activeTab, setActiveTab] = useState('workers')

  const { data: workersData } = useQuery<{ data: Worker[]; total: number }>({
    queryKey: ['workers-count'],
    queryFn: () => fetch('/api/workers?limit=1').then((r) => r.json()),
  })

  const { data: usersData } = useQuery<{ data: SystemUser[]; total: number }>({
    queryKey: ['users-count'],
    queryFn: () => fetch('/api/users').then((r) => r.json()),
  })

  const workerCount = workersData?.total ?? 0
  const staffCount = usersData?.data?.length ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ID Cards</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and download identity cards for workers and staff.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card
          className="cursor-pointer transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99] bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent border-teal-200/60"
          onClick={() => setActiveTab('workers')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Workers</p>
                <p className="text-2xl font-bold tracking-tight mt-1">{workerCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Field workforce</p>
              </div>
              <div className="rounded-xl p-2.5 shrink-0 bg-teal-500/15 text-teal-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99] bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-200/60"
          onClick={() => setActiveTab('staff')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Staff</p>
                <p className="text-2xl font-bold tracking-tight mt-1">{staffCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">System users</p>
              </div>
              <div className="rounded-xl p-2.5 shrink-0 bg-amber-500/15 text-amber-600">
                <IdCard className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="workers" className="gap-2">
            <Users className="h-4 w-4" />
            Workers
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2">
            <UserCog className="h-4 w-4" />
            Staff
          </TabsTrigger>
        </TabsList>
        <TabsContent value="workers" className="mt-4">
          <WorkersTab />
        </TabsContent>
        <TabsContent value="staff" className="mt-4">
          <StaffTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
