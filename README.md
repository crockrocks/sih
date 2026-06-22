# InterviewAssist

An AI-powered recruitment platform that automates candidate screening using a LangGraph agentic pipeline, vector search, and LLM-based scoring.

## How it works

When an employee triggers candidate scoring, the backend runs a multi-step LangGraph pipeline:

1. **Intent Router** — classifies the query (screen / generate questions / compare)
2. **Resume Screener** — LLM extracts structured scores from the candidate's profile
3. **Qdrant Retriever** — hybrid dense + BM25 retrieval over the resume and job vector stores
4. **Relevance Grader** — decides whether retrieved context is sufficient
5. **Query Rewriter** — rewrites the query and retries retrieval if context is weak (up to 2 retries)
6. **Answer Generator** — produces a final JSON score with explanation
7. **RAGAS Evaluation** — faithfulness / relevancy metrics logged to MLflow after each run

Expert matching runs in parallel via batch embedding similarity (zero LLM calls) to recommend the top 5 internal experts for the role.

## Tech stack

### Frontend
- React 18 + Vite
- Tailwind CSS, Headless UI, Framer Motion
- React Router v6, Axios

### Backend
- FastAPI + Uvicorn (async)
- MongoDB via Motor (async driver)
- LangGraph + LangChain — agentic screening pipeline
- Groq AI (primary LLM) — optional local LLM via llama.cpp OpenAI-compatible server
- Qdrant — vector store for resumes and job descriptions
- fastembed (`BAAI/bge-small-en-v1.5`) — ONNX embeddings, no scikit-learn dependency
- rank-bm25 — sparse retrieval for hybrid search
- RAGAS — RAG evaluation (faithfulness, answer relevancy)
- MLflow — experiment tracking for RAGAS scores
- PyMuPDF — PDF text extraction

### Infrastructure
- Docker Compose — Qdrant, MLflow, FastAPI containers
- Kubernetes — `k8s/` manifests for cloud deployment

## Project structure

```
InterviewAssist/
├── docker-compose.yml          # Qdrant + MLflow + FastAPI services
├── k8s/                        # Kubernetes manifests
│   ├── fastapi-deployment.yaml
│   ├── mlflow-deployment.yaml
│   ├── qdrant-deployment.yaml
│   └── secrets.yaml            # gitignored — populate manually
└── interview/
    ├── src/
    │   └── Components/         # React pages & UI components
    ├── backend/
    │   ├── main.py             # FastAPI app & all API routes
    │   ├── config.py           # Env-driven configuration
    │   ├── parse.py            # PDF extraction & resume parsing
    │   ├── score.py            # Batch expert scoring via embeddings
    │   ├── llm.py / llm_factory.py
    │   ├── graph/              # LangGraph pipeline
    │   │   ├── graph.py        # Graph definition & compilation
    │   │   ├── nodes.py        # Node implementations
    │   │   └── state.py        # ScreeningState TypedDict
    │   ├── retrieval/          # Qdrant client & embedding helpers
    │   ├── evaluation/         # RAGAS + MLflow logging
    │   └── requirements.txt
    └── package.json
```

## Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- Docker & Docker Compose
- MongoDB Atlas URI (or local MongoDB)
- Groq API key

### 1. Infrastructure (Qdrant + MLflow)

```bash
docker compose up -d qdrant mlflow
```

Qdrant REST: `http://localhost:6333`  
MLflow UI: `http://localhost:5001`

### 2. Backend

```bash
cd interview/backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Create `interview/backend/.env`:

```env
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/
GROQ_AI_KEY=<your-groq-key>
QDRANT_HOST=localhost
QDRANT_PORT=6333
MLFLOW_TRACKING_URI=http://localhost:5001
# Optional — local LLM via llama.cpp
USE_LOCAL_LLM=false
LOCAL_LLM_URL=http://localhost:8080/v1
LOCAL_LLM_MODEL=local
```

```bash
uvicorn main:app --reload --port 8000
```

### 3. Frontend

```bash
cd interview
npm install
npm run dev
```

App runs at `http://localhost:5174`.

### 4. Full stack via Docker Compose

```bash
# copy and fill in the root .env for the compose file
cp interview/backend/.env .env
docker compose up --build
```

## API overview

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/register` | Register candidate or employee |
| POST | `/api/login` | Login |
| POST | `/api/parse-resume` | Extract structured data from PDF |
| POST | `/api/submit-interview` | Save candidate profile + upsert to Qdrant |
| GET | `/api/job-openings` | List all job openings |
| POST | `/api/job-openings` | Create job opening + upsert to Qdrant |
| POST | `/api/job-openings/{id}/apply` | Apply for a job |
| GET | `/api/score-candidate/{job_id}/{email}` | Run LangGraph screening pipeline |
| POST | `/api/job-openings/{id}/select-candidate` | Mark candidate selected |

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | Yes | MongoDB connection string |
| `GROQ_AI_KEY` | Yes (if not using local LLM) | Groq API key |
| `QDRANT_HOST` | No | Defaults to `localhost` |
| `QDRANT_PORT` | No | Defaults to `6333` |
| `MLFLOW_TRACKING_URI` | No | Defaults to `http://localhost:5001` |
| `USE_LOCAL_LLM` | No | `true` to use llama.cpp server |
| `LOCAL_LLM_URL` | No | llama.cpp OpenAI-compatible base URL |
| `LOCAL_LLM_MODEL` | No | Model name for local LLM |
