import { useState } from "react";
import axios from "axios";

export default function App() {
  const [file, setFile] = useState(null);
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

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
      const botMsg = {
        type: "bot",
        text: res.data.answer,
        pages: res.data.pages,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [...prev, { type: "bot", text: "❌ Kuch error aaya. Dobara try karo." }]);
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.logo}>📄 DocuMind</h1>
        <p style={styles.tagline}>Chat with your PDF — instantly</p>
      </div>

      <div style={styles.uploadBox}>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files[0])}
          style={styles.fileInput}
        />
        <button onClick={handleUpload} disabled={!file || uploading} style={styles.uploadBtn}>
          {uploading ? "Uploading..." : "Upload PDF"}
        </button>
        {uploaded && <span style={styles.badge}>✅ PDF Ready</span>}
      </div>

      <div style={styles.chatBox}>
        {messages.length === 0 && (
          <p style={styles.placeholder}>⬆️ PDF upload karo, phir questions poochho...</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={msg.type === "user" ? styles.userMsg : msg.type === "system" ? styles.systemMsg : styles.botMsg}>
            {msg.type === "user" && <strong>You: </strong>}
            {msg.type === "bot" && <strong>🤖 DocuMind: </strong>}
            <span>{msg.text}</span>
            {msg.pages && (
              <div style={styles.pages}>📌 Pages: {msg.pages.join(", ")}</div>
            )}
          </div>
        ))}
        {loading && <div style={styles.botMsg}>🤖 <em>Thinking...</em></div>}
      </div>

      <div style={styles.inputRow}>
        <input
          type="text"
          placeholder={uploaded ? "Apna question likho..." : "Pehle PDF upload karo..."}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          disabled={!uploaded}
          style={styles.input}
        />
        <button onClick={handleAsk} disabled={!uploaded || loading} style={styles.askBtn}>
          Send 🚀
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: 750, margin: "0 auto", padding: 24, fontFamily: "Segoe UI, sans-serif", minHeight: "100vh", background: "#f5f7ff" },
  header: { textAlign: "center", marginBottom: 24 },
  logo: { fontSize: 36, margin: 0, color: "#4f46e5" },
  tagline: { color: "#6b7280", marginTop: 4 },
  uploadBox: { display: "flex", alignItems: "center", gap: 12, background: "#fff", padding: 16, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", marginBottom: 20 },
  fileInput: { flex: 1 },
  uploadBtn: { background: "#4f46e5", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600 },
  badge: { color: "#16a34a", fontWeight: 600 },
  chatBox: { background: "#fff", borderRadius: 12, padding: 20, minHeight: 350, maxHeight: 400, overflowY: "auto", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 },
  placeholder: { color: "#9ca3af", textAlign: "center", marginTop: 80 },
  userMsg: { background: "#ede9fe", padding: "10px 14px", borderRadius: 10, alignSelf: "flex-end", maxWidth: "80%" },
  botMsg: { background: "#f0fdf4", padding: "10px 14px", borderRadius: 10, maxWidth: "90%", lineHeight: 1.6 },
  systemMsg: { background: "#fef9c3", padding: "8px 14px", borderRadius: 8, fontSize: 14, color: "#92400e" },
  pages: { marginTop: 8, fontSize: 13, color: "#6b7280" },
  inputRow: { display: "flex", gap: 10 },
  input: { flex: 1, padding: "12px 16px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 15, outline: "none" },
  askBtn: { background: "#4f46e5", color: "#fff", border: "none", padding: "12px 22px", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 15 },
};