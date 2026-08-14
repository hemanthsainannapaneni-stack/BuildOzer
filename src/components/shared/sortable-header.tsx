'use client'

import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { TableHead } from '@/components/ui/table'
import type { SortDir } from '@/lib/use-sort'

interface SortableHeaderProps {
  column: string
  sortKey: string | null
  sortDir: SortDir
  onToggle: (key: string) => void
  children: React.ReactNode
  className?: string
}

export function SortableHeader({ column, sortKey, sortDir, onToggle, children, className }: SortableHeaderProps) {
  const isActive = sortKey === column
  return (
    <TableHead
      className={`cursor-pointer select-none hover:bg-muted/50 transition-colors ${className ?? ''}`}
      onClick={() => onToggle(column)}
    >
      <div className="flex items-center gap-1.5">
        <span>{children}</span>
        {isActive ? (
          sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-teal-600" /> : <ArrowDown className="h-3.5 w-3.5 text-teal-600" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/40" />
        )}
      </div>
    </TableHead>
  )
}
