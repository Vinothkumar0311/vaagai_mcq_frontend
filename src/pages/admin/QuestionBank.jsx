import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { adminApi } from "../../services/api";
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle,
  AlertTriangle,
  FileArchive,
  ImageIcon,
  X,
  PlusCircle,
  Info,
  Trash2,
  Search,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmModal } from "../../components/ConfirmModal";
import * as XLSX from "xlsx";
import JSZip from "jszip";

// ─── Extract Embedded Drawings from XLSX ──────────────────────────────────────
async function extractEmbeddedImagesFromXlsx(fileBuffer) {
  const imageMap = {};
  try {
    const zip = await JSZip.loadAsync(fileBuffer);
    const sheetRelEntry = zip.file("xl/worksheets/_rels/sheet1.xml.rels");
    if (!sheetRelEntry) return imageMap;

    const sheetRelXml = await sheetRelEntry.async("string");
    const drawingMatch =
      sheetRelXml.match(/Type="[^"]*relationships\/drawing"\s+Target="([^"]*)"/i) ||
      sheetRelXml.match(/Target="([^"]*)"\s+Type="[^"]*relationships\/drawing"/i);

    let drawingPath = "xl/drawings/drawing1.xml";
    if (drawingMatch) {
      const target = drawingMatch[1];
      const basePath = "xl/worksheets";
      const parts = (basePath + "/" + target).split("/");
      const resolvedParts = [];
      for (const part of parts) {
        if (part === "..") resolvedParts.pop();
        else resolvedParts.push(part);
      }
      drawingPath = resolvedParts.join("/");
    }

    const drawingEntry = zip.file(drawingPath);
    if (!drawingEntry) return imageMap;

    const drawingRelPath = drawingPath.replace("xl/drawings/", "xl/drawings/_rels/") + ".rels";
    const drawingRelEntry = zip.file(drawingRelPath);
    if (!drawingRelEntry) return imageMap;

    const drawingRelXml = await drawingRelEntry.async("string");
    const rels = {};
    const relRegex = /<Relationship\s+Id="([^"]*)"\s+Type="[^"]*"\s+Target="([^"]*)"/gi;
    let match;
    while ((match = relRegex.exec(drawingRelXml)) !== null) {
      rels[match[1]] = match[2];
    }
    const relRegexAlt = /<Relationship\s+Target="([^"]*)"\s+Type="[^"]*"\s+Id="([^"]*)"/gi;
    while ((match = relRegexAlt.exec(drawingRelXml)) !== null) {
      rels[match[2]] = match[1];
    }

    const drawingXml = await drawingEntry.async("string");
    const anchorRegex = /<(?:xdr:)?(twoCellAnchor|oneCellAnchor)[^>]*>([\s\S]*?)<\/(?:xdr:)?\1>/gi;
    let anchorMatch;
    while ((anchorMatch = anchorRegex.exec(drawingXml)) !== null) {
      const anchorContent = anchorMatch[2];
      const rowMatch = anchorContent.match(/<(?:xdr:)?from>[\s\S]*?<(?:xdr:)?row>(\d+)<\/(?:xdr:)?row>/i) ||
                       anchorContent.match(/<(?:xdr:)?row>(\d+)<\/(?:xdr:)?row>/i);
      const blipMatch = anchorContent.match(/embed="([^"]*)"/i) || anchorContent.match(/r:embed="([^"]*)"/i);

      if (rowMatch && blipMatch) {
        const rowIndex = parseInt(rowMatch[1], 10);
        const rId = blipMatch[1];
        const targetPath = rels[rId];
        if (targetPath) {
          const basePath = "xl/drawings";
          const parts = (basePath + "/" + targetPath).split("/");
          const resolvedParts = [];
          for (const part of parts) {
            if (part === "..") resolvedParts.pop();
            else resolvedParts.push(part);
          }
          const mediaPath = resolvedParts.join("/");
          const mediaEntry = zip.file(mediaPath);
          if (mediaEntry) {
            const blob = await mediaEntry.async("blob");
            const basename = mediaPath.substring(mediaPath.lastIndexOf("/") + 1);
            imageMap[rowIndex] = {
              filename: basename,
              blob: blob,
              objectUrl: URL.createObjectURL(blob),
            };
          }
        }
      }
    }
  } catch (error) {
    console.error("Error extracting embedded images client-side:", error);
  }
  return imageMap;
}


