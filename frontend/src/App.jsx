import { useState, useRef, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || `${window.location.protocol}//${window.location.hostname}:8000`;

const severityStyles = {
  High: "bg-rose-500/10 text-rose-300 border-rose-500/30",
  Medium: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  Low: "bg-teal-500/10 text-teal-300 border-teal-500/30",
};
const severityStylesLight = {
  High: "bg-rose-50 text-rose-600 border-rose-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-teal-50 text-teal-700 border-teal-200",
};
const severityDot = { High: "bg-rose-400", Medium: "bg-amber-400", Low: "bg-teal-400" };

const fileIcons = { pdf: "PDF", docx: "DOC", csv: "CSV", txt: "TXT" };
const EMPTY_MESSAGES = [];
const TEXT_PREVIEW_LIMIT = 20000;

function getExt(name) {
  return name.split(".").pop()?.toLowerCase() || "";
}
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderInlineText(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="rounded bg-slate-500/15 px-1 py-0.5 font-mono text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function ChatMessageContent({ content }) {
  const lines = String(content || "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push(
        <h3 key={`heading-${index}`} className="pt-1 text-sm font-semibold leading-snug first:pt-0">
          {renderInlineText(heading[2])}
        </h3>
      );
      index += 1;
      continue;
    }

    if (/^[-*•]\s+/.test(line)) {
      const items = [];
      const start = index;
      while (index < lines.length && /^[-*•]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*•]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul key={`ul-${start}`} className="space-y-1.5 pl-4 list-disc marker:text-teal-500">
          {items.map((item, itemIndex) => <li key={itemIndex}>{renderInlineText(item)}</li>)}
        </ul>
      );
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      const items = [];
      const start = index;
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+[.)]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ol key={`ol-${start}`} className="space-y-1.5 pl-5 list-decimal marker:font-mono marker:text-teal-500">
          {items.map((item, itemIndex) => <li key={itemIndex}>{renderInlineText(item)}</li>)}
        </ol>
      );
      continue;
    }

    if (line.startsWith(">")) {
      blocks.push(
        <blockquote key={`quote-${index}`} className="border-l-2 border-teal-500/50 pl-3 italic opacity-90">
          {renderInlineText(line.replace(/^>\s?/, ""))}
        </blockquote>
      );
      index += 1;
      continue;
    }

    const paragraphLines = [line];
    const start = index;
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,3})\s+/.test(lines[index].trim()) &&
      !/^[-*•]\s+/.test(lines[index].trim()) &&
      !/^\d+[.)]\s+/.test(lines[index].trim()) &&
      !lines[index].trim().startsWith(">")
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    blocks.push(
      <p key={`paragraph-${start}`} className="leading-relaxed">
        {renderInlineText(paragraphLines.join(" "))}
      </p>
    );
  }

  return <div className="space-y-2.5 break-words">{blocks}</div>;
}

