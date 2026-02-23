/**
 * Empty State Component
 * Shown when there's no data to display
 */
'use client'

import { FileText } from 'lucide-react'

export default function EmptyState({ 
  icon: Icon = FileText, 
  title = 'No data found', 
  description = 'There is no data to display at the moment.',
  action = null 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {action}
    </div>
  )
}
