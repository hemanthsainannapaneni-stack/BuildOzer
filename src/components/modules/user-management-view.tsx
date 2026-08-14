'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import { Users, Plus, Pencil, Power, PowerOff, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { TableExportButton, type ExportColumn } from '@/components/ui/table-export-button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAuthStore, roleLabels, type UserRole } from '@/lib/auth-store'

// ---------- types ----------
interface SystemUser {
  id: string
  username: string
  fullName: string
  role: UserRole
  contractorName: string
  isActive: boolean
  lastLogin: string | null
}

interface UsersResponse {
  data: SystemUser[]
  total: number
}

// ---------- role badge colors ----------
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

// ---------- export columns ----------
const userExportColumns: ExportColumn<SystemUser>[] = [
  { key: 'fullName', header: 'Name' },
  { key: 'username', header: 'Username', accessor: (u) => u.username },
  { key: 'role', header: 'Role', accessor: (u) => roleLabels[u.role] ?? u.role },
  { key: 'contractorName', header: 'Contractor' },
  {
    key: 'isActive',
    header: 'Status',
    accessor: (u) => (u.isActive ? 'Active' : 'Inactive'),
  },
  {
    key: 'lastLogin',
    header: 'Last Login',
    accessor: (u) =>
      u.lastLogin ? format(new Date(u.lastLogin), 'yyyy-MM-dd HH:mm:ss') : 'Never',
  },
]

// ---------- skeleton ----------
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

// ---------- form dialog ----------
interface UserFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingUser: SystemUser | null
  contractors: string[]
}

function UserFormDialog({ open, onOpenChange, editingUser, contractors }: UserFormProps) {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<UserRole>('SAFETY_OFFICER')
  const [contractorName, setContractorName] = useState('All Contractors')

  const isEdit = !!editingUser

  const handleOpenChange = (val: boolean) => {
    if (val && editingUser) {
      setFullName(editingUser.fullName)
      setUsername(editingUser.username)
      setRole(editingUser.role)
      setContractorName(editingUser.contractorName)
    } else if (val) {
      setFullName('')
      setUsername('')
      setRole('SAFETY_OFFICER')
      setContractorName('All Contractors')
    }
    onOpenChange(val)
  }

  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (body: { fullName: string; username: string; role: string; contractorName: string }) => {
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
    mutation.mutate({ fullName: fullName.trim(), username: username.trim(), role, contractorName })
  }

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
            <Input
              id="fullName"
              placeholder="Enter full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isEdit}
            />
          </div>
          <div className="space-y-2">
            <Label>Role *</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(roleLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Contractor</Label>
            <Select value={contractorName} onValueChange={setContractorName}>
              <SelectTrigger>
                <SelectValue placeholder="Select contractor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Contractors">All Contractors</SelectItem>
                {contractors.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------- main component ----------
export default function UserManagementView() {
  const role = useAuthStore((s) => s.role)
  const isAdmin = role === 'ADMIN'

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SystemUser | null>(null)

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then((r) => r.json()),
  })

  // Fetch contractors for the select dropdown
  const { data: contractorsData } = useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['contractors-select'],
    queryFn: () => fetch('/api/contractors?limit=100').then((r) => r.json()),
  })
  const contractorNames = (contractorsData?.data ?? []).map((c) => c.name)

  const users = data?.data ?? []

  const handleEdit = (user: SystemUser) => {
    setEditingUser(user)
    setDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingUser(null)
    setDialogOpen(true)
  }

  const queryClient = useQueryClient()

  const toggleMutation = useMutation({
    mutationFn: async (user: SystemUser) => {
      const res = await fetch(`/api/users/${user.id}`, {
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
    },
    onError: () => {
      toast.error('Failed to toggle user status')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete user')
      return res.json()
    },
    onSuccess: () => {
      toast.success('User deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeleteTarget(null)
    },
    onError: () => {
      toast.error('Failed to delete user')
    },
  })

  const activeCount = users.filter((u) => u.isActive).length
  const inactiveCount = users.length - activeCount

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage system users and their access permissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TableExportButton
            rows={users}
            columns={userExportColumns}
            filename="users"
            variant="outline"
            size="default"
          />
          {isAdmin && (
            <Button
              className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
              onClick={handleAdd}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent border-teal-200/60 dark:border-teal-700/40 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99] backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Total Users</p>
                  <p className="text-2xl font-bold tracking-tight mt-1">{users.length}</p>
                </div>
                <div className="rounded-xl p-2.5 shrink-0 bg-teal-500/15 text-teal-600 dark:text-teal-400">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-200/60 dark:border-emerald-700/40 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99] backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Active</p>
                  <p className="text-2xl font-bold tracking-tight mt-1 text-emerald-600">{activeCount}</p>
                </div>
                <div className="rounded-xl p-2.5 shrink-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border-red-200/60 dark:border-red-700/40 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.99] backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Inactive</p>
                  <p className="text-2xl font-bold tracking-tight mt-1 text-red-600">{inactiveCount}</p>
                </div>
                <div className="rounded-xl p-2.5 shrink-0 bg-red-500/15 text-red-600 dark:text-red-400">
                  <PowerOff className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">All Users</CardTitle>
        </CardHeader>
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
                      <TableHead>Name</TableHead>
                      <TableHead className="w-32">Username</TableHead>
                      <TableHead className="w-40">Role</TableHead>
                      <TableHead>Contractor</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-40">Last Login</TableHead>
                      {isAdmin && <TableHead className="w-36">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">{user.fullName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">@{user.username}</TableCell>
                        <TableCell><RoleBadge role={user.role} /></TableCell>
                        <TableCell className="text-sm">{user.contractorName}</TableCell>
                        <TableCell><ActiveStatusBadge active={user.isActive} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.lastLogin
                            ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })
                            : '—'
                          }
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleEdit(user)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 w-8 p-0 ${user.isActive ? 'text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
                                onClick={() => toggleMutation.mutate(user)}
                                disabled={toggleMutation.isPending}
                              >
                                {user.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
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
                      <div className="flex items-center gap-2 shrink-0">
                        <ActiveStatusBadge active={user.isActive} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <RoleBadge role={user.role} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>{user.contractorName}</span>
                      <span>
                        Last login:{' '}
                        {user.lastLogin
                          ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })
                          : '—'
                        }
                      </span>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2 pt-1">
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleEdit(user)}>
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-8 text-xs ${user.isActive ? 'text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800'}`}
                          onClick={() => toggleMutation.mutate(user)}
                          disabled={toggleMutation.isPending}
                        >
                          {user.isActive ? <PowerOff className="h-3 w-3 mr-1" /> : <Power className="h-3 w-3 mr-1" />}
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800"
                          onClick={() => setDeleteTarget(user)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
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
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) setEditingUser(null)
          }}
          editingUser={editingUser}
          contractors={contractorNames}
        />
      )}

      {/* Delete Confirmation Dialog */}
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
