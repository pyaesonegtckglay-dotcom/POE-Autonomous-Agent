'use client'
import clsx from 'clsx'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending: { label: 'Pending', color: 'text-slate-300', bg: 'bg-slate-700/50', dot: 'bg-slate-400' },
  planning: { label: 'Planning', color: 'text-blue-300', bg: 'bg-blue-900/30', dot: 'bg-blue-400' },
  running: { label: 'Running', color: 'text-emerald-300', bg: 'bg-emerald-900/30', dot: 'bg-emerald-400' },
  verifying: { label: 'Verifying', color: 'text-violet-300', bg: 'bg-violet-900/30', dot: 'bg-violet-400' },
  repairing: { label: 'Repairing', color: 'text-orange-300', bg: 'bg-orange-900/30', dot: 'bg-orange-400' },
  complete: { label: 'Complete', color: 'text-green-300', bg: 'bg-green-900/30', dot: 'bg-green-400' },
  failed: { label: 'Failed', color: 'text-red-300', bg: 'bg-red-900/30', dot: 'bg-red-400' },
  cancelled: { label: 'Cancelled', color: 'text-gray-400', bg: 'bg-gray-800/50', dot: 'bg-gray-500' },
}

interface Props {
  status: string
  size?: 'sm' | 'md'
  showDot?: boolean
}

export function StatusBadge({ status, size = 'md', showDot = true }: Props) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const isActive = ['planning', 'running', 'verifying', 'repairing'].includes(status)

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.bg,
        config.color,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      {showDot && (
        <span
          className={clsx(
            'rounded-full',
            config.dot,
            size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
            isActive && 'live-indicator'
          )}
        />
      )}
      {config.label}
    </span>
  )
}
