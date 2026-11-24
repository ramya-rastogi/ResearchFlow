# ResearchFlow

An autonomous, multi-agent AI research pipeline with LangGraph state orchestration, deterministic citation auditing, real-time SSE streaming, and persistent history tracking.

---

## Architecture Overview

- **Backend:** FastAPI, LangGraph, LangChain (`langchain-mistralai`, `langchain-groq`), Tavily Search, BeautifulSoup, asyncpg (PostgreSQL).
- **Frontend:** React 18, Vite, Tailwind CSS v4 (`@tailwindcss/vite`), Framer Motion, Lucide Icons.
- **Workflow State Machine:**
  1. **Search Node:** Dual concurrent queries (topic + dynamic current year query) via Tavily with source exclusion and pinned URL prioritization.
  2. **Scrape Node:** Concurrent extraction of candidate pages, HTML clean-up (stripping scripts/styles/nav/footers), and short page discarding.
  3. **Write Node:** Grounded report drafting (Summary, Key Findings, Conclusion) with mandatory inline citations `(https://...)`.
  4. **Critic Node:** Fact-checking and structural review combined with deterministic Python verification (penalizing fabricated links and measuring citation coverage).
  5. **Revise Node:** Conditional loop re-evaluating the report until the trust threshold (default 90) or maximum revision limit (default 2) is reached.

---

## Quickstart Setup

### 1. Configure Environment Variables
Copy `.env.example` to `.env` in the root repository:
```bash
cp .env.example .env
```
Ensure your API keys are added:
- `TAVILY_API_KEY`: Required for web searches.
- `MISTRAL_API_KEY`: Required if `LLM_PROVIDER=mistral` (default).
- `GROQ_API_KEY`: Required if `LLM_PROVIDER=groq`.
- `DATABASE_URL`: (Optional) PostgreSQL connection URI. If omitted or offline, the system operates seamlessly in in-memory mode.

---

### 2. Backend Setup
From the repository root:
```bash
# Create and activate virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run the FastAPI server
uvicorn backend.app.main:app --reload --port 8000
```
Backend will be live at `http://localhost:8000` (Docs at `http://localhost:8000/docs`).

---

### 3. Frontend Setup
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
The React application will be accessible at `http://localhost:5173`.

---

### 4. Running with Docker Compose
To run PostgreSQL, Backend, and Frontend together:
```bash
docker-compose up --build
```

---

### 5. Running the Test Suite
From the repository root, run:
```bash
pytest
```
All unit and integration tests (tools, nodes, routing, API, and SSE streaming) run with fully mocked network and LLM layers.
