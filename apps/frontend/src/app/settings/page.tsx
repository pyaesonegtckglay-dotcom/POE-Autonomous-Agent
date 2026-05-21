'use client'
import { useState, useEffect } from 'react'
import { healthCheck, getStats, BACKEND_BASE } from '@/lib/api'

export default function SettingsPage() {
  const [health, setHealth] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [backendUrl] = useState(BACKEND_BASE)

  useEffect(() => {
    healthCheck().then((r) => setHealth(r.data)).catch(() => {})
    getStats().then((r) => setStats(r.data)).catch(() => {})
  }, [])

  const ENV_VARS = [
    { key: 'NEXT_PUBLIC_BACKEND_URL', value: backendUrl, desc: 'Backend API URL' },
    { key: 'DATABASE_URL', value: '***configured***', desc: 'PostgreSQL connection' },
    { key: 'REDIS_URL', value: '***configured***', desc: 'Upstash Redis URL' },
    { key: 'OPENROUTER_API_KEY', value: '***configured***', desc: 'OpenRouter API for LLM' },
    { key: 'HF_TOKEN', value: '***configured***', desc: 'HuggingFace token' },
    { key: 'VERCEL_TOKEN', value: '***configured***', desc: 'Vercel deployment token' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold poe-gradient-text mb-2">Settings</h1>
      <p className="text-slate-400 mb-8">System configuration and environment overview.</p>

      {/* Backend Status */}
      <div className="bg-poe-card border border-poe-blue/20 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">System Status</h2>
        {health ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500">Service</p>
              <p className="text-sm text-green-400">{health.status}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Version</p>
              <p className="text-sm text-slate-200">{health.version}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Redis</p>
              <p className={`text-sm ${health.redis === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                {health.redis || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Database</p>
              <p className={`text-sm ${health.database === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                {health.database || '—'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">Backend offline or unreachable</p>
        )}

        {stats && (
          <div className="mt-4 pt-4 border-t border-poe-blue/10 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500">CPU</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-poe-dark rounded-full h-1.5">
                  <div className="bg-poe-blue h-1.5 rounded-full" style={{ width: `${stats.cpu_percent}%` }} />
                </div>
                <span className="text-xs text-slate-300">{stats.cpu_percent}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500">Memory</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-poe-dark rounded-full h-1.5">
                  <div className="bg-poe-purple h-1.5 rounded-full" style={{ width: `${stats.memory_percent}%` }} />
                </div>
                <span className="text-xs text-slate-300">{stats.memory_percent}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500">Disk</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-poe-dark rounded-full h-1.5">
                  <div className="bg-poe-cyan h-1.5 rounded-full" style={{ width: `${stats.disk_percent}%` }} />
                </div>
                <span className="text-xs text-slate-300">{stats.disk_percent}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Environment Variables */}
      <div className="bg-poe-card border border-poe-blue/20 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Environment Configuration</h2>
        <div className="space-y-3">
          {ENV_VARS.map((env) => (
            <div key={env.key} className="flex items-center justify-between py-2 border-b border-poe-blue/10 last:border-0">
              <div>
                <code className="text-xs text-poe-cyan font-mono">{env.key}</code>
                <p className="text-xs text-slate-500 mt-0.5">{env.desc}</p>
              </div>
              <code className="text-xs text-slate-400 font-mono max-w-[200px] truncate">{env.value}</code>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture Info */}
      <div className="bg-poe-card border border-poe-blue/20 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Architecture</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <p className="text-slate-400"><span className="text-poe-cyan">Backend:</span> FastAPI + LangGraph + SWE-agent patterns</p>
            <p className="text-slate-400"><span className="text-poe-cyan">Frontend:</span> Next.js 14 + TailwindCSS</p>
            <p className="text-slate-400"><span className="text-poe-cyan">Orchestration:</span> DAG-based LangGraph planner</p>
            <p className="text-slate-400"><span className="text-poe-cyan">Sandbox:</span> Isolated per-task execution</p>
          </div>
          <div className="space-y-2">
            <p className="text-slate-400"><span className="text-poe-cyan">DB:</span> PostgreSQL (Supabase)</p>
            <p className="text-slate-400"><span className="text-poe-cyan">Cache:</span> Redis (Upstash)</p>
            <p className="text-slate-400"><span className="text-poe-cyan">LLM:</span> OpenRouter (GPT-4o-mini)</p>
            <p className="text-slate-400"><span className="text-poe-cyan">Repair Loop:</span> Up to 3 auto-retries</p>
          </div>
        </div>
      </div>
    </div>
  )
}
