'use client'
import { useState, useEffect } from 'react'
import { createTask, listTasks, Task, healthCheck } from '@/lib/api'
import { StatusBadge } from '@/components/StatusBadge'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [taskInput, setTaskInput] = useState('')
  const [health, setHealth] = useState<any>(null)

  const fetchTasks = async () => {
    try {
      const res = await listTasks(20)
      setTasks(res.data.tasks || [])
    } catch (err) {
      console.error('Failed to load tasks:', err)
    }
    setLoading(false)
  }

  const fetchHealth = async () => {
    try {
      const res = await healthCheck()
      setHealth(res.data)
    } catch {
      setHealth(null)
    }
  }

  useEffect(() => {
    fetchTasks()
    fetchHealth()
    const interval = setInterval(() => {
      fetchTasks()
      fetchHealth()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskInput.trim()) return

    setSubmitting(true)
    try {
      const res = await createTask(taskInput.trim())
      toast.success(`Task created: ${res.data.id.slice(0, 8)}...`)
      setTaskInput('')
      setTimeout(fetchTasks, 500)
    } catch (err: any) {
      toast.error(`Failed: ${err?.response?.data?.detail || err.message}`)
    }
    setSubmitting(false)
  }

  const EXAMPLE_TASKS = [
    'Create a hello-world Python API with FastAPI and verify it works',
    'Write a fibonacci calculator in Python with unit tests',
    'Create a bash script that monitors system CPU and memory',
    'Build a simple web scraper that fetches GitHub trending repos',
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold poe-gradient-text mb-2">
          POE Autonomous Agent
        </h1>
        <p className="text-slate-400">
          Submit engineering tasks for autonomous planning, execution, and verification.
        </p>
      </div>

      {/* Health Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-poe-card rounded-xl border border-poe-blue/20 p-4 card-glow">
          <div className="text-xs text-slate-500 mb-1">Backend Status</div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${health ? 'bg-green-400 live-indicator' : 'bg-red-400'}`} />
            <span className={`text-sm font-medium ${health ? 'text-green-400' : 'text-red-400'}`}>
              {health ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        <div className="bg-poe-card rounded-xl border border-poe-blue/20 p-4">
          <div className="text-xs text-slate-500 mb-1">Redis</div>
          <div className="text-sm font-medium text-slate-300">
            {health?.redis === 'connected' ? '✅ Connected' : health?.redis ? `⚠️ ${health.redis.slice(0, 20)}` : '—'}
          </div>
        </div>
        <div className="bg-poe-card rounded-xl border border-poe-blue/20 p-4">
          <div className="text-xs text-slate-500 mb-1">Database</div>
          <div className="text-sm font-medium text-slate-300">
            {health?.database === 'connected' ? '✅ Connected' : health?.database ? `⚠️ ${health.database.slice(0, 20)}` : '—'}
          </div>
        </div>
        <div className="bg-poe-card rounded-xl border border-poe-blue/20 p-4">
          <div className="text-xs text-slate-500 mb-1">Total Tasks</div>
          <div className="text-2xl font-bold poe-gradient-text">{tasks.length}</div>
        </div>
      </div>

      {/* Task Submission */}
      <div className="bg-poe-card rounded-xl border border-poe-blue/20 p-6 mb-8 card-glow">
        <h2 className="text-lg font-semibold text-white mb-4">
          🚀 Submit New Task
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            placeholder="Describe your engineering task... e.g. 'Create a REST API that fetches weather data and returns it as JSON'"
            className="w-full bg-poe-dark border border-poe-blue/30 rounded-lg p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-poe-blue text-sm resize-none"
            rows={3}
          />
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_TASKS.map((task) => (
                <button
                  key={task}
                  type="button"
                  onClick={() => setTaskInput(task)}
                  className="text-xs text-slate-500 hover:text-poe-cyan border border-slate-700 hover:border-poe-blue/50 rounded px-2 py-1 transition-colors"
                >
                  {task.slice(0, 40)}...
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={submitting || !taskInput.trim()}
              className="ml-4 px-6 py-2 bg-gradient-to-r from-poe-purple to-poe-blue rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="spinner w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                  Submitting...
                </span>
              ) : '▶ Run Task'}
            </button>
          </div>
        </form>
      </div>

      {/* Task List */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Recent Tasks</h2>
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-4xl mb-3">🤖</p>
            <p>No tasks yet. Submit your first task above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={`/task/${task.id}`}
                className="block bg-poe-card rounded-xl border border-poe-blue/10 hover:border-poe-blue/40 p-4 transition-all hover:card-glow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{task.title}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {task.id.slice(0, 8)}... •{' '}
                      {task.created_at
                        ? formatDistanceToNow(new Date(task.created_at), { addSuffix: true })
                        : 'just now'}
                    </p>
                  </div>
                  <StatusBadge status={task.status} size="sm" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
