'use client'
import { LogEntry } from '@/lib/api'
import { useEffect, useRef } from 'react'
import clsx from 'clsx'

interface Props {
  logs: LogEntry[]
  maxHeight?: string
  autoScroll?: boolean
}

export function LogTerminal({ logs, maxHeight = '400px', autoScroll = true }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  return (
    <div
      className="log-terminal"
      style={{ maxHeight }}
    >
      {logs.length === 0 ? (
        <p className="text-slate-600 text-xs">No logs yet...</p>
      ) : (
        logs.map((log, i) => (
          <div key={i} className="mb-0.5">
            <span className="text-slate-600 mr-2">
              {new Date(log.ts).toLocaleTimeString()}
            </span>
            <span
              className={clsx(
                'text-xs',
                log.level === 'error' ? 'log-error' :
                log.level === 'warning' ? 'log-warning' :
                log.msg?.startsWith('✅') || log.msg?.startsWith('🎉') ? 'log-success' :
                'log-info'
              )}
            >
              {log.msg}
            </span>
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  )
}
