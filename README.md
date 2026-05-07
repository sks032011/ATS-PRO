# AI-Powered ATS & Semantic Resume Search Engine

An AI-powered Applicant Tracking System (ATS) designed to evaluate, manage, and rank candidate resumes using semantic search and deterministic resume analysis.

Instead of relying only on traditional keyword matching, the platform combines:

* rule-based ATS evaluation
* vector embeddings for semantic similarity
* LLM-powered resume parsing and ranking

to improve candidate retrieval and resume analysis workflows.

---

# Features

### Semantic Candidate Search

Converts resumes and job descriptions into vector embeddings using Google Gemini embeddings and stores them in Pinecone for semantic similarity search.

### AI-Powered Candidate Ranking

Uses LLaMA-3 via Groq to generate recruiter-style reasoning and match scores based on job description relevance.

### ATS Resume Analyzer

A standalone resume analysis engine that evaluates resumes using deterministic scoring heuristics such as:

* technical skill relevance
* quantified achievements
* action verbs
* project quality
* resume structure
* ATS formatting quality

The analyzer works independently without saving resumes to the database.

### Intelligent Resume Parsing

Extracts structured candidate information from unstructured PDF resumes, including:

* skills
* education
* experience
* projects
* profile summary

### Candidate Pool Management

A centralized dashboard to:

* store candidate profiles
* search candidates semantically
* view uploaded resumes
* manage recruiter workflows

### Responsive Frontend

Built with React and Tailwind CSS with:

* responsive layouts
* loading states
* toast notifications
* recruiter-focused dashboard UI

---

# Tech Stack

## Frontend

* React.js
* Tailwind CSS
* Axios
* React Router

## Backend

* Node.js
* Express.js

## Databases

* MongoDB (candidate metadata & resume storage)
* Pinecone (vector similarity search)

## AI Models

* Google Gemini Embeddings (`gemini-embedding-001`)
* LLaMA-3 via Groq (`llama-3.3-70b-versatile`)

---

# System Architecture

The platform follows a decoupled client-server architecture:

```text
Frontend (React)
       ↓
Express API Server
       ↓
PDF Parsing Layer
       ↓
AI Extraction (Groq / LLaMA-3)
       ↓
Embedding Generation (Gemini)
       ↓
Pinecone Vector Search + MongoDB Storage
```

---

# Core Processing Pipeline

### Resume Upload Flow

1. User uploads a PDF resume
2. PDF text is extracted using `pdf-parse`
3. LLaMA-3 extracts structured candidate information
4. Gemini generates vector embeddings
5. Embeddings are stored in Pinecone
6. Candidate metadata is stored in MongoDB

### Semantic Search Flow

1. Recruiter enters a job description
2. Job description is converted into embeddings
3. Pinecone retrieves semantically similar candidates
4. LLaMA-3 reranks candidates and generates reasoning

### ATS Analysis Flow

1. User uploads a resume
2. Resume is analyzed using deterministic ATS heuristics
3. The system generates:

   * ATS score
   * strengths
   * improvement suggestions
   * score breakdown

No database persistence occurs during ATS analysis mode.

---

# Why This Project?

Traditional ATS systems often rely heavily on exact keyword matching and may fail to capture semantic relevance between resumes and job descriptions.

This project explores how:

* vector embeddings
* semantic search
* deterministic scoring systems
* LLM-based reasoning

can improve candidate retrieval and resume evaluation workflows.

---

# Local Setup

## Prerequisites

* Node.js (v18+)
* MongoDB instance
* Pinecone account & index
* Groq API key
* Google Gemini API key

---

# Installation

## Clone Repository

```bash
git clone <your-repo-url>
cd <repo-name>
```

## Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside `/backend`:

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string

PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=your_pinecone_index

GROQ_API_KEY=your_groq_api_key

GEMINI_API_KEY=your_gemini_api_key

FRONTEND_URL=http://localhost:5173
```

Start backend server:

```bash
npm run dev
```

---

## Frontend Setup

```bash
cd client
npm install
```

Create a `.env` file inside `/client`:

```env
VITE_API_URL=http://localhost:5000
```

Start frontend:

```bash
npm run dev
```
---

# License

This project is intended for educational and portfolio purposes.
