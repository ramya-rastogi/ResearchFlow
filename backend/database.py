import os
import json
import uuid
import time
import logging
from typing import Dict, Any, List, Optional
import asyncpg

try:
    from .config import DATABASE_URL
except ImportError:
    from config import DATABASE_URL

logger = logging.getLogger(__name__)

class BaseJobRepository:
    async def connect(self) -> bool:
        raise NotImplementedError

    async def create_job(self, job_id: str, topic: str, pinned_urls: Optional[List[str]] = None, excluded_urls: Optional[List[str]] = None) -> Dict[str, Any]:
        raise NotImplementedError

    async def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    async def update_job(self, job_id: str, updates: Dict[str, Any]) -> None:
        raise NotImplementedError

    async def add_log(self, job_id: str, log_entry: Dict[str, Any]) -> None:
        raise NotImplementedError

    async def list_history(self) -> List[Dict[str, Any]]:
        raise NotImplementedError

    async def clear_history(self) -> None:
        raise NotImplementedError

    async def delete_job(self, job_id: str) -> bool:
        raise NotImplementedError

    async def save_steering(self, job_id: str, pinned_urls: List[str], excluded_urls: List[str]) -> None:
        raise NotImplementedError


class InMemoryJobRepository(BaseJobRepository):
    def __init__(self):
        self._jobs: Dict[str, Dict[str, Any]] = {}
        self._logs: Dict[str, List[Dict[str, Any]]] = {}

    async def connect(self) -> bool:
        return True

    async def create_job(self, job_id: str, topic: str, pinned_urls: Optional[List[str]] = None, excluded_urls: Optional[List[str]] = None) -> Dict[str, Any]:
        now = time.time()
        job = {
            "job_id": job_id,
            "id": job_id,
            "topic": topic,
            "status": "running",
            "step": "pending",
            "results": {
                "initial_report": None,
                "initial_score": None,
                "initial_feedback": None,
                "revised_report": None,
                "revised_score": None,
                "revised_feedback": None,
                "final_report": None,
                "was_revised": False,
                "sources": [],
                "search_results": "",
                "scraped_content": "",
                "revisions": [],
                "verification": {}
            },
            "scores": {
                "trust_score": 0,
                "quality_score": 0,
                "final_score": 0,
                "citation_coverage": 0
            },
            "sources": [],
            "steering": {
                "pinnedUrls": pinned_urls or [],
                "excludedUrls": excluded_urls or []
            },
            "logs": [],
            "created_at": now,
            "updated_at": now
        }
        self._jobs[job_id] = job
        self._logs[job_id] = []
        return job

    async def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        job = self._jobs.get(job_id)
        if not job:
            return None
        job_copy = dict(job)
        job_copy["logs"] = list(self._logs.get(job_id, []))
        return job_copy

    async def update_job(self, job_id: str, updates: Dict[str, Any]) -> None:
        if job_id not in self._jobs:
            return
        job = self._jobs[job_id]
        job.update(updates)
        job["updated_at"] = time.time()

    async def add_log(self, job_id: str, log_entry: Dict[str, Any]) -> None:
        if job_id not in self._logs:
            self._logs[job_id] = []
        self._logs[job_id].append(log_entry)
        if job_id in self._jobs:
            self._jobs[job_id]["logs"] = list(self._logs[job_id])
            self._jobs[job_id]["updated_at"] = time.time()

    async def list_history(self) -> List[Dict[str, Any]]:
        history = []
        for j_id, j_data in self._jobs.items():
            if j_data.get("status") in ["completed", "failed"]:
                history.append(await self.get_job(j_id))
        history.sort(key=lambda x: x.get("created_at", 0), reverse=True)
        return history

    async def clear_history(self) -> None:
        self._jobs.clear()
        self._logs.clear()

    async def delete_job(self, job_id: str) -> bool:
        deleted = False
        if job_id in self._jobs:
            del self._jobs[job_id]
            deleted = True
        if job_id in self._logs:
            del self._logs[job_id]
        return deleted

    async def save_steering(self, job_id: str, pinned_urls: List[str], excluded_urls: List[str]) -> None:
        if job_id in self._jobs:
            self._jobs[job_id]["steering"] = {
                "pinnedUrls": pinned_urls,
                "excludedUrls": excluded_urls
            }
            self._jobs[job_id]["updated_at"] = time.time()


