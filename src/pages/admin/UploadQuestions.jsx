import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import {
  FileSpreadsheet, ChevronLeft, UploadCloud, CheckCircle,
  AlertTriangle, FileArchive, ImageIcon, X, PlusCircle,
  Pencil, Info, Trash2, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

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


// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'excel', label: 'Bulk Upload (Excel / ZIP)', icon: FileSpreadsheet },
  { id: 'manual', label: 'Add Question Manually', icon: PlusCircle }
];

// ─── Upload sub-modes (Excel tab) ─────────────────────────────────────────────
const MODES = [
  {
    id: 'excel', icon: FileSpreadsheet, title: 'Excel Only',
    subtitle: 'Text-based questions',
    description: 'Upload .xlsx with Question, Options A–D, Correct Answer. Use a URL in the "Image" column for image questions.',
    accept: '.xlsx,.xls', color: 'emerald'
  },
  {
    id: 'zip', icon: FileArchive, title: 'ZIP Archive',
    subtitle: 'Excel + images bundled',
    description: 'Pack your Excel and all image files in one .zip. Reference images by filename in the "Image" column.',
    accept: '.zip', color: 'blue'
  },
  {
    id: 'separate', icon: ImageIcon, title: 'Excel + Images',
    subtitle: 'Upload separately',
    description: 'Pick the Excel file then separately pick image files. Filenames in the "Image" column must match.',
    accept: '.xlsx,.xls', color: 'violet'
  }
];

const COLORS = {
  emerald: { ring: 'ring-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-400', icon: 'text-emerald-500' },
  blue:    { ring: 'ring-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950/20',       text: 'text-blue-600 dark:text-blue-400',       icon: 'text-blue-500' },
  violet:  { ring: 'ring-violet-500',  bg: 'bg-violet-50 dark:bg-violet-950/20',   text: 'text-violet-600 dark:text-violet-400',   icon: 'text-violet-500' }
};

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const EMPTY_FORM = { question: '', optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: 'A', class: '' };

// ─── Small helpers ────────────────────────────────────────────────────────────
function FileChip({ file, onRemove }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300">
      <ImageIcon size={11} className="shrink-0 text-violet-400" />
      <span className="truncate max-w-[150px]">{file.name}</span>
      <span className="text-slate-400 shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
      <button type="button" onClick={onRemove} className="ml-1 text-slate-400 hover:text-red-500 transition-colors">
        <X size={11} />
      </button>
    </div>
  );
}

// ─── Manual question list item ────────────────────────────────────────────────
function QuestionCard({ q, index, onDelete }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl">
      <span className="shrink-0 w-6 h-6 flex items-center justify-center bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-bold rounded-full">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{q.question}</p>
        <p className="text-xs text-slate-400 mt-0.5">Answer: <strong className="text-emerald-600 dark:text-emerald-400">{q.correctAnswer}</strong>
          {q.imageUrl && <span className="ml-2 inline-flex items-center gap-1 text-violet-500"><ImageIcon size={10} /> image</span>}
        </p>
      </div>
      <button onClick={() => onDelete(q.id)} className="shrink-0 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
    </div>
  );
}

