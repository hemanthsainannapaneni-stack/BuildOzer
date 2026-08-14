interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

const statusClassMap: Record<string, string> = {
  // Training / Document statuses
  Valid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  ExpiringSoon: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  Expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  // Fitness
  Fit: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  FitWithRestriction: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  Unfit: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Pending: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300',
  // Medical
  Conditional: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  // Incident
  Open: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  UnderInvestigation: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  Closed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  // Grievance
  InProgress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  Resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  Escalated: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  // Compliance
  Compliant: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  NonCompliant: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  // Vehicle
  NeedsRepair: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  Grounded: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  // Attendance
  Present: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  Absent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  HalfDay: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  Leave: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300',
  // Skill
  Skilled: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  SemiSkilled: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  Unskilled: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300',
}

const statusLabels: Record<string, string> = {
  ExpiringSoon: 'Expiring Soon',
  FitWithRestriction: 'Fit w/ Restriction',
  UnderInvestigation: 'Under Investigation',
  InProgress: 'In Progress',
  NonCompliant: 'Non-Compliant',
  SemiSkilled: 'Semi-Skilled',
  NeedsRepair: 'Needs Repair',
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const cls = statusClassMap[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300'
  const label = statusLabels[status] || status.replace(/([A-Z])/g, ' $1').trim()
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'} ${cls}`}>
      {label}
    </span>
  )
}
