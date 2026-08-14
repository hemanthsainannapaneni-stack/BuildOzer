'use client'

import { useNavStore } from '@/stores/nav-store'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

/**
 * TopBar — only renders inside the mobile frame (when mobileView is on).
 * On desktop it returns null because all the user actions (notifications,
 * profile, theme toggle, etc.) live in the sidebar.
 *
 * When in mobile view we only show the hamburger button that opens the
 * slide-in sidebar overlay.
 */
export function TopBar() {
  const { mobileView, setSidebarOpen } = useNavStore()

  if (!mobileView) return null

  return (
    <header className="flex items-center justify-between px-3 h-11 shrink-0 no-print">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setSidebarOpen(true)}
        title="Open menu"
        aria-label="Open menu"
        className="h-8 w-8 rounded-lg hover:bg-muted/60"
      >
        <Menu className="h-4 w-4" />
      </Button>
    </header>
  )
}
