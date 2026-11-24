import pytest
import httpx
from unittest.mock import patch, AsyncMock
from backend.app.main import app
from backend.database import get_repository

@pytest.fixture(autouse=True)
async def clear_repo():
    repo = get_repository()
    await repo.clear_history()

@pytest.mark.asyncio
@patch('backend.app.main.run_pipeline_task')
async def test_api_create_and_get_job(mock_run):
    mock_run.return_value = None
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Create job
        res = await client.post("/api/research", json={"topic": "Solid State Batteries"})
        assert res.status_code == 200
        data = res.json()
        assert "job_id" in data
        job_id = data["job_id"]
        assert data["topic"] == "Solid State Batteries"
        assert data["status"] == "running"

        # Get job status
        res_get = await client.get(f"/api/research/{job_id}")
        assert res_get.status_code == 200
        get_data = res_get.json()
        assert get_data["job_id"] == job_id
        assert get_data["topic"] == "Solid State Batteries"

@pytest.mark.asyncio
async def test_api_job_not_found_404():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/research/nonexistent-id-000")
        assert res.status_code == 404

@pytest.mark.asyncio
@patch('backend.app.main.run_pipeline_task')
async def test_api_steer_job(mock_run):
    mock_run.return_value = None
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/research", json={"topic": "Gene Therapy"})
        job_id = res.json()["job_id"]

        # Steer
        steer_payload = {
            "pinnedUrls": ["https://nih.gov/genes"],
            "excludedUrls": ["https://randomblog.com"]
        }
        steer_res = await client.post(f"/api/research/{job_id}/steer", json=steer_payload)
        assert steer_res.status_code == 200
        steer_data = steer_res.json()
        assert steer_data["status"] == "success"

        # Check job status includes steering
        status_res = await client.get(f"/api/research/{job_id}")
        job_info = status_res.json()
        assert job_info["steering"]["pinnedUrls"] == ["https://nih.gov/genes"]
        assert job_info["steering"]["excludedUrls"] == ["https://randomblog.com"]

@pytest.mark.asyncio
@patch('backend.app.main.run_pipeline_task')
async def test_api_history_and_clear(mock_run):
    mock_run.return_value = None
    repo = get_repository()
    # Add a completed job
    job = await repo.create_job("11111111-1111-1111-1111-111111111111", "Topic A")
    await repo.update_job("11111111-1111-1111-1111-111111111111", {
        "status": "completed",
        "scores": {"final_score": 9, "trust_score": 92, "quality_score": 88}
    })

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        hist_res = await client.get("/api/history")
        assert hist_res.status_code == 200
        history = hist_res.json()
        assert len(history) == 1
        assert history[0]["topic"] == "Topic A"
        assert history[0]["final_score"] == 9

        # Clear history
        del_res = await client.delete("/api/history")
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "cleared"

        # History is now empty
        empty_res = await client.get("/api/history")
        assert len(empty_res.json()) == 0

@pytest.mark.asyncio
async def test_api_sse_stream_initial_snapshot():
    repo = get_repository()
    job = await repo.create_job("22222222-2222-2222-2222-222222222222", "Stream Topic")
    await repo.update_job("22222222-2222-2222-2222-222222222222", {"status": "completed"})

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        async with client.stream("GET", "/api/research/22222222-2222-2222-2222-222222222222/stream") as response:
            assert response.status_code == 200
            assert "text/event-stream" in response.headers["content-type"]
            lines = []
            async for line in response.aiter_lines():
                if line.startswith("data:"):
                    lines.append(line)
                    break
            assert len(lines) > 0
            assert "Stream Topic" in lines[0]
