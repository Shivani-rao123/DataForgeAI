# DataForge AI

Agentic AI Data Intelligence Platform — turns a plain-English request into a clean, structured, source-backed dataset using a team of specialized AI agents.

## Team split

| Person | Owns |
|---|---|
| 1 — Backend: Planning agents | Planner Agent, Source-Discovery Agent, workflow JSON schema |
| 2 — Backend: Data agents + DB | Extraction Agent(s), Validator Agent, Critic/Self-Healing Agent, PostgreSQL, Redis |
| 3 — Frontend: Core + live view | Next.js setup, prompt input, workflow graph viewer/editor, Socket.IO live monitoring |
| 4 — Frontend: Data + polish | Dataset explorer, citation popover, dedupe explainer, export menu, history/templates, polish |

## Free tools used

- LLM: Groq API (free tier — console.groq.com)
- Web search: Tavily API (free tier — tavily.com)
- Everything else (Node, Express, Socket.IO, Next.js, React, Tailwind, PostgreSQL, Redis) is open source, no cost

## Getting started (backend)

\`\`\`
cd backend
cp .env.example .env      # add your GROQ_API_KEY and TAVILY_API_KEY
npm install
npm run dev                # starts on http://localhost:4000
\`\`\`

## Current status

- [x] Repo structure

- [x] Backend server wired up
- [x] Planner Agent (Groq) — prompt in, workflow JSON spec out
- [x] Source-Discovery Agent (Tavily) — resolves sources into real URLs
- [x] Shared workflow JSON schema (Zod), validated at every step
- [ ] Extraction, Validator, Critic agents
- [ ] PostgreSQL + Redis
- [ ] Frontend (Next.js)
