'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface SelectableWorker {
  id: string
  employeeNumber: string
  fullName: string
  isActive: boolean
  designation: { name: string }
}

interface Props {
  workers: SelectableWorker[]
  value: string[]
  onChange: (ids: string[]) => void
  loading?: boolean
  disabled?: boolean
  placeholder?: string
  /** Rendered under the control, e.g. a validation message. */
  className?: string
}

/**
 * Searchable multi-select for workers.
 *
 * Search matches name, employee number and designation; "Select all" applies to
 * whatever the current search narrows the list to, so a query like "mason" plus
 * one click selects that whole trade.
 */
export default function WorkerMultiSelect({
  workers,
  value,
  onChange,
  loading = false,
  disabled = false,
  placeholder = 'Select workers...',
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const sorted = useMemo(
    () => [...workers].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [workers],
  )

  // Filtering is done here rather than by cmdk's built-in matcher so that
  // "Select all" can act on exactly the rows the user can see.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter(
      (w) =>
        w.fullName.toLowerCase().includes(q) ||
        w.employeeNumber.toLowerCase().includes(q) ||
        w.designation.name.toLowerCase().includes(q),
    )
  }, [sorted, query])

  const selected = useMemo(
    () => sorted.filter((w) => value.includes(w.id)),
    [sorted, value],
  )

  const visibleIds = visible.map((w) => w.id)
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => value.includes(id))

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  }

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      onChange(value.filter((id) => !visibleIds.includes(id)))
    } else {
      onChange([...new Set([...value, ...visibleIds])])
    }
  }

  return (
    <div className={className}>
      <Popover open={open && !disabled} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className="flex items-center gap-2 min-w-0">
              <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {loading
                  ? 'Loading workers...'
                  : value.length === 0
                    ? placeholder
                    : value.length === 1
                      ? selected[0]?.fullName
                      : `${value.length} workers selected`}
              </span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search name, employee no. or role..."
              value={query}
              onValueChange={setQuery}
            />
            <div className="flex items-center justify-between border-b px-3 py-2">
              <button
                type="button"
                className="text-xs font-medium text-[#0d9488] hover:underline"
                onClick={toggleAllVisible}
                disabled={visible.length === 0}
              >
                {allVisibleSelected
                  ? `Clear these ${visible.length}`
                  : `Select all ${visible.length}`}
              </button>
              <span className="text-xs text-muted-foreground">
                {value.length} selected
              </span>
            </div>
            <CommandList className="max-h-64">
              <CommandEmpty>No workers found.</CommandEmpty>
              <CommandGroup>
                {visible.map((w) => {
                  const isSelected = value.includes(w.id)
                  return (
                    <CommandItem
                      key={w.id}
                      value={w.id}
                      onSelect={() => toggle(w.id)}
                      className="gap-2"
                    >
                      <div
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          isSelected
                            ? 'border-[#0d9488] bg-[#0d9488] text-white'
                            : 'border-muted-foreground/40',
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span className="truncate">{w.fullName}</span>
                      <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
                        {w.employeeNumber}
                      </span>
                      {!w.isActive && (
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected chips — capped so a large batch can't push the form off-screen */}
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto rounded-md border border-dashed p-2">
          {selected.map((w) => (
            <Badge
              key={w.id}
              variant="secondary"
              className="gap-1 pr-1 font-normal"
            >
              <span className="truncate max-w-[160px]">{w.fullName}</span>
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                onClick={() => toggle(w.id)}
                aria-label={`Remove ${w.fullName}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selected.length > 1 && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline px-1"
              onClick={() => onChange([])}
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  )
}
