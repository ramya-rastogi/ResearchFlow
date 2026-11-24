import uuid
import time
import json
import asyncio
import logging
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from .models import (
    ResearchRequest,
    SteerRequest,
    JobStatus,
    JobResult,
    JobScores,
    HistoryEntry,
    LogEntry,
    SourceItem,
)
from ..config import CORS_ORIGINS
from ..database import init_repository, get_repository
from ..agents import research_graph, make_log, set_log_listener

logger = logging.getLogger("researchflow")
logging.basicConfig(level=logging.INFO)

job_queues: Dict[str, asyncio.Queue] = {}

async def _live_log_listener(job_id: str, log_entry: Dict[str, Any]):
    repo = get_repository()
    await repo.add_log(job_id, log_entry)
    await _send_event(job_id, {"logs": [log_entry]})

set_log_listener(_live_log_listener)

@asynccontextmanager
async def lifespan(app: FastAPI):
    repo = await init_repository()
    logger.info("ResearchFlow Backend initialized successfully.")
    yield

app = FastAPI(title="ResearchFlow API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS else ["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def _send_event(job_id: str, data: Dict[str, Any]):
    queue = job_queues.get(job_id)
    if queue:
        await queue.put(data)

async def run_pipeline_task(job_id: str, topic: str, pinned_urls: List[str], excluded_urls: List[str]):
    repo = get_repository()
    accumulated_results: Dict[str, Any] = {
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
        "verification": None,
    }
    accumulated_scores: Dict[str, Any] = {
        "trust_score": 0,
        "quality_score": 0,
        "final_score": 0,
        "citation_coverage": 0,
    }
    accumulated_sources: List[Dict[str, Any]] = []

    best_draft: Dict[str, Any] = {
        "report": None,
        "trust_score": -1,
        "quality_score": -1,
        "scores": None,
        "verification": None,
    }

    try:
        init_log = make_log("System", f"Starting research pipeline for topic: '{topic}'", "info")
        await repo.add_log(job_id, init_log)
        await _send_event(job_id, {"logs": [init_log], "step": "search"})

        inputs = {
            "topic": topic,
            "iteration": 0,
            "pinned_urls": pinned_urls,
            "excluded_urls": excluded_urls,
            "job_id": job_id,
        }

        async for event in research_graph.astream(inputs, stream_mode="updates"):
            for node, state_update in event.items():
                step_name = state_update.get("step", node)
                update_payload: Dict[str, Any] = {"step": step_name}

                # Handle and persist logs
                node_logs = state_update.get("logs", [])
                for log in node_logs:
                    await repo.add_log(job_id, log)
                if node_logs:
                    update_payload["logs"] = node_logs

                # Handle sources
                if "sources" in state_update:
                    accumulated_sources = state_update["sources"]
                    update_payload["sources"] = accumulated_sources
                    accumulated_results["sources"] = accumulated_sources

                # Handle search/scraped data
                if "search_results" in state_update:
                    accumulated_results["search_results"] = state_update["search_results"]
                if "scraped_content" in state_update:
                    accumulated_results["scraped_content"] = state_update["scraped_content"]

                # Handle writing/revising reports
                if "report" in state_update:
                    rep = state_update["report"]
                    accumulated_results["final_report"] = rep
                    if node == "write":
                        accumulated_results["initial_report"] = rep
                    elif node == "revise":
                        accumulated_results["revised_report"] = rep
                        accumulated_results["was_revised"] = True

                # Handle critic evaluation and verification
                if "trust_score" in state_update or "quality_score" in state_update:
                    trust = state_update.get("trust_score", 0)
                    qual = state_update.get("quality_score", 0)
                    final_10 = int(round(trust / 10.0))
                    
                    accumulated_scores["trust_score"] = trust
                    accumulated_scores["quality_score"] = qual
                    accumulated_scores["final_score"] = final_10
                    
                    if "verification" in state_update:
                        verif = state_update["verification"]
                        accumulated_results["verification"] = verif
                        accumulated_scores["citation_coverage"] = verif.get("coverage_percentage", 0)

                    if "feedback" in state_update:
                        fb = state_update["feedback"]
                        if accumulated_results["initial_feedback"] is None:
                            accumulated_results["initial_feedback"] = fb
                            accumulated_results["initial_score"] = final_10
                        else:
                            accumulated_results["revised_feedback"] = fb
                            accumulated_results["revised_score"] = final_10

                    if "revisions" in state_update:
                        accumulated_results["revisions"] = state_update["revisions"]

                    # Keep track of highest-scoring draft across iterations
                    if trust > best_draft["trust_score"] or (trust == best_draft["trust_score"] and qual >= best_draft["quality_score"]):
                        best_draft["report"] = accumulated_results.get("final_report")
                        best_draft["trust_score"] = trust
                        best_draft["quality_score"] = qual
                        best_draft["scores"] = dict(accumulated_scores)
                        best_draft["verification"] = dict(accumulated_results["verification"]) if accumulated_results.get("verification") else None

                    update_payload["scores"] = accumulated_scores

                update_payload["results"] = accumulated_results
                await repo.update_job(job_id, update_payload)
                await _send_event(job_id, update_payload)

        # Pipeline complete: preserve best draft if a revision degraded scores
        if best_draft["report"] and best_draft["trust_score"] > accumulated_scores.get("trust_score", 0):
            logger.info(
                f"Preserving higher-scoring draft with trust score {best_draft['trust_score']} "
                f"instead of degraded revision with trust score {accumulated_scores.get('trust_score')}"
            )
            accumulated_results["final_report"] = best_draft["report"]
            accumulated_scores = best_draft["scores"]
            if best_draft["verification"]:
                accumulated_results["verification"] = best_draft["verification"]

        final_log = make_log("System", "Research pipeline completed successfully.", "success")
        await repo.add_log(job_id, final_log)
        await repo.update_job(job_id, {
            "status": "completed",
            "step": "done",
            "results": accumulated_results,
            "scores": accumulated_scores,
            "sources": accumulated_sources
        })
        await _send_event(job_id, {
            "status": "completed",
            "step": "done",
            "logs": [final_log],
            "results": accumulated_results,
            "scores": accumulated_scores,
            "sources": accumulated_sources
        })

    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}", exc_info=True)
        err_msg = f"Pipeline execution error: {str(e)}"
        err_log = make_log("System", err_msg, "error")
        await repo.add_log(job_id, err_log)
        await repo.update_job(job_id, {
            "status": "failed",
            "step": "error",
            "results": accumulated_results,
            "scores": accumulated_scores,
            "sources": accumulated_sources
        })
        await _send_event(job_id, {
            "status": "failed",
            "step": "error",
            "logs": [err_log]
        })
    finally:
        await asyncio.sleep(2.0)
        job_queues.pop(job_id, None)


