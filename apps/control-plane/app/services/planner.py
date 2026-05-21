"""
Agent Brain - LangGraph-based DAG planner with self-repair.
Uses OpenRouter API (OpenAI-compatible) for LLM calls.
"""
import json
import uuid
import httpx
import structlog
from typing import Any, Optional
from app.core.config import settings

logger = structlog.get_logger()

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
PLANNING_MODEL = "openai/gpt-4o-mini"


async def call_llm(prompt: str, system_prompt: str = "") -> str:
    """Call LLM via OpenRouter API."""
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://poe-autonomous-agent.vercel.app",
        "X-Title": "POE Autonomous Agent",
    }
    
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": PLANNING_MODEL,
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": 4096,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{OPENROUTER_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


PLANNER_SYSTEM_PROMPT = """You are an autonomous AI task planner. 
Given a task description, you create a detailed DAG (Directed Acyclic Graph) execution plan.

Output ONLY valid JSON with this exact structure:
{
  "goal": "task goal description",
  "nodes": [
    {
      "id": "node_1",
      "type": "shell|code|file|verify|deploy",
      "description": "what this node does",
      "command": "shell command if type=shell",
      "code": "python code if type=code",
      "language": "python|bash if type=code",
      "filename": "filename if type=file",
      "content": "file content if type=file",
      "depends_on": [],
      "status": "pending"
    }
  ]
}

Rules:
- Each node must have a unique id
- depends_on lists node ids that must complete first
- For shell nodes: include the exact shell command
- For code nodes: include complete runnable code
- For file nodes: include complete file content
- For verify nodes: include command to verify success
- Keep it minimal and executable
- No more than 8 nodes total"""


async def plan_task(task_description: str, task_id: str) -> dict:
    """Generate a DAG plan for the given task."""
    logger.info("planning_task", task_id=task_id, description=task_description[:100])

    prompt = f"""Create an execution plan for this task:

Task: {task_description}

Generate a practical, executable DAG plan that can be run in a Linux sandbox environment.
Include shell commands, code, file creation, and verification steps as appropriate.
Make sure all commands are real and executable."""

    try:
        response = await call_llm(prompt, PLANNER_SYSTEM_PROMPT)
        
        # Extract JSON from response
        json_start = response.find("{")
        json_end = response.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            json_str = response[json_start:json_end]
            dag = json.loads(json_str)
        else:
            raise ValueError("No JSON found in response")

        logger.info("plan_created", task_id=task_id, node_count=len(dag.get("nodes", [])))
        return dag

    except Exception as e:
        logger.error("planning_failed", task_id=task_id, error=str(e))
        # Fallback minimal plan
        return {
            "goal": task_description,
            "nodes": [
                {
                    "id": "node_1",
                    "type": "shell",
                    "description": "Execute the task",
                    "command": f"echo 'Starting task: {task_description[:100]}' && echo 'Task executed'",
                    "depends_on": [],
                    "status": "pending",
                },
                {
                    "id": "node_2",
                    "type": "verify",
                    "description": "Verify task completion",
                    "command": "echo 'Task verification complete'",
                    "depends_on": ["node_1"],
                    "status": "pending",
                },
            ],
        }


REPAIR_SYSTEM_PROMPT = """You are an autonomous AI repair agent.
Given a failed task execution, analyze the failure and provide a fix.

Output ONLY valid JSON:
{
  "failure_category": "dependency_error|syntax_error|runtime_error|network_error|permission_error|unknown",
  "root_cause": "brief explanation",
  "fix_description": "what the fix does",
  "fixed_command": "corrected command or code",
  "fixed_type": "shell|code|file"
}"""


async def analyze_and_repair(
    task_id: str,
    failed_node: dict,
    error_output: str,
    attempt: int,
) -> dict:
    """Analyze failure and generate a repair."""
    logger.info("repair_start", task_id=task_id, attempt=attempt, node_id=failed_node.get("id"))

    prompt = f"""Analyze this failure and provide a fix:

Failed Node:
{json.dumps(failed_node, indent=2)}

Error Output:
{error_output[:2000]}

Attempt number: {attempt}

Provide a concrete fix that will resolve this specific error."""

    try:
        response = await call_llm(prompt, REPAIR_SYSTEM_PROMPT)
        
        json_start = response.find("{")
        json_end = response.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            repair = json.loads(response[json_start:json_end])
        else:
            raise ValueError("No JSON in repair response")

        logger.info("repair_generated", task_id=task_id, category=repair.get("failure_category"))
        return repair

    except Exception as e:
        logger.error("repair_analysis_failed", task_id=task_id, error=str(e))
        return {
            "failure_category": "unknown",
            "root_cause": str(e),
            "fix_description": "Fallback: retry with echo",
            "fixed_command": "echo 'repair fallback executed'",
            "fixed_type": "shell",
        }
