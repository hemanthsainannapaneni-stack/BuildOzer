'use client'

import { useNavStore, type PageId } from '@/stores/nav-store'
import { useAuthStore, rolePermissions, roleLabels } from '@/lib/auth-store'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import { useState, useEffect, useCallback } from 'react'
import {
  LayoutDashboard,
  Users,
  HeartPulse,
  GraduationCap,
  AlertTriangle,
  MessageSquareWarning,
  Truck,
  Scale,
  ClipboardCheck,
  Settings,
  X,
  FileBarChart,
  Menu,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Moon,
  Sun,
  Bell,
  Trash2,
  ChevronDown,
  User as UserIcon,
  Calendar,
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const navItems: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'locations', label: 'Locations', icon: MapPin },
  { id: 'workers', label: 'Workforce', icon: Users },
  { id: 'vehicles', label: 'Machinery', icon: Truck },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
  { id: 'training', label: 'Training', icon: GraduationCap },
  { id: 'medical', label: 'Medical', icon: HeartPulse },
  { id: 'grievance', label: 'Grievances', icon: MessageSquareWarning },
  { id: 'legal', label: 'Legal', icon: Scale },
  { id: 'compliance', label: 'Site Compliance', icon: ClipboardCheck },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
  { id: 'settings', label: 'Settings', icon: Settings },
]

interface Notification {
  id: string
  title: string
  message: string
  priority: string
  isRead: boolean
  createdAt: string
}

