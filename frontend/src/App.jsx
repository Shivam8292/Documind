import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000";

// Axios interceptor — har request mein token lagao
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function App() {
  const [dark, setDark] = useState(false);
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
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("chats");
  const [currentChatId, setCurrentChatId] = useState(null);
  const chatEndRef = useRef(null);

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

  // ── Auth ──────────────────────────────────────────────
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

  // ── Data Fetch ────────────────────────────────────────
  const fetchFileHistory = async () => {
    try {
      const res = await axios.get(`${API}/history`);
      setFileHistory(res.data.history);
    } catch {}
  };

  const fetchChatHistory = async () => {
    try {
      const res = await axios.get(`${API}/chats`);
      setChatHistory(res.data.chats);
    } catch {}
  };

  // ── Upload ────────────────────────────────────────────
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
    if (newList.length === 0) {
      await axios.delete(`${API}/reset`);
      setMessages([]);
    }
  };

  const handleLoad = async (filename) => {
    try {
      const res = await axios.post(`${API}/load/${encodeURIComponent(filename)}`);
      setUploadedFiles(res.data.uploaded_files);
      setMessages((prev) => [...prev, { type: "system", text: `✅ ${filename} loaded!` }]);
      setShowSidebar(false);
    } catch {
      setMessages((prev) => [...prev, { type: "system", text: "❌  Load failed. Please try again." }]);
    }
  };

  const handleLoadChat = (chat) => {
    const msgs = chat.messages.map((m) => ({
      type: m.role === "user" ? "user" : "bot",
      text: m.text,
      sources: m.sources || null,
    }));
    setMessages(msgs);
    setCurrentChatId(chat.id);
    setShowSidebar(false);
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    setUploadedFiles([]);
    axios.delete(`${API}/reset`);
  };

  const handleDeleteChat = async (chatId) => {
    await axios.delete(`${API}/chats/${chatId}`);
    fetchChatHistory();
    if (currentChatId === chatId) {
      setMessages([]);
      setCurrentChatId(null);
    }
  };

  const handleClearAllChats = async () => {
    await axios.delete(`${API}/chats`);
    setChatHistory([]);
    setMessages([]);
    setCurrentChatId(null);
  };

  const handleDeleteHistory = async (filename) => {
    await axios.delete(`${API}/history/${encodeURIComponent(filename)}`);
    fetchFileHistory();
  };

  const handleClearAllHistory = async () => {
    await axios.delete(`${API}/history`);
    setFileHistory([]);
  };

  const handleReset = async () => {
    await axios.delete(`${API}/reset`);
    setUploadedFiles([]);
    setMessages([]);
    setFiles([]);
    setCurrentChatId(null);
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
      setMessages((prev) => [...prev, { type: "bot", text: "❌Ask anything...Something went wrong. Please try again." }]);
    }
    setLoading(false);
  };

  const d = dark;

  // ── Auth Page ─────────────────────────────────────────
  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 transition-all ${d ? "bg-gray-950" : "bg-gradient-to-br from-indigo-50 via-white to-purple-100"}`}>
        <div className={`w-full max-w-md rounded-3xl shadow-2xl p-8 ${d ? "bg-gray-900 border border-gray-800" : "bg-white"}`}>
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className={`text-4xl font-black tracking-tighter ${d ? "text-white" : "text-indigo-600"}`}>📄 DocuMind</h1>
            <p className={`text-sm mt-2 ${d ? "text-gray-400" : "text-gray-400"}`}>Chat with your PDFs — instantly</p>
          </div>

          {/* Tabs */}
          <div className={`flex rounded-2xl p-1 mb-6 ${d ? "bg-gray-800" : "bg-gray-100"}`}>
            <button
              onClick={() => { setAuthMode("login"); setAuthError(""); }}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${authMode === "login" ? "bg-indigo-600 text-white shadow" : d ? "text-gray-400" : "text-gray-500"}`}
            >
              Login
            </button>
            <button
              onClick={() => { setAuthMode("register"); setAuthError(""); }}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${authMode === "register" ? "bg-indigo-600 text-white shadow" : d ? "text-gray-400" : "text-gray-500"}`}
            >
              Register
            </button>
          </div>

          {/* Fields */}
          <div className="flex flex-col gap-3">
            {authMode === "register" && (
              <input
                type="text"
                placeholder="Your name"
                value={authData.name}
                onChange={(e) => setAuthData({ ...authData, name: e.target.value })}
                className={`w-full rounded-xl px-4 py-3 text-sm outline-none border-2 transition font-medium ${d ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500" : "bg-gray-50 border-gray-100 text-gray-800 placeholder-gray-400 focus:border-indigo-300"}`}
              />
            )}
            <input
              type="email"
              placeholder="Email address"
              value={authData.email}
              onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              className={`w-full rounded-xl px-4 py-3 text-sm outline-none border-2 transition font-medium ${d ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500" : "bg-gray-50 border-gray-100 text-gray-800 placeholder-gray-400 focus:border-indigo-300"}`}
            />
            <input
              type="password"
              placeholder="Password"
              value={authData.password}
              onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              className={`w-full rounded-xl px-4 py-3 text-sm outline-none border-2 transition font-medium ${d ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500" : "bg-gray-50 border-gray-100 text-gray-800 placeholder-gray-400 focus:border-indigo-300"}`}
            />

            {authError && (
              <p className="text-red-500 text-xs font-semibold text-center">{authError}</p>
            )}

            <button
              onClick={handleAuth}
              disabled={authLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black py-3 rounded-xl transition cursor-pointer shadow-lg shadow-indigo-200 mt-2"
            >
              {authLoading ? "⏳ Please wait..." : authMode === "login" ? "🚀 Login" : "✨ Register"}
            </button>
          </div>

          {/* Dark toggle */}
          <div className="text-center mt-6">
            <button onClick={() => setDark(!d)} className={`text-xs font-semibold cursor-pointer ${d ? "text-yellow-400" : "text-gray-400"}`}>
              {d ? "☀️ Light Mode" : "🌙 Dark Mode"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main App ──────────────────────────────────────────
  return (
    <div className={`min-h-screen transition-all duration-300 ${d ? "bg-gray-950" : "bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-100"} flex flex-col items-center px-4 py-8 relative`}>

      {/* Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-80 z-50 transform transition-transform duration-300 shadow-2xl flex flex-col ${showSidebar ? "translate-x-0" : "translate-x-full"} ${d ? "bg-gray-900 border-l border-gray-800" : "bg-white border-l border-gray-200"}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${d ? "border-gray-800" : "border-gray-100"}`}>
          <div className="flex gap-2">
            <button onClick={() => setSidebarTab("chats")} className={`text-sm font-bold px-3 py-1 rounded-full transition cursor-pointer ${sidebarTab === "chats" ? "bg-indigo-600 text-white" : d ? "text-gray-400" : "text-gray-400"}`}>
              💬 Chats
            </button>
            <button onClick={() => setSidebarTab("files")} className={`text-sm font-bold px-3 py-1 rounded-full transition cursor-pointer ${sidebarTab === "files" ? "bg-indigo-600 text-white" : d ? "text-gray-400" : "text-gray-400"}`}>
              📂 Files
            </button>
          </div>
          <button onClick={() => setShowSidebar(false)} className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sidebarTab === "chats" && (
            chatHistory.length === 0
              ? <p className={`text-center text-sm py-10 ${d ? "text-gray-500" : "text-gray-400"}`}>No chats yet...</p>
              : chatHistory.map((chat) => (
                <div key={chat.id} className={`flex items-center justify-between px-5 py-3 border-b cursor-pointer transition ${currentChatId === chat.id ? d ? "bg-indigo-900/40" : "bg-indigo-50" : d ? "border-gray-800 hover:bg-gray-800" : "border-gray-50 hover:bg-gray-50"}`} onClick={() => handleLoadChat(chat)}>
                  <div className="flex-1 min-w-0 mr-2">
                    <p className={`text-sm font-semibold truncate ${d ? "text-gray-200" : "text-gray-700"}`}>💬 {chat.title}</p>
                    <p className={`text-xs mt-0.5 ${d ? "text-gray-500" : "text-gray-400"}`}>{chat.created_at}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.id); }} className="text-red-400 hover:text-red-500 text-sm px-2 py-1 rounded-lg cursor-pointer">🗑️</button>
                </div>
              ))
          )}

          {sidebarTab === "files" && (
            fileHistory.length === 0
              ? <p className={`text-center text-sm py-10 ${d ? "text-gray-500" : "text-gray-400"}`}>No files yet...</p>
              : fileHistory.map((item, i) => (
                <div key={i} className={`flex items-center justify-between px-5 py-3 border-b transition ${d ? "border-gray-800 hover:bg-gray-800" : "border-gray-50 hover:bg-indigo-50"}`}>
                  <div className="flex-1 min-w-0 mr-2">
                    <p className={`text-sm font-semibold truncate ${d ? "text-gray-200" : "text-gray-700"}`}>📄 {item.filename}</p>
                    <p className={`text-xs mt-0.5 ${d ? "text-gray-500" : "text-gray-400"}`}>{item.uploaded_at}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => handleLoad(item.filename)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg font-semibold cursor-pointer">Load</button>
                    <button onClick={() => handleDeleteHistory(item.filename)} className="text-red-400 hover:text-red-500 text-sm px-2 py-1.5 rounded-lg cursor-pointer">🗑️</button>
                  </div>
                </div>
              ))
          )}
        </div>

        <div className={`p-4 border-t ${d ? "border-gray-800 bg-gray-900" : "border-gray-100 bg-white"}`}>
          {sidebarTab === "chats" && chatHistory.length > 0 && (
            <button onClick={handleClearAllChats} className="w-full py-2 rounded-xl text-sm font-bold text-red-400 border border-red-200 hover:bg-red-50 transition cursor-pointer">🗑️ Clear All Chats</button>
          )}
          {sidebarTab === "files" && fileHistory.length > 0 && (
            <button onClick={handleClearAllHistory} className="w-full py-2 rounded-xl text-sm font-bold text-red-400 border border-red-200 hover:bg-red-50 transition cursor-pointer">🗑️ Clear All Files</button>
          )}
        </div>
      </div>

      {showSidebar && <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setShowSidebar(false)} />}

      {/* Header */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-8">
        <div>
          <h1 className={`text-5xl font-black tracking-tighter ${d ? "text-white" : "text-indigo-600"}`}>📄 DocuMind</h1>
          <p className={`text-sm mt-1 font-medium ${d ? "text-gray-400" : "text-gray-400"}`}>Welcome, {user.name}! 👋</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button onClick={handleNewChat} className={`px-4 py-2 rounded-full text-sm font-bold transition cursor-pointer shadow-md ${d ? "bg-gray-800 text-green-400 hover:bg-gray-700" : "bg-white text-green-600 hover:bg-green-50 border border-green-100"}`}>
            ✏️ New
          </button>
          <button onClick={() => setShowSidebar(true)} className={`relative px-4 py-2 rounded-full text-sm font-bold transition cursor-pointer shadow-md ${d ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-100"}`}>
            🕘 History
            {chatHistory.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{chatHistory.length}</span>
            )}
          </button>
          <button onClick={() => setDark(!d)} className={`px-4 py-2 rounded-full text-sm font-bold transition cursor-pointer shadow-md ${d ? "bg-gray-800 text-yellow-400 hover:bg-gray-700" : "bg-white text-gray-600 border border-gray-100"}`}>
            {d ? "☀️" : "🌙"}
          </button>
          <button onClick={handleLogout} className={`px-4 py-2 rounded-full text-sm font-bold transition cursor-pointer shadow-md ${d ? "bg-gray-800 text-red-400 hover:bg-gray-700" : "bg-white text-red-500 hover:bg-red-50 border border-red-100"}`}>
            Logout
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className={`w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${d ? "bg-gray-900 border border-gray-800" : "bg-white/80 backdrop-blur-md border border-white"}`}>

        {/* Upload */}
        <div className={`p-5 border-b ${d ? "bg-gray-800/80 border-gray-700" : "bg-gradient-to-r from-indigo-50 to-purple-50 border-gray-100"}`}>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <label className={`flex-1 cursor-pointer border-2 border-dashed rounded-2xl px-4 py-3 text-center transition-all ${d ? "border-indigo-500/50 hover:border-indigo-400 bg-gray-900/50" : "border-indigo-200 hover:border-indigo-400 bg-white"}`}>
              <input type="file" accept=".pdf" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files))} />
              <span className={`text-sm font-medium ${d ? "text-gray-300" : "text-gray-500"}`}>
                {files.length > 0 ? `📎 ${files.length} file(s) selected` : "🖱️ Click to choose PDF(s)"}
              </span>
            </label>
            <button onClick={handleUpload} disabled={files.length === 0 || uploading} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-indigo-300 disabled:to-purple-300 text-white font-black px-6 py-3 rounded-2xl transition cursor-pointer shadow-lg text-sm">
              {uploading ? "⏳ Uploading..." : "🚀 Upload"}
            </button>
            {uploadedFiles.length > 0 && (
              <button onClick={handleReset} className="text-red-400 hover:text-red-500 text-xs font-bold cursor-pointer">Clear</button>
            )}
          </div>

          {uploadedFiles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {uploadedFiles.map((f, i) => (
                <span key={i} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold ${d ? "bg-indigo-900/60 text-indigo-300 border border-indigo-700" : "bg-indigo-100 text-indigo-700 border border-indigo-200"}`}>
                  📄 {f}
                  <button onClick={() => handleRemoveUploaded(f)} className="ml-1 text-red-400 hover:text-red-600 font-black cursor-pointer text-sm">✕</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="h-96 overflow-y-auto p-6 flex flex-col gap-4">
          {messages.length === 0 && (
            <div className={`flex-1 flex flex-col items-center justify-center gap-3 select-none ${d ? "text-gray-600" : "text-gray-300"}`}>
              <span className="text-6xl">🤖</span>
              <p className="text-sm font-medium">Upload a PDF and ask anything...</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
              {msg.type === "system" ? (
                <div className={`text-sm px-4 py-2 rounded-2xl w-full text-center font-medium ${d ? "bg-yellow-900/40 text-yellow-300 border border-yellow-700/40" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>{msg.text}</div>
              ) : msg.type === "user" ? (
                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm max-w-xs lg:max-w-md text-sm shadow-lg font-medium">{msg.text}</div>
              ) : (
                <div className={`px-4 py-3 rounded-2xl rounded-tl-sm max-w-xs lg:max-w-md text-sm shadow-sm ${d ? "bg-gray-800 text-gray-100 border border-gray-700" : "bg-gray-50 text-gray-800 border border-gray-100"}`}>
                  <span className="font-black text-indigo-500 text-xs uppercase tracking-wide">🤖 DocuMind</span>
                  <p className="mt-1.5 leading-relaxed">{msg.text}</p>
                  {msg.sources && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {msg.sources.map((s, j) => (
                        <span key={j} className={`text-xs px-2 py-1 rounded-full border font-medium ${d ? "bg-gray-700 text-gray-300 border-gray-600" : "bg-white text-indigo-500 border-indigo-100"}`}>📌 {s}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className={`px-4 py-3 rounded-2xl text-sm flex items-center gap-2 border ${d ? "bg-gray-800 text-gray-400 border-gray-700" : "bg-gray-50 text-gray-400 border-gray-100"}`}>
                <span className="animate-spin">⚙️</span>
                <span className="animate-pulse">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className={`p-4 border-t flex gap-3 ${d ? "border-gray-700 bg-gray-900" : "border-gray-100 bg-gray-50/50"}`}>
          <input
            type="text"
            placeholder={uploadedFiles.length > 0 ? "Ask anything..." : "Upload a PDF first..."}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            disabled={uploadedFiles.length === 0}
            className={`flex-1 rounded-2xl px-4 py-3 text-sm outline-none border-2 transition-all font-medium ${d ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500" : "bg-white border-gray-100 text-gray-800 placeholder-gray-500 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"} disabled:opacity-40`}
          />
          <button onClick={handleAsk} disabled={uploadedFiles.length === 0 || loading} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-indigo-300 disabled:to-purple-300 text-white font-black px-5 py-3 rounded-2xl transition cursor-pointer shadow-lg text-sm">
            Send 🚀
          </button>
        </div>
      </div>

      <p className={`text-xs mt-6 font-medium ${d ? "text-gray-700" : "text-gray-300"}`}>
        Built with ❤️ using React + FastAPI + LangChain + Groq
      </p>
    </div>
  );
}