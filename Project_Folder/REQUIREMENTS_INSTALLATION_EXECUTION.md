# Requirements, Installation, and Execution Guide

## Project

AI-Driven Enterprise Project Intelligence & Risk Management Platform

## System requirements

- Python 3.11 or newer
- Node.js 20 or newer
- npm
- A Google Gemini API key
- Two terminal windows: one for the backend and one for the frontend

## Backend Python packages

The exact pinned dependencies are also available in `backend/requirements.txt`.

```text
fastapi==0.141.1
uvicorn==0.52.1
python-multipart==0.0.32
python-dotenv==1.2.2
bcrypt==5.0.0
pandas==3.0.5
pypdf==6.14.2
docx2txt==0.9
python-docx==1.2.0
tenacity==9.1.4
google-api-core==2.25.2
reportlab==5.0.0
langchain-community==0.4.2
langchain-core==1.5.3
langchain-text-splitters==1.1.2
langchain-google-genai==4.3.2
langchain-chroma==1.1.0
chromadb==1.5.9
```

## Installation steps

### 1. Extract the ZIP file

Open the extracted `Project_Folder` directory in VS Code or Terminal.

### 2. Install backend dependencies

macOS or Linux:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Windows PowerShell:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Open `backend/.env` and replace the placeholders:

```env
GEMINI_API_KEY=your_own_gemini_api_key
SESSION_SECRET=your_own_long_random_secret
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
COOKIE_SECURE=false
```

Each reviewer must use their own Gemini API key. The submitted package contains no API key, password, email history, or user data.

### 3. Install frontend dependencies

Open a second terminal:

```bash
cd frontend
npm install
```

## Execution steps

### 1. Start the backend

From `Project_Folder/backend`, with the Python virtual environment active:

```bash
uvicorn main:app --reload
```

Backend URL: `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

### 2. Start the frontend

From `Project_Folder/frontend` in the second terminal:

```bash
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

### 3. Test the application

1. Create a fresh local account and log in.
2. Open Upload and select a PDF, DOCX, CSV, or TXT file.
3. Confirm the local preview, then upload the document.
4. Run AI Analysis and review the health score, risks, recommendations, and evidence.
5. Open Risks and Forecast.
6. Ask a document-grounded question in the assistant.
7. Generate a Word or PDF health report.

Synthetic test files are available in `sample_data/`.

## Verification commands

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Backend health check:

```text
http://localhost:8000/
```

## Important security notes

- Do not commit or share `backend/.env`.
- Do not share `backend/data/`, `backend/uploaded_docs/`, or `backend/chroma_db/`.
- Every user creates a separate local account and sees only their own project data.
- Gmail import is a planned feature and no Gmail mailbox data is included.
