from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import fitz
import os
from dotenv import load_dotenv
from typing import List

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

vectorstore = None
uploaded_files_list = []

@app.post("/upload")
async def upload_pdfs(files: List[UploadFile] = File(...)):
    global vectorstore, uploaded_files_list

    all_chunks = []
    all_meta = []
    new_files = []

    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)

    for file in files:
        pdf_bytes = await file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        for page_num in range(len(doc)):
            text = doc[page_num].get_text()
            if text.strip():
                splits = splitter.split_text(text)
                all_chunks.extend(splits)
                all_meta.extend([{
                    "page": page_num + 1,
                    "filename": file.filename
                }] * len(splits))

        new_files.append(file.filename)

    # Pehle se uploaded files ke saath merge karo
    if vectorstore is None:
        vectorstore = Chroma.from_texts(all_chunks, embeddings, metadatas=all_meta)
    else:
        vectorstore.add_texts(all_chunks, metadatas=all_meta)

    uploaded_files_list.extend(new_files)

    return {
        "message": f"{len(new_files)} PDF(s) uploaded! {len(all_chunks)} chunks indexed.",
        "uploaded_files": uploaded_files_list
    }


@app.get("/files")
def get_files():
    return {"uploaded_files": uploaded_files_list}


@app.delete("/reset")
def reset():
    global vectorstore, uploaded_files_list
    vectorstore = None
    uploaded_files_list = []
    return {"message": "All PDFs cleared!"}


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

    return {
        "answer": answer,
        "sources": sources
    }


@app.get("/")
def root():
    return {"status": "DocuMind backend is running!"}