'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import {
  Users,
  Shield,
  Plus,
  Pencil,
  Power,
  PowerOff,
  ShieldCheck,
  Trash2,
  Lock,
  GitBranch,
  ClipboardList,
  GripVertical,
  X,
  Loader2,
  Info,
  Database,
  Globe,
  
  AlertTriangle,
  ArrowRight,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAuthStore, roleLabels, rolePermissions, type UserRole } from '@/lib/auth-store'
import { useSort } from '@/lib/use-sort'
import { SortableHeader } from '@/components/shared/sortable-header'
import { TableExportButton, type ExportColumn } from '@/components/ui/table-export-button'


// ==================== TYPES ====================

interface SystemUser {
  id: string
  username: string
  fullName: string
  role: UserRole
  contractorName: string
  contractorId?: string | null
  isActive: boolean
  lastLogin: string | null
}

interface UsersResponse {
  data: SystemUser[]
  total: number
}

interface AuditLogEntry {
  id: string
  userName: string | null
  action: string
  entity: string
  entityId: string | null
  field: string | null
  oldValue: string | null
  newValue: string | null
  timestamp: string
}

interface AuditLogsResponse {
  data: AuditLogEntry[]
  total: number
}

interface WorkflowStep {
  id: string
  name: string
}

interface WorkflowConfig {
  key: string
  label: string
  description: string
  icon: React.ReactNode
  steps: WorkflowStep[]
}

// ==================== CONSTANTS ====================

const ALL_MODULES = [
  'dashboard', 'workers', 'medical', 'training', 'attendance',
  'incidents', 'grievance', 'vehicles', 'hazardous', 'legal',
  'compliance', 'settings', 'reports',
] as const

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Overview',
  workers: 'Workers',
  medical: 'Medical',
  training: 'Training',
  attendance: 'Attendance',
  incidents: 'Incidents',
  grievance: 'Grievance',
  vehicles: 'Vehicles',
  hazardous: 'Hazardous',
  legal: 'Legal',
  compliance: 'Compliance',
  settings: 'Settings',
  reports: 'Reports',
}

const ALL_ROLES: UserRole[] = ['ADMIN', 'SAFETY_OFFICER', 'PMC', 'HR_COORDINATOR', 'LEGAL_ADVISOR']

const ENTITY_OPTIONS = ['SystemUser', 'Worker', 'MedicalRecord', 'TrainingRecord', 'Incident', 'Grievance', 'Vehicle', 'HazardousMaterial']

// ==================== HELPERS ====================

const roleBadgeColors: Record<UserRole, string> = {
  ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  SAFETY_OFFICER: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  PMC: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  HR_COORDINATOR: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  LEGAL_ADVISOR: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeColors[role]}`}>
      {roleLabels[role]}
    </span>
  )
}

function ActiveStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function ActionBadge({ action }: { action: string }) {
  if (action === 'DELETE') {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800">
        DELETE
      </span>
    )
  }
  if (action === 'UPDATE') {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
        UPDATE
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
      CREATE
    </span>
  )
}

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

// ==================== EXPORT COLUMNS ====================

const userExportColumns: ExportColumn<SystemUser>[] = [
  { key: 'sno', header: 'S.No', accessor: (_r, idx) => idx + 1 },
  { key: 'fullName', header: 'Name' },
  { key: 'username', header: 'Username', accessor: (u) => `@${u.username}` },
  { key: 'role', header: 'Role', accessor: (u) => roleLabels[u.role] },
  { key: 'contractorName', header: 'Contractor' },
  { key: 'isActive', header: 'Status', accessor: (u) => (u.isActive ? 'Active' : 'Inactive') },
  { key: 'lastLogin', header: 'Last Login', accessor: (u) => (u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '—') },
]

const auditExportColumns: ExportColumn<AuditLogEntry>[] = [
  { key: 'sno', header: 'S.No', accessor: (_r, idx) => idx + 1 },
  { key: 'timestamp', header: 'Timestamp', accessor: (l) => formatDistanceToNow(new Date(l.timestamp), { addSuffix: true }) },
  { key: 'userName', header: 'User', accessor: (l) => l.userName || 'System' },
  { key: 'action', header: 'Action' },
  { key: 'entity', header: 'Entity', accessor: (l) => l.entity + (l.entityId ? ` #${l.entityId.substring(0, 8)}` : '') },
  { key: 'details', header: 'Details', accessor: (l) => {
    if (l.action === 'DELETE') return l.oldValue || '—'
    if (l.oldValue && l.newValue) return `${l.oldValue} → ${l.newValue}`
    return l.field || l.oldValue || l.newValue || '—'
  } },
]

