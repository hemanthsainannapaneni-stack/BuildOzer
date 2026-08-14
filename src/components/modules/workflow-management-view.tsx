'use client'

import { useEffect } from 'react'
import { useNavStore } from '@/stores/nav-store'

export default function WorkflowManagementView() {
  const setPage = useNavStore((s) => s.setPage)

  useEffect(() => {
    setPage('settings')
  }, [setPage])

  return null
}
