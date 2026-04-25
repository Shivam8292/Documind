import { useState, useRef, useEffect } from "react";
import axios from "axios";

export default function App() {
  const [file, setFile] = useState(null);
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post("http://127.0.0.1:8000/upload", formData);
      setUploaded(true);
      setMessages([{ type: "system", text: `✅ ${res.data.message}` }]);
    } catch {
      setMessages([{ type: "system", text: "❌ Upload failed. Backend check karo." }]);
    }
    setUploading(false);
  };

  const handleAsk = async () => {
    if (!question.trim() || !uploaded) return;
    const userMsg = { type: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);
    try {
      const res = await axios.post("http://127.0.0.1:8000/ask", { query: question });
      setMessages((prev) => [...prev, { type: "bot", text: res.data.answer, pages: res.data.pages }]);
    } catch {
      setMessages((prev) => [...prev, { type: "bot", text: "❌ Kuch error aaya. Dobara try karo." }]);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center px-4 py-8">
      
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-indigo-600 mb-2">📄 DocuMind</h1>
        <p className="text-gray-500 text-lg">Chat with your PDF — instantly</p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden">

        {/* Upload Section */}
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <label className="flex-1 cursor-pointer border-2 border-dashed border-indigo-300 rounded-xl px-4 py-3 text-center hover:border-indigo-500 transition">
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files[0])}
              />
              <span className="text-gray-500 text-sm">
                {file ? `📎 ${file.name}` : "Click to choose a PDF"}
              </span>
            </label>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold px-6 py-3 rounded-xl transition cursor-pointer"
            >
              {uploading ? "Uploading..." : "Upload PDF"}
            </button>
            {uploaded && (
              <span className="text-green-600 font-semibold text-sm">✅ Ready</span>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="h-96 overflow-y-auto p-6 flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              ⬆️ PDF upload karo, phir questions poochho...
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
              {msg.type === "system" ? (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm px-4 py-2 rounded-xl w-full text-center">
                  {msg.text}
                </div>
              ) : msg.type === "user" ? (
                <div className="bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm max-w-xs lg:max-w-md text-sm shadow">
                  {msg.text}
                </div>
              ) : (
                <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded-2xl rounded-tl-sm max-w-xs lg:max-w-md text-sm shadow">
                  <span className="font-semibold text-indigo-600">🤖 DocuMind</span>
                  <p className="mt-1 leading-relaxed">{msg.text}</p>
                  {msg.pages && (
                    <p className="mt-2 text-xs text-gray-400">📌 Pages: {msg.pages.join(", ")}</p>
                  )}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-500 px-4 py-3 rounded-2xl text-sm animate-pulse">
                🤖 Thinking...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-100 flex gap-3">
          <input
            type="text"
            placeholder={uploaded ? "Apna question likho..." : "Pehle PDF upload karo..."}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            disabled={!uploaded}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-50 transition"
          />
          <button
            onClick={handleAsk}
            disabled={!uploaded || loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold px-5 py-3 rounded-xl transition cursor-pointer"
          >
            Send 🚀
          </button>
        </div>

      </div>

      {/* Footer */}
      <p className="text-gray-400 text-xs mt-6">Built with ❤️ using React + FastAPI + LangChain</p>
    </div>
  );
}