'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavStore, type PageId } from '@/stores/nav-store'
import { useAuthStore, rolePermissions, roleLabels } from '@/lib/auth-store'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  FileBarChart,
  LayoutGrid,
  MapPin,
  Truck,
  GraduationCap,
  HeartPulse,
  MessageSquareWarning,
  Scale,
  ClipboardCheck,
  Settings,
  Moon,
  Sun,
  LogOut,
  X,
} from 'lucide-react'

interface NavEntry {
  id: PageId
  label: string
  icon: typeof LayoutDashboard
}

// The four modules that earn a permanent tab; everything else lives behind More.
const TAB_ITEMS: NavEntry[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'workers', label: 'Workforce', icon: Users },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
]

const MORE_ITEMS: NavEntry[] = [
  { id: 'locations', label: 'Locations', icon: MapPin },
  { id: 'vehicles', label: 'Machinery', icon: Truck },
  { id: 'training', label: 'Training', icon: GraduationCap },
  { id: 'medical', label: 'Medical', icon: HeartPulse },
  { id: 'grievance', label: 'Grievances', icon: MessageSquareWarning },
  { id: 'legal', label: 'Legal', icon: Scale },
  { id: 'compliance', label: 'Compliance', icon: ClipboardCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
]

// Detail and form pages belong to the tab they were opened from, so the tab
// stays lit while the user is inside them.
const PAGE_TO_SECTION: Partial<Record<PageId, PageId>> = {
  'worker-detail': 'workers',
  'worker-form': 'workers',
  'worker-fitness': 'workers',
  attendance: 'workers',
  'incident-detail': 'incidents',
  'incident-form': 'incidents',
  'vehicle-detail': 'vehicles',
}

export function sectionOf(page: PageId): PageId {
  return PAGE_TO_SECTION[page] ?? page
}

/**
 * BottomNav — the phone-app tab bar. Rendered in the flow below the scrolling
 * content (not fixed), so it sits inside the mobile preview frame exactly as it
 * does on a real phone.
 */
export function BottomNav() {
  const { activePage, setPage } = useNavStore()
  const { role, userName, logout } = useAuthStore()
  const { theme, setTheme } = useTheme()
  // The sheet is remembered against the page it was opened on, so any
  // navigation — a tile here, or a button inside the page — dismisses it.
  const [openedOn, setOpenedOn] = useState<PageId | null>(null)
  const moreOpen = openedOn === activePage
  const setMoreOpen = (open: boolean) => setOpenedOn(open ? activePage : null)

  const allowed = rolePermissions[role]?.modules ?? rolePermissions.SAFETY_OFFICER.modules
  const tabs = TAB_ITEMS.filter(t => allowed.includes(t.id))
  const moreItems = MORE_ITEMS.filter(t => allowed.includes(t.id))
  const section = sectionOf(activePage)
  const moreActive = moreItems.some(i => i.id === section)
  // While the sheet is open More owns the highlight, even though the page behind
  // it still belongs to another tab.
  const moreLit = moreActive || moreOpen

  const go = (page: PageId) => {
    setPage(page)
    setMoreOpen(false)
  }

  return (
    <>
      {/* More sheet — absolutely positioned inside the app frame rather than
          portalled to the body, so the preview frame contains it. */}
      <AnimatePresence>
        {moreOpen && (
          <div className="absolute inset-0 z-40 flex flex-col justify-end">
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              aria-label="Close menu"
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 38 }}
              /* pb clears the tab bar, which floats above this sheet */
              className="relative z-10 max-h-[78%] overflow-y-auto rounded-t-2xl border-t border-teal-100/60 bg-background px-4 pb-20 pt-3 shadow-2xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{userName || 'User'}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{roleLabels[role] || role}</p>
                </div>
                <button
                  onClick={() => setMoreOpen(false)}
                  aria-label="Close menu"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-muted hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {moreItems.map(item => {
                  const Icon = item.icon
                  const isActive = section === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => go(item.id)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors',
                        isActive
                          ? 'border-teal-200 bg-teal-50 text-teal-700'
                          : 'border-slate-200/70 bg-card text-slate-600 active:bg-muted',
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="text-[11px] font-semibold leading-tight">{item.label}</span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 active:bg-muted"
                >
                  {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </button>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 active:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <nav className="relative z-50 shrink-0 border-t border-teal-100/60 bg-background/95 backdrop-blur no-print">
        <div className="flex items-stretch justify-around px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1.5">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = !moreLit && section === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => go(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1 transition-colors',
                  isActive ? 'text-teal-600' : 'text-slate-500 active:text-slate-700',
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0', isActive && 'stroke-[2.4]')} />
                <span className={cn('truncate text-[10px] leading-none', isActive ? 'font-bold' : 'font-medium')}>
                  {tab.label}
                </span>
              </button>
            )
          })}

          <button
            onClick={() => setMoreOpen(!moreOpen)}
            aria-expanded={moreOpen}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1 transition-colors',
              moreLit ? 'text-teal-600' : 'text-slate-500 active:text-slate-700',
            )}
          >
            <LayoutGrid className={cn('h-5 w-5 shrink-0', moreLit && 'stroke-[2.4]')} />
            <span className={cn('truncate text-[10px] leading-none', moreLit ? 'font-bold' : 'font-medium')}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
