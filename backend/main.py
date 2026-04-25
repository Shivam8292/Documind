from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import fitz
import os
import json
import shutil
import uuid
from dotenv import load_dotenv
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_groq import ChatGroq
from langchain_community.embeddings import HuggingFaceEmbeddings

from database import get_db, User
from auth import hash_password, verify_password, create_token, get_current_user

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
CHATS_DIR = "chats"
HISTORY_FILE = "history.json"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(CHATS_DIR, exist_ok=True)

vectorstore = None
uploaded_files_list = []
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# ── Auth Models ─────────────────────────────────────────
class RegisterModel(BaseModel):
    name: str
    email: str
    password: str

class LoginModel(BaseModel):
    email: str
    password: str

# ── Register ─────────────────────────────────────────────
@app.post("/register")
def register(data: RegisterModel, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered!")
    user = User(
        name=data.name,
        email=data.email,
        hashed_password=hash_password(data.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_token({"sub": user.id})
    return {"token": token, "name": user.name, "email": user.email}

# ── Login ────────────────────────────────────────────────
@app.post("/login")
def login(data: LoginModel, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ya password galat hai!")
    token = create_token({"sub": user.id})
    return {"token": token, "name": user.name, "email": user.email}

# ── Me ───────────────────────────────────────────────────
@app.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"name": current_user.name, "email": current_user.email}

# ── File History Helpers ─────────────────────────────────
def get_user_history_file(user_id: str):
    return f"history_{user_id}.json"

def load_history(user_id: str):
    path = get_user_history_file(user_id)
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return []

def save_history(user_id: str, history: list):
    with open(get_user_history_file(user_id), "w") as f:
        json.dump(history, f)

# ── Chat Helpers ─────────────────────────────────────────
def get_user_chats_dir(user_id: str):
    path = os.path.join(CHATS_DIR, user_id)
    os.makedirs(path, exist_ok=True)
    return path

def get_all_chats(user_id: str):
    chats_dir = get_user_chats_dir(user_id)
    chats = []
    for fname in sorted(os.listdir(chats_dir), reverse=True):
        if fname.endswith(".json"):
            with open(os.path.join(chats_dir, fname), "r") as f:
                chats.append(json.load(f))
    return chats

def get_chat(user_id: str, chat_id: str):
    path = os.path.join(get_user_chats_dir(user_id), f"{chat_id}.json")
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return None

def save_chat(user_id: str, chat: dict):
    path = os.path.join(get_user_chats_dir(user_id), f"{chat['id']}.json")
    with open(path, "w") as f:
        json.dump(chat, f)

# ── PDF Process ──────────────────────────────────────────
def process_pdf(filepath: str, filename: str):
    global vectorstore
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    doc = fitz.open(filepath)
    chunks, meta = [], []
    for page_num in range(len(doc)):
        text = doc[page_num].get_text()
        if text.strip():
            splits = splitter.split_text(text)
            chunks.extend(splits)
            meta.extend([{"page": page_num + 1, "filename": filename}] * len(splits))
    if vectorstore is None:
        vectorstore = Chroma.from_texts(chunks, embeddings, metadatas=meta)
    else:
        vectorstore.add_texts(chunks, metadatas=meta)
    return len(chunks)

# ── Upload ───────────────────────────────────────────────
@app.post("/upload")
async def upload_pdfs(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user)
):
    global uploaded_files_list
    history = load_history(current_user.id)
    existing_names = [h["filename"] for h in history]
    new_files = []
    total_chunks = 0

    for file in files:
        filepath = os.path.join(UPLOAD_DIR, file.filename)
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)
        chunks = process_pdf(filepath, file.filename)
        total_chunks += chunks
        if file.filename not in existing_names:
            history.append({
                "filename": file.filename,
                "uploaded_at": datetime.now().strftime("%d %b %Y, %I:%M %p"),
                "chunks": chunks
            })
        new_files.append(file.filename)
        if file.filename not in uploaded_files_list:
            uploaded_files_list.append(file.filename)

    save_history(current_user.id, history)
    return {
        "message": f"{len(new_files)} PDF(s) uploaded! {total_chunks} chunks indexed.",
        "uploaded_files": uploaded_files_list
    }

# ── Load from History ────────────────────────────────────
@app.post("/load/{filename}")
def load_from_history(
    filename: str,
    current_user: User = Depends(get_current_user)
):
    global uploaded_files_list
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        return {"error": "File nahi mili!"}
    chunks = process_pdf(filepath, filename)
    if filename not in uploaded_files_list:
        uploaded_files_list.append(filename)
    return {
        "message": f"{filename} loaded! {chunks} chunks indexed.",
        "uploaded_files": uploaded_files_list
    }

# ── File History Routes ──────────────────────────────────
@app.get("/history")
def get_history(current_user: User = Depends(get_current_user)):
    return {"history": load_history(current_user.id)}

@app.delete("/history/{filename}")
def delete_from_history(filename: str, current_user: User = Depends(get_current_user)):
    filepath = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(filepath):
        os.remove(filepath)
    history = load_history(current_user.id)
    history = [h for h in history if h["filename"] != filename]
    save_history(current_user.id, history)
    return {"message": f"{filename} deleted!"}

@app.delete("/history")
def clear_all_history(current_user: User = Depends(get_current_user)):
    save_history(current_user.id, [])
    return {"message": "All history cleared!"}

@app.delete("/reset")
def reset(current_user: User = Depends(get_current_user)):
    global vectorstore, uploaded_files_list
    vectorstore = None
    uploaded_files_list = []
    return {"message": "Session cleared!"}

# ── Chat Routes ──────────────────────────────────────────
@app.get("/chats")
def get_chats(current_user: User = Depends(get_current_user)):
    return {"chats": get_all_chats(current_user.id)}

@app.delete("/chats/{chat_id}")
def delete_chat(chat_id: str, current_user: User = Depends(get_current_user)):
    path = os.path.join(get_user_chats_dir(current_user.id), f"{chat_id}.json")
    if os.path.exists(path):
        os.remove(path)
    return {"message": "Chat deleted!"}

@app.delete("/chats")
def clear_all_chats(current_user: User = Depends(get_current_user)):
    chats_dir = get_user_chats_dir(current_user.id)
    shutil.rmtree(chats_dir)
    os.makedirs(chats_dir, exist_ok=True)
    return {"message": "All chats cleared!"}

# ── Ask ──────────────────────────────────────────────────
class Question(BaseModel):
    query: str
    chat_id: Optional[str] = None

@app.post("/ask")
async def ask_question(
    q: Question,
    current_user: User = Depends(get_current_user)
):
    if not vectorstore:
        return {"error": "Pehle PDF upload karo!"}

    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
    prompt = ChatPromptTemplate.from_template("""
Answer the question based only on the following context:
{context}

Question: {question}
""")
    llm = ChatGroq(model="llama-3.3-70b-versatile", groq_api_key=os.getenv("GROQ_API_KEY"))
    chain = (
        {"context": retriever, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )

    answer = chain.invoke(q.query)
    docs = retriever.invoke(q.query)
    sources = list({f"{doc.metadata['filename']} (Page {doc.metadata['page']})" for doc in docs})

    chat_id = q.chat_id or str(uuid.uuid4())
    chat = get_chat(current_user.id, chat_id) or {
        "id": chat_id,
        "title": q.query[:40] + ("..." if len(q.query) > 40 else ""),
        "created_at": datetime.now().strftime("%d %b %Y, %I:%M %p"),
        "messages": []
    }
    chat["messages"].append({"role": "user", "text": q.query})
    chat["messages"].append({"role": "bot", "text": answer, "sources": sources})
    save_chat(current_user.id, chat)

    return {"answer": answer, "sources": sources, "chat_id": chat_id}

# ── Health ───────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "DocuMind backend is running!"}