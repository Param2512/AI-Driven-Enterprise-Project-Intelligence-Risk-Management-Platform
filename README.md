# AI-Driven Enterprise Project Intelligence

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

## Verification

```bash
cd frontend
npm run lint
npm run build
```

The backend exposes its health check at `http://localhost:8000/` and API documentation at `http://localhost:8000/docs`.
