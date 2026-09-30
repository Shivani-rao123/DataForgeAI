# DataForge AI Frontend

The DataForge AI frontend is a Next.js App Router application for submitting natural-language data requests, monitoring the agent pipeline, inspecting validated records, and exporting datasets.

See the repository [README](../README.md) for the complete architecture, backend setup, API reference, environment documentation, and production notes.

## Stack

- Next.js 16 and React 19
- TypeScript
- Tailwind CSS 4
- Zustand for workflow state
- Framer Motion for animation
- React Flow for the pipeline graph
- Lucide React for icons

## Setup

From this directory:

```bash
npm install
```

Create `.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The backend must be running on port `8000` for planning, streaming, history, and dataset operations.

## Commands

```bash
npm run dev       # Start the development server
npm run lint      # Run ESLint
npx tsc --noEmit  # Check TypeScript without emitting files
npm run build     # Create a production build
npm run start     # Serve the production build
```

## App Areas

| Route | Purpose |
| --- | --- |
| `/` | Create a new data collection workflow |
| `/workflow` | View live agent progress and validated results |
| `/dashboard` | View run statistics and recent workflows |
| `/history` | Browse previously completed workflows |
| `/datasets` | Inspect and export saved datasets |

## Main Code Areas

- `app/`: route pages and global styles
- `components/landing/`: prompt entry experience
- `components/layout/`: sidebar and application chrome
- `components/workflow/`: graph, agent status, logs, and result table
- `hooks/use-workflow-state.ts`: client-side workflow state
- `lib/api.ts`: backend REST and SSE client
- `lib/types.ts`: frontend representation of backend contracts
- `lib/csv.ts`: dataset export helpers

## Backend Connection

The API client reads `NEXT_PUBLIC_API_URL`. For local development, start the backend from the repository root with:

```bash
cd backend-py
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

The workflow page consumes the backend SSE endpoint at `/api/workflows/run/stream` and supports task cancellation through `/api/tasks/{task_id}/cancel`.

## Deployment

Set `NEXT_PUBLIC_API_URL` to the deployed API URL, then run:

```bash
npm run build
npm run start
```

Use HTTPS in production and configure the backend CORS allowlist to include the deployed frontend origin.
