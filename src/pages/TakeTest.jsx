import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { publicApi } from '../services/api';
import { Award, Clock, User, ArrowRight, ArrowLeft, Send, ShieldAlert, AlertCircle, CheckCircle, BookOpen, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const STAGE = { INFO: 'info', NAME: 'name', TEST: 'test', DONE: 'done' };

function generateSessionId() {
  return 'pub_' + Date.now() + '_' + Math.random().toString(36).slice(2);
}

export default function TakeTest() {
  const { id } = useParams();
  const [stage, setStage] = useState(STAGE.INFO);
  const [testInfo, setTestInfo] = useState(null);
  const [name, setName] = useState('');
  const [sessionId] = useState(() => generateSessionId());
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenCountdown, setFullscreenCountdown] = useState(20);
  const [started, setStarted] = useState(false);
  const timerRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const submitAnswersRef = useRef(null); // always holds latest submitAnswers to avoid stale closures

  useEffect(() => {
    publicApi.getTestInfo(id)
      .then(data => { setTestInfo(data); setLoading(false); })
      .catch(err => { setError(err.response?.data?.error || 'Test not found or not available.'); setLoading(false); });
  }, [id]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    if (!started || submitting) return;
    const handleBlur = () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [started, submitting]);

  useEffect(() => {
    let intervalId = null;
    if (started && !isFullscreen && !submitting) {
      setFullscreenCountdown(20);
      intervalId = setInterval(() => {
        setFullscreenCountdown(prev => {
          if (prev <= 1) {
            clearInterval(intervalId);
            // Use ref to get the LATEST submitAnswers — avoids stale closure
            if (!window._pubSecuritySubmitting && submitAnswersRef.current) {
              window._pubSecuritySubmitting = true;
              submitAnswersRef.current(true).finally(() => {
                window._pubSecuritySubmitting = false;
              });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setFullscreenCountdown(20);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [started, isFullscreen, submitting]);

  useEffect(() => {
    if (started && timeLeft > 0 && !submitting) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            // Use ref to get the LATEST submitAnswers — avoids stale closure
            if (submitAnswersRef.current) submitAnswersRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [started, timeLeft, submitting]);

  useEffect(() => {
    if (!started) return;
    const handleKeyDown = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || ['F12', 'PrintScreen'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const handleContextMenu = (e) => e.preventDefault();
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
    };
  }, [started]);

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Please enter your name.'); return; }
    setLoading(true);
    try {
      const data = await publicApi.getTestQuestions(id, sessionId, name.trim());
      setQuestions(data.questions || []);
      setTimeLeft(data.duration * 60);
      setStage(STAGE.TEST);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to load test.';
      if (err.response?.status === 400 && err.response?.data?.result) {
        toast.error('You have already completed this test.');
        setResult(err.response.data.result);
        setStage(STAGE.DONE);
      } else {
        toast.error(msg);
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen();
      setIsFullscreen(true);
    } catch (err) { /* allow if blocked */ }
    setStarted(true);
    toast.success('Assessment started. Fullscreen mode locked.');
  };

  const submitAnswers = async (forceZeroScore = false) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSubmitting(true);
    try {
      const formattedAnswers = [];
      if (!forceZeroScore) {
        Object.keys(selectedAnswers).forEach(qId => {
          formattedAnswers.push({ questionId: qId, selectedOption: selectedAnswers[qId] });
        });
      }
      questions.forEach(q => {
        if (!selectedAnswers[q.id] || forceZeroScore) {
          formattedAnswers.push({ questionId: q.id, selectedOption: '' });
        }
      });
      const totalDurationSec = testInfo?.duration ? testInfo.duration * 60 : 0;
      const timeSpent = totalDurationSec - timeLeft;
      const res = await publicApi.submitTest(id, sessionId, name, formattedAnswers, timeSpent, forceZeroScore);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      setResult(res);
      setStage(STAGE.DONE);
      if (forceZeroScore) {
        toast.error('Test terminated due to security violation.');
      } else {
        toast.success('Assessment submitted successfully!');
      }
    } catch (err) {
      toast.error('Submission failed: ' + (err.response?.data?.error || err.message));
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  // Keep the ref in sync with the latest submitAnswers on every render
  submitAnswersRef.current = submitAnswers;

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const totalQ = questions.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const activeQ = questions[currentIdx];

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading && stage === STAGE.INFO) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent" />
          <p className="text-slate-500 text-sm font-medium">Loading test...</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error && stage !== STAGE.DONE) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-10 max-w-md w-full text-center shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} className="text-rose-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-3">Test Unavailable</h1>
          <p className="text-slate-500 text-sm leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  if (stage === STAGE.DONE) {
    const showDetails = !!result?.resultsPublished && Array.isArray(result?.detailedAnswers) && result.detailedAnswers.length > 0;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className={`bg-white border border-slate-200 rounded-3xl p-6 md:p-10 ${showDetails ? 'max-w-3xl' : 'max-w-md'} w-full text-center shadow-lg transition-all duration-300`}>
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-500" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2 font-sans tracking-tight">
            {result?.resultsPublished ? 'Test Completed!' : 'Submitted!'}
          </h1>
          <p className="text-slate-500 text-sm mb-6">
            Thank you, <strong className="text-slate-900">{result?.name || name}</strong>!
          </p>
          {result?.resultsPublished ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6">
              <p className="text-slate-400 text-xs uppercase tracking-widest mb-2 font-mono font-bold">Your Score</p>
              <p className="text-5xl font-black text-slate-900 font-sans">
                {result.score}
                <span className="text-2xl text-slate-400 font-bold font-sans">/{result.total}</span>
              </p>
              <p className="text-emerald-600 font-bold mt-2 text-lg font-sans">
                {result.total > 0 ? ((result.score / result.total) * 100).toFixed(1) : 0}%
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
              <p className="text-amber-700 text-sm font-semibold">
                Results are pending publication by the administrator.
              </p>
            </div>
          )}

          {showDetails && (
            <div className="text-left mt-8 pt-8 border-t border-slate-200 space-y-6">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
                Response Analysis
              </h3>
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {result.detailedAnswers.map((q, idx) => {
                  const isCorrect = q.selectedOption?.toUpperCase() === q.correctAnswer?.toUpperCase();
                  const optionTexts = {
                    A: q.optionA,
                    B: q.optionB,
                    C: q.optionC,
                    D: q.optionD
                  };
                  return (
                    <div
                      key={q.questionId || idx}
                      className={`border rounded-2xl p-5 md:p-6 space-y-4 ${
                        isCorrect
                          ? 'border-emerald-100 bg-emerald-50/15'
                          : 'border-rose-100 bg-rose-50/15'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-xs font-bold text-slate-400 font-mono">
                          Question {idx + 1}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border ${
                            isCorrect
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}
                        >
                          {isCorrect ? (
                            <>
                              <CheckCircle size={12} /> Correct
                            </>
                          ) : (
                            <>
                              <XCircle size={12} /> {q.selectedOption ? 'Incorrect' : 'Unanswered'}
                            </>
                          )}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 leading-relaxed text-sm md:text-base font-sans">
                        {q.questionText}
                      </h4>

                      {q.imageUrl && (
                        <div className="overflow-hidden rounded-xl border border-slate-100 max-h-[300px] bg-slate-50 flex justify-start">
                          <img
                            src={
                              q.imageUrl.startsWith('http')
                                ? q.imageUrl
                                : `${import.meta.env.VITE_API_BASE_URL || 'https://vaagaimcqbackend-production.up.railway.app'}${q.imageUrl}`
                            }
                            alt="Diagram"
                            className="object-contain max-h-[300px] w-auto"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-2.5 my-3">
                        {[
                          { label: 'A', text: q.optionA },
                          { label: 'B', text: q.optionB },
                          { label: 'C', text: q.optionC },
                          { label: 'D', text: q.optionD },
                        ].map(opt => {
                          const isOptCorrect = opt.label.toUpperCase() === q.correctAnswer?.toUpperCase();
                          const isOptSelected = opt.label.toUpperCase() === q.selectedOption?.toUpperCase();
                          
                          let optStyle = 'border-slate-200 bg-white text-slate-700';
                          let badgeStyle = 'bg-slate-50 text-slate-500 border-slate-200';
                          
                          if (isOptCorrect) {
                            optStyle = 'border-emerald-500 bg-emerald-50/40 text-emerald-950';
                            badgeStyle = 'bg-emerald-500 text-white border-emerald-500';
                          } else if (isOptSelected) {
                            optStyle = 'border-rose-500 bg-rose-50/40 text-rose-950';
                            badgeStyle = 'bg-rose-500 text-white border-rose-500';
                          }
                          
                          return (
                            <div
                              key={opt.label}
                              className={`flex items-start gap-4 p-3 border-2 rounded-2xl text-left transition-all ${optStyle}`}
                            >
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border-2 ${badgeStyle}`}>
                                {opt.label}
                              </div>
                              <span className="text-sm font-medium leading-relaxed pt-0.5">{opt.text}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-1 gap-2 pt-2 text-xs md:text-sm font-sans">
                        <div
                          className={`p-3 rounded-xl border ${
                            isCorrect
                              ? 'bg-emerald-55/40 border-emerald-100/60 text-emerald-800'
                              : 'bg-rose-55/40 border-rose-100/60 text-rose-800'
                          }`}
                        >
                          <span className="font-bold">Your Response: </span>
                          {q.selectedOption ? (
                            <span>
                              <strong>[{q.selectedOption}]</strong> {optionTexts[q.selectedOption]}
                            </span>
                          ) : (
                            <span className="italic font-normal text-slate-500">No option selected</span>
                          )}
                        </div>

                        {!isCorrect && (
                          <div className="p-3 rounded-xl border bg-emerald-55/40 border-emerald-100/60 text-emerald-800">
                            <span className="font-bold">Correct Solution: </span>
                            <span>
                              <strong>[{q.correctAnswer}]</strong> {optionTexts[q.correctAnswer]}
                            </span>
                          </div>
                        )}

                        {q.explanation && (
                          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-750">
                            <span className="font-bold block text-slate-900 mb-1">
                              Explanation:
                            </span>
                            <p className="whitespace-pre-line leading-relaxed">
                              {q.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-slate-400 text-xs mt-6">You may close this window.</p>
        </div>
      </div>
    );
  }

  // ── INFO stage ───────────────────────────────────────────────────────────
  if (stage === STAGE.INFO) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-10 max-w-md w-full text-center shadow-lg">
          <div className="w-20 h-20 rounded-3xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto mb-6">
            <Award size={40} className="text-indigo-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-1">{testInfo?.name}</h1>
          <p className="text-slate-400 text-sm mb-8">Online Assessment</p>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <Clock size={20} className="text-indigo-500 mx-auto mb-2" />
              <p className="text-slate-900 font-bold text-lg">{testInfo?.duration} min</p>
              <p className="text-slate-400 text-xs">Duration</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <BookOpen size={20} className="text-indigo-500 mx-auto mb-2" />
              <p className="text-slate-900 font-bold text-lg">{testInfo?.questionCount}</p>
              <p className="text-slate-400 text-xs">Questions</p>
            </div>
          </div>
          <button
            onClick={() => setStage(STAGE.NAME)}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all active:scale-98"
          >
            Continue to Enter Name <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ── NAME stage ───────────────────────────────────────────────────────────
  if (stage === STAGE.NAME) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-10 max-w-md w-full shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto mb-6">
            <User size={30} className="text-indigo-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-1">Enter Your Name</h2>
          <p className="text-slate-400 text-sm text-center mb-8">Your name will be recorded with your submission</p>
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              autoFocus
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 placeholder-slate-400 rounded-2xl outline-none transition-all text-base font-semibold"
            />
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 space-y-1.5">
              <p>⏱ Duration: <strong className="text-slate-900">{testInfo?.duration} minutes</strong></p>
              <p>📋 Questions: <strong className="text-slate-900">{testInfo?.questionCount}</strong></p>
              <p>🔒 Fullscreen mode will be enforced during the test</p>
              <p>⚠️ Single attempt only — cannot retake once started</p>
            </div>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all active:scale-98"
            >
              {loading ? 'Loading...' : <><Send size={16} /> Start Test</>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Pre-start lobby ──────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-10 max-w-md w-full text-center shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto mb-6">
            <Award size={30} className="text-indigo-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">{testInfo?.name}</h2>
          <p className="text-slate-500 text-sm mb-1">
            Welcome, <strong className="text-slate-900">{name}</strong>!
          </p>
          <p className="text-slate-400 text-xs mb-8">{totalQ} questions · {testInfo?.duration} minutes</p>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs text-slate-500 space-y-2 mb-8">
            <p>• Fullscreen mode is enforced — do not leave the window</p>
            <p>• This is a single-attempt test. You cannot retake once submitted</p>
            <p>• Your timer starts when you click the button below</p>
          </div>
          <button
            onClick={handleStartExam}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all active:scale-98"
          >
            Start Assessment &amp; Enter Fullscreen
          </button>
        </div>
      </div>
    );
  }

  // ── Active test workspace ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">

        {/* Fullscreen warning */}
        {!isFullscreen && (
          <div className="flex items-center justify-between p-4 bg-rose-50 border-2 border-rose-400 rounded-2xl animate-pulse">
            <div className="flex items-center gap-3">
              <ShieldAlert size={20} className="text-rose-500 shrink-0" />
              <div>
                <p className="text-rose-700 font-bold text-sm">Security Alert: Fullscreen deactivated!</p>
                <p className="text-slate-600 text-xs mt-0.5">
                  Return to fullscreen within{' '}
                  <span className="font-black text-rose-600">{fullscreenCountdown}s</span>{' '}
                  or test terminates with 0 marks.
                </p>
              </div>
            </div>
            <button
              onClick={async () => { try { await document.documentElement.requestFullscreen(); } catch (e) {} }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shrink-0 ml-4 transition-all"
            >
              Re-Enter Fullscreen
            </button>
          </div>
        )}

        {/* Header bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex-1">
            <h3 className="text-slate-900 font-bold text-sm truncate">{testInfo?.name}</h3>
            <div className="flex items-center gap-3 mt-2">
              <div className="h-1.5 bg-slate-100 rounded-full flex-1 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${totalQ > 0 ? (answeredCount / totalQ) * 100 : 0}%` }}
                />
              </div>
              <span className="text-slate-500 text-xs font-bold shrink-0">{answeredCount}/{totalQ} Answered</span>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-mono font-bold text-sm border shadow-sm ${timeLeft <= 60 ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
            <Clock size={15} />
            {formatTime(timeLeft)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">

          {/* Main question area */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">

              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Question {currentIdx + 1} of {totalQ}
                </span>
                {selectedAnswers[activeQ?.id] && (
                  <span className="text-xs px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-bold">
                    ✓ Saved
                  </span>
                )}
              </div>

              <h2
                className="text-slate-900 text-xl font-bold leading-relaxed"
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {activeQ?.question}
              </h2>

              {activeQ?.imageUrl && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                  <img
                    src={activeQ.imageUrl.startsWith('http') ? activeQ.imageUrl : `${import.meta.env.VITE_API_BASE_URL || 'https://vaagaimcqbk.vinothvk.in'}${activeQ.imageUrl}`}
                    alt="Question"
                    className="max-w-full max-h-96 object-contain mx-auto"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                {[
                  { label: 'A', text: activeQ?.optionA },
                  { label: 'B', text: activeQ?.optionB },
                  { label: 'C', text: activeQ?.optionC },
                  { label: 'D', text: activeQ?.optionD },
                ].map(opt => {
                  const sel = selectedAnswers[activeQ?.id] === opt.label;
                  return (
                    <button
                      key={opt.label}
                      onClick={() => setSelectedAnswers(prev => ({ ...prev, [activeQ.id]: opt.label }))}
                      className={`flex items-start gap-4 p-4 border-2 rounded-2xl text-left transition-all ${
                        sel
                          ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/15'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border-2 ${
                        sel
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-300 text-slate-500 bg-white'
                      }`}>
                        {opt.label}
                      </div>
                      <span className={`text-base font-medium leading-relaxed ${sel ? 'text-indigo-900' : 'text-slate-700'}`}>
                        {opt.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-4">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(p => p - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all disabled:opacity-40 shadow-sm"
              >
                <ArrowLeft size={14} /> Previous
              </button>
              {currentIdx < totalQ - 1 ? (
                <button
                  onClick={() => setCurrentIdx(p => p + 1)}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Next <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={() => submitAnswers()}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  <Send size={14} /> {submitting ? 'Submitting...' : 'Submit Assessment'}
                </button>
              )}
            </div>
          </div>

          {/* Sidebar palette */}
          <div className="lg:col-span-1 sticky top-6 space-y-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-slate-900 font-bold text-sm">Question Palette</h4>
                <p className="text-slate-400 text-[10px] mt-0.5">Navigate questions</p>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {questions.map((q, idx) => {
                  const isCur = idx === currentIdx;
                  const isAns = !!selectedAnswers[q.id];
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIdx(idx)}
                      className={`w-full aspect-square flex items-center justify-center font-mono font-bold text-xs rounded-xl transition-all ${
                        isCur
                          ? 'bg-indigo-600 text-white ring-2 ring-indigo-500/30'
                          : isAns
                          ? 'bg-emerald-50 border border-emerald-300 text-emerald-700'
                          : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] font-semibold text-slate-500 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-indigo-600 rounded-md shrink-0" />Current
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-emerald-50 border border-emerald-300 rounded-md shrink-0" />Answered
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-slate-50 border border-slate-200 rounded-md shrink-0" />Pending
                </div>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => submitAnswers()}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/15 disabled:opacity-50"
                >
                  <Send size={12} /> Submit Exam
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
