from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import fitz
import os
from dotenv import load_dotenv

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
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

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    global vectorstore

    pdf_bytes = await file.read()
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    texts, metadatas = [], []
    for page_num in range(len(doc)):
        text = doc[page_num].get_text()
        if text.strip():
            texts.append(text)
            metadatas.append({"page": page_num + 1})

    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks, chunk_meta = [], []
    for text, meta in zip(texts, metadatas):
        split = splitter.split_text(text)
        chunks.extend(split)
        chunk_meta.extend([meta] * len(split))

    # Free local embeddings — OpenAI ki zaroorat nahi!
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    vectorstore = Chroma.from_texts(chunks, embeddings, metadatas=chunk_meta)

    return {"message": f"PDF uploaded! {len(chunks)} chunks indexed."}


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

    # Groq LLM — Free!
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
    pages = sorted(set(doc.metadata["page"] for doc in docs))

    return {"answer": answer, "pages": pages}


@app.get("/")
def root():
    return {"status": "DocuMind backend is running!"}