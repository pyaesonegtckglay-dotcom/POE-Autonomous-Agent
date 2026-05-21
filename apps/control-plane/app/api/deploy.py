from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import httpx
import uuid
from datetime import datetime
import structlog

from app.core.config import settings
from app.core.redis_client import redis_set, redis_get

router = APIRouter()
logger = structlog.get_logger()


class HFDeployRequest(BaseModel):
    space_name: str
    task_id: Optional[str] = None
    repo_id: Optional[str] = None


class VercelDeployRequest(BaseModel):
    project_name: str
    task_id: Optional[str] = None
    repo_url: Optional[str] = None


@router.post("/deploy/hf")
async def deploy_to_huggingface(payload: HFDeployRequest, background_tasks: BackgroundTasks):
    """Trigger HuggingFace Spaces deployment."""
    deploy_id = str(uuid.uuid4())
    deploy_data = {
        "id": deploy_id,
        "target": "huggingface",
        "space_name": payload.space_name,
        "status": "queued",
        "logs": [],
        "created_at": datetime.utcnow().isoformat(),
    }
    await redis_set(f"deploy:{deploy_id}", deploy_data, expire=86400)

    background_tasks.add_task(_deploy_to_hf, deploy_id, payload)

    return {"deploy_id": deploy_id, "status": "queued", "target": "huggingface"}


async def _deploy_to_hf(deploy_id: str, payload: HFDeployRequest):
    """Background HF deployment task."""
    logs = []
    try:
        logs.append(f"Starting HuggingFace deployment for space: {payload.space_name}")
        
        headers = {
            "Authorization": f"Bearer {settings.HF_TOKEN}",
            "Content-Type": "application/json",
        }

        # Check if space exists
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"https://huggingface.co/api/spaces/{payload.space_name}",
                headers=headers,
            )
            
            if resp.status_code == 200:
                logs.append(f"✅ Space {payload.space_name} exists")
                space_url = f"https://huggingface.co/spaces/{payload.space_name}"
                status = "deployed"
            else:
                logs.append(f"Space {payload.space_name} not found (status: {resp.status_code})")
                space_url = f"https://huggingface.co/spaces/{payload.space_name}"
                status = "pending"

        deploy_data = {
            "id": deploy_id,
            "target": "huggingface",
            "status": status,
            "url": space_url,
            "logs": logs,
            "updated_at": datetime.utcnow().isoformat(),
        }
        await redis_set(f"deploy:{deploy_id}", deploy_data, expire=86400)
        logger.info("hf_deployment_complete", deploy_id=deploy_id, status=status)

    except Exception as e:
        logs.append(f"❌ Deployment error: {str(e)}")
        await redis_set(
            f"deploy:{deploy_id}",
            {"id": deploy_id, "target": "huggingface", "status": "failed", "logs": logs},
            expire=86400,
        )


@router.post("/deploy/vercel")
async def deploy_to_vercel(payload: VercelDeployRequest, background_tasks: BackgroundTasks):
    """Trigger Vercel deployment."""
    deploy_id = str(uuid.uuid4())
    deploy_data = {
        "id": deploy_id,
        "target": "vercel",
        "project_name": payload.project_name,
        "status": "queued",
        "logs": [],
        "created_at": datetime.utcnow().isoformat(),
    }
    await redis_set(f"deploy:{deploy_id}", deploy_data, expire=86400)
    background_tasks.add_task(_deploy_to_vercel, deploy_id, payload)
    return {"deploy_id": deploy_id, "status": "queued", "target": "vercel"}


async def _deploy_to_vercel(deploy_id: str, payload: VercelDeployRequest):
    """Background Vercel deployment."""
    logs = []
    try:
        logs.append(f"Starting Vercel deployment for project: {payload.project_name}")

        headers = {
            "Authorization": f"Bearer {settings.VERCEL_TOKEN}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"https://api.vercel.com/v9/projects/{payload.project_name}",
                headers=headers,
            )
            
            if resp.status_code == 200:
                project = resp.json()
                url = project.get("link", {}).get("projectUrl", f"https://{payload.project_name}.vercel.app")
                logs.append(f"✅ Vercel project found: {url}")
                status = "deployed"
            else:
                logs.append(f"Project check returned: {resp.status_code}")
                url = f"https://{payload.project_name}.vercel.app"
                status = "pending"

        await redis_set(
            f"deploy:{deploy_id}",
            {"id": deploy_id, "target": "vercel", "status": status, "url": url, "logs": logs},
            expire=86400,
        )
        logger.info("vercel_deployment_complete", deploy_id=deploy_id, status=status)

    except Exception as e:
        logs.append(f"❌ Vercel error: {str(e)}")
        await redis_set(
            f"deploy:{deploy_id}",
            {"id": deploy_id, "target": "vercel", "status": "failed", "logs": logs},
            expire=86400,
        )


@router.get("/deploy/{deploy_id}")
async def get_deployment(deploy_id: str):
    """Get deployment status."""
    data = await redis_get(f"deploy:{deploy_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return data
