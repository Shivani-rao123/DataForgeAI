# DataForge AI

DataForge AI converts a natural-language request into a clean, structured, source-backed dataset. Specialized agents plan the request, discover sources, extract records, check quality, validate fields, and remove duplicates.

## Contents

- [What it does](#what-it-does)
- [Technology stack](#technology-stack)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [API overview](#api-overview)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Roadmap](#roadmap)

## What it does

Typical workflow:

1. The user describes the dataset they need.
2. The Planner creates a structured workflow specification.
3. Source Discovery resolves searches, websites, and connectors into usable sources.
4. Extraction collects records and source citations.
5. The Critic checks source quality and can retry weak extractions.
6. The Validator checks fields, reports issues, and deduplicates records.
7. The result is shown in the frontend and can be exported as CSV or copied as JSON.

The frontend receives progress through Server-Sent Events (SSE), so each agent stage is visible while the pipeline runs.

## Technology stack

### Frontend

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- Zustand for client-side workflow state
- Framer Motion for UI transitions
- `@xyflow/react` for the pipeline graph
- Lucide React for icons

### Backend

- Python 3.10 or newer
- FastAPI and Uvicorn
- Pydantic 2 request and workflow schemas
- LangGraph pipeline orchestration
- Groq or Gemini language models
- Tavily source discovery
- SQLAlchemy 2 persistence
- SQLite for local development or PostgreSQL for deployment
- Redis and RQ integration for queued extraction work
- Trafilatura and provider connectors for source extraction

## Quick start

### Requirements

- Python 3.10+
- Node.js 20+
- npm
- An LLM API key for Groq or Gemini
- A Tavily API key for web-search workflows

### 1. Start the backend

Linux/macOS:

```bash
cd backend-py
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Windows PowerShell:

```powershell
cd backend-py
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

The API is available at [http://localhost:8000](http://localhost:8000). Interactive API documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

### 2. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

Start Next.js:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

Copy [backend-py/.env.example](backend-py/.env.example) to `backend-py/.env`. The following values are supported:

| Variable | Required | Purpose |
| --- | --- | --- |
| `LLM_PROVIDER` | Yes | Select `groq` or `gemini` |
| `GROQ_API_KEY` | Provider-dependent | Groq credential |
| `GEMINI_API_KEY` | Provider-dependent | Gemini credential |
| `GEMINI_MODEL` | No | Gemini model override |
| `TAVILY_API_KEY` | For web search | Tavily credential |
| `DATABASE_URL` | No | PostgreSQL URL; SQLite is the default |
| `REDIS_URL` | No | Redis URL for queues and pub/sub |
| `ALLOWED_ORIGINS` | Recommended | Comma-separated frontend origins |
| `ENV` | No | `development` or `production` |
| `ADZUNA_APP_ID` | Optional | Adzuna connector application ID |
| `ADZUNA_APP_KEY` | Optional | Adzuna connector application key |
| `ADZUNA_COUNTRY` | Optional | Adzuna country code, such as `in` or `us` |

For local development, the backend automatically permits `localhost:3000` and `127.0.0.1:3000` when `ENV=development`.

## Architecture

```text
Next.js frontend
	|
	| REST + Server-Sent Events
	v
FastAPI API
	|
	v
Planner -> Source Discovery -> Extraction -> Critic -> Validator
	|                                             |
	+---------------- SQLAlchemy persistence <-----+
			      |
		       SQLite or PostgreSQL
			      |
			 Redis / RQ
```

Important backend modules:

- `backend-py/app/main.py`: FastAPI application, CORS, startup, planning, discovery, and task routes
- `backend-py/app/stream.py`: live pipeline execution and SSE events
- `backend-py/app/graph.py`: LangGraph orchestration for non-streaming execution
- `backend-py/app/schemas.py`: shared workflow and result contracts
- `backend-py/app/agents/`: planning, discovery, extraction, critic, and validation logic
- `backend-py/app/connectors/`: structured source providers
- `backend-py/app/db/`: models, persistence, Redis, and queue integration
- `frontend/app/`: application routes
- `frontend/components/workflow/`: graph, status strip, logs, and results table
- `frontend/lib/api.ts`: REST and SSE client
- `frontend/hooks/use-workflow-state.ts`: Zustand workflow state

## API overview

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

The stream can emit:

```text
pipeline:start
planner:start / planner:done
discovery:start / discovery:done
extraction:start / extraction:done
critic:start / critic:done
validator:start / validator:done
pipeline:complete
pipeline:error
pipeline:cancelled
```

### Tasks

```http
GET /api/tasks?limit=50&offset=0&status=done&search=jobs
GET /api/tasks/{task_id}
GET /api/tasks/{task_id}/events
POST /api/tasks/{task_id}/cancel
POST /api/tasks/{task_id}/retry
```

Task states are `running`, `done`, `failed`, and `cancelled`. Cancellation takes effect at the next pipeline stage boundary after the currently running blocking operation finishes.

## Routes in the frontend

| Route | Purpose |
| --- | --- |
| `/` | Submit a new natural-language request |
| `/workflow` | Watch the live pipeline and inspect results |
| `/dashboard` | View run statistics and recent workflows |
| `/history` | Browse saved workflows |
| `/datasets` | Inspect and export completed datasets |

## Development

Frontend commands:

```bash
cd frontend
npm run dev
npm run lint
npx tsc --noEmit
npm run build
npm run start
```

Backend commands:

```bash
cd backend-py
source venv/bin/activate
python -m compileall -q app
uvicorn app.main:app --reload --port 8000
```

The repository currently has no automated test suite. Before opening a pull request, run the frontend lint/type checks and compile the backend package.

## Troubleshooting

### Frontend cannot reach the API

Confirm that the backend is running on port `8000` and that `frontend/.env.local` contains:

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

Restart the Next.js development server after changing environment variables.

### CORS errors

Set the frontend origin in the backend environment:

```dotenv
ENV=production
ALLOWED_ORIGINS=http://localhost:3000
```

For local development, leave `ENV=development` to enable the built-in localhost origins.

### The workflow appears stuck

The first model request can take longer because the backend warms up the LLM at startup. Check the backend terminal for provider errors, confirm the selected provider API key, and verify that Tavily is configured for web-search prompts.

### Stop does not cancel immediately

Cancellation is cooperative. The API accepts the cancellation request while the pipeline is running, but a synchronous model, network, or extraction operation must finish before the next cancellation check runs.

### Database errors

The default local database is `dataforge.db` in the backend working directory. For PostgreSQL, verify the complete `DATABASE_URL`, network access, and SSL requirements. Database initialization runs automatically at API startup.

## Production notes

- Set `ENV=production` and configure `ALLOWED_ORIGINS` explicitly.
- Use PostgreSQL instead of the local SQLite file for shared deployments.
- Use managed Redis when running multiple API instances or RQ workers.
- Set `NEXT_PUBLIC_API_URL` before building the frontend.
- Use HTTPS and a reverse proxy that preserves SSE connections.
- Configure proxy read timeouts long enough for model and extraction stages.
- Add authentication before exposing task history, retry, or cancellation publicly.
- Store all secrets in a deployment secret manager.

## Security

Never commit `.env`, database URLs, Redis URLs, or API keys. If a credential is exposed, revoke and rotate it immediately. The current API is designed for local or trusted environments; authentication, per-user task ownership, rate limiting, and authorization are still required for public deployment.

## Contributing

1. Create a focused branch, for example `feature/workflow-task-lifecycle`.
2. Keep frontend and backend contract changes synchronized.
3. Update the relevant README section when adding a route, environment variable, or command.
4. Run `npm run lint`, `npx tsc --noEmit`, and `python -m compileall -q app` before opening a pull request.
5. Do not include secrets, generated databases, or local environment files in commits.

## Roadmap

- Authentication and per-user task ownership
- Automated backend and frontend tests
- Durable background execution for the complete pipeline
- Reconnectable SSE streams after a browser refresh
- History search, filtering, pagination, and deletion
- Reusable workflow templates
- More structured data connectors
- Dataset versioning and scheduled refreshes
