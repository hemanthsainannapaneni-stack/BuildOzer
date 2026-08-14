import { Button } from '@/components/ui/button'
import { useNavStore } from '@/stores/nav-store'
import { ChevronLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  description?: string
  showBack?: boolean
  action?: { label: string; onClick: () => void; variant?: 'default' | 'outline' | 'destructive' }
}

export function PageHeader({ title, description, showBack, action }: PageHeaderProps) {
  const goBack = useNavStore(s => s.goBack)
  const activePage = useNavStore(s => s.activePage)
  const hasBackTarget = ['worker-detail', 'worker-form', 'worker-fitness', 'incident-detail', 'incident-form', 'vehicle-detail'].includes(activePage)

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {(showBack || hasBackTarget) && (
          <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {action && (
        <Button variant={action.variant || 'default'} onClick={action.onClick} className="mt-2 sm:mt-0">
          {action.label}
        </Button>
      )}
    </div>
  )
}