function getInitials(name: string): string {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function SidebarNav() {
  const { activePage, setPage, sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed, mobileView } = useNavStore()
  const { logout, userName, role } = useAuthStore()
  const permissions = rolePermissions[role] ?? rolePermissions.SAFETY_OFFICER
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  // Avoid hydration mismatch for theme icon
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const fetchNotifications = useCallback(() => {
    fetch('/api/notifications')
      .then(r => r.ok ? r.json() : [])
      .then(setNotifications)
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const filteredItems = navItems.filter(item => permissions.modules.includes(item.id))
  // When mobile view is forced, the sidebar always behaves as a mobile overlay
  // (never collapsed, always slide-in) regardless of screen size.
  const forceMobile = mobileView
  const collapsed = forceMobile ? false : sidebarCollapsed

  const unreadCount = notifications.filter(n => !n.isRead).length

  const handleClearAll = async () => {
    setClearing(true)
    try {
      await fetch('/api/notifications', { method: 'DELETE' })
      setNotifications([])
    } catch {
      // ignore
    }
    setClearing(false)
  }

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  const isDark = mounted && theme === 'dark'

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className={cn(
            'fixed inset-0 bg-black/50 z-40 backdrop-blur-sm',
            forceMobile ? '' : 'lg:hidden'
          )}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Sidebar */}
      <aside className={cn(
        'text-sidebar-foreground flex flex-col shrink-0 transition-[width] duration-300 ease-in-out relative',
        // Light teal gradient background
        'bg-gradient-to-b from-teal-50/60 via-teal-50/30 to-cyan-50/40',
        'border-r border-teal-100/60',
        // Mobile: fixed, slide in/out
        'fixed top-0 left-0 z-50 h-full w-64',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop: in-flow, full or mini — only when not in forced mobile view
        !forceMobile && 'lg:static lg:h-full lg:translate-x-0',
        !forceMobile && (collapsed ? 'lg:w-16' : 'lg:w-64')
      )}>
        {/* Header */}
        <div className={cn(
          'flex items-center border-b border-teal-100/60 shrink-0',
          collapsed ? 'h-14 justify-center px-2' : 'h-20 px-3'
        )}>
          <img
            src="/buildozer-logo.png"
            alt="Buildozer"
            className={cn(
              'object-contain transition-all duration-300',
              collapsed ? 'w-10 h-10 rounded-xl' : 'w-full rounded-2xl'
            )}
          />
          {/* Mobile close */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'text-teal-700/50 hover:text-teal-700 hover:bg-teal-100/60 h-8 w-8 shrink-0 ml-auto',
              forceMobile ? '' : 'lg:hidden'
            )}
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Nav items */}
        <ScrollArea className="flex-1 min-h-0 py-3 px-2.5">
          <nav className="space-y-0.5">
            {filteredItems.map(item => {
              const Icon = item.icon
              const isActive = activePage === item.id || (item.id === 'workers' && ['worker-detail', 'worker-form', 'worker-fitness', 'attendance'].includes(activePage)) || (item.id === 'incidents' && ['incident-detail', 'incident-form'].includes(activePage)) || (item.id === 'vehicles' && activePage === 'vehicle-detail')

              const btn = (
                <button
                  key={item.id}
                  onClick={() => { setPage(item.id); setSidebarOpen(false) }}
                  className={cn(
                    'w-full flex items-center rounded-lg text-sm font-medium transition-colors relative',
                    collapsed
                      ? 'justify-center px-0 py-2.5'
                      : 'gap-3 px-3 py-2.5',
                    isActive
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold shadow-sm'
                      : 'text-slate-600 hover:bg-teal-50 hover:text-teal-700'
                  )}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              )

              if (collapsed) {
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      {btn}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return btn
            })}
          </nav>
        </ScrollArea>

        {/* User Actions section (above collapse toggle) */}
        <div className={cn(
          'shrink-0 border-t border-teal-100/60 py-2',
          collapsed ? 'px-1.5' : 'px-2.5'
        )}>
          <div className={cn('flex flex-col gap-1', collapsed && 'items-center')}>
            {/* Dark/Light mode toggle */}
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="h-9 w-9 rounded-lg text-slate-600 hover:bg-teal-50 hover:text-teal-700"
                    title="Toggle theme"
                  >
                    {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{isDark ? 'Switch to Light' : 'Switch to Dark'}</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                onClick={toggleTheme}
                className="justify-start gap-3 h-9 px-3 rounded-lg text-slate-600 hover:bg-teal-50 hover:text-teal-700 font-medium"
              >
                {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
              </Button>
            )}

            {/* Notifications */}
            <Popover open={notifOpen} onOpenChange={setNotifOpen}>
              <PopoverTrigger asChild>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative h-9 w-9 rounded-lg text-slate-600 hover:bg-teal-50 hover:text-teal-700"
                        title="Notifications"
                      >
                        <Bell className="h-4 w-4" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-background">
                            {unreadCount}
                          </span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Notifications</TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 h-9 px-3 rounded-lg text-slate-600 hover:bg-teal-50 hover:text-teal-700 font-medium relative"
                  >
                    <div className="relative">
                      <Bell className="h-4 w-4" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-background">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="ml-auto text-xs">{unreadCount} new</Badge>
                    )}
                  </Button>
                )}
              </PopoverTrigger>
              <PopoverContent side="right" align="start" className="w-80 p-0 rounded-xl">
                <div className="flex items-center justify-between p-3 border-b">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>}
                    {notifications.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-red-600"
                        onClick={handleClearAll}
                        disabled={clearing}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>
                <ScrollArea className="h-80">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
                  ) : (
                    <div className="divide-y">
                      {notifications.map(n => (
                        <div key={n.id} className="p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start gap-2">
                            <span className={cn(
                              'mt-1 inline-block w-2 h-2 rounded-full shrink-0',
                              n.priority === 'Critical' ? 'bg-red-500' : n.priority === 'High' ? 'bg-amber-500' : 'bg-teal-500'
                            )} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{n.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>

            {/* Profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-lg text-slate-600 hover:bg-teal-50 hover:text-teal-700 mt-1"
                        title="Profile"
                      >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center text-xs font-bold">
                          {getInitials(userName || 'User')}
                        </div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{userName || 'Profile'}</TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    variant="ghost"
                    className="justify-start gap-2 h-10 px-2 rounded-lg text-slate-600 hover:bg-teal-50 hover:text-teal-700 font-medium mt-1"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {getInitials(userName || 'User')}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate leading-tight">{userName || 'User'}</p>
                      <p className="text-[10px] text-slate-500 truncate leading-tight">{roleLabels[role] || role}</p>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </Button>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userName || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{roleLabels[role] || role}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setPage('settings'); setSidebarOpen(false) }} className="cursor-pointer">
                  <UserIcon className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setPage('attendance'); setSidebarOpen(false) }} className="cursor-pointer">
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Collapse toggle — always on the sidebar right edge, vertically centered (desktop only, hidden in forced mobile view) */}
        <button
          onClick={() => setSidebarCollapsed(!collapsed)}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -right-3 z-10 h-6 w-6 rounded-full border border-teal-200 bg-white shadow-sm items-center justify-center hover:bg-teal-50 hover:shadow-md transition-all',
            forceMobile ? 'hidden' : 'hidden lg:flex'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRight className="h-3.5 w-3.5 text-teal-600" />
            : <ChevronLeft className="h-3.5 w-3.5 text-teal-600" />
          }
        </button>
      </aside>

      {/* Mobile floating menu button (also shown on desktop when mobile view is forced) */}
      <button
        className={cn(
          'fixed bottom-4 left-4 z-30 h-12 w-12 rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/30 flex items-center justify-center active:scale-95 transition-transform',
          forceMobile ? '' : 'lg:hidden'
        )}
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>
    </TooltipProvider>
  )
}
