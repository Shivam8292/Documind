# 📄 DocuMind — AI-Powered PDF Intelligence Engine

<div align="center">

![DocuMind](https://img.shields.io/badge/DocuMind-PDF%20Intelligence-6366f1?style=for-the-badge&logoColor=white)
&nbsp;
![Status](https://img.shields.io/badge/Status-Active-22c55e?style=for-the-badge)
&nbsp;
![License](https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge)

<br/>

[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![LangChain](https://img.shields.io/badge/LangChain-000000?style=flat-square&logo=chainlink&logoColor=white)](https://langchain.com/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-FF6B35?style=flat-square)](https://trychroma.com/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org/)
[![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)

<br/>

> **Upload any PDF. Ask anything. Get answers with exact page citations.**
>
> DocuMind is a full-stack RAG (Retrieval-Augmented Generation) application that transforms static documents into interactive, queryable knowledge bases — with user authentication, persistent chat history, and multi-document support.

</div>

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      DocuMind System                        │
├─────────────────────────┬───────────────────────────────────┤
│       FRONTEND          │           BACKEND                 │
│  React + Vite +         │        FastAPI (Python)           │
│  Tailwind CSS           │                                   │
└─────────────────────────┴───────────────────────────────────┘
```

```
User Uploads PDF(s)
        │
        ▼
┌──────────────────┐
│  PyMuPDF (fitz)  │  ← Extracts text page by page
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Text Splitter   │  ← Splits into 500-token chunks with overlap
│  (LangChain)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  HuggingFace     │  ← Converts chunks to vector embeddings
│  Embeddings      │    (all-MiniLM-L6-v2, runs locally, free)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   ChromaDB       │  ← Stores vectors in-memory vector store
│  Vector Store    │
└────────┬─────────┘
         │
    User asks a question
         │
         ▼
┌──────────────────┐
│ Semantic Search  │  ← Finds top 3 most relevant chunks
│  (ChromaDB)      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Groq Inference  │  ← LLaMA 3.3 70B generates answer
│ (LLaMA 3.3 70B)  │    from retrieved context only
└────────┬─────────┘
         │
         ▼
  Answer + Page Citations
  delivered to user
```

---

## ✨ Core Features

| Module | Features |
|--------|----------|
| 📤 **Document Engine** | Multi-PDF upload, disk persistence, re-load from history |
| 🤖 **RAG Pipeline** | Semantic chunking → vector embeddings → LLM synthesis |
| 📌 **Citations** | Every answer includes filename + exact page number |
| 💬 **Chat History** | All conversations saved per user, reloadable anytime |
| 📂 **File History** | Previously uploaded PDFs stored and instantly reusable |
| 🔐 **Authentication** | JWT-based register/login/logout with bcrypt password hashing |
| 👤 **User Isolation** | Each user has completely separate data, chats & files |
| 🌙 **Theming** | Dark / Light mode toggle with smooth transitions |
| ⚡ **Performance** | Embeddings loaded once at startup — no per-request overhead |

---

## 🗂️ Project Structure

```
Documind/
│
├── backend/                    # FastAPI Python backend
│   ├── main.py                 # All API routes & RAG pipeline
│   ├── auth.py                 # JWT token creation & verification
│   ├── database.py             # SQLAlchemy models & SQLite setup
│   ├── uploads/                # Persistent PDF storage
│   ├── chats/                  # Per-user chat history (JSON files)
│   ├── .env                    # Environment variables (not committed)
│   └── requirements.txt        # Python dependencies
│
├── frontend/                   # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx             # Main component (auth + chat + sidebar)
│   │   ├── main.jsx            # React entry point
│   │   └── index.css           # Tailwind CSS import
│   ├── index.html
│   └── vite.config.js          # Vite + Tailwind plugin config
│
└── README.md
```

---

## 🔐 Authentication Flow

```
┌───────────┐    email + password     ┌──────────────────┐
│   User    │ ──────────────────────▶ │  FastAPI /login  │
└───────────┘                         └────────┬─────────┘
                                               │
                                      bcrypt verify password
                                               │
                                      ┌────────▼─────────┐
                                      │  SQLite Database  │
                                      │   (User table)    │
                                      └────────┬─────────┘
                                               │
                                      JWT Token (7 days)
                                               │
                                      ┌────────▼─────────┐
                                      │   localStorage    │
                                      │    (Browser)      │
                                      └────────┬─────────┘
                                               │
                                  Every API request carries token
                                               │
                                      ┌────────▼─────────┐
                                      │  User's private   │
                                      │   data returned   │
                                      └──────────────────┘
```

---

## 📡 API Reference

| Method | Endpoint | Description | Protected |
|--------|----------|-------------|-----------|
| `POST` | `/register` | Create new user account | ❌ |
| `POST` | `/login` | Authenticate & get JWT token | ❌ |
| `GET` | `/me` | Get current user profile | ✅ |
| `POST` | `/upload` | Upload one or more PDFs | ✅ |
| `POST` | `/ask` | Ask a question against uploaded PDFs | ✅ |
| `GET` | `/history` | Get user's file upload history | ✅ |
| `POST` | `/load/{filename}` | Re-load a previously uploaded PDF | ✅ |
| `DELETE` | `/history/{filename}` | Delete a file from history | ✅ |
| `DELETE` | `/history` | Clear all file history | ✅ |
| `GET` | `/chats` | Get all saved conversations | ✅ |
| `DELETE` | `/chats/{chat_id}` | Delete a specific conversation | ✅ |
| `DELETE` | `/chats` | Clear all conversations | ✅ |
| `DELETE` | `/reset` | Clear current session vectorstore | ✅ |

---

## ⚙️ Local Development Setup

### Prerequisites
- Python `3.10+`
- Node.js `18+`
- Groq API Key → [console.groq.com](https://console.groq.com) *(free)*

### 1. Clone the Repository

```bash
git clone https://github.com/Shivam8292/Documind.git
cd Documind
```

### 2. Backend Setup

```bash
cd backend

# Create & activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

Create `.env` file inside `/backend`:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Start the backend:

```bash
uvicorn main:app --reload
# Runs at → http://127.0.0.1:8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Runs at → http://localhost:5173
```

---

## 🛠️ Tech Stack

### 🖥️ Frontend
| Technology | Role |
|------------|------|
| **React 18** | Component-based UI framework |
| **Vite** | Lightning-fast dev server & bundler |
| **Tailwind CSS v4** | Utility-first styling with dark mode |
| **Axios** | HTTP client with JWT interceptors |

### ⚙️ Backend
| Technology | Role |
|------------|------|
| **FastAPI** | High-performance async REST API |
| **PyMuPDF** | PDF text extraction with page metadata |
| **LangChain** | RAG orchestration & prompt chaining |
| **ChromaDB** | In-memory vector store for semantic search |
| **HuggingFace** | Local embeddings — `all-MiniLM-L6-v2` |
| **Groq** | Ultra-fast LLM inference (LLaMA 3.3 70B) |
| **SQLAlchemy** | ORM for database operations |
| **SQLite** | Lightweight relational database |
| **JWT + bcrypt** | Secure authentication & password hashing |

---

## 🛣️ Roadmap

- [x] PDF Upload & RAG Pipeline
- [x] Semantic Search with Page Citations
- [x] Multiple PDF Support
- [x] File History with Reload
- [x] Per-user Chat History
- [x] Dark / Light Mode
- [x] JWT Authentication (Login / Register / Logout)
- [x] Per-user Data Isolation
- [ ] Deploy — Vercel (Frontend) + Render (Backend)
- [ ] Forgot Password via Email
- [ ] PDF Preview Side Panel
- [ ] Export Conversation as PDF

---

## 👨‍💻 Author

<div align="center">

**Shivam Kumar Yadav**

[![GitHub](https://img.shields.io/badge/GitHub-Shivam8292-181717?style=for-the-badge&logo=github)](https://github.com/Shivam8292)

</div>

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

Built with ❤️ using **React** · **FastAPI** · **LangChain** · **Groq**

⭐ **If this project helped you, consider giving it a star!**

</div>