type AccessRow = Record<string, string | number>
const accessExportColumns: ExportColumn<AccessRow>[] = [
  { key: 'module', header: 'Module' },
  ...ALL_ROLES.map((r) => ({ key: r, header: roleLabels[r] })),
]

// ==================== ANIMATION ====================

const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
}

// ==================== SKELETON ====================

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  )
}

// ==================== USER FORM DIALOG ====================

interface UserFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingUser: SystemUser | null
  contractors: string[]
  sites: { id: string; name: string }[]
}

function UserFormDialog({ open, onOpenChange, editingUser, contractors, sites }: UserFormProps) {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<UserRole>('SAFETY_OFFICER')
  const [contractorName, setContractorName] = useState('All Contractors')
  const [siteId, setSiteId] = useState<string>('')

  const isEdit = !!editingUser

  const handleOpenChange = (val: boolean) => {
    if (val && editingUser) {
      setFullName(editingUser.fullName)
      setUsername(editingUser.username)
      setRole(editingUser.role)
      setContractorName(editingUser.contractorName)
      setSiteId(editingUser.contractorId ?? '')
    } else if (val) {
      setFullName('')
      setUsername('')
      setRole('SAFETY_OFFICER')
      setContractorName('All Contractors')
      setSiteId('')
    }
    onOpenChange(val)
  }

  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (body: { fullName: string; username: string; role: string; contractorName: string; siteId?: string }) => {
      if (isEdit && editingUser) {
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('Failed to update user')
        return res.json()
      }
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create user')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(isEdit ? 'User updated successfully' : 'User created successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
    },
    onError: (err) => {
      toast.error(err.message || (isEdit ? 'Failed to update user' : 'Failed to create user'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !username.trim()) {
      toast.error('Please fill in all required fields')
      return
    }
    mutation.mutate({ fullName: fullName.trim(), username: username.trim(), role, contractorName, siteId: role === 'PMC' ? siteId : undefined })
  }

  const showSiteSelector = role === 'PMC'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit User' : 'Add New User'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update user details and permissions.' : 'Create a new system user with access permissions.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input id="fullName" placeholder="Enter full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input id="username" placeholder="Enter username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={isEdit} />
          </div>
          <div className="space-y-2">
            <Label>Role *</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>
                {Object.entries(roleLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Contractor</Label>
            <Select value={contractorName} onValueChange={setContractorName}>
              <SelectTrigger><SelectValue placeholder="Select contractor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All Contractors">All Contractors</SelectItem>
                {contractors.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showSiteSelector && (
            <div className="space-y-2">
              <Label>Site *</Label>
              <Select value={siteId} onValueChange={setSiteId}>
                <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#0d9488] hover:bg-[#0f766e] text-white" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ==================== TAB 1: USER MANAGEMENT ====================

function UserManagementTab() {
  const { userName, role: authRole } = useAuthStore()
  const isAdmin = authRole === 'ADMIN'

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SystemUser | null>(null)

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then((r) => r.json()),
  })

  const { data: contractorsData } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['contractors-select'],
    queryFn: () => fetch('/api/contractors?limit=100').then((r) => r.json()),
  })

  const { data: sitesData } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['sites-select'],
    queryFn: () => fetch('/api/sites?limit=100').then((r) => r.json()),
  })

  const contractorNames = (contractorsData?.data ?? []).map((c) => c.name)
  const sites = sitesData?.data ?? []
  const users = data?.data ?? []
  const queryClient = useQueryClient()
  const { sorted: sortedUsers, sortKey: userSortKey, sortDir: userSortDir, toggleSort: userToggleSort } = useSort(users as (SystemUser & Record<string, unknown>)[])

  const handleEdit = (user: SystemUser) => {
    setEditingUser(user)
    setDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingUser(null)
    setDialogOpen(true)
  }

  const toggleMutation = useMutation({
    mutationFn: async (user: SystemUser) => {
      const res = await fetch(`/api/users/${user.id}?deletedBy=${encodeURIComponent(userName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      })
      if (!res.ok) throw new Error('Failed to toggle user status')
      return res.json()
    },
    onSuccess: (_data, user) => {
      toast.success(`${user.fullName} is now ${user.isActive ? 'inactive' : 'active'}`)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
    },
    onError: () => { toast.error('Failed to toggle user status') },
  })

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/users/${userId}?deletedBy=${encodeURIComponent(userName)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete user')
      return res.json()
    },
    onSuccess: () => {
      toast.success('User deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
      setDeleteTarget(null)
    },
    onError: () => { toast.error('Failed to delete user') },
  })

  const activeCount = users.filter((u) => u.isActive).length
  const inactiveCount = users.length - activeCount

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent border-teal-200/60 dark:border-teal-700/40 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99] backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Total Users</p>
                  <p className="text-xl font-bold tracking-tight mt-1">{users.length}</p>
                </div>
                <div className="rounded-xl p-2 shrink-0 bg-teal-500/15 text-teal-600 dark:text-teal-400">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-200/60 dark:border-emerald-700/40 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99] backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Active</p>
                  <p className="text-xl font-bold tracking-tight mt-1 text-emerald-600">{activeCount}</p>
                </div>
                <div className="rounded-xl p-2 shrink-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border-red-200/60 dark:border-red-700/40 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99] backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Inactive</p>
                  <p className="text-xl font-bold tracking-tight mt-1 text-red-600">{inactiveCount}</p>
                </div>
                <div className="rounded-xl p-2 shrink-0 bg-red-500/15 text-red-600 dark:text-red-400">
                  <PowerOff className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">All Users</h2>
        <div className="flex items-center gap-2">
          <TableExportButton
            rows={sortedUsers as SystemUser[]}
            columns={userExportColumns}
            filename="users"
            variant="outline"
            size="default"
          />
          {isAdmin && (
            <Button className="bg-[#0d9488] hover:bg-[#0f766e] text-white" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />Add User
            </Button>
          )}
        </div>
      </div>

      {/* Users Table / Cards */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4"><TableSkeleton /></div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-base font-medium">No users found</p>
              <p className="text-sm mt-1">Start by adding a new user</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto max-h-[calc(100vh-12rem)] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead className="w-12">S.No</TableHead>
                      <SortableHeader column="fullName" sortKey={userSortKey} sortDir={userSortDir} onToggle={userToggleSort}>Name</SortableHeader>
                      <SortableHeader column="username" sortKey={userSortKey} sortDir={userSortDir} onToggle={userToggleSort} className="w-32">Username</SortableHeader>
                      <SortableHeader column="role" sortKey={userSortKey} sortDir={userSortDir} onToggle={userToggleSort} className="w-40">Role</SortableHeader>
                      <TableHead>Contractor</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-40">Last Login</TableHead>
                      {isAdmin && <TableHead className="w-36">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedUsers.map((user, index) => (
                      <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="text-muted-foreground text-xs">{index + 1}</TableCell>
                        <TableCell className="font-medium">{user.fullName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">@{user.username}</TableCell>
                        <TableCell><RoleBadge role={user.role} /></TableCell>
                        <TableCell className="text-sm">{user.contractorName}</TableCell>
                        <TableCell><ActiveStatusBadge active={user.isActive} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.lastLogin ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true }) : '—'}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(user)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="sm"
                                className={`h-8 w-8 p-0 ${user.isActive ? 'text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
                                onClick={() => toggleMutation.mutate(user)}
                                disabled={toggleMutation.isPending}
                              >
                                {user.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                              </Button>
                              <Button
                                variant="ghost" size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => setDeleteTarget(user)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y">
                {users.map((user) => (
                  <div key={user.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      </div>
                      <ActiveStatusBadge active={user.isActive} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <RoleBadge role={user.role} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>{user.contractorName}</span>
                      <span>Last login: {user.lastLogin ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true }) : '—'}</span>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2 pt-1">
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleEdit(user)}>
                          <Pencil className="h-3 w-3 mr-1" />Edit
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          className={`h-8 text-xs ${user.isActive ? 'text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800'}`}
                          onClick={() => toggleMutation.mutate(user)}
                          disabled={toggleMutation.isPending}
                        >
                          {user.isActive ? <PowerOff className="h-3 w-3 mr-1" /> : <Power className="h-3 w-3 mr-1" />}
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800"
                          onClick={() => setDeleteTarget(user)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />Delete
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      {isAdmin && (
        <UserFormDialog
          open={dialogOpen}
          onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingUser(null) }}
          editingUser={editingUser}
          contractors={contractorNames}
          sites={sites}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.fullName}</strong> (@{deleteTarget?.username})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ==================== TAB 2: ACCESS MANAGEMENT ====================

function AccessManagementTab() {
  const { role: authRole } = useAuthStore()
  const isAdmin = authRole === 'ADMIN'

  // Build local permission state from rolePermissions
  const [permissions, setPermissions] = useState<Record<UserRole, string[]>>(() => {
    const p: Record<string, string[]> = {}
    for (const r of ALL_ROLES) {
      p[r] = [...(rolePermissions[r]?.modules ?? [])]
    }
    return p as Record<UserRole, string[]>
  })

  const toggleModule = (role: UserRole, mod: string) => {
    setPermissions((prev) => {
      const current = prev[role]
      const hasModule = current.includes(mod)
      return {
        ...prev,
        [role]: hasModule ? current.filter((m) => m !== mod) : [...current, mod],
      }
    })
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Lock className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Access Restricted</p>
          <p className="text-sm mt-1">Only administrators can manage access permissions.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-teal-600" />
                Module Access by Role
              </CardTitle>
              <CardDescription>Toggle module access for each role. Changes are saved automatically.</CardDescription>
            </div>
            <TableExportButton
              rows={ALL_MODULES.map((mod) => {
                const row: AccessRow = { module: MODULE_LABELS[mod] || mod }
                for (const r of ALL_ROLES) {
                  row[r] = permissions[r].includes(mod) ? 'Yes' : 'No'
                }
                return row
              })}
              columns={accessExportColumns}
              filename="module_access"
              variant="outline"
              size="sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto max-h-[calc(100vh-12rem)] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="w-40 sticky left-0 bg-background z-10">Module</TableHead>
                  {ALL_ROLES.map((r) => (
                    <TableHead key={r} className="text-center min-w-[100px]">
                      <RoleBadge role={r} />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ALL_MODULES.map((mod) => (
                  <TableRow key={mod} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-sm sticky left-0 bg-background z-10">
                      {MODULE_LABELS[mod] || mod}
                    </TableCell>
                    {ALL_ROLES.map((r) => (
                      <TableCell key={`${r}-${mod}`} className="text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={permissions[r].includes(mod)}
                            onCheckedChange={() => toggleModule(r, mod)}
                          />
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y">
            {ALL_ROLES.map((r) => (
              <div key={r} className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <RoleBadge role={r} />
                  <span className="text-xs text-muted-foreground">{permissions[r].length} modules</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALL_MODULES.map((mod) => (
                    <button
                      key={`${r}-${mod}`}
                      type="button"
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                        permissions[r].includes(mod)
                          ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800'
                          : 'bg-muted text-muted-foreground border-muted'
                      }`}
                      onClick={() => toggleModule(r, mod)}
                    >
                      {MODULE_LABELS[mod] || mod}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ==================== TAB 3: WORKFLOW MANAGEMENT ====================

function WorkflowManagementTab() {
  const [workflows, setWorkflows] = useState<WorkflowConfig[]>([
    {
      key: 'incident',
      label: 'Incident Workflow',
      description: 'Status progression for incident reports',
      icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
      steps: [
        { id: 's1', name: 'Open' },
        { id: 's2', name: 'Under Investigation' },
        { id: 's3', name: 'Closed' },
      ],
    },
    {
      key: 'grievance',
      label: 'Grievance Workflow',
      description: 'Status progression for grievance complaints',
      icon: <ClipboardList className="h-4 w-4 text-amber-500" />,
      steps: [
        { id: 'g1', name: 'Open' },
        { id: 'g2', name: 'In Progress' },
        { id: 'g3', name: 'Resolved' },
      ],
    },
    {
      key: 'training',
      label: 'Training Approval Workflow',
      description: 'Approval stages for training records',
      icon: <FileText className="h-4 w-4 text-teal-500" />,
      steps: [
        { id: 't1', name: 'Pending Approval' },
        { id: 't2', name: 'Approved' },
        { id: 't3', name: 'Completed' },
      ],
    },
  ])

  const [editingStep, setEditingStep] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newStepInput, setNewStepInput] = useState<Record<string, string>>({})

  const addStep = (workflowKey: string) => {
    const name = newStepInput[workflowKey]?.trim()
    if (!name) {
      toast.error('Please enter a step name')
      return
    }
    setWorkflows((prev) =>
      prev.map((w) =>
        w.key === workflowKey
          ? { ...w, steps: [...w.steps, { id: generateId(), name }] }
          : w,
      ),
    )
    setNewStepInput((prev) => ({ ...prev, [workflowKey]: '' }))
    toast.success('Step added')
  }

  const renameStep = (workflowKey: string, stepId: string) => {
    if (!editValue.trim()) return
    setWorkflows((prev) =>
      prev.map((w) =>
        w.key === workflowKey
          ? { ...w, steps: w.steps.map((s) => (s.id === stepId ? { ...s, name: editValue.trim() } : s)) }
          : w,
      ),
    )
    setEditingStep(null)
    setEditValue('')
    toast.success('Step renamed')
  }

  const removeStep = (workflowKey: string, stepId: string) => {
    setWorkflows((prev) =>
      prev.map((w) =>
        w.key === workflowKey
          ? { ...w, steps: w.steps.filter((s) => s.id !== stepId) }
          : w,
      ),
    )
    toast.success('Step removed')
  }

  const moveStep = (workflowKey: string, stepId: string, direction: 'up' | 'down') => {
    setWorkflows((prev) =>
      prev.map((w) => {
        if (w.key !== workflowKey) return w
        const idx = w.steps.findIndex((s) => s.id === stepId)
        if (idx === -1) return w
        const newIdx = direction === 'up' ? idx - 1 : idx + 1
        if (newIdx < 0 || newIdx >= w.steps.length) return w
        const newSteps = [...w.steps]
        ;[newSteps[idx], newSteps[newIdx]] = [newSteps[newIdx], newSteps[idx]]
        return { ...w, steps: newSteps }
      }),
    )
  }

  return (
    <div className="space-y-6">
      {workflows.map((wf) => (
        <Card key={wf.key}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {wf.icon}
              {wf.label}
            </CardTitle>
            <CardDescription>{wf.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              {wf.steps.map((step, idx) => (
                <div key={step.id} className="flex items-center gap-1">
                  {/* Step Card */}
                  <div className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2 shadow-sm">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

                    {editingStep === step.id ? (
                      <Input
                        className="h-7 w-28 text-sm"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') renameStep(wf.key, step.id)
                          if (e.key === 'Escape') { setEditingStep(null); setEditValue('') }
                        }}
                        onBlur={() => renameStep(wf.key, step.id)}
                        autoFocus
                      />
                    ) : (
                      <span
                        className="text-sm font-medium cursor-pointer hover:text-teal-600 transition-colors"
                        onClick={() => { setEditingStep(step.id); setEditValue(step.name) }}
                      >
                        {step.name}
                      </span>
                    )}

                    {/* Reorder arrows */}
                    <button
                      type="button"
                      className="p-0.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
                      onClick={() => moveStep(wf.key, step.id, 'up')}
                      disabled={idx === 0}
                      aria-label="Move up"
                    >
                      <ArrowRight className="h-3 w-3 rotate-[-90deg]" />
                    </button>
                    <button
                      type="button"
                      className="p-0.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
                      onClick={() => moveStep(wf.key, step.id, 'down')}
                      disabled={idx === wf.steps.length - 1}
                      aria-label="Move down"
                    >
                      <ArrowRight className="h-3 w-3 rotate-90" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      className="p-0.5 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      onClick={() => removeStep(wf.key, step.id)}
                      aria-label="Remove step"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Arrow between steps */}
                  {idx < wf.steps.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mx-0.5" />
                  )}
                </div>
              ))}

              {/* Add step input */}
              <div className="flex items-center gap-1 ml-1">
                {wf.steps.length > 0 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mr-0.5" />
                )}
                <Input
                  className="h-9 w-36 text-sm"
                  placeholder="New step..."
                  value={newStepInput[wf.key] ?? ''}
                  onChange={(e) => setNewStepInput((prev) => ({ ...prev, [wf.key]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') addStep(wf.key) }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 bg-[#0d9488] hover:bg-[#0f766e] text-white border-teal-600"
                  onClick={() => addStep(wf.key)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ==================== TAB 4: AUDIT LOG ====================

function AuditLogTab() {
  const [actionFilter, setActionFilter] = useState<string>('')
  const [entityFilter, setEntityFilter] = useState<string>('')

  const queryParams = useMemo(() => {
    const p = new URLSearchParams()
    if (actionFilter) p.set('action', actionFilter)
    if (entityFilter) p.set('entity', entityFilter)
    return p.toString()
  }, [actionFilter, entityFilter])

  const { data, isLoading } = useQuery<AuditLogsResponse>({
    queryKey: ['audit-logs', actionFilter, entityFilter],
    queryFn: () => fetch(`/api/audit-logs?${queryParams}`).then((r) => r.json()),
  })

  const logs = data?.data ?? []
  const { sorted: sortedLogs, sortKey: logSortKey, sortDir: logSortDir, toggleSort: logToggleSort } = useSort(logs as (AuditLogEntry & Record<string, unknown>)[])

  const activeFilterCount = (actionFilter ? 1 : 0) + (entityFilter ? 1 : 0)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="py-0">
        <CardContent className="px-3 py-2">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs font-medium">Action Type</Label>
              <Select value={actionFilter} onValueChange={(v) => setActionFilter(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="CREATE">CREATE</SelectItem>
                  <SelectItem value="UPDATE">UPDATE</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs font-medium">Entity Type</Label>
              <Select value={entityFilter} onValueChange={(v) => setEntityFilter(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="All Entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {ENTITY_OPTIONS.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {activeFilterCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800"
                onClick={() => { setActionFilter(''); setEntityFilter('') }}
              >
                <X className="h-3 w-3 mr-1" />Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Log Table / Cards */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-teal-600" />
              Audit Trail
              {data && <span className="text-sm font-normal text-muted-foreground">({data.total} entries)</span>}
            </CardTitle>
            <TableExportButton
              rows={sortedLogs as AuditLogEntry[]}
              columns={auditExportColumns}
              filename="audit_logs"
              variant="outline"
              size="sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-base font-medium">No audit logs found</p>
              <p className="text-sm mt-1">Actions performed by admins will appear here</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto max-h-[calc(100vh-12rem)] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-12">S.No</TableHead>
                      <SortableHeader column="timestamp" sortKey={logSortKey} sortDir={logSortDir} onToggle={logToggleSort} className="w-48">Timestamp</SortableHeader>
                      <SortableHeader column="userName" sortKey={logSortKey} sortDir={logSortDir} onToggle={logToggleSort} className="w-32">User</SortableHeader>
                      <SortableHeader column="action" sortKey={logSortKey} sortDir={logSortDir} onToggle={logToggleSort} className="w-24">Action</SortableHeader>
                      <SortableHeader column="entity" sortKey={logSortKey} sortDir={logSortDir} onToggle={logToggleSort} className="w-40">Entity</SortableHeader>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedLogs.map((log, index) => (
                      <TableRow
                        key={log.id}
                        className={
                          log.action === 'DELETE'
                            ? 'bg-red-50/50 dark:bg-red-900/10 hover:bg-red-100/50 dark:hover:bg-red-900/20'
                            : 'hover:bg-muted/50'
                        }
                      >
                        <TableCell className="text-muted-foreground text-xs">{index + 1}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{log.userName || 'System'}</TableCell>
                        <TableCell><ActionBadge action={log.action} /></TableCell>
                        <TableCell className="text-sm">
                          <span className="font-medium">{log.entity}</span>
                          {log.entityId && (
                            <span className="text-xs text-muted-foreground ml-1.5">#{log.entityId.substring(0, 8)}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm max-w-xs">
                          {log.action === 'DELETE' ? (
                            <span className="text-red-600 dark:text-red-400">{log.oldValue || '—'}</span>
                          ) : log.oldValue && log.newValue ? (
                            <span>
                              <span className="text-muted-foreground line-through">{log.oldValue}</span>
                              {' → '}
                              <span className="font-medium">{log.newValue}</span>
                            </span>
                          ) : log.field || log.oldValue || log.newValue || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y max-h-96 overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-4 space-y-2 ${
                      log.action === 'DELETE'
                        ? 'bg-red-50/50 dark:bg-red-900/10'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ActionBadge action={log.action} />
                        <span className="text-sm font-medium">{log.entity}</span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      By <span className="font-medium text-foreground">{log.userName || 'System'}</span>
                    </div>
                    {log.action === 'DELETE' ? (
                      <p className="text-sm text-red-600 dark:text-red-400">{log.oldValue || '—'}</p>
                    ) : log.oldValue && log.newValue ? (
                      <p className="text-sm">
                        <span className="text-muted-foreground line-through">{log.oldValue}</span>
                        {' → '}
                        <span className="font-medium">{log.newValue}</span>
                      </p>
                    ) : log.field ? (
                      <p className="text-sm text-muted-foreground">{log.field}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ==================== MAIN SETTINGS VIEW ====================

export default function SettingsView() {
  const { userName, role, contractorName } = useAuthStore()
  const queryClient = useQueryClient()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage users, access, workflows, and system configuration.</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted">
          <TabsTrigger value="users" className="text-sm gap-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">User Management</span>
            <span className="sm:hidden">Users</span>
          </TabsTrigger>
          <TabsTrigger value="access" className="text-sm gap-1.5">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Access Management</span>
            <span className="sm:hidden">Access</span>
          </TabsTrigger>
          <TabsTrigger value="workflow" className="text-sm gap-1.5">
            <GitBranch className="h-4 w-4" />
            <span className="hidden sm:inline">Workflow Management</span>
            <span className="sm:hidden">Workflows</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-sm gap-1.5">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Audit Log</span>
            <span className="sm:hidden">Audit</span>
          </TabsTrigger>
          <TabsTrigger value="about" className="text-sm gap-1.5">
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">About</span>
            <span className="sm:hidden">About</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagementTab />
        </TabsContent>

        <TabsContent value="access">
          <AccessManagementTab />
        </TabsContent>

        <TabsContent value="workflow">
          <WorkflowManagementTab />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogTab />
        </TabsContent>

        <TabsContent value="about">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profile Card */}
            <motion.div {...fadeInUp}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Your Profile</CardTitle>
                  <CardDescription>Your account information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                        <Users className="h-7 w-7" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{userName || 'Demo User'}</h3>
                        <p className="text-sm text-muted-foreground">{roleLabels[role] || role}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-3">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Role</p>
                          <p className="font-medium">{roleLabels[role] || role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Contractor</p>
                          <p className="font-medium">{contractorName || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* System Info Card */}
            <motion.div {...fadeInUp} transition={{ duration: 0.35, delay: 0.1 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">System Information</CardTitle>
                  <CardDescription>Application and environment details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-3">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">App Version</p>
                        <p className="font-medium">RMS v0.3.0</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Database</p>
                        <p className="font-medium">SQLite (connected)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Framework</p>
                        <p className="font-medium">Next.js 16 + TypeScript</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">ORM</p>
                        <p className="font-medium">Prisma 6</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
