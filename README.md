# DataForge AI

DataForge AI turns a plain-English request into a clean, structured, source-backed dataset. A multi-agent pipeline plans the request, discovers sources, extracts records, checks extraction quality, validates the result, removes duplicates, and exposes live progress in the web application.

## Features

- Natural-language data collection prompts
- Planner, Source Discovery, Extraction, Critic, and Validator agents
- Web search and structured job-board connectors
- Source citations and record verification status
- Live pipeline progress over Server-Sent Events (SSE)
- Searchable, sortable result tables
- CSV export and JSON copying
- Workflow history and saved datasets
- Durable task status and agent event history
- Workflow cancellation and retry endpoints
- SQLite for local development or PostgreSQL for shared deployments
- Redis and RQ support for queued extraction work

## Technology Stack

### Frontend

- Next.js 16 with the App Router
- React 19 and TypeScript
- Tailwind CSS 4
- Zustand for workflow state
- Framer Motion for transitions
- React Flow via `@xyflow/react` for the pipeline graph
- Lucide React for icons

### Backend

- Python 3.10+
- FastAPI and Uvicorn
- Pydantic 2 for request and workflow schemas
- LangGraph for pipeline orchestration
- Groq or Gemini for language-model execution
- Tavily for web source discovery
- SQLAlchemy 2 for persistence
- SQLite by default, PostgreSQL supported
- Redis and RQ for queueing and progress infrastructure
- Trafilatura and connector clients for source extraction

## Repository Layout

```text
DataForgeAI/
├── backend-py/
│   ├── app/
│   │   ├── agents/          Planner, discovery, extraction, critic, validator
│   │   ├── connectors/      Structured job and public-data connectors
│   │   ├── db/              SQLAlchemy models, persistence, Redis, queue
│   │   ├── workers/         Background extraction workers
│   │   ├── graph.py         LangGraph workflow
│   │   ├── main.py          FastAPI application and REST routes
│   │   ├── schemas.py       Shared Pydantic workflow contract
│   │   └── stream.py        SSE pipeline and task controls
│   ├── .env.example
│   ├── requirements.txt
│   └── debug_extract.py
├── frontend/
│   ├── app/                 Home, dashboard, workflow, history, datasets
│   ├── components/          Layout, landing, workflow, and shared UI
│   ├── hooks/               Zustand workflow state
│   ├── lib/                 API client, types, CSV export, utilities
│   └── package.json
└── README.md
```

## Prerequisites

- Python 3.10 or newer
- Node.js 20 or newer
- npm
- An LLM API key: Groq or Gemini
- A Tavily API key for web search workflows
- PostgreSQL and Redis only when using external services; local SQLite works without them

## Backend Setup

From the repository root:

```bash
cd backend-py
python -m venv venv
```

Activate the virtual environment:

```bash
# Linux/macOS
source venv/bin/activate

# Windows PowerShell
venv\Scripts\Activate.ps1
```

Install dependencies and create the environment file:

```bash
pip install -r requirements.txt
cp .env.example .env
```

Add the required credentials to `backend-py/.env`, then start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

