from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import fitz
import os
import json
import shutil
import uuid
from dotenv import load_dotenv
from typing import List
from datetime import datetime

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_groq import ChatGroq
from langchain_community.embeddings import HuggingFaceEmbeddings

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
HISTORY_FILE = "history.json"
CHATS_DIR = "chats"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(CHATS_DIR, exist_ok=True)

vectorstore = None
uploaded_files_list = []
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# ── File History Helpers ────────────────────────────────
def load_history():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r") as f:
            return json.load(f)
    return []

def save_history(history):
    with open(HISTORY_FILE, "w") as f:
        json.dump(history, f)

# ── Chat History Helpers ────────────────────────────────
def get_all_chats():
    chats = []
    for fname in sorted(os.listdir(CHATS_DIR), reverse=True):
        if fname.endswith(".json"):
            with open(os.path.join(CHATS_DIR, fname), "r") as f:
                chats.append(json.load(f))
    return chats

def get_chat(chat_id: str):
    path = os.path.join(CHATS_DIR, f"{chat_id}.json")
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return None

def save_chat(chat: dict):
    path = os.path.join(CHATS_DIR, f"{chat['id']}.json")
    with open(path, "w") as f:
        json.dump(chat, f)

# ── PDF Process ─────────────────────────────────────────
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


# ── Upload ──────────────────────────────────────────────
@app.post("/upload")
async def upload_pdfs(files: List[UploadFile] = File(...)):
    global uploaded_files_list

    history = load_history()
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

    save_history(history)

    return {
        "message": f"{len(new_files)} PDF(s) uploaded! {total_chunks} chunks indexed.",
        "uploaded_files": uploaded_files_list
    }


# ── Load from File History ──────────────────────────────
@app.post("/load/{filename}")
def load_from_history(filename: str):
    global uploaded_files_list

    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        return {"error": "File nahi mili disk pe!"}

    chunks = process_pdf(filepath, filename)

    if filename not in uploaded_files_list:
        uploaded_files_list.append(filename)

    return {
        "message": f"{filename} loaded! {chunks} chunks indexed.",
        "uploaded_files": uploaded_files_list
    }


# ── File History Routes ─────────────────────────────────
@app.get("/history")
def get_history():
    return {"history": load_history()}

@app.delete("/history/{filename}")
def delete_from_history(filename: str):
    filepath = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(filepath):
        os.remove(filepath)
    history = load_history()
    history = [h for h in history if h["filename"] != filename]
    save_history(history)
    return {"message": f"{filename} deleted!"}

@app.delete("/history")
def clear_all_history():
    if os.path.exists(UPLOAD_DIR):
        shutil.rmtree(UPLOAD_DIR)
        os.makedirs(UPLOAD_DIR, exist_ok=True)
    save_history([])
    return {"message": "All history cleared!"}

@app.delete("/reset")
def reset():
    global vectorstore, uploaded_files_list
    vectorstore = None
    uploaded_files_list = []
    return {"message": "Session cleared!"}


# ── Chat History Routes ─────────────────────────────────
@app.get("/chats")
def get_chats():
    return {"chats": get_all_chats()}

@app.get("/chats/{chat_id}")
def get_single_chat(chat_id: str):
    chat = get_chat(chat_id)
    if not chat:
        return {"error": "Chat nahi mili!"}
    return chat

@app.delete("/chats/{chat_id}")
def delete_chat(chat_id: str):
    path = os.path.join(CHATS_DIR, f"{chat_id}.json")
    if os.path.exists(path):
        os.remove(path)
    return {"message": "Chat deleted!"}

@app.delete("/chats")
def clear_all_chats():
    if os.path.exists(CHATS_DIR):
        shutil.rmtree(CHATS_DIR)
        os.makedirs(CHATS_DIR, exist_ok=True)
    return {"message": "All chats cleared!"}


# ── Ask ─────────────────────────────────────────────────
class Question(BaseModel):
    query: str
    chat_id: str = None

@app.post("/ask")
async def ask_question(q: Question):
    if not vectorstore:
        return {"error": "Pehle PDF upload karo!"}

    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

    prompt = ChatPromptTemplate.from_template("""
Answer the question based only on the following context:
{context}

Question: {question}
""")

    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        groq_api_key=os.getenv("GROQ_API_KEY")
    )

    chain = (
        {"context": retriever, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )

    answer = chain.invoke(q.query)
    docs = retriever.invoke(q.query)
    sources = list({f"{doc.metadata['filename']} (Page {doc.metadata['page']})" for doc in docs})

    # Chat save karo
    chat_id = q.chat_id or str(uuid.uuid4())
    chat = get_chat(chat_id) or {
        "id": chat_id,
        "title": q.query[:40] + ("..." if len(q.query) > 40 else ""),
        "created_at": datetime.now().strftime("%d %b %Y, %I:%M %p"),
        "messages": []
    }

    chat["messages"].append({"role": "user", "text": q.query})
    chat["messages"].append({"role": "bot", "text": answer, "sources": sources})
    save_chat(chat)

    return {
        "answer": answer,
        "sources": sources,
        "chat_id": chat_id
    }


# ── Health ───────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "DocuMind backend is running!"}