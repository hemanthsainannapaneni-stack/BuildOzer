import { create } from 'zustand'

export type PageId =
  | 'dashboard'
  | 'workers'
  | 'worker-detail'
  | 'worker-form'
  | 'worker-fitness'
  | 'locations'
  | 'medical'
  | 'training'
  | 'attendance'
  | 'incidents'
  | 'incident-detail'
  | 'incident-form'
  | 'grievance'
  | 'vehicles'
  | 'vehicle-detail'
  | 'hazardous'
  | 'legal'
  | 'compliance'
  | 'settings'
  | 'reports'

interface NavState {
  activePage: PageId
  pageParams: Record<string, string>
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  mobileView: boolean
  // Worker-form dialog (replaces the worker-form page route for the "Register Worker" / "Edit" buttons)
  workerFormDialogOpen: boolean
  workerFormEditId: string | null
  openWorkerForm: (editId?: string | null) => void
  closeWorkerForm: () => void
  // Incident-form dialog (replaces the incident-form page route for the "Log New Incident" button)
  incidentFormDialogOpen: boolean
  openIncidentForm: () => void
  closeIncidentForm: () => void
  setPage: (page: PageId, params?: Record<string, string>) => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setMobileView: (on: boolean) => void
  toggleMobileView: () => void
  goBack: () => void
}

export const pageTitles: Record<PageId, string> = {
  dashboard: 'Overview',
  workers: 'Workforce',
  'worker-detail': 'Worker Details',
  'worker-form': 'Register Worker',
  'worker-fitness': 'Fitness & Experience',
  locations: 'Locations',
  medical: 'Medical Records',
  training: 'Training & Certification',
  attendance: 'Attendance',
  incidents: 'Incident Register',
  'incident-detail': 'Incident Details',
  'incident-form': 'Log Incident',
  grievance: 'Grievances',
  vehicles: 'Machinery & Vehicles',
  'vehicle-detail': 'Vehicle Details',
  hazardous: 'Hazardous Materials',
  legal: 'Legal Compliance',
  compliance: 'Site Compliance',
  settings: 'Settings',
  reports: 'Reports',
}

export const useNavStore = create<NavState>((set, get) => ({
  activePage: 'dashboard',
  pageParams: {},
  sidebarOpen: true,
  sidebarCollapsed: false,
  mobileView: false,
  workerFormDialogOpen: false,
  workerFormEditId: null,
  openWorkerForm: (editId = null) =>
    set({ workerFormDialogOpen: true, workerFormEditId: editId }),
  closeWorkerForm: () =>
    set({ workerFormDialogOpen: false, workerFormEditId: null }),
  incidentFormDialogOpen: false,
  openIncidentForm: () => set({ incidentFormDialogOpen: true }),
  closeIncidentForm: () => set({ incidentFormDialogOpen: false }),
  setPage: (page, params = {}) => {
    set({ activePage: page, pageParams: params })
  },
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setMobileView: (on) => set({ mobileView: on }),
  toggleMobileView: () => {
    const next = !get().mobileView
    // When entering mobile view, close the sidebar overlay so the framed
    // content is visible. The FAB remains available to re-open it.
    set(next ? { mobileView: true, sidebarOpen: false } : { mobileView: false })
  },
  goBack: () => {
    const current = get().activePage
    const backMap: Partial<Record<PageId, PageId>> = {
      'worker-detail': 'workers',
      'worker-form': 'workers',
      'worker-fitness': 'worker-detail',
      'incident-detail': 'incidents',
      'incident-form': 'incidents',
      'vehicle-detail': 'vehicles',
    }
    const back = backMap[current]
    if (back) {
      set({ activePage: back, pageParams: {} })
    }
  },
}))
