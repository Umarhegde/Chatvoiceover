import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Dict, Optional


class JobStatus:
    QUEUED = "queued"
    RUNNING = "running"
    DONE = "done"
    ERROR = "error"


@dataclass
class Job:
    id: str
    status: str = JobStatus.QUEUED
    progress: int = 0
    total: int = 0
    result_file: Optional[str] = None
    error: Optional[str] = None
    created_at: float = field(default_factory=time.time)


class JobQueue:
    """Single-worker in-process job queue backed by a ThreadPoolExecutor."""

    def __init__(self, max_workers: int = 1) -> None:
        self._jobs: Dict[str, Job] = {}
        self._executor = ThreadPoolExecutor(max_workers=max_workers)

    # ------------------------------------------------------------------
    def create_job(self) -> str:
        job_id = str(uuid.uuid4())
        self._jobs[job_id] = Job(id=job_id)
        return job_id

    def submit(self, job_id: str, fn, *args, **kwargs) -> None:
        """Queue fn(job, *args, **kwargs) for background execution."""
        job = self._jobs[job_id]

        def _run() -> None:
            job.status = JobStatus.RUNNING
            try:
                fn(job, *args, **kwargs)
                job.status = JobStatus.DONE
            except Exception as exc:  # noqa: BLE001
                job.status = JobStatus.ERROR
                job.error = str(exc)

        job.status = JobStatus.QUEUED
        self._executor.submit(_run)

    def get(self, job_id: str) -> Optional[Job]:
        return self._jobs.get(job_id)

    def cleanup_old(self, max_age_hours: int = 24) -> None:
        cutoff = time.time() - max_age_hours * 3600
        stale = [jid for jid, j in self._jobs.items() if j.created_at < cutoff]
        for jid in stale:
            del self._jobs[jid]


job_queue = JobQueue(max_workers=1)