def _to_job_status(job_data: Dict[str, Any]) -> JobStatus:
    res = job_data.get("results") or job_data.get("result") or {}
    sc = job_data.get("scores") or {}
    src = job_data.get("sources") or res.get("sources") or []
    lg = job_data.get("logs") or []

    job_result = JobResult(
        initial_report=res.get("initial_report"),
        initial_score=res.get("initial_score"),
        initial_feedback=res.get("initial_feedback"),
        revised_report=res.get("revised_report"),
        revised_score=res.get("revised_score"),
        revised_feedback=res.get("revised_feedback"),
        final_report=res.get("final_report"),
        was_revised=res.get("was_revised", False),
        sources=[SourceItem(**s) for s in src] if src else [],
        search_results=res.get("search_results"),
        scraped_content=res.get("scraped_content"),
        revisions=res.get("revisions") or [],
        verification=res.get("verification")
    )

    job_scores = JobScores(
        trust_score=sc.get("trust_score", 0),
        quality_score=sc.get("quality_score", 0),
        final_score=sc.get("final_score", 0),
        citation_coverage=sc.get("citation_coverage", 0)
    )

    logs_list = []
    for l in lg:
        if isinstance(l, dict):
            logs_list.append(LogEntry(
                id=l.get("id", str(uuid.uuid4())),
                agent=l.get("agent", "System"),
                type=l.get("type", "info"),
                message=l.get("message", ""),
                source_url=l.get("source_url"),
                timestamp=l.get("timestamp", time.time())
            ))

    j_id = str(job_data.get("job_id") or job_data.get("id"))
    return JobStatus(
        job_id=j_id,
        id=j_id,
        topic=job_data.get("topic", ""),
        status=job_data.get("status", "running"),
        step=job_data.get("step", "pending"),
        result=job_result,
        results=job_result,
        scores=job_scores,
        sources=job_result.sources,
        steering=job_data.get("steering", {}),
        logs=logs_list,
        created_at=float(job_data.get("created_at", time.time())),
        updated_at=float(job_data.get("updated_at", time.time()))
    )


