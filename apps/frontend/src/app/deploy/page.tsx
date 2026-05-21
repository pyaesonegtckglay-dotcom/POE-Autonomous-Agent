'use client'
import { useState } from 'react'
import { deployToHF, deployToVercel, getDeployment } from '@/lib/api'
import toast from 'react-hot-toast'

export default function DeployPage() {
  const [hfSpace, setHfSpace] = useState('pyaesonegtckglay/poe-autonomous-agent-backend')
  const [vercelProject, setVercelProject] = useState('poe-autonomous-agent')
  const [deployingHF, setDeployingHF] = useState(false)
  const [deployingVercel, setDeployingVercel] = useState(false)
  const [results, setResults] = useState<any[]>([])

  const handleHFDeploy = async () => {
    setDeployingHF(true)
    try {
      const res = await deployToHF(hfSpace)
      const deployId = res.data.deploy_id
      toast.success(`HF deployment queued: ${deployId.slice(0, 8)}...`)

      // Poll for status
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        const status = await getDeployment(deployId).catch(() => null)
        if (status) {
          setResults((prev) => [
            { ...status.data, target: 'HuggingFace' },
            ...prev.filter((r) => r.id !== deployId),
          ])
          if (status.data.status !== 'queued' || attempts > 10) {
            clearInterval(poll)
            setDeployingHF(false)
          }
        }
      }, 3000)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'HF deploy failed')
      setDeployingHF(false)
    }
  }

  const handleVercelDeploy = async () => {
    setDeployingVercel(true)
    try {
      const res = await deployToVercel(vercelProject)
      const deployId = res.data.deploy_id
      toast.success(`Vercel deployment queued: ${deployId.slice(0, 8)}...`)

      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        const status = await getDeployment(deployId).catch(() => null)
        if (status) {
          setResults((prev) => [
            { ...status.data, target: 'Vercel' },
            ...prev.filter((r) => r.id !== deployId),
          ])
          if (status.data.status !== 'queued' || attempts > 10) {
            clearInterval(poll)
            setDeployingVercel(false)
          }
        }
      }, 3000)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Vercel deploy failed')
      setDeployingVercel(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold poe-gradient-text mb-2">Deployment Center</h1>
      <p className="text-slate-400 mb-8">Deploy backend to HuggingFace Spaces and frontend to Vercel.</p>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* HuggingFace */}
        <div className="bg-poe-card border border-poe-blue/20 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center text-xl">🤗</div>
            <div>
              <h2 className="text-lg font-semibold text-white">HuggingFace Spaces</h2>
              <p className="text-xs text-slate-500">Backend API deployment</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Space Name</label>
              <input
                value={hfSpace}
                onChange={(e) => setHfSpace(e.target.value)}
                className="w-full bg-poe-dark border border-poe-blue/20 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-poe-blue"
              />
            </div>
            <div className="bg-poe-dark/50 rounded-lg p-3 text-xs text-slate-400 space-y-1">
              <p>• Docker SDK space</p>
              <p>• Auto-restart safe</p>
              <p>• FastAPI on port 7860</p>
              <p>• /api/health endpoint</p>
            </div>
            <button
              onClick={handleHFDeploy}
              disabled={deployingHF}
              className="w-full py-2.5 bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 rounded-lg text-sm font-medium hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
            >
              {deployingHF ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner w-3 h-3 border-2 border-yellow-300 border-t-transparent rounded-full" />
                  Deploying...
                </span>
              ) : '🤗 Deploy to HuggingFace'}
            </button>
          </div>
        </div>

        {/* Vercel */}
        <div className="bg-poe-card border border-poe-blue/20 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">▲</div>
            <div>
              <h2 className="text-lg font-semibold text-white">Vercel</h2>
              <p className="text-xs text-slate-500">Frontend deployment</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Project Name</label>
              <input
                value={vercelProject}
                onChange={(e) => setVercelProject(e.target.value)}
                className="w-full bg-poe-dark border border-poe-blue/20 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-poe-blue"
              />
            </div>
            <div className="bg-poe-dark/50 rounded-lg p-3 text-xs text-slate-400 space-y-1">
              <p>• Next.js production build</p>
              <p>• Auto CDN deployment</p>
              <p>• Environment variables</p>
              <p>• Edge runtime</p>
            </div>
            <button
              onClick={handleVercelDeploy}
              disabled={deployingVercel}
              className="w-full py-2.5 bg-white/10 border border-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              {deployingVercel ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                  Deploying...
                </span>
              ) : '▲ Deploy to Vercel'}
            </button>
          </div>
        </div>
      </div>

      {/* Deployment Results */}
      {results.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Deployment Results</h2>
          <div className="space-y-3">
            {results.map((r) => (
              <div
                key={r.id}
                className="bg-poe-card border border-poe-blue/20 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-200">{r.target} Deployment</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    r.status === 'deployed' ? 'bg-green-900/30 text-green-400' :
                    r.status === 'failed' ? 'bg-red-900/30 text-red-400' :
                    'bg-yellow-900/30 text-yellow-400'
                  }`}>
                    {r.status}
                  </span>
                </div>
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-poe-cyan hover:underline"
                  >
                    {r.url}
                  </a>
                )}
                {r.logs && r.logs.length > 0 && (
                  <div className="mt-2 bg-black/20 rounded p-2 max-h-24 overflow-y-auto">
                    {r.logs.map((l: string, i: number) => (
                      <p key={i} className="text-xs text-slate-400">{l}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Deployment Info */}
      <div className="mt-8 bg-poe-card border border-poe-blue/20 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Live Deployments</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Backend (HuggingFace)</p>
            <a
              href="https://PYAE1994-poe-autonomous-agent-backend.hf.space"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-poe-cyan hover:underline break-all"
            >
              https://PYAE1994-poe-autonomous-agent-backend.hf.space
            </a>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Frontend (Vercel)</p>
            <a
              href="https://poe-autonomous-agent.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-poe-cyan hover:underline"
            >
              https://poe-autonomous-agent.vercel.app
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
