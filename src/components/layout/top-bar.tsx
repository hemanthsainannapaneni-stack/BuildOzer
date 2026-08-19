'use client'

import { useCallback, useEffect, useState } from 'react'
import { useNavStore, pageTitles } from '@/stores/nav-store'
import { useAuthStore, roleLabels } from '@/lib/auth-store'
import { useCompactUi } from '@/hooks/use-compact-layout'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
import { Bell, ChevronLeft, LogOut, Monitor, Moon, Sun, User as UserIcon } from 'lucide-react'

interface Notification {
  id: string
  title: string
  message: string
  priority: string
  isRead: boolean
  createdAt: string
}

// Pages that were opened from a list and therefore have somewhere to go back to.
const BACKABLE = new Set([
  'worker-detail',
  'worker-form',
  'worker-fitness',
  'incident-detail',
  'incident-form',
  'vehicle-detail',
])

function getInitials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * TopBar — the phone-app header: page title in the middle, account and app
 * actions on the right. Renders wherever the compact layout is in effect (a
 * narrow screen, or the mobile preview frame); on desktop it returns null
 * because those actions live in the sidebar.
 */
export function TopBar() {
  const { activePage, mobileView, setMobileView, setPage, goBack } = useNavStore()
  const { userName, role, logout } = useAuthStore()
  const compact = useCompactUi()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- theme is only known client-side; matches SidebarNav
    setMounted(true)
  }, [])

  const fetchNotifications = useCallback(() => {
    fetch('/api/notifications')
      .then(r => (r.ok ? r.json() : []))
      .then(setNotifications)
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  if (!compact) return null

  const unreadCount = notifications.filter(n => !n.isRead).length
  const isDark = mounted && theme === 'dark'
  const canGoBack = BACKABLE.has(activePage)

  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-teal-100/60 bg-background px-2 no-print">
      <div className="flex w-16 items-center">
        {canGoBack ? (
          <Button variant="ghost" size="icon" onClick={goBack} aria-label="Go back" className="h-8 w-8 rounded-lg">
            <ChevronLeft className="h-4.5 w-4.5" />
          </Button>
        ) : mobileView ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileView(false)}
            aria-label="Exit mobile view"
            title="Exit mobile view"
            className="h-8 w-8 rounded-lg text-slate-500"
          >
            <Monitor className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <h1 className="min-w-0 flex-1 truncate text-center text-base font-bold tracking-tight text-foreground">
        {pageTitles[activePage] ?? 'Overview'}
      </h1>

      <div className="flex w-16 items-center justify-end gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="h-8 w-8 rounded-lg text-slate-500"
        >
          {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              className="relative h-8 w-8 rounded-lg text-slate-500"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 rounded-xl p-0">
            <div className="border-b p-3 text-sm font-semibold">
              Notifications{unreadCount > 0 && <span className="ml-1 text-xs font-medium text-muted-foreground">({unreadCount} new)</span>}
            </div>
            <ScrollArea className="h-64">
              {notifications.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No notifications</p>
              ) : (
                <div className="divide-y">
                  {notifications.map(n => (
                    <div key={n.id} className="flex items-start gap-2 p-3">
                      <span
                        className={cn(
                          'mt-1 inline-block h-2 w-2 shrink-0 rounded-full',
                          n.priority === 'Critical' ? 'bg-red-500' : n.priority === 'High' ? 'bg-amber-500' : 'bg-teal-500',
                        )}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{n.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Account"
              className="ml-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-[11px] font-bold text-white"
            >
              {getInitials(userName || 'User')}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium leading-none">{userName || 'User'}</p>
              <p className="mt-1 text-xs leading-none text-muted-foreground">{roleLabels[role] || role}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPage('settings')} className="cursor-pointer">
              <UserIcon className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            {mobileView && (
              <DropdownMenuItem onClick={() => setMobileView(false)} className="cursor-pointer">
                <Monitor className="mr-2 h-4 w-4" />
                Desktop View
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