// ─── Preview Modal ────────────────────────────────────────────────────────────
function PreviewModal({ rows, imageFiles = [], onConfirm, onCancel, uploading }) {
  const imgUrlMap = React.useMemo(() => {
    const map = {};
    imageFiles.forEach((f) => { map[f.name.toLowerCase()] = URL.createObjectURL(f); });
    return map;
  }, [imageFiles]);

  const getImgSrc = (imgVal) => {
    if (!imgVal) return null;
    if (imgVal.startsWith("http") || imgVal.startsWith("//")) return imgVal;
    return imgUrlMap[imgVal.toLowerCase()] || null;
  };

  const OPT_LABELS = ["A", "B", "C", "D"];
  const OPT_KEYS   = ["optionA", "optionB", "optionC", "optionD"];

  const modal = (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", background: "rgba(0,0,0,0.70)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col"
        style={{ width: "95vw", maxWidth: 1100, height: "95vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800" style={{ flexShrink: 0 }}>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Eye size={20} className="text-primary-600" /> Question Preview
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              <strong>{rows.length}</strong> question(s) found — review before uploading
            </p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-red-500 transition-colors p-1"><X size={20} /></button>
        </div>

        {/* Question Cards */}
        <div style={{ overflowY: "auto", flex: 1, padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {rows.map((r, i) => {
            const imgSrc = r.embeddedImgUrl || getImgSrc(r.image);
            const isImageOnly = !r.question && r.image;
            return (
              <div key={i}
                className="dark:bg-slate-800/40 dark:border-slate-700"
                style={{ border: "1px solid #e2e8f0", borderRadius: 16, padding: "1rem 1.25rem", background: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}
              >
                {/* Card header: index + class + image-only badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#ede9fe", color: "#6d28d9", fontWeight: 700, fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                  {r.class && (
                    <span style={{ padding: "3px 10px", background: "#dbeafe", color: "#1e40af", borderRadius: 999, fontWeight: 700, fontSize: 12, border: "1px solid #bfdbfe" }}>
                      Class: {r.class}
                    </span>
                  )}
                  {isImageOnly && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", background: "#ede9fe", color: "#6d28d9", borderRadius: 999, fontWeight: 600, fontSize: 12 }}>
                      <ImageIcon size={12} /> Image Question
                    </span>
                  )}
                </div>

                {/* Card body: text+options on left, image on right */}
                <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
                  {/* Left */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {r.question && (
                      <p className="text-slate-800 dark:text-slate-100"
                        style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {r.question}
                      </p>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px" }}>
                      {OPT_KEYS.map((k, idx) => {
                        const label = OPT_LABELS[idx];
                        const isCorrect = r.correctAnswer === label;
                        return (
                          <div key={k} style={{
                            display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 12px", borderRadius: 10,
                            background: isCorrect ? "#d1fae5" : "#f1f5f9",
                            border: isCorrect ? "1.5px solid #6ee7b7" : "1px solid #e2e8f0",
                          }}>
                            <span style={{ width: 22, height: 22, borderRadius: "50%", background: isCorrect ? "#10b981" : "#94a3b8", color: "#fff", fontWeight: 700, fontSize: 11, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {label}
                            </span>
                            <span style={{ fontSize: 13, color: isCorrect ? "#065f46" : "#334155", fontWeight: isCorrect ? 600 : 400, lineHeight: 1.5, wordBreak: "break-word" }}
                              className="dark:text-slate-200">
                              {r[k] || <span style={{ color: "#cbd5e1" }}>—</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: image */}
                  {r.image && (
                    <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 150, maxWidth: 180 }}>
                      {imgSrc ? (
                        <img src={imgSrc} alt="question"
                          style={{ width: "100%", maxHeight: 180, objectFit: "contain", borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", padding: 4 }}
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: 100, background: "#f1f5f9", borderRadius: 10, border: "2px dashed #c7d2fe", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <ImageIcon size={28} style={{ color: "#a5b4fc" }} />
                          <span style={{ fontSize: 10, color: "#94a3b8", textAlign: "center" }}>Upload image files to preview</span>
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", background: "#ede9fe", borderRadius: 8, width: "100%", overflow: "hidden" }}>
                        <ImageIcon size={11} style={{ color: "#7c3aed", flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: "#6d28d9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.image}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800" style={{ flexShrink: 0 }}>
          <button onClick={onCancel} disabled={uploading}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-50">
            ← Back
          </button>
          <button onClick={onConfirm} disabled={uploading}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary-600/25 transition-all disabled:opacity-50">
            {uploading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading…</>
              : <><UploadCloud size={15} /> Confirm &amp; Upload {rows.length} Question(s)</>}
          </button>
        </div>
      </div>
    </div>
  );
  return ReactDOM.createPortal(modal, document.body);
}


const TABS = [
  { id: "excel", label: "Bulk Upload (Excel / ZIP)", icon: FileSpreadsheet },
  { id: "manual", label: "Add Manually", icon: PlusCircle },
  { id: "browse", label: "Browse Questions", icon: BookOpen },
];

const EMPTY_FORM = {
  question: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctAnswer: "A",
  class: "",
  explanation: "",
};
const OPTION_LABELS = ["A", "B", "C", "D"];

export const QuestionBank = () => {
  const [tab, setTab] = useState("excel");

  // Excel tab
  const [file, setFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);
  const imgInputRef = useRef(null);

  // Manual tab
  const [form, setForm] = useState(EMPTY_FORM);
  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const manualImgRef = useRef(null);

  // Browse tab
  const [questions, setQuestions] = useState([]);
  const [classDistribution, setClassDistribution] = useState([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [classes, setClasses] = useState([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showDeduplicateConfirm, setShowDeduplicateConfirm] = useState(false);

  useEffect(() => {
    adminApi
      .getDistinctClasses()
      .then(setClasses)
      .catch(() => {});
  }, []);

  const fetchQuestions = useCallback(
    async (p = 1, customClassFilter = undefined) => {
      setBrowseLoading(true);
      const activeClassFilter =
        customClassFilter !== undefined ? customClassFilter : classFilter;
      try {
        const data = await adminApi.getQuestions(
          p,
          20,
          search,
          activeClassFilter,
        );
        setQuestions(data.questions);
        setPagination(data.pagination);
        setClassDistribution(data.classDistribution || []);
        setPage(p);
      } catch {
        toast.error("Failed to load questions.");
      } finally {
        setBrowseLoading(false);
      }
    },
    [search, classFilter],
  );

  useEffect(() => {
    if (tab === "browse") {
      fetchQuestions(1);
    }
  }, [tab]);

  // Excel handlers
  const handleFile = (f) => {
    setFile(f);
    setUploadStats(null);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleExcelSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error("Please select a file."); return; }

    // ZIP files: upload directly (can't parse client-side)
    const isZip = file.name.toLowerCase().endsWith(".zip");
    if (isZip) { await doUpload(); return; }

    // Excel: parse and show preview first
    try {
      const data = await file.arrayBuffer();

      // Extract embedded drawing images client-side
      const embeddedImagesMap = await extractEmbeddedImagesFromXlsx(data);

      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      // raw:false returns formatted cell values (prevents Excel serial numbers for class/date cells)
      const json = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });

      const rows = json
        .map((row, idx) => {
          const embeddedImg = embeddedImagesMap[idx + 1];
          const questionText = String(row["Question"] || row["question"] || "").trim();
          const optionA = String(row["Option A"] || row["optionA"] || row["OptionA"] || "").trim();
          const optionB = String(row["Option B"] || row["optionB"] || row["OptionB"] || "").trim();
          const optionC = String(row["Option C"] || row["optionC"] || row["OptionC"] || "").trim();
          const optionD = String(row["Option D"] || row["optionD"] || row["OptionD"] || "").trim();
          const correctAnswer = String(row["Correct Answer"] || row["correctAnswer"] || row["Answer"] || "A").trim().toUpperCase();
          const questionClass = String(row["Class"] || row["class"] || row["Grade"] || row["grade"] || row["Standard"] || row["standard"] || "").trim();

          let imageVal = String(row["Image"] || row["image"] || "").trim();
          let embeddedImgUrl = null;

          if (embeddedImg) {
            imageVal = imageVal || embeddedImg.filename;
            embeddedImgUrl = embeddedImg.objectUrl;
          }

          return {
            question: questionText,
            optionA,
            optionB,
            optionC,
            optionD,
            correctAnswer,
            class: questionClass,
            image: imageVal,
            embeddedImgUrl,
          };
        })
        .filter((r) => r.question !== "" || r.image !== "" || r.embeddedImgUrl);

      if (rows.length === 0) { toast.error("No valid questions found in the file."); return; }
      setPreviewRows(rows);
      setShowPreview(true);
    } catch (err) {
      toast.error("Could not read file: " + err.message);
    }
  };

  // Actual upload (called after preview confirmation or directly for ZIP)
  const doUpload = async () => {
    setUploading(true);
    try {
      const result = await adminApi.uploadQuestions(null, file, imageFiles);
      setUploadStats(result);
      setShowPreview(false);
      toast.success(`Uploaded ${result.count} question(s)!`);
      setFile(null);
      setImageFiles([]);
      if (tab === "browse") fetchQuestions(1);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setUploading(false);
    }
  };

  // Manual handlers
  const handleFormChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (
      !form.question ||
      !form.optionA ||
      !form.optionB ||
      !form.optionC ||
      !form.optionD
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      await adminApi.addQuestion({ ...form }, imgFile);
      toast.success("Question saved to bank!");
      setForm(EMPTY_FORM);
      setImgFile(null);
      setImgPreview(null);
      if (tab === "browse") fetchQuestions(1);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await adminApi.deleteQuestion(confirmDeleteId);
      toast.success("Question deleted.");
      fetchQuestions(page);
    } catch {
      toast.error("Failed to delete.");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleDeduplicate = async () => {
    try {
      setShowDeduplicateConfirm(false);
      const res = await adminApi.deleteDuplicateQuestions();
      toast.success(res.message || "Removed duplicate questions successfully.");
      fetchQuestions(1);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to remove duplicates.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Preview Modal — portal rendered at document.body */}
      {showPreview && (
        <PreviewModal
          rows={previewRows}
          imageFiles={imageFiles}
          uploading={uploading}
          onConfirm={doUpload}
          onCancel={() => setShowPreview(false)}
        />
      )}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <BookOpen className="text-primary-600" size={28} /> Question Bank
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Upload and manage questions globally. Tag each question with a{" "}
          <strong>class</strong> — examiners see only questions matching their
          class.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}
              >
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* ── EXCEL TAB ── */}
        {tab === "excel" && (
          <div className="space-y-5">
            <div className="flex items-start gap-2 p-3 rounded-xl text-xs bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400">
              <Info size={13} className="mt-0.5 shrink-0" />
              Upload an Excel file with columns:{" "}
              <strong>
                Question, Option A, Option B, Option C, Option D, Correct
                Answer, Class, Image (optional), Explanation (optional)
              </strong>
              . Use a ZIP to bundle images. The <strong>Class</strong> column
              tags each question to a class.
            </div>

            <form onSubmit={handleExcelSubmit} className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${file ? "border-primary-400 bg-primary-50/10" : "border-slate-200 dark:border-slate-800 hover:border-primary-400"}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,.zip"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFile(e.target.files[0]);
                    e.target.value = "";
                  }}
                />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileSpreadsheet size={26} className="text-primary-500" />
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {(file.size / 1024).toFixed(1)} KB · Click to replace
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="ml-auto text-slate-400 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <UploadCloud
                      size={32}
                      className="mx-auto text-slate-300 dark:text-slate-600"
                    />
                    <p className="text-sm font-semibold text-slate-500">
                      Drag & drop Excel or ZIP here
                    </p>
                    <p className="text-xs text-slate-400">or click to browse</p>
                  </div>
                )}
              </div>

              {/* Extra images */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-slate-500">
                    Additional Image Files{" "}
                    <span className="font-normal text-slate-400">
                      (optional, for Excel-only mode)
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => imgInputRef.current?.click()}
                    className="text-xs font-semibold text-violet-600 hover:underline"
                  >
                    + Add images
                  </button>
                </div>
                <input
                  ref={imgInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      const valid = [...e.target.files].filter((f) =>
                        f.type.startsWith("image/"),
                      );
                      setImageFiles((prev) => {
                        const names = new Set(prev.map((f) => f.name));
                        return [
                          ...prev,
                          ...valid.filter((f) => !names.has(f.name)),
                        ];
                      });
                    }
                    e.target.value = "";
                  }}
                />
                {imageFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 border border-violet-200/60 dark:border-violet-900/40 rounded-2xl bg-violet-50/40 dark:bg-violet-950/10">
                    {imageFiles.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        <ImageIcon size={11} className="text-violet-400" />
                        <span className="truncate max-w-[120px]">{f.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setImageFiles((prev) =>
                              prev.filter((_, j) => j !== i),
                            )
                          }
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {uploadStats && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-2xl text-sm border border-emerald-200/60">
                  <CheckCircle size={16} className="shrink-0" />
                  <span>
                    <strong>Done!</strong> {uploadStats.count} question(s) added
                    to bank
                    {uploadStats.imageCount > 0
                      ? ` · ${uploadStats.imageCount} with images`
                      : ""}
                    .
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={!file || uploading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing…
                  </>
                ) : file?.name?.toLowerCase().endsWith(".zip") ? (
                  <><UploadCloud size={15} /> Upload ZIP to Question Bank</>
                ) : (
                  <><Eye size={15} /> Preview &amp; Upload
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ── MANUAL TAB ── */}
        {tab === "manual" && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
                Question Text *
              </label>
              <textarea
                name="question"
                value={form.question}
                onChange={handleFormChange}
                rows={3}
                placeholder="Type the question here…"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {OPTION_LABELS.map((opt) => (
                <div key={opt}>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
                    Option {opt} *
                  </label>
                  <input
                    name={`option${opt}`}
                    value={form[`option${opt}`]}
                    onChange={handleFormChange}
                    placeholder={`Option ${opt}`}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
                Correct Answer *
              </label>
              <div className="flex gap-2">
                {OPTION_LABELS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, correctAnswer: opt }))
                    }
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${form.correctAnswer === opt ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
                  Class / Grade{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  name="class"
                  value={form.class}
                  onChange={handleFormChange}
                  placeholder="e.g. 10th, 12th, 1"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
                  Explanation{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  name="explanation"
                  value={form.explanation}
                  onChange={handleFormChange}
                  placeholder="Answer explanation…"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
                Question Image{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              {imgPreview ? (
                <div className="relative inline-block">
                  <img
                    src={imgPreview}
                    alt="preview"
                    className="h-32 w-auto rounded-xl border border-slate-200 dark:border-slate-700 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImgFile(null);
                      setImgPreview(null);
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => manualImgRef.current?.click()}
                  className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-violet-400 transition-colors"
                >
                  <ImageIcon
                    size={18}
                    className="text-slate-300 dark:text-slate-600"
                  />
                  <p className="text-xs text-slate-400">
                    Click to attach an image
                  </p>
                </div>
              )}
              <input
                ref={manualImgRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setImgFile(f);
                  setImgPreview(URL.createObjectURL(f));
                  e.target.value = "";
                }}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary-600/25 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{" "}
                  Saving…
                </>
              ) : (
                <>
                  <PlusCircle size={15} /> Add to Question Bank
                </>
              )}
            </button>
          </form>
        )}

        {/* ── BROWSE TAB ── */}
        {tab === "browse" && (
          <div className="space-y-6">
            {/* Class-wise Question Distribution Overview */}
            {classDistribution.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Class Wise Questions Summary (Click to Filter)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setClassFilter("");
                      fetchQuestions(1, "");
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all ${classFilter === "" ? "border-primary-500 bg-primary-50/10 dark:bg-primary-950/20" : "border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700/60"}`}
                  >
                    <p className="text-xs font-semibold text-slate-400">
                      Total Pool
                    </p>
                    <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                      {classDistribution.reduce(
                        (acc, curr) => acc + curr.count,
                        0,
                      )}
                    </p>
                  </button>
                  {classDistribution.map((item) => (
                    <button
                      key={item.className}
                      type="button"
                      onClick={() => {
                        setClassFilter(item.className);
                        fetchQuestions(1, item.className);
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all ${classFilter === item.className ? "border-primary-500 bg-primary-50/10 dark:bg-primary-950/20" : "border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700/60"}`}
                    >
                      <p className="text-xs font-semibold text-slate-400 truncate">
                        Class: {item.className}
                      </p>
                      <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                        {item.count}{" "}
                        <span className="text-xs font-normal text-slate-450 dark:text-slate-500">
                          Qs
                        </span>
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="relative flex-1">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchQuestions(1)}
                  placeholder="Search questions…"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <select
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  fetchQuestions(1, e.target.value);
                }}
                className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Classes</option>
                <option value="Unassigned">Unassigned</option>
                {classDistribution
                  .filter((c) => c.className !== "Unassigned")
                  .map((c) => (
                    <option key={c.className} value={c.className}>
                      {c.className}
                    </option>
                  ))}
              </select>
              <button
                onClick={() => fetchQuestions(1)}
                className="px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-all"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setShowDeduplicateConfirm(true)}
                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/30 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles size={14} /> Remove Duplicates
              </button>
            </div>

            {browseLoading ? (
              <div className="py-12 text-center text-slate-400">
                Loading questions…
              </div>
            ) : questions.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <BookOpen
                  size={36}
                  className="mx-auto text-slate-300 dark:text-slate-700 mb-2"
                />
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  No questions found. Upload some to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div
                    key={q.id}
                    className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl group"
                  >
                    <span className="shrink-0 w-6 h-6 flex items-center justify-center bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-bold rounded-full">
                      {(page - 1) * 20 + i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                        {q.question || "(Image question)"}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-1">
                        <span className="text-xs text-slate-400">
                          Answer:{" "}
                          <strong className="text-emerald-600 dark:text-emerald-400">
                            {q.correctAnswer}
                          </strong>
                        </span>
                        {q.class && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full font-semibold">
                            {q.class}
                          </span>
                        )}
                        {q.imageUrl && (
                          <span className="text-xs text-violet-500 flex items-center gap-1">
                            <ImageIcon size={10} /> image
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteClick(q.id)}
                      className="shrink-0 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-500">
                  {pagination.total} question(s) total
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchQuestions(page - 1)}
                    disabled={page <= 1}
                    className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-slate-800 disabled:opacity-40 transition-all"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Page {page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => fetchQuestions(page + 1)}
                    disabled={page >= pagination.totalPages}
                    className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-slate-800 disabled:opacity-40 transition-all"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        title="Delete Question?"
        message="This question will be permanently removed from the global Question Bank."
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
        confirmText="Delete Question"
        type="danger"
      />

      <ConfirmModal
        isOpen={showDeduplicateConfirm}
        title="Remove Repeated Questions?"
        message="This will scan the global Question Bank and permanently delete all duplicate questions sharing the same text, options, answer, and class tag."
        onConfirm={handleDeduplicate}
        onCancel={() => setShowDeduplicateConfirm(false)}
        confirmText="Remove Duplicates"
        type="warning"
      />
    </div>
  );
};

export default QuestionBank;
