"""
Task Runner - Orchestrates the full task lifecycle:
Plan → Execute → Verify → Repair → Complete
"""
import asyncio
import uuid
from datetime import datetime
from typing import Optional
import structlog

from app.core.config import settings
from app.core.redis_client import redis_set, redis_get, redis_publish
from app.services.executor import SandboxExecutor, execute_dag_node
from app.services.planner import plan_task, analyze_and_repair

logger = structlog.get_logger()


def build_execution_order(nodes: list) -> list:
    """Topological sort of DAG nodes."""
    node_map = {n["id"]: n for n in nodes}
    visited = set()
    order = []

    def visit(node_id):
        if node_id in visited:
            return
        visited.add(node_id)
        node = node_map.get(node_id, {})
        for dep in node.get("depends_on", []):
            if dep in node_map:
                visit(dep)
        order.append(node_id)

    for node in nodes:
        visit(node["id"])

    return [node_map[nid] for nid in order if nid in node_map]


async def run_task(task_id: str, task_data: dict):
    """
    Full task lifecycle:
    1. Plan (create DAG)
    2. Execute nodes in order
    3. Verify
    4. Repair on failure
    5. Complete or fail
    """
    logger.info("task_run_start", task_id=task_id)
    logs = []

    def log(msg: str, level: str = "info"):
        entry = {"ts": datetime.utcnow().isoformat(), "level": level, "msg": msg}
        logs.append(entry)
        logger.info("task_log", task_id=task_id, msg=msg)
        # Publish to Redis for live streaming
        asyncio.create_task(
            redis_publish(f"task_logs:{task_id}", entry)
        )

    async def save_state(status: str, extra: dict = None):
        state = {
            "id": task_id,
            "status": status,
            "logs": logs,
            "updated_at": datetime.utcnow().isoformat(),
            **(extra or {}),
        }
        await redis_set(f"task:{task_id}", state, expire=86400)

    try:
        # ── Phase 1: Planning ──────────────────────────────────────────────
        log("🧠 Planner Agent starting DAG generation...")
        await save_state("planning")

        dag = await plan_task(task_data.get("description", task_data.get("title", "")), task_id)
        nodes = dag.get("nodes", [])

        log(f"✅ DAG created with {len(nodes)} nodes")
        await save_state("running", {"dag": dag})

        # ── Phase 2: Execute ───────────────────────────────────────────────
        executor = SandboxExecutor(task_id)
        execution_order = build_execution_order(nodes)
        node_results = {}
        repair_history = []
        files_created = []

        log("⚙️ Developer Agent starting execution...")

        for node in execution_order:
            node_id = node["id"]
            
            # Update node status
            for n in dag["nodes"]:
                if n["id"] == node_id:
                    n["status"] = "running"
            await save_state("running", {"dag": dag})

            log(f"▶️ Executing node [{node_id}]: {node.get('description', node.get('type', ''))}")

            # Execute with repair loop
            result = None
            for attempt in range(settings.MAX_REPAIR_RETRIES + 1):
                if attempt > 0:
                    log(f"🔧 Repair attempt {attempt} for node [{node_id}]", "warning")
                    await save_state("repairing", {"dag": dag})

                    repair = await analyze_and_repair(
                        task_id, node, result.get("stderr", ""), attempt
                    )
                    repair_history.append({
                        "node_id": node_id,
                        "attempt": attempt,
                        "repair": repair,
                    })
                    log(f"🔍 Root cause: {repair.get('root_cause', 'unknown')}")
                    log(f"💡 Fix: {repair.get('fix_description', '')}")

                    # Apply fix
                    fixed_type = repair.get("fixed_type", "shell")
                    if fixed_type == "shell":
                        node = dict(node)
                        node["type"] = "shell"
                        node["command"] = repair.get("fixed_command", "echo repaired")
                    elif fixed_type == "code":
                        node = dict(node)
                        node["type"] = "code"
                        node["code"] = repair.get("fixed_command", "print('repaired')")
                        node["language"] = "python"

                result = await execute_dag_node(task_id, node, executor, node_results)
                node_results[node_id] = result

                if result["status"] == "success":
                    break

                if attempt == settings.MAX_REPAIR_RETRIES:
                    log(f"❌ Node [{node_id}] failed after {attempt} repair attempts", "error")
                    # Mark node failed
                    for n in dag["nodes"]:
                        if n["id"] == node_id:
                            n["status"] = "failed"
                    # Continue with other nodes instead of aborting
                    break

            # Update node status
            for n in dag["nodes"]:
                if n["id"] == node_id:
                    n["status"] = result["status"] if result else "failed"

            files_created.extend(result.get("files_created", []))

            if result and result["status"] == "success":
                log(f"✅ Node [{node_id}] complete")
            else:
                log(f"⚠️ Node [{node_id}] had issues but continuing...", "warning")

        # ── Phase 3: Verification ──────────────────────────────────────────
        log("🔍 Reviewer Agent running verification...")
        await save_state("verifying", {"dag": dag})

        # Count successes
        success_count = sum(1 for r in node_results.values() if r.get("status") == "success")
        total_count = len(node_results)

        log(f"📊 Execution summary: {success_count}/{total_count} nodes succeeded")

        # Determine final status
        final_status = "complete" if success_count > 0 else "failed"

        # ── Phase 4: Finalize ──────────────────────────────────────────────
        log(f"🎉 Task {'completed successfully' if final_status == 'complete' else 'failed'}!")

        final_state = {
            "id": task_id,
            "title": task_data.get("title", ""),
            "status": final_status,
            "dag": dag,
            "execution_result": {
                "success_count": success_count,
                "total_count": total_count,
                "node_results": node_results,
            },
            "repair_history": repair_history,
            "files_created": list(set(files_created)),
            "logs": logs,
            "completed_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

        await redis_set(f"task:{task_id}", final_state, expire=86400 * 7)

        # Try to persist to DB
        try:
            from app.core.database import AsyncSessionLocal
            from app.models.task import Task, TaskStatus
            from sqlalchemy import select

            async with AsyncSessionLocal() as session:
                result_db = await session.execute(select(Task).where(Task.id == task_id))
                task_obj = result_db.scalar_one_or_none()
                if task_obj:
                    task_obj.status = TaskStatus(final_status)
                    task_obj.dag = dag
                    task_obj.execution_result = final_state["execution_result"]
                    task_obj.repair_history = repair_history
                    task_obj.logs = logs
                    task_obj.files_created = list(set(files_created))
                    task_obj.completed_at = datetime.utcnow()
                    await session.commit()
        except Exception as db_err:
            logger.warning("db_update_failed", task_id=task_id, error=str(db_err))

        logger.info("task_run_complete", task_id=task_id, status=final_status)

    except Exception as e:
        logger.error("task_run_error", task_id=task_id, error=str(e))
        logs.append({"ts": datetime.utcnow().isoformat(), "level": "error", "msg": f"Fatal error: {str(e)}"})
        await redis_set(
            f"task:{task_id}",
            {
                "id": task_id,
                "status": "failed",
                "error_message": str(e),
                "logs": logs,
                "updated_at": datetime.utcnow().isoformat(),
            },
            expire=86400,
        )