// ─── Preview Modal (rendered via portal to avoid stacking context issues) ──────
function PreviewModal({ rows, imageFiles = [], onConfirm, onCancel, uploading }) {
  // Build a map: filename (lowercase) -> object URL for preview
  const imgUrlMap = React.useMemo(() => {
    const map = {};
    imageFiles.forEach((f) => {
      map[f.name.toLowerCase()] = URL.createObjectURL(f);
    });
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


// ─── Main component ───────────────────────────────────────────────────────────
export const UploadQuestions = () => {
  const { id: testId } = useParams();
  const navigate = useNavigate();

  // Tab state
  const [tab, setTab] = useState('excel');

  // ── Excel-tab state ──────────────────────────────────────────────────────────
  const [mode, setMode] = useState('excel');
  const [file, setFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);
  const imgInputRef  = useRef(null);

  // ── Manual-tab state ─────────────────────────────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM);
  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedQuestions, setSavedQuestions] = useState([]);
  const manualImgRef = useRef(null);

  // ── Excel helpers ────────────────────────────────────────────────────────────
  const currentMode = MODES.find(m => m.id === mode);
  const c = COLORS[currentMode.color];

  const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type !== 'dragleave'); };
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files[0]) setPrimaryFile(e.dataTransfer.files[0]); };

  const setPrimaryFile = (f) => {
    const n = f.name.toLowerCase();
    if (mode === 'zip' && !n.endsWith('.zip')) { toast.error('Please select a ZIP file.'); return; }
    if (mode !== 'zip' && !n.endsWith('.xlsx') && !n.endsWith('.xls')) { toast.error('Please select an Excel file (.xlsx or .xls).'); return; }
    setFile(f); setUploadStats(null);
  };

  const handleFileChange = (e) => { if (e.target.files?.[0]) setPrimaryFile(e.target.files[0]); e.target.value = ''; };
  const handleImagesChange = (e) => {
    if (e.target.files) {
      const valid = [...e.target.files].filter(f => f.type.startsWith('image/'));
      setImageFiles(prev => { const names = new Set(prev.map(f => f.name)); return [...prev, ...valid.filter(f => !names.has(f.name))]; });
    }
    e.target.value = '';
  };

  const switchMode = (m) => { setMode(m); setFile(null); setImageFiles([]); setUploadStats(null); };

  // Parse Excel client-side and open preview (skip preview for ZIP)
  const handleExcelSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('Please select a file first.'); return; }

    if (mode === 'zip') {
      // ZIP: no client-side parse, go straight to upload
      await doUpload();
      return;
    }

    try {
      const data = await file.arrayBuffer();

      // Extract embedded drawing images client-side
      const embeddedImagesMap = await extractEmbeddedImagesFromXlsx(data);

      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      // raw:false returns formatted cell values (prevents Excel serial numbers for class/date cells)
      const json = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

      const rows = json
        .map((row, idx) => {
          const embeddedImg = embeddedImagesMap[idx + 1];
          const questionText = String(row['Question'] || row['question'] || '').trim();
          const optionA = String(row['Option A'] || row['optionA'] || row['OptionA'] || '').trim();
          const optionB = String(row['Option B'] || row['optionB'] || row['OptionB'] || '').trim();
          const optionC = String(row['Option C'] || row['optionC'] || row['OptionC'] || '').trim();
          const optionD = String(row['Option D'] || row['optionD'] || row['OptionD'] || '').trim();
          const correctAnswer = String(row['Correct Answer'] || row['correctAnswer'] || row['CorrectAnswer'] || row['Answer'] || row['Correct'] || '').trim().toUpperCase();
          const questionClass = String(row['Class'] || row['class'] || row['Grade'] || row['grade'] || row['Standard'] || row['standard'] || '').trim();

          let imageVal = String(row['Image'] || row['image'] || '').trim();
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
        .filter((() => {
          const seenQuestions = new Set();
          return (r) => {
            // Must have at least a question or an image
            if (!r.question && !r.image && !r.embeddedImgUrl) return false;
            // Must have all four options (prevents phantom rows from wrapped text)
            if (!r.optionA || !r.optionB || !r.optionC || !r.optionD) return false;
            // Must have a valid correct answer
            if (!['A', 'B', 'C', 'D'].includes(r.correctAnswer)) return false;
            // Deduplicate by question text to prevent same question appearing twice
            const key = (r.question || r.image || '').trim().toLowerCase();
            if (seenQuestions.has(key)) return false;
            seenQuestions.add(key);
            return true;
          };
        })());

      if (rows.length === 0) { toast.error('No valid questions found in the file.'); return; }
      setPreviewRows(rows);
      setShowPreview(true);
    } catch (err) {
      toast.error('Could not read file: ' + err.message);
    }
  };

  // Actual upload after confirmation
  const doUpload = async () => {
    setUploading(true);
    try {
      const imgs = mode === 'separate' ? imageFiles : [];
      const result = await adminApi.uploadQuestions(testId, file, imgs);
      setUploadStats(result);
      setShowPreview(false);
      toast.success(`Uploaded ${result.count} question(s)!`);
      setTimeout(() => navigate('/admin/tests'), 1800);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Upload failed.');
    } finally { setUploading(false); }
  };

  // ── Manual helpers ────────────────────────────────────────────────────────────
  const handleFormChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleManualImage = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImgFile(f);
    setImgPreview(URL.createObjectURL(f));
    e.target.value = '';
  };

  const clearManualImage = () => { setImgFile(null); setImgPreview(null); };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const { question, optionA, optionB, optionC, optionD, correctAnswer, class: questionClass } = form;
    if (!question || !optionA || !optionB || !optionC || !optionD) { toast.error('Please fill in all fields.'); return; }
    setSaving(true);
    try {
      const saved = await adminApi.addQuestion(testId, { question, optionA, optionB, optionC, optionD, correctAnswer, class: questionClass }, imgFile);
      setSavedQuestions(prev => [...prev, saved]);
      toast.success('Question saved!');
      setForm(EMPTY_FORM);
      clearManualImage();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to save question.');
    } finally { setSaving(false); }
  };

  const handleDeleteSaved = async (id) => {
    try {
      await adminApi.deleteQuestion(id);
      setSavedQuestions(prev => prev.filter(q => q.id !== id));
      toast.success('Question removed.');
    } catch (err) { toast.error('Failed to delete.'); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Preview Modal — rendered via portal at document.body */}
      {showPreview && (
        <PreviewModal
          rows={previewRows}
          imageFiles={imageFiles}
          uploading={uploading}
          onConfirm={doUpload}
          onCancel={() => setShowPreview(false)}
        />
      )}
      {/* Back */}
      <button onClick={() => navigate('/admin/tests')} className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
        <ChevronLeft size={16} /> Back to Tests
      </button>

      {/* Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="text-primary-600" size={24} /> Upload Questions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Test <strong className="text-slate-700 dark:text-slate-300">{testId}</strong> — add questions in bulk via Excel or one-by-one manually.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              >
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* ── EXCEL TAB ── */}
        {tab === 'excel' && (
          <div className="space-y-6">
            {/* Mode selector */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Upload Method</p>
              <div className="grid grid-cols-3 gap-3">
                {MODES.map(m => {
                  const Icon = m.icon; const cc = COLORS[m.color]; const sel = mode === m.id;
                  return (
                    <button key={m.id} type="button" onClick={() => switchMode(m.id)}
                      className={`text-left p-3.5 rounded-2xl border-2 transition-all ${sel ? `border-transparent ring-2 ${cc.ring} ${cc.bg}` : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}
                    >
                      <Icon size={18} className={sel ? cc.icon : 'text-slate-400'} />
                      <p className={`text-xs font-bold mt-2 ${sel ? cc.text : 'text-slate-700 dark:text-slate-300'}`}>{m.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{m.subtitle}</p>
                    </button>
                  );
                })}
              </div>
              <div className={`mt-3 flex items-start gap-2 p-3 rounded-xl text-xs ${c.bg} ${c.text}`}>
                <Info size={13} className="mt-0.5 shrink-0" />{currentMode.description}
              </div>
            </div>

            {/* Format guide */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 rounded-2xl">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-3"><AlertTriangle size={13} className="text-amber-500" /> Required Excel Columns</p>
              <div className="grid grid-cols-4 gap-1.5 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
                {['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer'].map(col => (
                  <div key={col} className="p-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-center">{col}</div>
                ))}
                <div className="p-1.5 border border-violet-200 dark:border-violet-800/50 bg-violet-50 dark:bg-violet-950/20 rounded-lg text-center text-violet-600 dark:text-violet-400 col-span-2">Image (optional)</div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">• Correct Answer = A, B, C or D &nbsp;•&nbsp; Image = filename or https://… URL</p>
            </div>

            {/* Drop zone */}
            <form onSubmit={handleExcelSubmit} className="space-y-4">
              <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragActive ? 'border-primary-500 bg-primary-50/10' : 'border-slate-200 dark:border-slate-800 hover:border-primary-400'}`}
              >
                <input ref={fileInputRef} type="file" className="hidden" accept={currentMode.accept} onChange={handleFileChange} />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    {mode === 'zip' ? <FileArchive size={26} className="text-blue-500" /> : <FileSpreadsheet size={26} className="text-emerald-500" />}
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{file.name}</p>
                      <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB · Click to replace</p>
                    </div>
                    <button type="button" onClick={e => { e.stopPropagation(); setFile(null); setUploadStats(null); }} className="ml-auto text-slate-400 hover:text-red-500"><X size={16} /></button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <UploadCloud size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-semibold text-slate-500">Drag & drop {mode === 'zip' ? 'ZIP archive' : 'Excel file'} here</p>
                    <p className="text-xs text-slate-400">or click to browse</p>
                  </div>
                )}
              </div>

              {/* Separate image picker */}
              {mode === 'separate' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-500">Image Files <span className="font-normal text-slate-400">(optional)</span></p>
                    <button type="button" onClick={() => imgInputRef.current?.click()} className="text-xs font-semibold text-violet-600 hover:underline">+ Add images</button>
                  </div>
                  <input ref={imgInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleImagesChange} />
                  {imageFiles.length === 0 ? (
                    <div onClick={() => imgInputRef.current?.click()} className="border-2 border-dashed border-violet-200 dark:border-violet-900/50 rounded-2xl p-5 text-center cursor-pointer hover:border-violet-400 transition-colors">
                      <ImageIcon size={22} className="mx-auto mb-1 text-violet-300" />
                      <p className="text-xs text-slate-400">Click to pick image files</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 p-3 border border-violet-200/60 dark:border-violet-900/40 rounded-2xl bg-violet-50/40 dark:bg-violet-950/10">
                      {imageFiles.map((f, i) => <FileChip key={i} file={f} onRemove={() => setImageFiles(prev => prev.filter((_, j) => j !== i))} />)}
                      <button type="button" onClick={() => imgInputRef.current?.click()} className="px-3 py-1.5 text-xs font-semibold text-violet-600 border border-dashed border-violet-300 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/20 transition-colors">+ Add more</button>
                    </div>
                  )}
                </div>
              )}

              {/* Success stats */}
              {uploadStats && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-2xl text-sm border border-emerald-200/60 dark:border-emerald-900/40">
                    <CheckCircle size={16} className="shrink-0" />
                    <span><strong>Done!</strong> {uploadStats.count} question(s) saved{uploadStats.imageCount > 0 ? ` · ${uploadStats.imageCount} with images` : ''}.</span>
                  </div>
                  {uploadStats.warnings?.length > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl">
                      <p className="text-xs font-bold text-amber-600 mb-1 flex items-center gap-1"><AlertTriangle size={12} /> {uploadStats.warnings.length} warning(s)</p>
                      {uploadStats.warnings.map((w, i) => <p key={i} className="text-xs text-amber-500">• {w}</p>)}
                    </div>
                  )}
                </div>
              )}

              <button type="submit" disabled={!file || uploading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing…</>
                  : <>{mode === 'zip' ? <><UploadCloud size={15} /> Upload ZIP</> : <><Eye size={15} /> Preview &amp; Upload</>}</>}
              </button>
            </form>
          </div>
        )}

        {/* ── MANUAL TAB ── */}
        {tab === 'manual' && (
          <div className="space-y-6">
            <form onSubmit={handleManualSubmit} className="space-y-4">

              {/* Question text */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Question Text *</label>
                <textarea name="question" value={form.question} onChange={handleFormChange} rows={3} placeholder="Type the question here…"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              {/* Options grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {OPTION_LABELS.map(opt => (
                  <div key={opt}>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Option {opt} *</label>
                    <input name={`option${opt}`} value={form[`option${opt}`]} onChange={handleFormChange} placeholder={`Option ${opt}`}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                ))}
              </div>

              {/* Correct Answer */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Correct Answer *</label>
                <div className="flex gap-2">
                  {OPTION_LABELS.map(opt => (
                    <button key={opt} type="button" onClick={() => setForm(f => ({ ...f, correctAnswer: opt }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${form.correctAnswer === opt ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'}`}
                    >{opt}</button>
                  ))}
                </div>
              </div>

              {/* Class (Grade) */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
                  Class / Grade <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input name="class" value={form.class} onChange={handleFormChange} placeholder="e.g. 10th, 12th"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Image upload */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
                  Question Image <span className="font-normal text-slate-400">(optional)</span>
                </label>
                {imgPreview ? (
                  <div className="relative inline-block">
                    <img src={imgPreview} alt="preview" className="h-32 w-auto rounded-xl border border-slate-200 dark:border-slate-700 object-cover" />
                    <button type="button" onClick={clearManualImage}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div onClick={() => manualImgRef.current?.click()}
                    className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-violet-400 transition-colors"
                  >
                    <ImageIcon size={18} className="text-slate-300 dark:text-slate-600" />
                    <p className="text-xs text-slate-400">Click to attach an image (JPEG, PNG, WebP…)</p>
                  </div>
                )}
                <input ref={manualImgRef} type="file" className="hidden" accept="image/*" onChange={handleManualImage} />
              </div>

              <button type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary-600/25 transition-all disabled:opacity-50"
              >
                {saving
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                  : <><PlusCircle size={15} /> Save Question</>}
              </button>
            </form>

            {/* Saved questions list */}
            {savedQuestions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Added This Session ({savedQuestions.length})</p>
                  <button onClick={() => navigate('/admin/tests')} className="text-xs font-semibold text-primary-600 hover:underline">Done → Go to Tests</button>
                </div>
                {savedQuestions.map((q, i) => <QuestionCard key={q.id} q={q} index={i} onDelete={handleDeleteSaved} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadQuestions;