function ScoreGauge({ score, dark, size = 128 }) {
  const color = score >= 75 ? "text-teal-400" : score >= 50 ? "text-amber-400" : "text-rose-400";
  const ringColor = score >= 75 ? "stroke-teal-400" : score >= 50 ? "stroke-amber-400" : "stroke-rose-400";
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="-rotate-90" viewBox="0 0 100 100" style={{ width: size, height: size }}>
        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className={dark ? "text-slate-800" : "text-slate-200"} />
        <circle cx="50" cy="50" r="42" fill="none" strokeWidth="6" strokeLinecap="round" className={ringColor}
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-mono font-semibold tabular-nums ${color}`} style={{ fontSize: size / 4 }}>{score}</span>
        <span className={`font-mono text-[10px] tracking-wider ${dark ? "text-slate-500" : "text-slate-400"}`}>/ 100</span>
      </div>
    </div>
  );
}

function MiniGauge({ score, dark }) {
  const color = score >= 75 ? "text-teal-400" : score >= 50 ? "text-amber-400" : "text-rose-400";
  const ringColor = score >= 75 ? "stroke-teal-400" : score >= 50 ? "stroke-amber-400" : "stroke-rose-400";
  const circumference = 2 * Math.PI * 16;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-10 h-10 flex-shrink-0">
      <svg className="-rotate-90 w-10 h-10" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="4" className={dark ? "text-slate-800" : "text-slate-200"} />
        <circle cx="20" cy="20" r="16" fill="none" strokeWidth="4" strokeLinecap="round" className={ringColor} strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-mono text-[10px] font-bold ${color}`}>{score}</span>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { id: "upload", label: "Upload", icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" },
  { id: "analysis", label: "AI Analysis", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
  { id: "risks", label: "Risks", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
  { id: "forecast", label: "Forecast", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: "settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
];

function AuthScreen({ onAuthed, dark }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        onAuthed(data.email);
      } else {
        setError(data.detail || "Error");
      }
    } catch {
      setError("Connection failed");
    }
    setLoading(false);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${dark ? "bg-[#0a0e14]" : "bg-slate-50"}`}>
      <div className={`w-full max-w-sm rounded-lg border p-7 ${dark ? "border-slate-800 bg-[#0d1219]" : "border-slate-200 bg-white"}`}>
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center">
            <span className="font-mono text-xs font-bold text-slate-950">AI</span>
          </div>
          <div>
            <p className={`text-sm font-semibold ${dark ? "text-slate-100" : "text-slate-900"}`}>Enterprise Project Intelligence</p>
            <p className="text-[10px] font-mono text-slate-500">RISK MANAGEMENT PLATFORM</p>
          </div>
        </div>
        <h1 className={`text-lg font-semibold mb-1 ${dark ? "text-slate-100" : "text-slate-900"}`}>
          {mode === "login" ? "Log in" : "Create account"}
        </h1>
        <p className="text-sm mb-5 text-slate-500">
          {mode === "login" ? "Your uploads and analysis history are saved to your account." : "Documents and analysis you save will be tied to this email."}
        </p>
        <div className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full rounded-md border px-3.5 py-2.5 text-sm focus:outline-none focus:border-teal-500/50 ${dark ? "bg-[#0a0e14] border-slate-800 text-slate-100 placeholder-slate-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"}`}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className={`w-full rounded-md border px-3.5 py-2.5 text-sm focus:outline-none focus:border-teal-500/50 ${dark ? "bg-[#0a0e14] border-slate-800 text-slate-100 placeholder-slate-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"}`}
          />
        </div>
        {error && <p className="text-xs text-rose-400 mt-3">{error}</p>}
        <button
          onClick={submit}
          disabled={loading || !email.trim() || !password}
          className="w-full mt-4 rounded-md bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-30 transition-colors"
        >
          {loading ? "..." : mode === "login" ? "Log in" : "Sign up"}
        </button>
        <button
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
          className="w-full mt-3 text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors"
        >
          {mode === "login" ? "No account? Sign up" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}

function PreviewModal({ file, onClose, dark }) {
  const [textPreview, setTextPreview] = useState("");
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const ext = getExt(file.name);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;

    const preparePreview = async () => {
      setLoading(true);
      setError("");
      setTextPreview("");
      setPdfUrl(null);

      try {
        if (ext === "pdf") {
          objectUrl = URL.createObjectURL(file);
          if (!cancelled) setPdfUrl(objectUrl);
        } else if (ext === "docx") {
          const mammothModule = await import("mammoth");
          const mammoth = mammothModule.default || mammothModule;
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          if (!cancelled) {
            const extracted = result.value.trim();
            setTextPreview(extracted.slice(0, TEXT_PREVIEW_LIMIT));
            if (!extracted) setError("No readable text was found in this DOCX file.");
          }
        } else if (ext === "txt" || ext === "csv") {
          const content = await file.text();
          if (!cancelled) setTextPreview(content.slice(0, TEXT_PREVIEW_LIMIT));
        } else {
          throw new Error("Preview is not supported for this file type.");
        }
      } catch (previewError) {
        if (!cancelled) setError(previewError.message || "Could not generate the preview.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    preparePreview();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, ext]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const previewWasTruncated = textPreview.length >= TEXT_PREVIEW_LIMIT;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-4xl h-[85vh] rounded-lg border flex flex-col shadow-2xl ${dark ? "bg-[#0d1219] border-slate-700" : "bg-white border-slate-200"}`}
      >
        <div className={`px-4 sm:px-5 py-4 border-b flex items-center justify-between gap-4 ${dark ? "border-slate-800" : "border-slate-200"}`}>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`flex-shrink-0 font-mono text-[9px] font-bold px-1.5 py-1 rounded ${dark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                {fileIcons[ext] || "DOC"}
              </span>
              <p className={`text-sm font-medium truncate ${dark ? "text-slate-100" : "text-slate-900"}`}>{file.name}</p>
            </div>
            <p className="text-xs font-mono text-slate-500 mt-1">{formatSize(file.size)} · Preview before upload</p>
          </div>
          <button
            onClick={onClose}
            className={`rounded-md p-1.5 flex-shrink-0 ${dark ? "text-slate-500 hover:text-slate-300 hover:bg-slate-800" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}
            aria-label="Close preview"
            title="Close preview"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={`flex-1 min-h-0 overflow-auto ${pdfUrl ? "p-0" : "p-4 sm:p-5"}`}>
          {loading ? (
            <div className="h-full flex items-center justify-center gap-3 text-slate-500">
              <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Preparing preview...</p>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center text-center px-6">
              <div>
                <p className="text-sm text-rose-400">Preview unavailable</p>
                <p className="text-xs text-slate-500 mt-1">{error}</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              title={`Preview of ${file.name}`}
              className="w-full h-full rounded-b-lg bg-white"
            />
          ) : (
            <div>
              <pre className={`text-xs sm:text-sm font-mono whitespace-pre-wrap break-words leading-relaxed ${dark ? "text-slate-300" : "text-slate-700"}`}>
                {textPreview}
              </pre>
              {previewWasTruncated && (
                <p className="mt-5 border-t border-slate-500/20 pt-3 text-xs font-mono text-amber-500">
                  Preview limited to the first {TEXT_PREVIEW_LIMIT.toLocaleString()} characters. The complete file will still be uploaded.
                </p>
              )}
            </div>
          )}
        </div>

        <div className={`px-4 sm:px-5 py-3 border-t flex items-center justify-between gap-4 ${dark ? "border-slate-800" : "border-slate-200"}`}>
          <p className="text-[10px] sm:text-xs text-slate-500">This preview is generated locally. The file has not been uploaded yet.</p>
          <button onClick={onClose} className="rounded-md bg-teal-600 px-4 py-2 text-xs font-medium text-white hover:bg-teal-500">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [dark, setDark] = useState(true);
  const [userEmail, setUserEmail] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [pendingFiles, setPendingFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [analysisCache, setAnalysisCache] = useState({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [exportingWord, setExportingWord] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [chatByDoc, setChatByDoc] = useState({});
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(null);
  const [riskFilter, setRiskFilter] = useState("All");
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [forecastData, setForecastData] = useState(null);
  const [forecasting, setForecasting] = useState(false);
  const [forecastError, setForecastError] = useState(null);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const prevKeyRef = useRef(null);
  const prevLenRef = useRef(0);

  useEffect(() => {
    loadAccount();
  }, []);

  const loadAccount = async () => {
    try {
      const sessionRes = await fetch(`${API_BASE}/me`, { credentials: "include" });
      if (!sessionRes.ok) {
        setUserEmail(null);
        return;
      }
      const session = await sessionRes.json();
      setUserEmail(session.email);

      const res = await fetch(`${API_BASE}/history`, { credentials: "include" });
      if (!res.ok) throw new Error("Unable to load account history");
      const data = await res.json();
      const docs = (data.documents || []).map((d) => ({ name: d.filename, chunks: d.chunks, status: "success" }));
      setUploadedDocs(docs);
      const cache = {};
      (data.documents || []).forEach((d) => {
        if (d.analysis) cache[d.filename] = d.analysis;
      });
      setAnalysisCache(cache);
    } catch {
      // backend might be down; user can still use the app once it's up
    } finally {
      setCheckingSession(false);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/logout`, { method: "POST", credentials: "include" });
    } catch {
      // Clear local UI state even if the backend is temporarily unavailable.
    }
    setUserEmail(null);
    setUploadedDocs([]);
    setAnalysisCache({});
    setChatByDoc({});
    setSelectedDoc(null);
    setActiveTab("dashboard");
    setForecastData(null);
  };

  const cacheKey = selectedDoc || "__all__";
  const currentAnalysis = analysisCache[cacheKey];
  const successDocs = uploadedDocs.filter((d) => d.status === "success");
  const messages = chatByDoc[cacheKey] || EMPTY_MESSAGES;
  const sevStyles = dark ? severityStyles : severityStylesLight;

  useEffect(() => {
    if (prevKeyRef.current !== cacheKey) {
      prevKeyRef.current = cacheKey;
      prevLenRef.current = messages.length;
      return;
    }
    if (messages.length > prevLenRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLenRef.current = messages.length;
  }, [messages, cacheKey]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const addPendingFiles = (files) => {
    const valid = [];
    const oversized = [];
    files.forEach((f) => {
      if (f.size === 0) {
        alert(`File "${f.name}" is empty.`);
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        oversized.push(f.name);
        return;
      }
      valid.push(f);
    });
    if (oversized.length > 0) alert(`Files > 10MB skipped: ${oversized.join(", ")}`);
    setPendingFiles((prev) => [
      ...prev,
      ...valid.map((f) => ({ file: f, id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}` })),
    ]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length > 0) addPendingFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.length > 0) addPendingFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const removePending = (id) => setPendingFiles((prev) => prev.filter((p) => p.id !== id));

  const confirmUpload = async () => {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    const toUpload = [...pendingFiles];
    setPendingFiles([]);
    for (const { file } of toUpload) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch(`${API_BASE}/upload`, { method: "POST", credentials: "include", body: formData });
        const data = await res.json();
        if (res.ok) {
          setUploadedDocs((prev) => [
            ...prev.filter((d) => d.name !== file.name),
            { name: file.name, chunks: data.chunks_added, status: "success" },
          ]);
        } else {
          setUploadedDocs((prev) => [...prev, { name: file.name, status: "error", error: data.detail }]);
        }
      } catch {
        setUploadedDocs((prev) => [...prev, { name: file.name, status: "error", error: "Connection failed" }]);
      }
    }
    setUploading(false);
  };

  const runAnalysis = async (docName) => {
    const key = docName || "__all__";
    setSelectedDoc(docName);
    setAnalysisError(null);
    setActiveTab("analysis");
    if (analysisCache[key]) return;

    setAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ source_file: docName }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setAnalysisError(data.detail || "Rate limit exceeded. Please wait.");
        return;
      }
      if (res.ok) {
        setAnalysisCache((prev) => ({ ...prev, [key]: data }));
      } else {
        setAnalysisError(data.detail || "Analysis failed");
      }
    } catch {
      setAnalysisError("Could not connect to backend");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAsk = async () => {
    if (!question.trim() || asking) return;

    const userMsg = { role: "user", content: question };
    setChatByDoc((prev) => ({ ...prev, [cacheKey]: [...(prev[cacheKey] || []), userMsg] }));
    setQuestion("");
    setAsking(true);

    try {
      const res = await fetch(`${API_BASE}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ question: userMsg.content, source_file: selectedDoc }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setChatByDoc((prev) => ({
          ...prev,
          [cacheKey]: [...(prev[cacheKey] || []), { role: "assistant", content: data.detail || "Rate limit exceeded. Please wait.", sources: [] }],
        }));
        return;
      }
      if (!res.ok) {
        setChatByDoc((prev) => ({
          ...prev,
          [cacheKey]: [...(prev[cacheKey] || []), { role: "assistant", content: data.detail || `Error (${res.status})`, sources: [] }],
        }));
        return;
      }
      const answerText = Array.isArray(data.answer) ? data.answer.map((b) => b.text).join("\n") : data.answer;
      setChatByDoc((prev) => ({
        ...prev,
        [cacheKey]: [...(prev[cacheKey] || []), { role: "assistant", content: answerText, sources: data.sources }],
      }));
    } catch {
      setChatByDoc((prev) => ({
        ...prev,
        [cacheKey]: [...(prev[cacheKey] || []), { role: "assistant", content: "Connection error.", sources: [] }],
      }));
    }
    setAsking(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const copyAnswer = async (content, messageIndex) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessage(messageIndex);
      window.setTimeout(() => setCopiedMessage(null), 1600);
    } catch {
      // Clipboard access can be unavailable in insecure browser contexts.
    }
  };

  const generateWordReport = async () => {
    if (!selectedDoc) return alert("Please select a specific document in Analysis tab.");
    setExportingWord(true);
    try {
      const res = await fetch(`${API_BASE}/generate-doc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ source_file: selectedDoc }),
      });
      if (res.status === 429) {
        const err = await res.json();
        alert("Rate limit exceeded: " + (err.detail || "Please wait."));
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        alert("Error: " + err.detail);
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedDoc.replace(/\.[^.]+$/, "")}_health_report.docx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Failed to generate report.");
    }
    setExportingWord(false);
  };

  const generatePdfReport = async () => {
    if (!selectedDoc) return alert("Please select a specific document in Analysis tab.");
    setExportingPdf(true);
    try {
      const res = await fetch(`${API_BASE}/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ source_file: selectedDoc }),
      });
      if (res.status === 429) {
        const err = await res.json();
        alert("Rate limit exceeded: " + (err.detail || "Please wait."));
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        alert("Error: " + err.detail);
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedDoc.replace(/\.[^.]+$/, "")}_report.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Failed to generate PDF report.");
    }
    setExportingPdf(false);
  };

  const runForecast = async (docName) => {
    setForecasting(true);
    setForecastError(null);
    setForecastData(null);
    try {
      const res = await fetch(`${API_BASE}/forecast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ source_file: docName }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setForecastError(data.detail || "Rate limit exceeded. Please wait.");
        return;
      }
      if (res.ok) {
        setForecastData(data);
      } else {
        setForecastError(data.detail || "Forecast failed");
      }
    } catch {
      setForecastError("Connection error");
    } finally {
      setForecasting(false);
    }
  };

  const allAnalyses = Object.values(analysisCache).filter((a) => a && a.document !== "All Documents");
  const avgHealth = allAnalyses.length ? Math.round(allAnalyses.reduce((s, a) => s + (a.health_score || 0), 0) / allAnalyses.length) : null;
  const allRisks = allAnalyses.flatMap((a) => (a.risks || []).map((r) => ({ ...r, document: a.document })));
  const riskCounts = { High: 0, Medium: 0, Low: 0 };
  allRisks.forEach((r) => {
    if (riskCounts[r.severity] !== undefined) riskCounts[r.severity]++;
  });

  const risksByDoc = {};
  allAnalyses.forEach((a) => {
    if (a.risks && a.risks.length > 0) {
      risksByDoc[a.document] = { risks: a.risks, health_score: a.health_score };
    }
  });
  const filteredRisksByDoc = Object.entries(risksByDoc)
    .map(([doc, data]) => ({
      doc,
      health_score: data.health_score,
      risks: riskFilter === "All" ? data.risks : data.risks.filter((r) => r.severity === riskFilter),
    }))
    .filter((g) => g.risks.length > 0);

  const toggleGroup = (doc) => setCollapsedGroups((prev) => ({ ...prev, [doc]: !prev[doc] }));

  const c = dark
    ? {
        page: "bg-[#0a0e14]",
        sidebar: "bg-[#0d1219]",
        panel: "bg-[#0d1219]",
        panelAlt: "bg-[#0a0e14]",
        border: "border-slate-800",
        borderHover: "hover:border-slate-700",
        text: "text-slate-100",
        textDim: "text-slate-400",
        textMute: "text-slate-500",
        inputBg: "bg-[#0a0e14]",
      }
    : {
        page: "bg-slate-50",
        sidebar: "bg-white",
        panel: "bg-white",
        panelAlt: "bg-slate-50",
        border: "border-slate-200",
        borderHover: "hover:border-slate-300",
        text: "text-slate-900",
        textDim: "text-slate-600",
        textMute: "text-slate-500",
        inputBg: "bg-slate-50",
      };

  if (checkingSession) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${c.page}`}>
        <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!userEmail) {
    return <AuthScreen onAuthed={loadAccount} dark={dark} />;
  }

  return (
    <div className={`min-h-screen ${c.page} ${c.text} flex`}>
      {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} dark={dark} />}

      <aside className={`w-56 flex-shrink-0 border-r ${c.border} ${c.sidebar} flex flex-col`}>
        <div className={`px-5 py-5 flex items-center gap-2.5 border-b ${c.border}`}>
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center flex-shrink-0">
            <span className="font-mono text-xs font-bold text-slate-950">AI</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">Project Intelligence</p>
            <p className="text-[10px] font-mono text-slate-500 tracking-wide">RISK MANAGEMENT</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                activeTab === item.id ? "bg-teal-500/10 text-teal-500" : `${c.textDim} hover:bg-teal-500/5`
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
              </svg>
              {item.label}
              {item.id === "risks" && allRisks.length > 0 && (
                <span
                  className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    dark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {allRisks.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className={`px-3 py-3 border-t ${c.border} space-y-2`}>
          <div className={`flex items-center rounded-md p-0.5 ${dark ? "bg-slate-900" : "bg-slate-100"}`}>
            <button
              onClick={() => setDark(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[5px] text-xs font-medium transition-colors ${
                dark ? "bg-slate-800 text-teal-400" : "text-slate-400 hover:text-slate-500"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
              Dark
            </button>
            <button
              onClick={() => setDark(false)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[5px] text-xs font-medium transition-colors ${
                !dark ? "bg-white text-amber-500 shadow-sm" : "text-slate-500 hover:text-slate-400"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1zm6 5a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z" />
              </svg>
              Light
            </button>
          </div>

          <div className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 ${dark ? "bg-slate-900" : "bg-slate-100"}`}>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-slate-950">{userEmail.charAt(0).toUpperCase()}</span>
            </div>
            <span className={`text-xs font-mono truncate flex-1 ${c.textMute}`}>{userEmail}</span>
            <button onClick={logout} className="flex-shrink-0 text-slate-500 hover:text-rose-400 transition-colors" title="Log out">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {/* DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-semibold">Dashboard</h1>
                <p className={`text-sm mt-1 ${c.textMute}`}>Overview across all your uploaded documents</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`rounded-lg border ${c.border} ${c.panel} p-5`}>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-2">Documents</p>
                  <p className="text-3xl font-mono font-semibold">{successDocs.length}</p>
                </div>
                <div className={`rounded-lg border ${c.border} ${c.panel} p-5`}>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-2">Avg. Health</p>
                  <p className="text-3xl font-mono font-semibold">{avgHealth !== null ? avgHealth : "—"}</p>
                </div>
                <div className={`rounded-lg border ${c.border} ${c.panel} p-5`}>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-2">Risks Found</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-mono font-semibold">{allRisks.length}</p>
                    <span className="text-xs font-mono text-rose-400">{riskCounts.High}H</span>
                    <span className="text-xs font-mono text-amber-400">{riskCounts.Medium}M</span>
                    <span className="text-xs font-mono text-teal-400">{riskCounts.Low}L</span>
                  </div>
                </div>
              </div>

              <div className={`rounded-lg border ${c.border} ${c.panel} p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium">Documents</h2>
                </div>
                {successDocs.length === 0 ? (
                  <div className="text-center py-10">
                    <p className={`text-sm mb-3 ${c.textMute}`}>No documents yet</p>
                    <button onClick={() => setActiveTab("upload")} className="text-xs font-mono text-teal-500 hover:text-teal-400">
                      Upload your first document →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {successDocs.map((doc, i) => {
                      const a = analysisCache[doc.name];
                      return (
                        <button
                          key={i}
                          onClick={() => runAnalysis(doc.name)}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-md border ${c.border} ${c.borderHover} transition-colors text-left`}
                        >
                          <span
                            className={`flex-shrink-0 font-mono text-[9px] font-bold px-1.5 py-1 rounded ${
                              dark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {fileIcons[getExt(doc.name)] || "DOC"}
                          </span>
                          <span className="text-sm truncate flex-1">{doc.name}</span>
                          {a ? (
                            <span
                              className={`text-xs font-mono px-2 py-0.5 rounded ${
                                a.health_score >= 75
                                  ? "text-teal-400"
                                  : a.health_score >= 50
                                  ? "text-amber-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {a.health_score}/100
                            </span>
                          ) : (
                            <span className="text-xs font-mono text-slate-500">not analyzed</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* UPLOAD */}
          {activeTab === "upload" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-semibold">Upload Project Documents</h1>
                <p className={`text-sm mt-1 ${c.textMute}`}>Upload your project files to start AI-powered analysis</p>
              </div>

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-lg border p-12 text-center transition-all ${
                  dragActive
                    ? "border-teal-400/60 bg-teal-500/5"
                    : `${c.border} ${c.panel} ${c.borderHover}`
                }`}
                style={{ borderStyle: "dashed" }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.csv,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-md bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium">Drag & drop files here, or click to browse</p>
                  <p className="text-xs text-slate-500 font-mono">Supported: PDF · DOCX · CSV · TXT (Max 10MB)</p>
                </div>
              </div>

              <div className={`rounded-lg border ${c.border} ${c.panel} p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium">Selected Files</h2>
                  {pendingFiles.length > 0 && (
                    <span className="text-xs font-mono text-slate-500">
                      {pendingFiles.length} file{pendingFiles.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {pendingFiles.length === 0 ? (
                  <p className={`text-sm py-4 text-center ${c.textMute}`}>No files selected.</p>
                ) : (
                  <div className="space-y-2 mb-4">
                    {pendingFiles.map(({ file, id }) => (
                      <div
                        key={id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md ${c.panelAlt} border ${c.border}`}
                      >
                        <span
                          className={`flex-shrink-0 font-mono text-[9px] font-bold px-1.5 py-1 rounded ${
                            dark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {fileIcons[getExt(file.name)] || "DOC"}
                        </span>
                        <span className="text-sm truncate flex-1">{file.name}</span>
                        <span className="text-xs font-mono text-slate-500 flex-shrink-0">{formatSize(file.size)}</span>
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="flex-shrink-0 text-xs font-mono text-teal-500 hover:text-teal-400"
                        >
                          preview
                        </button>
                        <button
                          onClick={() => removePending(id)}
                          className="flex-shrink-0 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={confirmUpload}
                  disabled={pendingFiles.length === 0 || uploading}
                  className="w-full rounded-md bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    `Upload ${pendingFiles.length > 0 ? `(${pendingFiles.length})` : ""}`
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ANALYSIS */}
          {activeTab === "analysis" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-semibold">AI Analysis</h1>
                <p className={`text-sm mt-1 ${c.textMute}`}>Per-document risk analysis and grounded Q&A</p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => runAnalysis(null)}
                  disabled={successDocs.length === 0}
                  className={`text-sm px-3 py-2 rounded-md border transition-colors disabled:opacity-30 ${
                    selectedDoc === null
                      ? "bg-teal-500/10 border-teal-500/30 text-teal-500"
                      : `${c.panel} ${c.border} ${c.textDim} ${c.borderHover}`
                  }`}
                >
                  All Documents
                </button>
                {successDocs.map((doc, i) => (
                  <button
                    key={i}
                    onClick={() => runAnalysis(doc.name)}
                    className={`text-sm px-3 py-2 rounded-md border transition-colors truncate max-w-[200px] ${
                      selectedDoc === doc.name
                        ? "bg-teal-500/10 border-teal-500/30 text-teal-500"
                        : `${c.panel} ${c.border} ${c.textDim} ${c.borderHover}`
                    }`}
                  >
                    {doc.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                <div className={`lg:col-span-3 rounded-lg border ${c.border} ${c.panel} p-6 min-h-[560px]`}>
                  {successDocs.length === 0 ? (
                    <div className={`h-full flex items-center justify-center text-center text-sm ${c.textMute}`}>
                      Upload a document to run analysis
                    </div>
                  ) : analyzing ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3">
                      <div className="w-7 h-7 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-mono text-slate-500">running analysis...</p>
                    </div>
                  ) : analysisError ? (
                    <div className="h-full flex items-center justify-center text-center text-sm text-rose-400">
                      {analysisError}
                    </div>
                  ) : !currentAnalysis ? (
                    <div className={`h-full flex items-center justify-center text-center text-sm ${c.textMute}`}>
                      Select a document above to view its analysis
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">Analysis</p>
                          <h2 className="text-base font-medium truncate">{currentAnalysis.document}</h2>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={generateWordReport}
                            disabled={!selectedDoc || exportingWord}
                            className="flex-shrink-0 text-xs font-mono text-teal-400 border border-teal-500/30 rounded-md px-3 py-1.5 hover:bg-teal-500/10 transition-colors disabled:opacity-30 flex items-center gap-1.5"
                          >
                            {exportingWord && <div className="w-3 h-3 border-2 border-teal-400/40 border-t-teal-400 rounded-full animate-spin" />}
                            Word Report
                          </button>
                          <button
                            onClick={generatePdfReport}
                            disabled={!selectedDoc || exportingPdf}
                            className="flex-shrink-0 text-xs font-mono text-white bg-teal-600 hover:bg-teal-500 rounded-md px-3 py-1.5 transition-colors disabled:opacity-30 flex items-center gap-1.5"
                          >
                            {exportingPdf && <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                            PDF Report
                          </button>
                        </div>
                      </div>

                      <div className={`flex items-center gap-5 rounded-lg ${c.panelAlt} border ${c.border} p-4`}>
                        <ScoreGauge score={currentAnalysis.health_score ?? 0} dark={dark} />
                        <div>
                          <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                            Project Health
                          </p>
                          <p className={`text-sm leading-relaxed ${c.textDim}`}>
                            {currentAnalysis.health_summary}
                          </p>
                        </div>
                      </div>

                      {currentAnalysis.methodology && (
                        <div className={`rounded-lg border border-teal-500/20 bg-teal-500/5 p-4`}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <svg className="w-3.5 h-3.5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="text-[11px] font-mono uppercase tracking-wider text-teal-500">Methodology — On what basis?</h3>
                          </div>
                          <p className={`text-sm leading-relaxed ${c.textDim}`}>{currentAnalysis.methodology}</p>
                        </div>
                      )}

                      <div>
                        <h3 className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-2">Scope</h3>
                        <p className={`text-sm leading-relaxed ${c.textDim}`}>{currentAnalysis.scope_summary}</p>
                      </div>

                      {currentAnalysis.risks?.length > 0 && (
                        <div>
                          <h3 className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-3">
                            Risks ({currentAnalysis.risks.length})
                          </h3>
                          <div className="space-y-2">
                            {currentAnalysis.risks.map((risk, i) => (
                              <div key={i} className={`rounded-md border ${c.border} ${c.panelAlt} p-3`}>
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <span className="text-sm font-medium">{risk.title}</span>
                                  <span
                                    className={`flex-shrink-0 text-[10px] font-mono px-2 py-0.5 rounded border ${
                                      sevStyles[risk.severity] || sevStyles.Medium
                                    }`}
                                  >
                                    {risk.severity}
                                  </span>
                                </div>
                                <p className={`text-xs leading-relaxed ${c.textMute}`}>{risk.description}</p>
                                {risk.evidence && (
                                  <div className={`mt-2 pl-2 border-l-2 border-teal-500/40`}>
                                    <p className="text-[9px] font-mono uppercase tracking-wider text-teal-500 mb-0.5">Basis</p>
                                    <p className={`text-xs leading-relaxed ${c.textMute} italic`}>{risk.evidence}</p>
                                  </div>
                                )}
                                <span className="inline-block mt-2 text-[9px] font-mono uppercase tracking-wider text-slate-500">
                                  {risk.category}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {currentAnalysis.recommendations?.length > 0 && (
                        <div>
                          <h3 className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-2">
                            Recommendations
                          </h3>
                          <ul className="space-y-1.5">
                            {currentAnalysis.recommendations.map((rec, i) => (
                              <li key={i} className={`text-sm flex gap-2 leading-relaxed ${c.textDim}`}>
                                <span className="text-teal-500 flex-shrink-0 font-mono text-xs mt-0.5">
                                  {String(i + 1).padStart(2, "0")}
                                </span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {currentAnalysis.user_stories && (
                        <div>
                          <h3 className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-2">
                            User Stories
                          </h3>
                          <ul className="space-y-1.5">
                            {currentAnalysis.user_stories.map((story, i) => (
                              <li key={i} className={`text-sm ${c.textMute}`}>• {story}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div
                  className={`lg:col-span-2 flex flex-col rounded-lg border ${c.border} ${c.panel} h-[560px]`}
                >
                  <div className={`px-4 py-3.5 border-b ${c.border} flex items-center justify-between`}>
                    <div className="min-w-0">
                      <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Assistant</p>
                      <h2 className="text-sm font-medium truncate">{selectedDoc || "All Documents"}</h2>
                    </div>
                    {messages.length > 0 && (
                      <button
                        onClick={() => setChatByDoc((prev) => ({ ...prev, [cacheKey]: [] }))}
                        className="flex-shrink-0 text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        clear
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {messages.length === 0 && (
                      <div className="h-full flex items-center justify-center text-center px-4">
                        <p className={`text-sm leading-relaxed ${c.textMute}`}>
                          Ask about <span className={c.textDim}>{selectedDoc || "all uploaded documents"}</span>
                          <br />
                          <span className="text-xs font-mono text-slate-500 mt-1 block">
                            e.g. "What are the key risks?"
                          </span>
                        </p>
                      </div>
                    )}
                    {messages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[88%] rounded-lg px-3.5 py-2.5 text-sm ${
                            msg.role === "user"
                              ? "bg-teal-600/90 text-white"
                              : dark
                              ? "bg-slate-800/70 text-slate-100"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {msg.role === "assistant" ? (
                            <ChatMessageContent content={msg.content} />
                          ) : (
                            <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>
                          )}
                          {msg.sources?.length > 0 && (
                            <div className="mt-3 border-t border-current/10 pt-2">
                              <p className="text-[9px] font-mono uppercase tracking-wider opacity-50 mb-1">Sources</p>
                              <div className="flex flex-wrap gap-1">
                                {msg.sources.map((source) => (
                                  <span key={source} className="rounded border border-current/10 px-1.5 py-0.5 text-[10px] font-mono opacity-75">
                                    {source}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {msg.role === "assistant" && (
                            <button
                              onClick={() => copyAnswer(msg.content, i)}
                              className="mt-2 text-[10px] font-mono opacity-50 hover:opacity-90 transition-opacity"
                              aria-label="Copy answer"
                            >
                              {copiedMessage === i ? "copied" : "copy answer"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {asking && (
                      <div className="flex justify-start">
                        <div className={`rounded-lg px-3.5 py-2.5 ${dark ? "bg-slate-800/70" : "bg-slate-100"}`}>
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className={`px-4 py-3.5 border-t ${c.border}`}>
                    <div className="flex gap-2">
                      <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask a question..."
                        rows={1}
                        className={`flex-1 resize-none rounded-md ${c.inputBg} border ${c.border} px-3.5 py-2.5 text-sm ${c.text} placeholder-slate-500 focus:outline-none focus:border-teal-500/50`}
                      />
                      <button
                        onClick={handleAsk}
                        disabled={asking || !question.trim()}
                        className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Ask
                      </button>
                    </div>
                    <p className="mt-1.5 text-[9px] font-mono text-slate-500">Enter to send · Shift + Enter for a new line</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RISKS */}
          {activeTab === "risks" && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-xl font-semibold">Risks</h1>
                  <p className={`text-sm mt-1 ${c.textMute}`}>Grouped by document, across your entire account</p>
                </div>
                {allRisks.length > 0 && (
                  <div className="flex gap-1.5">
                    {["All", "High", "Medium", "Low"].map((sev) => (
                      <button
                        key={sev}
                        onClick={() => setRiskFilter(sev)}
                        className={`text-xs font-mono px-3 py-1.5 rounded-md border transition-colors ${
                          riskFilter === sev
                            ? sev === "All"
                              ? "bg-teal-500/10 border-teal-500/30 text-teal-500"
                              : `${sevStyles[sev]}`
                            : `${c.panel} ${c.border} ${c.textMute} ${c.borderHover}`
                        }`}
                      >
                        {sev}
                        {sev !== "All" && ` (${riskCounts[sev]})`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {allRisks.length === 0 ? (
                <div className={`rounded-lg border ${c.border} ${c.panel} p-10 text-center`}>
                  <p className={`text-sm mb-3 ${c.textMute}`}>No risks found yet — analyze a document first</p>
                  <button onClick={() => setActiveTab("analysis")} className="text-xs font-mono text-teal-500 hover:text-teal-400">
                    Go to AI Analysis →
                  </button>
                </div>
              ) : filteredRisksByDoc.length === 0 ? (
                <div className={`rounded-lg border ${c.border} ${c.panel} p-10 text-center`}>
                  <p className={`text-sm ${c.textMute}`}>No {riskFilter.toLowerCase()} severity risks found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRisksByDoc.map(({ doc, health_score, risks }) => {
                    const isCollapsed = collapsedGroups[doc];
                    const groupCounts = { High: 0, Medium: 0, Low: 0 };
                    risks.forEach((r) => {
                      if (groupCounts[r.severity] !== undefined) groupCounts[r.severity]++;
                    });

                    return (
                      <div key={doc} className={`rounded-lg border ${c.border} ${c.panel} overflow-hidden`}>
                        <button
                          onClick={() => toggleGroup(doc)}
                          className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors ${c.borderHover}`}
                        >
                          <MiniGauge score={health_score ?? 0} dark={dark} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`flex-shrink-0 font-mono text-[9px] font-bold px-1.5 py-1 rounded ${
                                  dark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {fileIcons[getExt(doc)] || "DOC"}
                              </span>
                              <h2 className="text-sm font-medium truncate">{doc}</h2>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                              {groupCounts.High > 0 && (
                                <span className="flex items-center gap-1 text-[11px] font-mono text-rose-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                  {groupCounts.High} high
                                </span>
                              )}
                              {groupCounts.Medium > 0 && (
                                <span className="flex items-center gap-1 text-[11px] font-mono text-amber-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  {groupCounts.Medium} medium
                                </span>
                              )}
                              {groupCounts.Low > 0 && (
                                <span className="flex items-center gap-1 text-[11px] font-mono text-teal-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                                  {groupCounts.Low} low
                                </span>
                              )}
                            </div>
                          </div>
                          <svg
                            className={`w-4 h-4 flex-shrink-0 text-slate-500 transition-transform ${
                              isCollapsed ? "" : "rotate-180"
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {!isCollapsed && (
                          <div className={`px-5 pb-5 pt-1 space-y-2 border-t ${c.border}`}>
                            {risks.map((risk, i) => (
                              <div key={i} className={`rounded-md border ${c.border} ${c.panelAlt} p-3.5 mt-3`}>
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                        severityDot[risk.severity] || severityDot.Medium
                                      }`}
                                    />
                                    <span className="text-sm font-medium truncate">{risk.title}</span>
                                  </div>
                                  <span
                                    className={`flex-shrink-0 text-[10px] font-mono px-2 py-0.5 rounded border ${
                                      sevStyles[risk.severity] || sevStyles.Medium
                                    }`}
                                  >
                                    {risk.severity}
                                  </span>
                                </div>
                                <p className={`text-sm leading-relaxed mb-2 ${c.textMute}`}>{risk.description}</p>
                                {risk.evidence && (
                                  <div className="pl-2 border-l-2 border-teal-500/40 mb-2">
                                    <p className="text-[9px] font-mono uppercase tracking-wider text-teal-500 mb-0.5">Basis</p>
                                    <p className={`text-xs leading-relaxed italic ${c.textMute}`}>{risk.evidence}</p>
                                  </div>
                                )}
                                <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
                                  <span className="uppercase tracking-wider">{risk.category}</span>
                                </div>
                              </div>
                            ))}
                            <button
                              onClick={() => runAnalysis(doc)}
                              className="text-xs font-mono text-teal-500 hover:text-teal-400 mt-1"
                            >
                              View full analysis →
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* FORECAST */}
          {activeTab === "forecast" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-semibold">Schedule / Delivery Forecast</h1>
                <p className={`text-sm mt-1 ${c.textMute}`}>
                  Predict deadline risks and delivery timeline for a selected document
                </p>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <select
                  onChange={(e) => setSelectedDoc(e.target.value || null)}
                  value={selectedDoc || ""}
                  className={`px-3 py-2 rounded-md border ${c.border} ${c.inputBg} text-sm focus:outline-none focus:border-teal-500/50`}
                >
                  <option value="">Select a document...</option>
                  {successDocs.map((doc) => (
                    <option key={doc.name} value={doc.name}>
                      {doc.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (selectedDoc) runForecast(selectedDoc);
                    else alert("Select a document first.");
                  }}
                  disabled={!selectedDoc || forecasting}
                  className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-30 transition-colors"
                >
                  Run Forecast
                </button>
              </div>

              {forecasting && (
                <div className="flex items-center gap-3 py-6">
                  <div className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-slate-500">Analyzing schedule...</span>
                </div>
              )}
              {forecastError && <p className="text-sm text-rose-400">{forecastError}</p>}
              {forecastData && (
                <div className={`rounded-lg border ${c.border} ${c.panel} p-6 space-y-4`}>
                  <h2 className="text-base font-medium">Forecast for {forecastData.document}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div
                      className={`rounded-md p-4 ${
                        forecastData.delay_risk === "High"
                          ? "bg-rose-500/10 border border-rose-500/30"
                          : forecastData.delay_risk === "Medium"
                          ? "bg-amber-500/10 border border-amber-500/30"
                          : "bg-teal-500/10 border border-teal-500/30"
                      }`}
                    >
                      <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Delay Risk</p>
                      <p
                        className={`text-2xl font-bold ${
                          forecastData.delay_risk === "High"
                            ? "text-rose-400"
                            : forecastData.delay_risk === "Medium"
                            ? "text-amber-400"
                            : "text-teal-400"
                        }`}
                      >
                        {forecastData.delay_risk}
                      </p>
                    </div>
                    <div className={`rounded-md p-4 ${c.panelAlt} border ${c.border}`}>
                      <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Estimated Delivery</p>
                      <p className="text-lg font-semibold mt-1">{forecastData.estimated_delivery || "N/A"}</p>
                    </div>
                    <div className={`rounded-md p-4 ${c.panelAlt} border ${c.border}`}>
                      <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Actions</p>
                      <p className="text-sm mt-1 text-slate-500">
                        {forecastData.recommendations?.length > 0 ? forecastData.recommendations[0] : "None"}
                      </p>
                    </div>
                  </div>

                  {forecastData.basis && (
                    <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-4">
                      <p className="text-[11px] font-mono uppercase tracking-wider text-teal-500 mb-1.5">Basis — On what basis?</p>
                      <p className={`text-sm leading-relaxed ${c.textDim}`}>{forecastData.basis}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-medium mb-2">Blockers</h3>
                    <ul className="space-y-1">
                      {forecastData.blockers?.map((b, i) => (
                        <li key={i} className={`text-sm ${c.textMute}`}>• {b}</li>
                      )) || <p className={`text-sm ${c.textMute}`}>No blockers identified.</p>}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-2">Recommendations</h3>
                    <ul className="space-y-1">
                      {forecastData.recommendations?.slice(1).map((r, i) => (
                        <li key={i} className={`text-sm ${c.textMute}`}>• {r}</li>
                      )) || <p className={`text-sm ${c.textMute}`}>No additional recs.</p>}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-semibold">Settings</h1>
                <p className={`text-sm mt-1 ${c.textMute}`}>Account and system status</p>
              </div>

              <div className={`rounded-lg border ${c.border} ${c.panel} p-5 space-y-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Account</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{userEmail}</p>
                  </div>
                  <button onClick={logout} className="text-xs font-mono text-rose-400 hover:text-rose-300">
                    Log out
                  </button>
                </div>
                <div className={`flex items-center justify-between pt-4 border-t ${c.border}`}>
                  <div>
                    <p className="text-sm">Backend connection</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{API_BASE}</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-mono text-teal-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> connected
                  </span>
                </div>
                <div className={`flex items-center justify-between pt-4 border-t ${c.border}`}>
                  <div>
                    <p className="text-sm">Gmail sync (planned)</p>
                    <p className={`text-xs mt-0.5 ${c.textMute}`}>No Gmail account or email data is connected. Each user will authorize their own account.</p>
                  </div>
                  <span className="text-xs font-mono text-slate-500">not connected</span>
                </div> 
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
