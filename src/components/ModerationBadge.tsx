import { Badge } from '@/components/ui/badge'
import { ShieldCheck, ShieldWarning, Clock } from '@phosphor-icons/react'
import type { ModerationStatus } from '@/lib/types'

interface ModerationBadgeProps {
  status: ModerationStatus
  className?: string
}

const statusConfig: Record<ModerationStatus, {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  Icon: typeof ShieldCheck
}> = {
  approved: { label: 'Approved', variant: 'secondary', Icon: ShieldCheck },
  flagged: { label: 'Flagged', variant: 'destructive', Icon: ShieldWarning },
  pending: { label: 'Pending Review', variant: 'outline', Icon: Clock },
}

/** Displays a colored badge for a content moderation status */
export function ModerationBadge({ status, className }: ModerationBadgeProps) {
  const { label, variant, Icon } = statusConfig[status]
  return (
    <Badge variant={variant} className={className}>
      <Icon size={14} className="mr-1" />
      {label}
    </Badge>
  )
}
