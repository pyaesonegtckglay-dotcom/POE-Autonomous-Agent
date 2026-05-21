'use client'
import { useState, useEffect } from 'react'
import { listTasks, getLogs, Task } from '@/lib/api'
import { StatusBadge } from '@/components/StatusBadge'
import { LogTerminal } from '@/components/LogTerminal'

export default function LogsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    listTasks(30).then((res) => setTasks(res.data.tasks || [])).catch(console.error)
  }, [])

  const loadLogs = async (taskId: string) => {
    setSelected(taskId)
    setLoading(true)
    try {
      const res = await getLogs(taskId)
      setLogs(res.data.logs || [])
    } catch {
      setLogs([{ ts: new Date().toISOString(), level: 'error', msg: 'Failed to load logs' }])
    }
    setLoading(false)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold poe-gradient-text mb-6">Execution Logs</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Task list */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-slate-400 mb-3">Tasks</h2>
          {tasks.length === 0 ? (
            <p className="text-slate-500 text-sm">No tasks yet</p>
          ) : (
            tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => loadLogs(task.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selected === task.id
                    ? 'border-poe-blue/60 bg-poe-blue/10'
                    : 'border-poe-blue/10 hover:border-poe-blue/30 bg-poe-card'
                }`}
              >
                <p className="text-sm text-slate-200 truncate mb-1">{task.title}</p>
                <StatusBadge status={task.status} size="sm" />
              </button>
            ))
          )}
        </div>

        {/* Log viewer */}
        <div className="md:col-span-2">
          <h2 className="text-sm font-medium text-slate-400 mb-3">
            {selected ? `Logs for ${selected.slice(0, 8)}...` : 'Select a task'}
          </h2>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="spinner w-6 h-6 border-4 border-poe-blue border-t-transparent rounded-full" />
            </div>
          ) : selected ? (
            <LogTerminal logs={logs} maxHeight="600px" />
          ) : (
            <div className="log-terminal h-32 flex items-center justify-center text-slate-600">
              Select a task to view its logs
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