The backend runs at [http://localhost:8000](http://localhost:8000). FastAPI documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

## Frontend Setup

Open a second terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

The backend template is [backend-py/.env.example](backend-py/.env.example). Never commit a real `.env` file or place secrets in frontend environment variables unless they are intentionally public.

### Core backend variables

| Variable | Required | Description |
| --- | --- | --- |
| `LLM_PROVIDER` | Yes | `groq` or `gemini` |
| `GROQ_API_KEY` | If using Groq | Groq API credential |
| `GEMINI_API_KEY` | If using Gemini | Gemini API credential |
| `GEMINI_MODEL` | No | Gemini model name |
| `TAVILY_API_KEY` | Yes for web search | Tavily search credential |
| `DATABASE_URL` | No | PostgreSQL URL; SQLite is the default |
| `REDIS_URL` | No | Redis URL for queue and pub/sub support |
| `ALLOWED_ORIGINS` | Recommended | Comma-separated frontend origins |
| `ENV` | No | `development` or `production` |

### Optional connector variables

| Variable | Description |
| --- | --- |
| `ADZUNA_APP_ID` | Adzuna application ID |
| `ADZUNA_APP_KEY` | Adzuna application key |
| `ADZUNA_COUNTRY` | Adzuna country code, such as `in`, `gb`, or `us` |

## How the Pipeline Works

```text
User prompt
	|
	v
Planner
	|
	v
Source Discovery
	|
	v
Extraction
	|
	v
Critic / Self-healing
	|
	v
Validator / Deduplication
	|
	v
Persisted dataset + citations
```

The frontend connects to `GET /api/workflows/run/stream`. Each stage emits start and completion events. A completed event includes the validated result needed to render the table without another request.

## API Reference

### Health

```http
GET /health
```

### Planning and execution

```http
POST /api/workflows/plan
Content-Type: application/json

{"prompt":"Find entry-level software engineering jobs in Bangalore"}
```

```http
POST /api/workflows/discover
Content-Type: application/json

{"spec":{...}}
```

```http
GET /api/workflows/run/stream?prompt=...
```

The SSE stream emits events including:

- `pipeline:start`
- `planner:start`, `planner:done`
- `discovery:start`, `discovery:done`
- `extraction:start`, `extraction:done`
- `critic:start`, `critic:done`
- `validator:start`, `validator:done`
- `pipeline:complete`
- `pipeline:error`
- `pipeline:cancelled`

### Tasks and history

```http
GET /api/tasks?limit=50&offset=0&status=done&search=jobs
GET /api/tasks/{task_id}
GET /api/tasks/{task_id}/events
POST /api/tasks/{task_id}/cancel
POST /api/tasks/{task_id}/retry
```

Task statuses are `running`, `done`, `failed`, and `cancelled`.

## Development Commands

Frontend:

```bash
cd frontend
npm run dev
npm run lint
npx tsc --noEmit
npm run build
```

Backend:

```bash
cd backend-py
source venv/bin/activate
python -m compileall -q app
uvicorn app.main:app --reload --port 8000
```

## Production Notes

- Set `ENV=production` and configure `ALLOWED_ORIGINS` explicitly.
- Use PostgreSQL rather than the local SQLite file for shared or deployed environments.
- Use a managed Redis instance when running RQ workers or multiple API instances.
- Set `NEXT_PUBLIC_API_URL` to the deployed API URL when building the frontend.
- Run the frontend with `npm run build && npm run start`.
- Put the API behind HTTPS and a reverse proxy capable of preserving SSE connections.
- Add authentication before exposing task history, retry, or cancellation to untrusted users.
- Keep API keys, database URLs, and Redis URLs outside version control.

## Security

Credentials must only be stored in local or deployment secret managers. If a secret is committed or shared, revoke and rotate it immediately. Do not paste real credentials into issues, pull requests, screenshots, or chat logs.

The current API is intended for local development and trusted environments. Authentication, per-user task ownership, rate limiting, and production-grade authorization should be added before public deployment.

## Team Ownership

| Area | Ownership |
| --- | --- |
| Planning and source discovery agents | Backend planning |
| Extraction, critic, validator, database, Redis | Backend data and infrastructure |
| Next.js app, prompt input, workflow graph, live monitoring | Frontend core |
| Dataset explorer, citations, dedupe explanation, exports, history, polish | Frontend data and UX |

## Current Status

- [x] Backend FastAPI server
- [x] Planner and source discovery agents
- [x] Extraction, critic, validator, and deduplication pipeline
- [x] LangGraph workflow orchestration
- [x] SQLite/PostgreSQL persistence
- [x] Redis/RQ integration points
- [x] SSE live workflow monitoring
- [x] Task history and dataset views
- [x] CSV export and result inspection
- [x] Task cancellation and retry endpoints
- [ ] Authentication and per-user task ownership
- [ ] Production background-worker execution for the complete pipeline
- [ ] Automated backend and frontend test suite
