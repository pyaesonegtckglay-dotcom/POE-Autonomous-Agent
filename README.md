# POE Autonomous Agent

A production-grade autonomous AI developer operating system.

![POE Logo](https://i.imgur.com/kRVXVzS.png)

## Architecture

```
POE-AUTONOMOUS-AGENT/
├── apps/
│   ├── control-plane/     # FastAPI backend (deployed on HuggingFace)
│   ├── execution-core/    # Sandbox execution (embedded in control-plane)
│   ├── agent-brain/       # LangGraph DAG planner (embedded in control-plane)
│   └── frontend/          # Next.js dashboard (deployed on Vercel)
└── infra/
    ├── docker/            # Docker Compose
    ├── postgres/          # DB schema
    ├── redis/             # Redis config
    └── env/               # Environment templates
```

## Live Deployments

- **Backend**: https://pyaesonegtckglay-poe-autonomous-agent-backend.hf.space
- **Frontend**: https://poe-autonomous-agent.vercel.app
- **GitHub**: https://github.com/pyaesonegtckglay-dotcom/POE-Autonomous-Agent
- **API Docs**: https://pyaesonegtckglay-poe-autonomous-agent-backend.hf.space/docs

## Features

- 🧠 **LangGraph DAG Planning** - Tasks broken into executable node graphs
- ⚙️ **Isolated Sandbox Execution** - Each task runs in `/tmp/poe_sandbox/task_{id}/`
- 🔧 **Self-Repair Loop** - Auto-fixes failures up to 3 times using SWE-agent patterns
- 💾 **Persistent State** - PostgreSQL + Redis for task history
- 📊 **Real-time Dashboard** - Next.js UI with live logs and DAG visualization
- 🚀 **Deployment APIs** - Deploy to HuggingFace and Vercel from the UI

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| POST | /api/tasks | Submit new task |
| GET | /api/tasks/{id} | Get task status |
| POST | /api/tasks/{id}/cancel | Cancel task |
| POST | /api/tasks/{id}/resume | Resume failed task |
| GET | /api/logs/{id} | Get task logs |
| POST | /api/deploy/hf | Deploy to HuggingFace |
| POST | /api/deploy/vercel | Deploy to Vercel |

## Tech Stack

- **Backend**: FastAPI, LangGraph, SQLAlchemy, asyncpg
- **Frontend**: Next.js 14, TailwindCSS, TypeScript
- **Database**: PostgreSQL (Supabase)
- **Cache/Queue**: Redis (Upstash)
- **LLM**: OpenRouter (GPT-4o-mini)
- **Execution**: Isolated subprocess sandbox
- **Deployment**: HuggingFace Spaces (Docker) + Vercel

## Environment Variables

```bash
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=rediss://...
OPENROUTER_API_KEY=sk-or-v1-...
HF_TOKEN=hf_...
VERCEL_TOKEN=vcp_...
NEXT_PUBLIC_BACKEND_URL=https://...hf.space
```

## Development

```bash
# Backend
cd apps/control-plane
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd apps/frontend
npm install
npm run dev
```
