import axios from 'axios'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://PYAE1994-poe-autonomous-agent-backend.hf.space'

export const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Types
export interface Task {
  id: string
  title: string
  description?: string
  status: 'pending' | 'planning' | 'running' | 'verifying' | 'repairing' | 'complete' | 'failed' | 'cancelled'
  dag?: DAG
  execution_result?: ExecutionResult
  repair_history?: RepairEntry[]
  logs?: LogEntry[]
  files_created?: string[]
  error_message?: string
  created_at?: string
  updated_at?: string
  completed_at?: string
}

export interface DAG {
  goal: string
  nodes: DAGNode[]
}

export interface DAGNode {
  id: string
  type: 'shell' | 'code' | 'file' | 'verify' | 'deploy'
  description: string
  command?: string
  code?: string
  depends_on: string[]
  status: 'pending' | 'running' | 'failed' | 'complete'
}

export interface ExecutionResult {
  success_count: number
  total_count: number
  node_results: Record<string, any>
}

export interface RepairEntry {
  node_id: string
  attempt: number
  repair: {
    failure_category: string
    root_cause: string
    fix_description: string
  }
}

export interface LogEntry {
  ts: string
  level: string
  msg: string
}

export interface HealthStatus {
  status: string
  version: string
  service: string
  redis?: string
  database?: string
}

// API calls
export const healthCheck = () => api.get<HealthStatus>('/api/health')

export const createTask = (title: string, description?: string) =>
  api.post<Task>('/api/tasks', { title, description: description || title })

export const getTask = (id: string) => api.get<Task>(`/api/tasks/${id}`)

export const listTasks = (limit = 20, offset = 0) =>
  api.get<{ tasks: Task[]; total: number }>(`/api/tasks?limit=${limit}&offset=${offset}`)

export const cancelTask = (id: string) => api.post(`/api/tasks/${id}/cancel`)

export const resumeTask = (id: string) => api.post(`/api/tasks/${id}/resume`)

export const getLogs = (id: string) =>
  api.get<{ task_id: string; status: string; logs: LogEntry[] }>(`/api/logs/${id}`)

export const deployToHF = (spaceName: string) =>
  api.post('/api/deploy/hf', { space_name: spaceName })

export const deployToVercel = (projectName: string) =>
  api.post('/api/deploy/vercel', { project_name: projectName })

export const getDeployment = (id: string) => api.get(`/api/deploy/${id}`)

export const getStats = () => api.get('/api/stats')

export const BACKEND_BASE = BACKEND_URL
