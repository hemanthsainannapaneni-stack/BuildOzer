'use client'

import { useAuthStore } from '@/lib/auth-store'
import { useNavStore } from '@/stores/nav-store'
import { SidebarNav } from './sidebar-nav'
import { TopBar } from './top-bar'
import { LoginScreen } from './login-screen'
import { lazy, Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

// Dialog-based wizards (always mounted, conditionally visible)
import WorkerFormDialog from '@/components/modules/worker-form-dialog'
import IncidentFormDialog from '@/components/modules/incident-form-dialog'

// Lazy-load module views for performance
const DashboardView = lazy(() => import('@/components/modules/dashboard-view'))
const WorkforceView = lazy(() => import('@/components/modules/workforce-view'))
const WorkerDetailView = lazy(() => import('@/components/modules/worker-detail-view'))
const WorkerFormView = lazy(() => import('@/components/modules/worker-form-view'))
const WorkerFitnessView = lazy(() => import('@/components/modules/worker-fitness-view'))
const LocationsView = lazy(() => import('@/components/modules/locations-view'))
const MedicalView = lazy(() => import('@/components/modules/medical-view'))
const TrainingView = lazy(() => import('@/components/modules/training-view'))
const IncidentListView = lazy(() => import('@/components/modules/incident-list-view'))
const IncidentDetailView = lazy(() => import('@/components/modules/incident-detail-view'))
const IncidentFormView = lazy(() => import('@/components/modules/incident-form-view'))
const GrievanceView = lazy(() => import('@/components/modules/grievance-view'))
const VehicleListView = lazy(() => import('@/components/modules/vehicle-list-view'))
const VehicleDetailView = lazy(() => import('@/components/modules/vehicle-detail-view'))
const HazardousView = lazy(() => import('@/components/modules/hazardous-view'))
const LegalView = lazy(() => import('@/components/modules/legal-view'))
const ComplianceView = lazy(() => import('@/components/modules/compliance-view'))
const SettingsView = lazy(() => import('@/components/modules/settings-view'))
const ReportsView = lazy(() => import('@/components/modules/reports-view'))

function LoadingFallback() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl mt-4" />
    </div>
  )
}

const pageComponents: Record<string, React.LazyExoticComponent<() => JSX.Element>> = {
  dashboard: DashboardView,
  workers: WorkforceView,
  'worker-detail': WorkerDetailView,
  'worker-form': WorkerFormView,
  'worker-fitness': WorkerFitnessView,
  locations: LocationsView,
  medical: MedicalView,
  training: TrainingView,
  attendance: WorkforceView,
  incidents: IncidentListView,
  'incident-detail': IncidentDetailView,
  'incident-form': IncidentFormView,
  grievance: GrievanceView,
  vehicles: VehicleListView,
  'vehicle-detail': VehicleDetailView,
  hazardous: HazardousView,
  legal: LegalView,
  compliance: ComplianceView,
  settings: SettingsView,
  reports: ReportsView,
}

export function AppShell() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const activePage = useNavStore(s => s.activePage)
  const mobileView = useNavStore(s => s.mobileView)

  if (!isAuthenticated) return <LoginScreen />

  const PageComponent = pageComponents[activePage]

  const pageContent = (
    <Suspense fallback={<LoadingFallback />}>
      {PageComponent ? <PageComponent /> : <div className="text-center py-20 text-muted-foreground">Page not found</div>}
    </Suspense>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SidebarNav />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {mobileView ? (
          <div className="flex-1 overflow-hidden bg-muted/50 flex items-stretch justify-center p-0 sm:p-4 lg:p-6">
            <div className="mobile-frame w-full max-w-[420px] h-full bg-background shadow-2xl ring-1 ring-black/5 sm:rounded-[1.75rem] overflow-hidden flex flex-col">
              {/* TopBar inside the mobile frame so it aligns with content */}
              <TopBar />
              <main className="flex-1 overflow-y-auto">
                <div className="p-4">{pageContent}</div>
              </main>
            </div>
          </div>
        ) : (
          <>
            <main className="flex-1 overflow-hidden">
              <div className="px-3 sm:px-4 pt-3 pb-0 h-full flex flex-col">{pageContent}</div>
            </main>
          </>
        )}
      </div>
      {/* Global wizard dialogs — always mounted so any caller can open them */}
      <WorkerFormDialog />
      <IncidentFormDialog />
    </div>
  )
}
