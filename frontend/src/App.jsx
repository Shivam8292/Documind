import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000";

export default function App() {
  const [dark, setDark] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API}/history`);
      setHistory(res.data.history);
    } catch {}
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    try {
      const res = await axios.post(`${API}/upload`, formData);
      setUploadedFiles(res.data.uploaded_files);
      setMessages((prev) => [...prev, { type: "system", text: `✅ ${res.data.message}` }]);
      setFiles([]);
      fetchHistory();
    } catch {
      setMessages((prev) => [...prev, { type: "system", text: "❌ Upload failed." }]);
    }
    setUploading(false);
  };

  const handleLoad = async (filename) => {
    try {
      const res = await axios.post(`${API}/load/${filename}`);
      setUploadedFiles(res.data.uploaded_files);
      setMessages((prev) => [...prev, { type: "system", text: `✅ ${filename} loaded!` }]);
      setShowHistory(false);
    } catch {
      setMessages((prev) => [...prev, { type: "system", text: "❌ Load failed." }]);
    }
  };

  const handleDeleteHistory = async (filename) => {
    await axios.delete(`${API}/history/${encodeURIComponent(filename)}`);
    fetchHistory();
  };

  const handleClearAllHistory = async () => {
    await axios.delete(`${API}/history`);
    setHistory([]);
  };

  const handleReset = async () => {
    await axios.delete(`${API}/reset`);
    setUploadedFiles([]);
    setMessages([]);
    setFiles([]);
  };

  const handleAsk = async () => {
    if (!question.trim() || uploadedFiles.length === 0) return;
    setMessages((prev) => [...prev, { type: "user", text: question }]);
    setQuestion("");
    setLoading(true);
    try {
      const res = await axios.post(`${API}/ask`, { query: question });
      setMessages((prev) => [...prev, { type: "bot", text: res.data.answer, sources: res.data.sources }]);
    } catch {
      setMessages((prev) => [...prev, { type: "bot", text: "❌ Kuch error aaya." }]);
    }
    setLoading(false);
  };

  const d = dark;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${d ? "bg-gray-950" : "bg-gradient-to-br from-indigo-50 via-white to-purple-50"} flex flex-col items-center px-4 py-8`}>

      {/* Header */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-8">
        <div>
          <h1 className={`text-4xl font-black tracking-tight ${d ? "text-white" : "text-indigo-600"}`}>
            📄 DocuMind
          </h1>
          <p className={`text-sm mt-1 ${d ? "text-gray-400" : "text-gray-500"}`}>
            Chat with your PDFs — instantly
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition cursor-pointer ${
              d ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
            }`}
          >
            🕘 History {history.length > 0 && `(${history.length})`}
          </button>
          <button
            onClick={() => setDark(!d)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition cursor-pointer ${
              d ? "bg-gray-800 text-yellow-400 hover:bg-gray-700" : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
            }`}
          >
            {d ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className={`w-full max-w-2xl rounded-2xl shadow-xl mb-6 overflow-hidden transition-colors duration-300 ${d ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-100"}`}>
          <div className={`px-6 py-4 flex items-center justify-between border-b ${d ? "border-gray-800" : "border-gray-100"}`}>
            <h2 className={`font-bold text-base ${d ? "text-white" : "text-gray-800"}`}>📂 File History</h2>
            {history.length > 0 && (
              <button
                onClick={handleClearAllHistory}
                className="text-xs text-red-400 hover:text-red-500 font-semibold transition cursor-pointer"
              >
                🗑️ Clear All
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <p className={`text-center text-sm py-6 ${d ? "text-gray-500" : "text-gray-400"}`}>
              Koi history nahi hai abhi...
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {history.map((item, i) => (
                <div key={i} className={`flex items-center justify-between px-6 py-3 transition ${d ? "divide-gray-800 hover:bg-gray-800" : "hover:bg-gray-50"}`}>
                  <div>
                    <p className={`text-sm font-semibold ${d ? "text-gray-200" : "text-gray-700"}`}>
                      📄 {item.filename}
                    </p>
                    <p className={`text-xs mt-0.5 ${d ? "text-gray-500" : "text-gray-400"}`}>
                      {item.uploaded_at} · {item.chunks} chunks
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLoad(item.filename)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDeleteHistory(item.filename)}
                      className="text-red-400 hover:text-red-500 text-xs px-2 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Card */}
      <div className={`w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden transition-colors duration-300 ${d ? "bg-gray-900 border border-gray-800" : "bg-white"}`}>

        {/* Upload Section */}
        <div className={`p-6 border-b transition-colors duration-300 ${d ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-100"}`}>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <label className={`flex-1 cursor-pointer border-2 border-dashed rounded-xl px-4 py-3 text-center transition-all ${
              d ? "border-indigo-500 hover:border-indigo-400 bg-gray-900" : "border-indigo-300 hover:border-indigo-500 bg-white"
            }`}>
              <input type="file" accept=".pdf" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files))} />
              <span className={`text-sm ${d ? "text-gray-300" : "text-gray-500"}`}>
                {files.length > 0 ? `📎 ${files.length} file(s) selected` : "Click to choose PDF(s)"}
              </span>
            </label>
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold px-6 py-3 rounded-xl transition cursor-pointer shadow-lg shadow-indigo-200"
            >
              {uploading ? "⏳ Uploading..." : "🚀 Upload"}
            </button>
            {uploadedFiles.length > 0 && (
              <button onClick={handleReset} className="text-red-400 hover:text-red-500 text-sm font-semibold cursor-pointer">
                🗑️ Clear
              </button>
            )}
          </div>

          {uploadedFiles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {uploadedFiles.map((f, i) => (
                <span key={i} className={`text-xs px-3 py-1 rounded-full font-medium ${d ? "bg-indigo-900 text-indigo-300" : "bg-indigo-100 text-indigo-700"}`}>
                  📄 {f}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="h-96 overflow-y-auto p-6 flex flex-col gap-4">
          {messages.length === 0 && (
            <div className={`flex-1 flex flex-col items-center justify-center gap-3 ${d ? "text-gray-500" : "text-gray-400"}`}>
              <span className="text-5xl">🤖</span>
              <p className="text-sm">PDF upload karo aur poochho kuch bhi...</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
              {msg.type === "system" ? (
                <div className={`text-sm px-4 py-2 rounded-xl w-full text-center ${d ? "bg-yellow-900 text-yellow-300 border border-yellow-700" : "bg-yellow-50 text-yellow-800 border border-yellow-200"}`}>
                  {msg.text}
                </div>
              ) : msg.type === "user" ? (
                <div className="bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm max-w-xs lg:max-w-md text-sm shadow-lg">
                  {msg.text}
                </div>
              ) : (
                <div className={`px-4 py-3 rounded-2xl rounded-tl-sm max-w-xs lg:max-w-md text-sm shadow ${d ? "bg-gray-800 text-gray-100" : "bg-gray-100 text-gray-800"}`}>
                  <span className="font-bold text-indigo-500">🤖 DocuMind</span>
                  <p className="mt-1 leading-relaxed">{msg.text}</p>
                  {msg.sources && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {msg.sources.map((s, j) => (
                        <span key={j} className={`text-xs px-2 py-1 rounded-full border ${d ? "bg-gray-700 text-gray-300 border-gray-600" : "bg-white text-gray-500 border-gray-200"}`}>
                          📌 {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className={`px-4 py-3 rounded-2xl text-sm flex items-center gap-2 ${d ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                <span className="animate-spin">⚙️</span> Thinking...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className={`p-4 border-t flex gap-3 ${d ? "border-gray-700 bg-gray-900" : "border-gray-100"}`}>
          <input
            type="text"
            placeholder={uploadedFiles.length > 0 ? "Kuch bhi poochho..." : "Pehle PDF upload karo..."}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            disabled={uploadedFiles.length === 0}
            className={`flex-1 rounded-xl px-4 py-3 text-sm outline-none border transition-all ${
              d ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500" : "bg-gray-50 border-gray-200 text-gray-800 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            } disabled:opacity-50`}
          />
          <button
            onClick={handleAsk}
            disabled={uploadedFiles.length === 0 || loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold px-5 py-3 rounded-xl transition cursor-pointer"
          >
            Send 🚀
          </button>
        </div>
      </div>

      <p className={`text-xs mt-6 ${d ? "text-gray-600" : "text-gray-400"}`}>
        Built with ❤️ using React + FastAPI + LangChain + Groq
      </p>
    </div>
  );
}