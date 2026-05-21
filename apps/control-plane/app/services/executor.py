"""
Execution Core - Isolated sandbox execution service.
Each task runs inside /tmp/poe_sandbox/task_{id}/
"""
import asyncio
import os
import shutil
import subprocess
import time
import uuid
from pathlib import Path
from typing import Optional
import structlog

from app.core.config import settings

logger = structlog.get_logger()


class SandboxExecutor:
    """Isolated sandbox for executing shell commands and code."""

    def __init__(self, task_id: str):
        self.task_id = task_id
        self.sandbox_path = Path(settings.SANDBOX_BASE_PATH) / f"task_{task_id}"
        self.sandbox_path.mkdir(parents=True, exist_ok=True)
        logger.info("sandbox_created", task_id=task_id, path=str(self.sandbox_path))

    async def execute_shell(
        self,
        command: str,
        timeout: int = 60,
        env_vars: Optional[dict] = None,
    ) -> dict:
        """Execute a shell command in the sandbox."""
        start_time = time.time()
        env = os.environ.copy()
        if env_vars:
            env.update(env_vars)

        logger.info("shell_execute_start", task_id=self.task_id, command=command[:200])

        try:
            proc = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(self.sandbox_path),
                env=env,
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(), timeout=timeout
                )
            except asyncio.TimeoutError:
                proc.kill()
                await proc.communicate()
                return {
                    "status": "failed",
                    "stdout": "",
                    "stderr": f"Command timed out after {timeout}s",
                    "exit_code": -1,
                    "files_created": self._list_files(),
                    "duration_ms": int((time.time() - start_time) * 1000),
                }

            exit_code = proc.returncode
            stdout_text = stdout.decode("utf-8", errors="replace")
            stderr_text = stderr.decode("utf-8", errors="replace")

            status = "success" if exit_code == 0 else "failed"
            logger.info(
                "shell_execute_complete",
                task_id=self.task_id,
                exit_code=exit_code,
                status=status,
            )

            return {
                "status": status,
                "stdout": stdout_text,
                "stderr": stderr_text,
                "exit_code": exit_code,
                "files_created": self._list_files(),
                "duration_ms": int((time.time() - start_time) * 1000),
            }

        except Exception as e:
            logger.error("shell_execute_error", task_id=self.task_id, error=str(e))
            return {
                "status": "failed",
                "stdout": "",
                "stderr": str(e),
                "exit_code": -1,
                "files_created": [],
                "duration_ms": int((time.time() - start_time) * 1000),
            }

    async def write_file(self, filename: str, content: str) -> dict:
        """Write a file to the sandbox."""
        file_path = self.sandbox_path / filename
        file_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            file_path.write_text(content, encoding="utf-8")
            logger.info("file_written", task_id=self.task_id, filename=filename)
            return {"status": "success", "path": str(file_path)}
        except Exception as e:
            logger.error("file_write_failed", task_id=self.task_id, error=str(e))
            return {"status": "failed", "error": str(e)}

    async def read_file(self, filename: str) -> Optional[str]:
        """Read a file from the sandbox."""
        file_path = self.sandbox_path / filename
        try:
            return file_path.read_text(encoding="utf-8")
        except Exception:
            return None

    def _list_files(self) -> list:
        """List all files in the sandbox."""
        files = []
        try:
            for p in self.sandbox_path.rglob("*"):
                if p.is_file():
                    files.append(str(p.relative_to(self.sandbox_path)))
        except Exception:
            pass
        return files

    def cleanup(self):
        """Remove sandbox directory."""
        try:
            shutil.rmtree(str(self.sandbox_path))
            logger.info("sandbox_cleaned", task_id=self.task_id)
        except Exception as e:
            logger.warning("sandbox_cleanup_failed", error=str(e))


async def execute_dag_node(
    task_id: str,
    node: dict,
    executor: SandboxExecutor,
    context: dict,
) -> dict:
    """Execute a single DAG node."""
    node_type = node.get("type", "shell")
    node_id = node.get("id", "unknown")
    
    logger.info("dag_node_start", task_id=task_id, node_id=node_id, type=node_type)

    if node_type == "shell":
        command = node.get("command", "echo 'No command'")
        # Substitute context variables
        for k, v in context.items():
            command = command.replace(f"{{{k}}}", str(v))
        result = await executor.execute_shell(command)

    elif node_type == "file":
        filename = node.get("filename", "output.txt")
        content = node.get("content", "")
        result = await executor.write_file(filename, content)
        result["stdout"] = f"File written: {filename}"
        result["stderr"] = ""

    elif node_type == "code":
        code = node.get("code", "print('hello')")
        lang = node.get("language", "python")
        filename = f"script_{node_id}.py" if lang == "python" else f"script_{node_id}.sh"
        await executor.write_file(filename, code)
        if lang == "python":
            result = await executor.execute_shell(f"python3 {filename}")
        else:
            result = await executor.execute_shell(f"bash {filename}")

    elif node_type == "verify":
        command = node.get("command", "echo 'verified'")
        result = await executor.execute_shell(command)
        if result["exit_code"] != 0:
            result["status"] = "failed"
            result["stderr"] = f"Verification failed: {result['stderr']}"

    elif node_type == "deploy":
        result = {
            "status": "success",
            "stdout": f"Deployment node {node_id} - handled by deployment service",
            "stderr": "",
            "exit_code": 0,
            "files_created": [],
        }
    else:
        result = await executor.execute_shell(f"echo 'Unknown node type: {node_type}'")

    result["node_id"] = node_id
    result["node_type"] = node_type
    logger.info("dag_node_complete", task_id=task_id, node_id=node_id, status=result["status"])
    return result
