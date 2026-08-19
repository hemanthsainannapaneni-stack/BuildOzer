import * as React from 'react'
import { useNavStore } from '@/stores/nav-store'

// Below this width the sidebar is already an overlay, so the content area has
// the full screen to itself and should lay out as a phone app rather than as a
// squeezed desktop dashboard.
const COMPACT_BREAKPOINT = 1024

export function useIsCompactViewport() {
  const [isCompact, setIsCompact] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${COMPACT_BREAKPOINT - 0.02}px)`)
    const onChange = () => setIsCompact(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isCompact
}

// True wherever the phone layout is in effect: a narrow screen, or the mobile
// preview frame on a wide one. Matches the `.compact-ui` class AppShell sets,
// for the few places where CSS alone cannot express the change.
export function useCompactUi() {
  const mobileView = useNavStore(s => s.mobileView)
  return useIsCompactViewport() || mobileView
}
