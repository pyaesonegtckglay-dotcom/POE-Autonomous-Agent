'use client'
import { DAGNode } from '@/lib/api'
import clsx from 'clsx'

const TYPE_ICONS: Record<string, string> = {
  shell: '⚡',
  code: '💻',
  file: '📄',
  verify: '✅',
  deploy: '🚀',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'border-slate-600 bg-slate-800/50',
  running: 'border-emerald-500 bg-emerald-900/20 shadow-[0_0_8px_rgba(52,211,153,0.3)]',
  failed: 'border-red-500 bg-red-900/20',
  complete: 'border-green-500 bg-green-900/20',
}

interface Props {
  nodes: DAGNode[]
}

export function DAGViewer({ nodes }: Props) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="text-center text-slate-500 py-8">
        <p className="text-2xl mb-2">⬡</p>
        <p className="text-sm">No DAG generated yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {nodes.map((node) => (
          <div
            key={node.id}
            className={clsx(
              'flex-1 min-w-[200px] max-w-[280px] rounded-lg border p-3 transition-all',
              STATUS_COLORS[node.status] || STATUS_COLORS.pending
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-slate-400">{node.id}</span>
              <span className="text-sm">{TYPE_ICONS[node.type] || '▶'}</span>
            </div>
            <p className="text-xs text-slate-300 mb-2 line-clamp-2">
              {node.description || node.type}
            </p>
            {node.command && (
              <code className="text-xs text-poe-cyan font-mono bg-black/30 px-1 rounded block truncate">
                {node.command}
              </code>
            )}
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-500 capitalize">{node.status}</span>
              {node.depends_on?.length > 0 && (
                <span className="text-xs text-slate-600">
                  ← {node.depends_on.join(', ')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500" /> Pending</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Running</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Complete</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Failed</span>
      </div>
    </div>
  )
}
