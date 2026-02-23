/**
 * Loading Spinner Component
 * Reusable loading indicator
 */
'use client'

import { RefreshCw } from 'lucide-react'

export default function LoadingSpinner({ size = 'default', className = '' }) {
  const sizeClasses = {
    small: 'w-4 h-4',
    default: 'w-6 h-6',
    large: 'w-8 h-8',
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <RefreshCw className={`${sizeClasses[size]} animate-spin text-emerald-600`} />
    </div>
  )
}

export function LoadingOverlay({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 gap-2">
      <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