@app.post("/api/research", response_model=JobStatus)
async def create_research_job(req: ResearchRequest):
    job_id = str(uuid.uuid4())
    repo = get_repository()
    
    pinned = req.pinnedUrls or []
    excluded = req.excludedUrls or []

    job_data = await repo.create_job(
        job_id=job_id,
        topic=req.topic,
        pinned_urls=pinned,
        excluded_urls=excluded
    )

    job_queues[job_id] = asyncio.Queue()
    asyncio.create_task(run_pipeline_task(job_id, req.topic, pinned, excluded))

    return _to_job_status(job_data)


@app.get("/api/research/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    repo = get_repository()
    job_data = await repo.get_job(job_id)
    if not job_data:
        raise HTTPException(status_code=404, detail="Job not found")
    return _to_job_status(job_data)


@app.get("/api/research/{job_id}/stream")
async def stream_job_events(job_id: str, request: Request):
    repo = get_repository()
    job_data = await repo.get_job(job_id)
    if not job_data:
        raise HTTPException(status_code=404, detail="Job not found")

    queue = job_queues.get(job_id)

    async def event_generator():
        # First send the current snapshot
        current_job = await repo.get_job(job_id)
        if current_job:
            status_obj = _to_job_status(current_job)
            yield json.dumps(status_obj.model_dump())

        if current_job and current_job.get("status") in ["completed", "failed"]:
            return

        if not queue:
            return

        while True:
            if await request.is_disconnected():
                break
            try:
                event_data = await asyncio.wait_for(queue.get(), timeout=1.0)
                yield json.dumps(event_data, default=str)
                if event_data.get("status") in ["completed", "failed"]:
                    break
            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break

    return EventSourceResponse(event_generator())


@app.post("/api/research/{job_id}/steer")
async def steer_job(job_id: str, req: SteerRequest):
    repo = get_repository()
    job_data = await repo.get_job(job_id)
    if not job_data:
        raise HTTPException(status_code=404, detail="Job not found")

    pinned = req.pinnedUrls or []
    excluded = req.excludedUrls or []

    await repo.save_steering(job_id, pinned, excluded)
    log_msg = f"Steering configuration updated: Pinned {len(pinned)} URLs, Excluded {len(excluded)} URLs."
    log_entry = make_log("System", log_msg, "info")
    await repo.add_log(job_id, log_entry)
    await _send_event(job_id, {"logs": [log_entry], "steering": {"pinnedUrls": pinned, "excludedUrls": excluded}})

    return {"status": "success", "job_id": job_id, "pinnedUrls": pinned, "excludedUrls": excluded}


@app.get("/api/history", response_model=List[HistoryEntry])
async def list_history():
    repo = get_repository()
    records = await repo.list_history()
    history = []
    for r in records:
        sc = r.get("scores") or {}
        res = r.get("results") or {}
        history.append(HistoryEntry(
            job_id=str(r.get("job_id") or r.get("id")),
            topic=r.get("topic", ""),
            status=r.get("status", ""),
            final_score=sc.get("final_score") or (res.get("revised_score") if res.get("was_revised") else res.get("initial_score")),
            trust_score=sc.get("trust_score"),
            quality_score=sc.get("quality_score"),
            was_revised=res.get("was_revised", False),
            created_at=float(r.get("created_at", 0))
        ))
    history.sort(key=lambda x: x.created_at, reverse=True)
    return history


@app.get("/api/history/{job_id}", response_model=JobStatus)
async def get_history_entry(job_id: str):
    repo = get_repository()
    job_data = await repo.get_job(job_id)
    if not job_data:
        raise HTTPException(status_code=404, detail="Job not found")
    return _to_job_status(job_data)


@app.delete("/api/history")
async def clear_history():
    repo = get_repository()
    await repo.clear_history()
    job_queues.clear()
    return {"status": "cleared"}
