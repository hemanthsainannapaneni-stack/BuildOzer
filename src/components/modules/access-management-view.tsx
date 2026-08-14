'use client'

import { useEffect } from 'react'
import { useNavStore } from '@/stores/nav-store'

export default function AccessManagementView() {
  const setPage = useNavStore((s) => s.setPage)

  useEffect(() => {
    setPage('settings')
  }, [setPage])

  return null
}
