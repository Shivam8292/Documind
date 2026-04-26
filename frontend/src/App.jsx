import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000";

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function App() {
  const [dark, setDark] = useState(true);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authData, setAuthData] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileHistory, setFileHistory] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [sidebarTab, setSidebarTab] = useState("chats");
  const [currentChatId, setCurrentChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const name = localStorage.getItem("name");
    const email = localStorage.getItem("email");
    if (token && name) {
      setUser({ name, email });
      fetchFileHistory();
      fetchChatHistory();
    }
  }, []);

  const handleAuth = async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      const endpoint = authMode === "login" ? "/login" : "/register";
      const payload = authMode === "login"
        ? { email: authData.email, password: authData.password }
        : { name: authData.name, email: authData.email, password: authData.password };
      const res = await axios.post(`${API}${endpoint}`, payload);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("name", res.data.name);
      localStorage.setItem("email", res.data.email);
      setUser({ name: res.data.name, email: res.data.email });
      fetchFileHistory();
      fetchChatHistory();
    } catch (err) {
      setAuthError(err.response?.data?.detail || "Something went wrong. Please try again.");
    }
    setAuthLoading(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setMessages([]);
    setUploadedFiles([]);
    setFileHistory([]);
    setChatHistory([]);
    setCurrentChatId(null);
    setAuthData({ name: "", email: "", password: "" });
  };

  const fetchFileHistory = async () => {
    try { const res = await axios.get(`${API}/history`); setFileHistory(res.data.history); } catch {}
  };

  const fetchChatHistory = async () => {
    try { const res = await axios.get(`${API}/chats`); setChatHistory(res.data.chats); } catch {}
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
      fetchFileHistory();
    } catch {
      setMessages((prev) => [...prev, { type: "system", text: "❌ Upload failed. Please try again." }]);
    }
    setUploading(false);
  };

  const handleRemoveUploaded = async (filename) => {
    const newList = uploadedFiles.filter((f) => f !== filename);
    setUploadedFiles(newList);
    if (newList.length === 0) { await axios.delete(`${API}/reset`); setMessages([]); }
  };

  const handleLoad = async (filename) => {
    try {
      const res = await axios.post(`${API}/load/${encodeURIComponent(filename)}`);
      setUploadedFiles(res.data.uploaded_files);
      setMessages((prev) => [...prev, { type: "system", text: `✅ ${filename} loaded!` }]);
    } catch {
      setMessages((prev) => [...prev, { type: "system", text: "❌ Load failed. Please try again." }]);
    }
  };

  const handleLoadChat = (chat) => {
    setMessages(chat.messages.map((m) => ({ type: m.role === "user" ? "user" : "bot", text: m.text, sources: m.sources || null })));
    setCurrentChatId(chat.id);
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    setUploadedFiles([]);
    axios.delete(`${API}/reset`);
  };

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation();
    await axios.delete(`${API}/chats/${chatId}`);
    fetchChatHistory();
    if (currentChatId === chatId) { setMessages([]); setCurrentChatId(null); }
  };

  const handleDeleteHistory = async (filename, e) => {
    e.stopPropagation();
    await axios.delete(`${API}/history/${encodeURIComponent(filename)}`);
    fetchFileHistory();
  };

  const handleAsk = async () => {
    if (!question.trim() || uploadedFiles.length === 0) return;
    setMessages((prev) => [...prev, { type: "user", text: question }]);
    setQuestion("");
    setLoading(true);
    try {
      const res = await axios.post(`${API}/ask`, { query: question, chat_id: currentChatId });
      setMessages((prev) => [...prev, { type: "bot", text: res.data.answer, sources: res.data.sources }]);
      setCurrentChatId(res.data.chat_id);
      fetchChatHistory();
    } catch {
      setMessages((prev) => [...prev, { type: "bot", text: "❌ Something went wrong. Please try again." }]);
    }
    setLoading(false);
  };

  const d = dark;

  // ── Auth Page ─────────────────────────────────────────
  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 ${d ? "bg-gray-950" : "bg-gradient-to-br from-indigo-50 via-white to-purple-100"}`}>
        <div className={`w-full max-w-md rounded-3xl shadow-2xl p-8 ${d ? "bg-gray-900 border border-gray-800" : "bg-white"}`}>
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-3xl">📄</span>
              <h1 className={`text-3xl font-black tracking-tighter ${d ? "text-white" : "text-indigo-600"}`}>DocuMind</h1>
            </div>
            <p className={`text-sm ${d ? "text-gray-400" : "text-gray-400"}`}>Chat with your PDFs — instantly</p>
          </div>

          <div className={`flex rounded-2xl p-1 mb-6 ${d ? "bg-gray-800" : "bg-gray-100"}`}>
            <button onClick={() => { setAuthMode("login"); setAuthError(""); }} className={`flex-1 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${authMode === "login" ? "bg-indigo-600 text-white shadow" : d ? "text-gray-400" : "text-gray-500"}`}>Login</button>
            <button onClick={() => { setAuthMode("register"); setAuthError(""); }} className={`flex-1 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${authMode === "register" ? "bg-indigo-600 text-white shadow" : d ? "text-gray-400" : "text-gray-500"}`}>Register</button>
          </div>

          <div className="flex flex-col gap-3">
            {authMode === "register" && (
              <input type="text" placeholder="Your name" value={authData.name} onChange={(e) => setAuthData({ ...authData, name: e.target.value })}
                className={`w-full rounded-xl px-4 py-3 text-sm outline-none border-2 transition font-medium ${d ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500" : "bg-gray-50 border-gray-100 text-gray-800 placeholder-gray-400 focus:border-indigo-300"}`} />
            )}
            <input type="email" placeholder="Email address" value={authData.email} onChange={(e) => setAuthData({ ...authData, email: e.target.value })} onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              className={`w-full rounded-xl px-4 py-3 text-sm outline-none border-2 transition font-medium ${d ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500" : "bg-gray-50 border-gray-100 text-gray-800 placeholder-gray-400 focus:border-indigo-300"}`} />
            <input type="password" placeholder="Password" value={authData.password} onChange={(e) => setAuthData({ ...authData, password: e.target.value })} onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              className={`w-full rounded-xl px-4 py-3 text-sm outline-none border-2 transition font-medium ${d ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500" : "bg-gray-50 border-gray-100 text-gray-800 placeholder-gray-400 focus:border-indigo-300"}`} />
            {authError && <p className="text-red-500 text-xs font-semibold text-center">{authError}</p>}
            <button onClick={handleAuth} disabled={authLoading} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black py-3 rounded-xl transition cursor-pointer shadow-lg mt-2">
              {authLoading ? "⏳ Please wait..." : authMode === "login" ? "🚀 Login" : "✨ Register"}
            </button>
          </div>

          <div className="text-center mt-6">
            <button onClick={() => setDark(!d)} className={`text-xs font-semibold cursor-pointer ${d ? "text-yellow-400" : "text-gray-400"}`}>{d ? "☀️ Light Mode" : "🌙 Dark Mode"}</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main App ──────────────────────────────────────────
  return (
    <div className={`flex h-screen overflow-hidden transition-all duration-300 ${d ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900"}`}>

      {/* LEFT SIDEBAR */}
      <div className={`${sidebarOpen ? "w-64" : "w-0"} flex-shrink-0 transition-all duration-300 overflow-hidden flex flex-col ${d ? "bg-gray-900 border-r border-gray-800" : "bg-white border-r border-gray-200"}`}>
        
        {/* Logo */}
        <div className={`flex items-center gap-2 px-4 py-4 border-b ${d ? "border-gray-800" : "border-gray-100"}`}>
          <span className="text-xl">📄</span>
          <span className={`font-black text-lg tracking-tight ${d ? "text-white" : "text-indigo-600"}`}>DocuMind</span>
        </div>

        {/* New Chat Button */}
        <div className="px-3 py-3">
          <button onClick={handleNewChat} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${d ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}>
            <span>✏️</span> New Chat
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex mx-3 rounded-lg p-0.5 mb-2 ${d ? "bg-gray-800" : "bg-gray-100"}`}>
          <button onClick={() => setSidebarTab("chats")} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${sidebarTab === "chats" ? "bg-indigo-600 text-white" : d ? "text-gray-400" : "text-gray-500"}`}>💬 Chats</button>
          <button onClick={() => setSidebarTab("files")} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${sidebarTab === "files" ? "bg-indigo-600 text-white" : d ? "text-gray-400" : "text-gray-500"}`}>📂 Files</button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto px-2">
          {sidebarTab === "chats" && (
            chatHistory.length === 0
              ? <p className={`text-center text-xs py-8 ${d ? "text-gray-600" : "text-gray-400"}`}>No chats yet...</p>
              : chatHistory.map((chat) => (
                <div key={chat.id} onClick={() => handleLoadChat(chat)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl mb-1 cursor-pointer transition ${currentChatId === chat.id ? "bg-indigo-600 text-white" : d ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-700"}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">💬 {chat.title}</p>
                    <p className={`text-xs truncate ${currentChatId === chat.id ? "text-indigo-200" : d ? "text-gray-500" : "text-gray-400"}`}>{chat.created_at}</p>
                  </div>
                  <button onClick={(e) => handleDeleteChat(chat.id, e)} className={`opacity-0 group-hover:opacity-100 text-xs px-1 transition cursor-pointer ${currentChatId === chat.id ? "text-indigo-200 hover:text-white" : "text-red-400 hover:text-red-500"}`}>🗑️</button>
                </div>
              ))
          )}

          {sidebarTab === "files" && (
            fileHistory.length === 0
              ? <p className={`text-center text-xs py-8 ${d ? "text-gray-600" : "text-gray-400"}`}>No files yet...</p>
              : fileHistory.map((item, i) => (
                <div key={i} className={`group flex items-center justify-between px-3 py-2.5 rounded-xl mb-1 transition ${d ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}>
                  <div className="flex-1 min-w-0 mr-1">
                    <p className={`text-xs font-semibold truncate ${d ? "text-gray-300" : "text-gray-700"}`}>📄 {item.filename}</p>
                    <p className={`text-xs ${d ? "text-gray-500" : "text-gray-400"}`}>{item.chunks} chunks</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => handleLoad(item.filename)} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded-lg cursor-pointer">Load</button>
                    <button onClick={(e) => handleDeleteHistory(item.filename, e)} className="text-xs text-red-400 hover:text-red-500 px-1 cursor-pointer">🗑️</button>
                  </div>
                </div>
              ))
          )}
        </div>

        {/* User Info */}
        <div className={`px-3 py-3 border-t ${d ? "border-gray-800" : "border-gray-100"}`}>
          <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${d ? "bg-gray-800" : "bg-gray-50"}`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0">
                {user.name[0].toUpperCase()}
              </div>
              <span className={`text-xs font-semibold truncate ${d ? "text-gray-300" : "text-gray-700"}`}>{user.name}</span>
            </div>
            <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-500 cursor-pointer shrink-0 ml-1">Logout</button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Bar */}
        <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${d ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-2 rounded-lg cursor-pointer transition ${d ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
              ☰
            </button>
            <span className={`text-sm font-semibold ${d ? "text-gray-300" : "text-gray-600"}`}>
              {currentChatId ? chatHistory.find(c => c.id === currentChatId)?.title || "Chat" : "New Chat"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDark(!d)} className={`p-2 rounded-lg cursor-pointer transition text-sm ${d ? "hover:bg-gray-800 text-yellow-400" : "hover:bg-gray-100 text-gray-500"}`}>
              {d ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        {/* Upload Bar */}
        <div className={`px-4 py-2 border-b shrink-0 ${d ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
          <div className="flex items-center gap-2 flex-wrap">
            <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition ${d ? "border-gray-700 text-gray-400 hover:border-indigo-500 hover:text-indigo-400" : "border-gray-200 text-gray-500 hover:border-indigo-400 hover:text-indigo-600"}`}>
              <input type="file" accept=".pdf" multiple className="hidden" ref={fileInputRef} onChange={(e) => setFiles(Array.from(e.target.files))} />
              📎 {files.length > 0 ? `${files.length} file(s) selected` : "Choose PDF(s)"}
            </label>
            <button onClick={handleUpload} disabled={files.length === 0 || uploading}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold cursor-pointer transition">
              {uploading ? "⏳ Uploading..." : "🚀 Upload"}
            </button>
            {uploadedFiles.map((f, i) => (
              <span key={i} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${d ? "bg-indigo-900/50 text-indigo-300 border border-indigo-700" : "bg-indigo-50 text-indigo-700 border border-indigo-200"}`}>
                📄 {f}
                <button onClick={() => handleRemoveUploaded(f)} className="text-red-400 hover:text-red-600 cursor-pointer ml-0.5">✕</button>
              </span>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4">
          {messages.length === 0 && (
            <div className={`flex-1 flex flex-col items-center justify-center gap-4 select-none ${d ? "text-gray-700" : "text-gray-300"}`}>
              <span className="text-7xl">📄</span>
              <div className="text-center">
                <p className={`text-xl font-black ${d ? "text-gray-400" : "text-gray-500"}`}>Upload a PDF to get started</p>
                <p className={`text-sm mt-1 ${d ? "text-gray-600" : "text-gray-400"}`}>Ask anything — get answers with page citations</p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
              {msg.type === "system" ? (
                <div className={`text-xs px-4 py-2 rounded-xl w-full text-center font-medium ${d ? "bg-yellow-900/30 text-yellow-300 border border-yellow-800/40" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>{msg.text}</div>
              ) : msg.type === "user" ? (
                <div className="flex items-end gap-2 max-w-lg">
                  <div className="bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-br-sm text-sm shadow-lg font-medium">{msg.text}</div>
                  <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0 mb-0.5">{user.name[0].toUpperCase()}</div>
                </div>
              ) : (
                <div className="flex items-start gap-2 max-w-2xl">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5 ${d ? "bg-gray-800" : "bg-gray-100"}`}>🤖</div>
                  <div className={`px-4 py-3 rounded-2xl rounded-tl-sm text-sm shadow-sm ${d ? "bg-gray-800 text-gray-100 border border-gray-700" : "bg-white text-gray-800 border border-gray-100 shadow"}`}>
                    <p className="leading-relaxed">{msg.text}</p>
                    {msg.sources && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {msg.sources.map((s, j) => (
                          <span key={j} className={`text-xs px-2 py-1 rounded-full border font-medium ${d ? "bg-gray-700 text-gray-300 border-gray-600" : "bg-indigo-50 text-indigo-600 border-indigo-100"}`}>📌 {s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 ${d ? "bg-gray-800" : "bg-gray-100"}`}>🤖</div>
              <div className={`px-4 py-3 rounded-2xl text-sm flex items-center gap-2 ${d ? "bg-gray-800 text-gray-400 border border-gray-700" : "bg-white text-gray-400 border border-gray-100 shadow"}`}>
                <span className="animate-spin">⚙️</span>
                <span className="animate-pulse">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className={`px-4 py-4 border-t shrink-0 ${d ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}>
          <div className={`flex items-end gap-3 rounded-2xl border-2 px-4 py-3 transition-all ${d ? "bg-gray-800 border-gray-700 focus-within:border-indigo-500" : "bg-gray-50 border-gray-200 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50"}`}>
            <textarea
              rows={1}
              placeholder={uploadedFiles.length > 0 ? "Ask anything about your PDF..." : "Upload a PDF first..."}
              value={question}
              onChange={(e) => { setQuestion(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
              disabled={uploadedFiles.length === 0}
              className={`flex-1 text-sm outline-none resize-none bg-transparent max-h-32 ${d ? "text-white placeholder-gray-500" : "text-gray-800 placeholder-gray-400"} disabled:opacity-40`}
            />
            <button onClick={handleAsk} disabled={uploadedFiles.length === 0 || loading || !question.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white p-2 rounded-xl transition cursor-pointer shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>
          <p className={`text-center text-xs mt-2 ${d ? "text-gray-700" : "text-gray-300"}`}>Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}