class PostgresJobRepository(BaseJobRepository):
    def __init__(self, db_url: str):
        self.db_url = db_url
        self.pool: Optional[asyncpg.Pool] = None

    async def connect(self) -> bool:
        try:
            self.pool = await asyncpg.create_pool(self.db_url, timeout=5)
            await self.init_schema()
            logger.info("Successfully connected to PostgreSQL.")
            return True
        except Exception as e:
            logger.warning(f"Could not connect to PostgreSQL ({e}). Falling back to IN-MEMORY store.")
            return False

    async def init_schema(self) -> None:
        if not self.pool:
            return
        async with self.pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS jobs (
                    id UUID PRIMARY KEY,
                    topic TEXT NOT NULL,
                    status TEXT NOT NULL,
                    step TEXT NOT NULL DEFAULT 'pending',
                    results JSONB DEFAULT '{}'::jsonb,
                    scores JSONB DEFAULT '{}'::jsonb,
                    sources JSONB DEFAULT '[]'::jsonb,
                    steering JSONB DEFAULT '{}'::jsonb,
                    created_at DOUBLE PRECISION NOT NULL,
                    updated_at DOUBLE PRECISION NOT NULL
                );

                CREATE TABLE IF NOT EXISTS job_logs (
                    id UUID PRIMARY KEY,
                    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
                    agent TEXT NOT NULL,
                    type TEXT NOT NULL DEFAULT 'info',
                    message TEXT NOT NULL,
                    source_url TEXT,
                    created_at DOUBLE PRECISION NOT NULL
                );
            """)

    async def create_job(self, job_id: str, topic: str, pinned_urls: Optional[List[str]] = None, excluded_urls: Optional[List[str]] = None) -> Dict[str, Any]:
        if not self.pool:
            return {}
        now = time.time()
        steering = {"pinnedUrls": pinned_urls or [], "excludedUrls": excluded_urls or []}
        results = {
            "initial_report": None,
            "initial_score": None,
            "initial_feedback": None,
            "revised_report": None,
            "revised_score": None,
            "revised_feedback": None,
            "final_report": None,
            "was_revised": False,
            "sources": [],
            "search_results": "",
            "scraped_content": "",
            "revisions": [],
            "verification": {}
        }
        scores = {
            "trust_score": 0,
            "quality_score": 0,
            "final_score": 0,
            "citation_coverage": 0
        }
        async with self.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO jobs (id, topic, status, step, results, scores, sources, steering, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            """, uuid.UUID(job_id), topic, "running", "pending", json.dumps(results), json.dumps(scores), json.dumps([]), json.dumps(steering), now, now)

        return {
            "job_id": job_id,
            "id": job_id,
            "topic": topic,
            "status": "running",
            "step": "pending",
            "results": results,
            "scores": scores,
            "sources": [],
            "steering": steering,
            "logs": [],
            "created_at": now,
            "updated_at": now
        }

    async def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        if not self.pool:
            return None
        try:
            job_uuid = uuid.UUID(job_id)
        except ValueError:
            return None

        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM jobs WHERE id = $1", job_uuid)
            if not row:
                return None
            logs_rows = await conn.fetch(
                "SELECT id, agent, type, message, source_url, created_at FROM job_logs WHERE job_id = $1 ORDER BY created_at ASC",
                job_uuid
            )

        logs = [
            {
                "id": str(lr["id"]),
                "agent": lr["agent"],
                "type": lr["type"],
                "message": lr["message"],
                "source_url": lr["source_url"],
                "timestamp": lr["created_at"]
            }
            for lr in logs_rows
        ]

        results = json.loads(row["results"]) if isinstance(row["results"], str) else (row["results"] or {})
        scores = json.loads(row["scores"]) if isinstance(row["scores"], str) else (row["scores"] or {})
        sources = json.loads(row["sources"]) if isinstance(row["sources"], str) else (row["sources"] or [])
        steering = json.loads(row["steering"]) if isinstance(row["steering"], str) else (row["steering"] or {})

        return {
            "job_id": str(row["id"]),
            "id": str(row["id"]),
            "topic": row["topic"],
            "status": row["status"],
            "step": row["step"],
            "results": results,
            "scores": scores,
            "sources": sources,
            "steering": steering,
            "logs": logs,
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        }

    async def update_job(self, job_id: str, updates: Dict[str, Any]) -> None:
        if not self.pool:
            return
        try:
            job_uuid = uuid.UUID(job_id)
        except ValueError:
            return

        set_clauses = []
        values = []
        now = time.time()
        valid_cols = {"topic", "status", "step", "results", "scores", "sources", "steering"}

        idx = 1
        for k, v in updates.items():
            if k in valid_cols:
                set_clauses.append(f"{k} = ${idx}")
                if isinstance(v, (dict, list)):
                    values.append(json.dumps(v))
                else:
                    values.append(v)
                idx += 1

        set_clauses.append(f"updated_at = ${idx}")
        values.append(now)
        idx += 1

        values.append(job_uuid)
        query = f"UPDATE jobs SET {', '.join(set_clauses)} WHERE id = ${idx}"

        async with self.pool.acquire() as conn:
            await conn.execute(query, *values)

    async def add_log(self, job_id: str, log_entry: Dict[str, Any]) -> None:
        if not self.pool:
            return
        try:
            job_uuid = uuid.UUID(job_id)
            log_uuid = uuid.UUID(log_entry.get("id", str(uuid.uuid4())))
        except ValueError:
            return

        async with self.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO job_logs (id, job_id, agent, type, message, source_url, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            """, log_uuid, job_uuid, log_entry.get("agent", "System"), log_entry.get("type", "info"),
            log_entry.get("message", ""), log_entry.get("source_url"), log_entry.get("timestamp", time.time()))

    async def list_history(self) -> List[Dict[str, Any]]:
        if not self.pool:
            return []
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("SELECT id FROM jobs WHERE status IN ('completed', 'failed') ORDER BY created_at DESC")
        history = []
        for r in rows:
            job = await self.get_job(str(r["id"]))
            if job:
                history.append(job)
        return history

    async def clear_history(self) -> None:
        if not self.pool:
            return
        async with self.pool.acquire() as conn:
            await conn.execute("DELETE FROM jobs")

    async def delete_job(self, job_id: str) -> bool:
        if not self.pool:
            return False
        try:
            job_uuid = uuid.UUID(job_id)
        except ValueError:
            return False
        async with self.pool.acquire() as conn:
            res = await conn.execute("DELETE FROM jobs WHERE id = $1", job_uuid)
            return "DELETE 1" in res

    async def save_steering(self, job_id: str, pinned_urls: List[str], excluded_urls: List[str]) -> None:
        await self.update_job(job_id, {"steering": {"pinnedUrls": pinned_urls, "excludedUrls": excluded_urls}})


# Global Repository Holder
_repo_instance: Optional[BaseJobRepository] = None

async def init_repository() -> BaseJobRepository:
    global _repo_instance
    if _repo_instance is not None:
        return _repo_instance

    if DATABASE_URL:
        pg_repo = PostgresJobRepository(DATABASE_URL)
        success = await pg_repo.connect()
        if success:
            _repo_instance = pg_repo
            return _repo_instance

    logger.warning("PostgreSQL not configured or unreachable. Operating in IN-MEMORY mode.")
    mem_repo = InMemoryJobRepository()
    await mem_repo.connect()
    _repo_instance = mem_repo
    return _repo_instance

def get_repository() -> BaseJobRepository:
    global _repo_instance
    if _repo_instance is None:
        _repo_instance = InMemoryJobRepository()
    return _repo_instance
