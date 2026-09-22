# AI-Driven Enterprise Project Intelligence & Risk Management Platform

An AI-assisted project intelligence and risk-management platform that converts project documents into grounded analysis, risk evidence, delivery forecasts, structured chat answers, and exportable reports.

## Features

- Secure account signup and login with bcrypt password hashing and signed HTTP-only sessions
- Per-user history, upload storage, vector retrieval, analysis, chat, forecasts, and report generation
- PDF, DOCX, CSV, and TXT upload with local preview before submission
- Gemini-powered document analysis backed by ChromaDB retrieval
- Evidence-linked risks, health scoring, delivery forecasting, and recommendations
- Grounded project Q&A with readable structured responses
- Word and PDF health-report export
- Completed Agile, Defect Tracker, and Unit Test internship artifacts
- Gmail import is clearly marked as a planned feature; no Gmail account or mailbox data is connected

## Privacy and security

- `.env`, account records, history, uploaded documents, ChromaDB, virtual environments, dependencies, and build output are excluded from Git.
- The backend derives identity from a signed session cookie instead of trusting an email supplied by the browser.
- Every data endpoint verifies authentication and filters documents by the authenticated owner.
- Each installation starts with its own local accounts and data. No developer email, password, Gmail token, history, or uploaded document is included in this repository.

## How it works

1. A user creates an account or signs in.
2. The browser previews the selected PDF, DOCX, CSV, or TXT file before upload.
3. FastAPI extracts and chunks the document text, then stores embeddings in ChromaDB under the authenticated user.
4. Gemini produces structured project health, risk, recommendation, and user-story analysis grounded in the uploaded content.
5. The same private document context powers the risk view, forecast, chat assistant, and Word/PDF reports.

## Project structure

```text
ai-project-advisor/
├── backend/
│   ├── main.py                 # FastAPI routes, authentication, RAG, analysis, forecast, and reports
│   ├── requirements.txt        # Python dependencies
│   └── .env.example            # Safe environment-variable template
├── frontend/
│   ├── src/App.jsx             # React application and all product views
│   ├── src/index.css           # Application styling
│   ├── public/                 # Public icons and favicon
│   └── package.json            # Frontend dependencies and scripts
├── Internship_artifacts/       # Completed Agile, Defect Tracker, and Unit Test workbooks
├── sample_data/                # Synthetic documents for reviewer testing
├── Individual_PPT_Param_Kumar.pptx
├── REQUIREMENTS_INSTALLATION_EXECUTION.md
├── .gitignore                  # Excludes secrets, accounts, uploads, vectors, dependencies, and builds
└── README.md
```

Use `REQUIREMENTS_INSTALLATION_EXECUTION.md` for prerequisites, package requirements, installation, execution, verification, and security guidance in one file.

## Local setup

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Set your own `GEMINI_API_KEY` and a long random `SESSION_SECRET` in `backend/.env`, then run:

```bash
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Each user must create or log in to their own local account.

## Quick demo

1. Start the backend and frontend.
2. Create a fresh local account.
3. Open **Upload** and preview a file from `sample_data/` before uploading it.
4. Run **AI Analysis** and review the health score, evidence-backed risks, and recommendations.
5. Open **Risks** and **Forecast**, then ask the assistant a project-specific question.
6. Generate a Word or PDF health report.

Suggested questions:

- What are the three most important delivery risks?
- Which task is most likely to delay the release, and why?
- What evidence supports the current health score?
- What should the project manager do next?

Gmail import is a planned item shown in Settings. It is not required for the current demo and no mailbox data is bundled with the project.

## Verification

```bash
cd frontend
npm run lint
npm run build
```

The backend exposes its health check at `http://localhost:8000/` and API documentation at `http://localhost:8000/docs`.

## Troubleshooting

- If the frontend cannot reach the backend, confirm `http://localhost:8000/` opens and that `VITE_API_BASE` matches the backend URL.
- If Gemini returns an authentication or quota error, verify `GEMINI_API_KEY` in `backend/.env` and retry after the provider limit resets.
- If login state appears stale during local testing, log out and create a fresh account; all project history is isolated by the authenticated user.
- Never commit `backend/.env`, `backend/data/`, `backend/uploaded_docs/`, or `backend/chroma_db/`.
