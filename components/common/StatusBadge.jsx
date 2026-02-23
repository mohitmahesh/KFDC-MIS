/**
 * Status Badge Component
 * Reusable badge for displaying status with appropriate styling
 */
'use client'

import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, AlertTriangle, Send } from 'lucide-react'
import { STATUS_COLORS, STATUS_LABELS } from './constants'

const STATUS_ICONS = {
  DRAFT: <Clock className="w-3.5 h-3.5" />,
  PENDING_DM_APPROVAL: <AlertTriangle className="w-3.5 h-3.5" />,
  PENDING_HO_APPROVAL: <Send className="w-3.5 h-3.5" />,
  PENDING_APPROVAL: <AlertTriangle className="w-3.5 h-3.5" />,
  SANCTIONED: <CheckCircle className="w-3.5 h-3.5" />,
  REJECTED: <XCircle className="w-3.5 h-3.5" />,
}

export default function StatusBadge({ status, showIcon = true, className = '' }) {
  const colorClass = STATUS_COLORS[status] || STATUS_COLORS.DRAFT
  const label = STATUS_LABELS[status] || status
  const icon = STATUS_ICONS[status]

  return (
    <Badge className={`${colorClass} ${className} gap-1`}>
      {showIcon && icon}
      {label}
    </Badge>
  )
}
