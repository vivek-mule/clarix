# 🧠 AI-Powered Adaptive Learning Platform

An intelligent learning platform that personalises educational content in real-time using AI agents, vector search, and knowledge modelling.

## Tech Stack

| Layer          | Technology                                        |
| -------------- | ------------------------------------------------- |
| **Frontend**   | React 19, Tailwind CSS v4, Vite, Zustand          |
| **Backend**    | Python 3.11+, FastAPI, Uvicorn                     |
| **AI / Agents**| LangGraph, LangChain, Google Gemini 1.5 Pro       |
| **Embeddings** | Sentence Transformers `all-MiniLM-L6-v2` (local)  |
| **Vector DB**  | Pinecone (384-dim, cosine)                         |
| **Auth & DB**  | Supabase (Auth + PostgreSQL)                       |

## Project Structure

```
Pragyantra Hackathon/
├── .env.example                   # ← copy to .env & fill in credentials
├── .gitignore
├── README.md
│
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py                # FastAPI entry point
│       ├── core/
│       │   ├── config.py          # Pydantic settings (.env loader)
│       │   ├── embeddings.py      # Local all-MiniLM-L6-v2 wrapper
│       │   ├── pinecone_client.py # Pinecone index (384-dim, cosine)
│       │   └── supabase_client.py # Supabase client singleton
│       ├── api/
│       │   ├── auth.py            # /api/auth — signup, login, logout
│       │   ├── learning.py        # /api/learning — topics & content
│       │   ├── assessment.py      # /api/assessment — quizzes
│       │   └── chat.py            # /api/chat — AI tutor
│       ├── models/
│       │   └── schemas.py         # Pydantic domain schemas
│       ├── services/
│       │   ├── knowledge_base.py  # Embed + upsert/query Pinecone
│       │   └── learner_model.py   # Learner profile CRUD (Supabase)
│       └── agents/
│           ├── llm.py             # Shared Gemini LLM instance
│           ├── tutor_agent.py     # LangGraph: retrieve → respond
│           ├── content_agent.py   # LangGraph: assess → select → adapt
│           └── assessment_agent.py# LangGraph: generate → evaluate → update
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx               # React entry point
│       ├── App.jsx                # Routes
│       ├── index.css              # Tailwind + design tokens
│       ├── lib/
│       │   ├── api.js             # Axios instance
│       │   └── supabaseClient.js  # Browser Supabase client
│       ├── components/
│       │   ├── Layout.jsx
│       │   └── Navbar.jsx
│       └── pages/
│           ├── HomePage.jsx
│           ├── DashboardPage.jsx
│           ├── LearnPage.jsx
│           ├── QuizPage.jsx
│           ├── ChatPage.jsx
│           └── LoginPage.jsx
│
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql # Tables + RLS policies
```

## Quick Start

### 1. Environment

```bash
cp .env.example .env
# Fill in your API keys
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Database

Run `supabase/migrations/001_initial_schema.sql` in your Supabase SQL editor.

## Architecture

```
┌─────────────┐       ┌─────────────────────────────────────┐
│  React SPA  │──────▶│  FastAPI  (/api/*)                  │
│  (Vite)     │  HTTP │                                     │
└─────────────┘       │  ┌───────────┐   ┌──────────────┐  │
                      │  │ LangGraph │──▶│ Gemini 1.5   │  │
                      │  │  Agents   │   │  Pro (LLM)   │  │
                      │  └─────┬─────┘   └──────────────┘  │
                      │        │                            │
                      │  ┌─────▼─────┐   ┌──────────────┐  │
                      │  │ Sentence  │──▶│  Pinecone    │  │
                      │  │Transformers│  │ (384d cosine)│  │
                      │  │  (local)  │   └──────────────┘  │
                      │  └───────────┘                      │
                      │        │                            │
                      │  ┌─────▼─────────────────────────┐  │
                      │  │  Supabase (Auth + PostgreSQL) │  │
                      │  └───────────────────────────────┘  │
                      └─────────────────────────────────────┘
```

## License

MIT
