import { create } from 'zustand'

export type UserRole = 'ADMIN' | 'SAFETY_OFFICER' | 'PMC' | 'HR_COORDINATOR' | 'LEGAL_ADVISOR'

interface AuthState {
  isAuthenticated: boolean
  userName: string
  role: UserRole
  contractorId: string | null
  contractorName: string | null
  siteId: string | null
  login: (name: string, role: UserRole, contractorId?: string, contractorName?: string, siteId?: string) => void
  logout: () => void
}

export const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Admin',
  SAFETY_OFFICER: 'Safety Officer',
  PMC: 'PMC',
  HR_COORDINATOR: 'HR / Payroll Coordinator',
  LEGAL_ADVISOR: 'Legal Advisor',
}

export const rolePermissions: Record<UserRole, {
  canEdit: boolean
  canViewAllContractors: boolean
  canApprove: boolean
  canViewAadhaar: boolean
  canViewMedical: boolean
  canViewPOSH: boolean
  modules: string[]
}> = {
  ADMIN: {
    canEdit: true,
    canViewAllContractors: true,
    canApprove: true,
    canViewAadhaar: true,
    canViewMedical: true,
    canViewPOSH: true,
    modules: ['dashboard', 'workers', 'locations', 'medical', 'training', 'attendance', 'incidents', 'grievance', 'vehicles', 'hazardous', 'legal', 'compliance', 'settings', 'reports'],
  },
  SAFETY_OFFICER: {
    canEdit: true,
    canViewAllContractors: false,
    canApprove: false,
    canViewAadhaar: true,
    canViewMedical: true,
    canViewPOSH: false,
    modules: ['dashboard', 'workers', 'locations', 'medical', 'training', 'attendance', 'incidents', 'grievance', 'vehicles', 'hazardous', 'legal', 'compliance', 'settings', 'reports'],
  },
  PMC: {
    canEdit: false,
    canViewAllContractors: true,
    canApprove: false,
    canViewAadhaar: false,
    canViewMedical: false,
    canViewPOSH: false,
    modules: ['dashboard', 'workers', 'locations', 'medical', 'training', 'incidents', 'vehicles', 'legal', 'compliance', 'settings', 'reports'],
  },
  HR_COORDINATOR: {
    canEdit: true,
    canViewAllContractors: false,
    canApprove: false,
    canViewAadhaar: true,
    canViewMedical: false,
    canViewPOSH: false,
    modules: ['dashboard', 'workers', 'locations', 'attendance', 'compliance', 'settings', 'reports'],
  },
  LEGAL_ADVISOR: {
    canEdit: false,
    canViewAllContractors: true,
    canApprove: false,
    canViewAadhaar: false,
    canViewMedical: false,
    canViewPOSH: true,
    modules: ['dashboard', 'workers', 'locations', 'legal', 'compliance', 'settings', 'reports'],
  },
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  userName: '',
  role: 'SAFETY_OFFICER' as UserRole,
  contractorId: null,
  contractorName: null,
  siteId: null,
  login: (name, role, contractorId, contractorName, siteId) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth', JSON.stringify({ name, role, contractorId, contractorName, siteId }))
    }
    set({ isAuthenticated: true, userName: name, role, contractorId: contractorId ?? null, contractorName: contractorName ?? null, siteId: siteId ?? null })
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth')
    }
    set({ isAuthenticated: false, userName: '', role: 'SAFETY_OFFICER' as UserRole, contractorId: null, contractorName: null, siteId: null })
  },
}))

// Hydrate from localStorage on init
if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem('auth')
    if (stored) {
      const data = JSON.parse(stored)
      const validRoles: UserRole[] = ['ADMIN', 'SAFETY_OFFICER', 'PMC', 'HR_COORDINATOR', 'LEGAL_ADVISOR']
      const safeRole = validRoles.includes(data.role) ? (data.role as UserRole) : 'SAFETY_OFFICER'
      useAuthStore.setState({
        isAuthenticated: true,
        userName: data.name || '',
        role: safeRole,
        contractorId: data.contractorId ?? null,
        contractorName: data.contractorName ?? null,
        siteId: data.siteId ?? null,
      })
    }
  } catch {
    // Clear corrupt data
    localStorage.removeItem('auth')
  }
}
