'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getTask, cancelTask, resumeTask, Task } from '@/lib/api'
import { StatusBadge } from '@/components/StatusBadge'
import { DAGViewer } from '@/components/DAGViewer'
import { LogTerminal } from '@/components/LogTerminal'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

export default function TaskPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string
  const [task, setTask] = useState<Task | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'dag' | 'logs' | 'repair'>('overview')
  const [loading, setLoading] = useState(true)

  const fetchTask = async () => {
    try {
      const res = await getTask(taskId)
      setTask(res.data)
    } catch (err) {
      console.error('Failed to load task:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTask()
    const isActive = (status: string) =>
      ['pending', 'planning', 'running', 'verifying', 'repairing'].includes(status)

    const interval = setInterval(async () => {
      const res = await getTask(taskId).catch(() => null)
      if (res) {
        setTask(res.data)
        if (!isActive(res.data.status)) {
          clearInterval(interval)
        }
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [taskId])

  const handleCancel = async () => {
    try {
      await cancelTask(taskId)
      toast.success('Task cancelled')
      fetchTask()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to cancel')
    }
  }

  const handleResume = async () => {
    try {
      await resumeTask(taskId)
      toast.success('Task resumed')
      fetchTask()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to resume')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8 border-4 border-poe-blue border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-slate-400">Task not found</p>
        <Link href="/dashboard" className="text-poe-cyan text-sm mt-2 block">← Back to Dashboard</Link>
      </div>
    )
  }

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'dag', label: `DAG (${task.dag?.nodes?.length || 0} nodes)` },
    { id: 'logs', label: `Logs (${task.logs?.length || 0})` },
    { id: 'repair', label: `Repairs (${task.repair_history?.length || 0})` },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard" className="text-slate-500 hover:text-poe-cyan text-sm mb-3 block">
          ← Back to Dashboard
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">{task.title}</h1>
            <div className="flex items-center gap-3">
              <StatusBadge status={task.status} />
              <span className="text-xs text-slate-500 font-mono">{task.id}</span>
              {task.created_at && (
                <span className="text-xs text-slate-500">
                  {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {['pending', 'planning', 'running'].includes(task.status) && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm rounded-lg border border-red-500/50 text-red-400 hover:bg-red-900/20 transition-colors"
              >
                Cancel
              </button>
            )}
            {['failed', 'cancelled'].includes(task.status) && (
              <button
                onClick={handleResume}
                className="px-4 py-2 text-sm rounded-lg bg-poe-blue/20 border border-poe-blue/50 text-poe-cyan hover:bg-poe-blue/30 transition-colors"
              >
                ↺ Resume
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      {task.execution_result && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-poe-card border border-poe-blue/20 rounded-xl p-4">
            <div className="text-xs text-slate-500">Success Rate</div>
            <div className="text-2xl font-bold text-green-400">
              {Math.round((task.execution_result.success_count / task.execution_result.total_count) * 100)}%
            </div>
          </div>
          <div className="bg-poe-card border border-poe-blue/20 rounded-xl p-4">
            <div className="text-xs text-slate-500">Nodes Executed</div>
            <div className="text-2xl font-bold poe-gradient-text">
              {task.execution_result.success_count}/{task.execution_result.total_count}
            </div>
          </div>
          <div className="bg-poe-card border border-poe-blue/20 rounded-xl p-4">
            <div className="text-xs text-slate-500">Repair Attempts</div>
            <div className="text-2xl font-bold text-orange-400">
              {task.repair_history?.length || 0}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-poe-blue/20 pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-poe-blue/20 text-poe-cyan border border-poe-blue/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-poe-card rounded-xl border border-poe-blue/20 p-6">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">Task Description</h3>
              <p className="text-slate-200">{task.description || task.title}</p>
            </div>
            {task.error_message && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                <p className="text-xs text-red-400 font-medium mb-1">Error</p>
                <p className="text-sm text-red-300">{task.error_message}</p>
              </div>
            )}
            {task.files_created && task.files_created.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">Files Created</h3>
                <div className="space-y-1">
                  {task.files_created.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <span className="text-poe-cyan">📄</span>
                      <code className="text-slate-300 font-mono text-xs">{f}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {task.dag?.goal && (
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">Agent Goal</h3>
                <p className="text-sm text-slate-300 italic">{task.dag.goal}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dag' && (
          <DAGViewer nodes={task.dag?.nodes || []} />
        )}

        {activeTab === 'logs' && (
          <LogTerminal logs={task.logs || []} maxHeight="500px" />
        )}

        {activeTab === 'repair' && (
          <div className="space-y-3">
            {!task.repair_history || task.repair_history.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No repairs needed ✅</p>
            ) : (
              task.repair_history.map((r, i) => (
                <div key={i} className="bg-orange-900/10 border border-orange-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-orange-400">Node: {r.node_id}</span>
                    <span className="text-xs text-slate-500">Attempt #{r.attempt}</span>
                  </div>
                  <p className="text-xs text-slate-400">Category: <span className="text-orange-300">{r.repair?.failure_category}</span></p>
                  <p className="text-xs text-slate-400">Root Cause: <span className="text-slate-200">{r.repair?.root_cause}</span></p>
                  <p className="text-xs text-slate-400">Fix: <span className="text-green-300">{r.repair?.fix_description}</span></p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
