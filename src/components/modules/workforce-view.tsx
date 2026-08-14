'use client'

import { useNavStore } from '@/stores/nav-store'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, CalendarCheck } from 'lucide-react'
import WorkerListView from './worker-list-view'
import AttendanceView from './attendance-view'

export default function WorkforceView() {
  const activePage = useNavStore((s) => s.activePage)
  const setPage = useNavStore((s) => s.setPage)

  // The active tab is derived directly from the nav store so there is a
  // single source of truth. The dashboard "Today's Attendance" tile sets
  // activePage to 'attendance', which surfaces here as the Attendance tab.
  const tab = activePage === 'attendance' ? 'attendance' : 'register'

  const handleTabChange = (value: string) => {
    setPage(value === 'attendance' ? 'attendance' : 'workers')
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-6rem)] overflow-hidden">
      <Tabs
        value={tab}
        onValueChange={handleTabChange}
        className="flex-1 min-h-0 flex flex-col gap-3"
      >
        <TabsList className="shrink-0 self-start">
          <TabsTrigger value="register" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Register
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1.5">
            <CalendarCheck className="h-3.5 w-3.5" />
            Attendance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="flex-1 min-h-0 overflow-hidden mt-0">
          <WorkerListView />
        </TabsContent>
        <TabsContent value="attendance" className="flex-1 min-h-0 overflow-y-auto mt-0 pr-0.5">
          <AttendanceView />
        </TabsContent>
      </Tabs>
    </div>
  )
}
