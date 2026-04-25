from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import fitz
import os
import json
import shutil
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

# Folders
UPLOAD_DIR = "uploads"
HISTORY_FILE = "history.json"
os.makedirs(UPLOAD_DIR, exist_ok=True)

vectorstore = None
uploaded_files_list = []

# ── History Helpers ─────────────────────────────────────
def load_history():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r") as f:
            return json.load(f)
    return []

def save_history(history):
    with open(HISTORY_FILE, "w") as f:
        json.dump(history, f)

def process_pdf(filepath: str, filename: str):
    """PDF ko process karke vectorstore mein add karo"""
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
        # Disk pe save karo
        filepath = os.path.join(UPLOAD_DIR, file.filename)
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)

        # Process karo
        chunks = process_pdf(filepath, file.filename)
        total_chunks += chunks

        # History mein add karo agar nahi hai
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


# ── Load from History ───────────────────────────────────
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


# ── Get History ─────────────────────────────────────────
@app.get("/history")
def get_history():
    return {"history": load_history()}


# ── Delete from History ─────────────────────────────────
@app.delete("/history/{filename}")
def delete_from_history(filename: str):
    # Disk se delete karo
    filepath = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(filepath):
        os.remove(filepath)

    # History se hatao
    history = load_history()
    history = [h for h in history if h["filename"] != filename]
    save_history(history)

    return {"message": f"{filename} deleted!"}


# ── Clear All History ───────────────────────────────────
@app.delete("/history")
def clear_all_history():
    # Saari files delete karo
    if os.path.exists(UPLOAD_DIR):
        shutil.rmtree(UPLOAD_DIR)
        os.makedirs(UPLOAD_DIR, exist_ok=True)

    save_history([])
    return {"message": "All history cleared!"}


# ── Reset Vectorstore ───────────────────────────────────
@app.delete("/reset")
def reset():
    global vectorstore, uploaded_files_list
    vectorstore = None
    uploaded_files_list = []
    # Embeddings ek baar load karo — startup pe
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    return {"message": "Session cleared!"}


# ── Ask ─────────────────────────────────────────────────
class Question(BaseModel):
    query: str

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

    return {"answer": answer, "sources": sources}


# ── Health ───────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "DocuMind backend is running!"}