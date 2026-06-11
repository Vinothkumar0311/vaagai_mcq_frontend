import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { examinerApi } from '../../services/api';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { AlertCircle, ShieldAlert, Award, Clock, ArrowRight, ArrowLeft, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../../components/ConfirmModal';

export const MCQTest = () => {
  const { id } = useParams(); // Test ID
  const navigate = useNavigate();
  const { user } = useAuth();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { questionId: 'A' | 'B' | 'C' | 'D' }
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [textSize, setTextSize] = useState('large'); // 'normal', 'large', 'xl'
  const [zoomImage, setZoomImage] = useState(false);
  const [fullscreenCountdown, setFullscreenCountdown] = useState(20);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Store shuffled option mappings stably per question
  // { [questionId]: [{ key: 'A', text: '...', originalKey: 'A' }, ...] }
  const [shuffledOptionsMap, setShuffledOptionsMap] = useState({});

  const timerRef = useRef(null);
  const isSubmittingRef = useRef(false); // prevent double submission on auto-submit

  // 1. Fetch questions on mount
  useEffect(() => {
    const fetchTest = async () => {
      try {
        const data = await examinerApi.getTestQuestions(id, user.email);
        setTest(data);
        setQuestions(data.questions || []);
        setTimeLeft(data.duration * 60);

        // Store options in original order (A, B, C, D) without shuffling
        const optionsMap = {};
        data.questions.forEach(q => {
          optionsMap[q.id] = [
            { label: 'A', text: q.optionA },
            { label: 'B', text: q.optionB },
            { label: 'C', text: q.optionC },
            { label: 'D', text: q.optionD }
          ];
        });
        setShuffledOptionsMap(optionsMap);

      } catch (err) {
        toast.error(err.message || 'Failed to initialize assessment session.');
        navigate('/examiner/tests');
      } finally {
        setLoading(false);
      }
    };
    if (user?.email) {
      fetchTest();
    }
  }, [id, user, navigate]);

  // 2. Fullscreen Change Handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      const activeFullscreen = !!document.fullscreenElement;
      setIsFullscreen(activeFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Exit fullscreen if window is blurred (switching tabs, using Windows key, clicking outside browser)
  useEffect(() => {
    if (!started || submitting) return;

    const handleBlur = () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.error('Failed to exit fullscreen on blur:', err));
      }
    };

    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, [started, submitting]);

  // 20-second grace period timer for returning to fullscreen mode
  useEffect(() => {
    let intervalId = null;

    if (started && !isFullscreen && !submitting) {
      setFullscreenCountdown(20);
      
      intervalId = setInterval(() => {
        setFullscreenCountdown(prev => {
          if (prev <= 1) {
            clearInterval(intervalId);
            toast.error('Security violation: Failed to return to fullscreen. Test submitted with 0 marks.', {
              duration: 10000,
              icon: '🚨'
            });
            // Use a flag on window to prevent duplicate submissions from this effect
            if (!window._mcqSecuritySubmitting) {
              window._mcqSecuritySubmitting = true;
              submitExamAnswers(true).finally(() => {
                window._mcqSecuritySubmitting = false;
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

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [started, isFullscreen, submitting]);

  // Block shortcut keys (ALT, CTRL, WINDOWS, Print screen, Shift) and right click
  useEffect(() => {
    if (!started) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (zoomImage) {
          e.preventDefault();
          e.stopPropagation();
          setZoomImage(false);
        }
        return;
      }

      const blockedKeys = ['Alt', 'Control', 'Meta', 'Shift', 'PrintScreen', 'Snapshot', 'F12'];
      
      if (
        e.altKey || 
        e.ctrlKey || 
        e.metaKey || 
        e.shiftKey || 
        blockedKeys.includes(e.key)
      ) {
        e.preventDefault();
        e.stopPropagation();
        toast.error('Shortcut keys (Alt, Ctrl, Shift, Windows, Print Screen) are disabled during this assessment!', {
          id: 'security-key-warning'
        });
        return false;
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'PrintScreen' || e.key === 'Snapshot') {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard?.writeText?.(''); // clear clipboard
        toast.error('Screenshots are strictly prohibited during the assessment!', {
          id: 'security-screenshot'
        });
        return false;
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      toast.error('Right-click menu is disabled during this assessment!', {
        id: 'security-rightclick'
      });
      return false;
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    window.addEventListener('contextmenu', handleContextMenu, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
    };
  }, [started, zoomImage]);

  // 3. Countdown timer logic
  useEffect(() => {
    if (started && timeLeft > 0 && !submitting) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            autoSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, timeLeft, submitting]);

  // 4. Force fullscreen request on start
  const handleStartExam = async () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      }
      setStarted(true);
      setIsFullscreen(true);
      toast.success('Examination session initiated. Fullscreen locked.');
    } catch (err) {
      console.warn('Fullscreen request rejected', err);
      // Let them proceed even if browser blocks fullscreen request (e.g. mobile Safari sometimes requires tap first)
      setStarted(true);
    }
  };

  // Re-enter Fullscreen request
  const requestReEnterFullscreen = async () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const selectOption = (questionId, optionLabel) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionLabel
    }));
  };

  // Submission handler
  const handleFormSubmit = (e) => {
    if (e) e.preventDefault();
    setShowSubmitConfirm(true);
  };

  // Core Submit routine
  const submitExamAnswers = async (forceZeroScore = false) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSubmitting(true);

    try {
      const formattedAnswers = [];
      if (!forceZeroScore) {
        Object.keys(selectedAnswers).forEach(qId => {
          formattedAnswers.push({
            questionId: qId,
            selectedOption: selectedAnswers[qId]
          });
        });
      }

      // In case some questions were left completely blank, pad them
      questions.forEach(q => {
        if (!selectedAnswers[q.id] || forceZeroScore) {
          formattedAnswers.push({
            questionId: q.id,
            selectedOption: ''
          });
        }
      });

      const totalDurationSec = test?.duration ? test.duration * 60 : 0;
      const timeSpent = totalDurationSec - timeLeft;

      const result = await examinerApi.submitTest(id, formattedAnswers, timeSpent, user.email, forceZeroScore);
      
      // Exit fullscreen safely
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(err => console.error(err));
      }

      if (forceZeroScore) {
        toast.error('Assessment terminated due to security violation. Graded score: 0');
        navigate('/examiner/tests');
      } else {
        if (result.resultsPublished) {
          toast.success('Grading complete. Responses submitted!');
          navigate(`/examiner/result/${result.resultId || result.id || id}`);
        } else {
          toast.success('Assessment submitted successfully! Results are pending publication by the administrator.');
          navigate('/examiner/tests');
        }
      }

    } catch (err) {
      toast.error('Failed to submit exam: ' + err.message);
      isSubmittingRef.current = false;
      setSubmitting(false);
      // If this was a forced security submit, navigate away regardless of error
      if (forceZeroScore) {
        navigate('/examiner/tests');
      }
    }
  };

  // Auto-submit trigger on timeout
  const autoSubmitExam = () => {
    if (isSubmittingRef.current) return;
    toast.error('Time limit exceeded! Auto-submitting answers immediately...', {
      duration: 5000,
      icon: '⏰'
    });
    submitExamAnswers();
  };

  if (loading) {
    return <LoadingSkeleton type="test-taking" />;
  }

  // Formatting minutes/seconds
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Active question and options
  const activeQuestion = questions[currentIdx];
  const activeOptions = shuffledOptionsMap[activeQuestion?.id] || [];
  
  // Progress Bar Details
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const percentComplete = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  const unansweredCount = totalQuestions - answeredCount;

  // Text size classes mapping
  const questionSizeClass = {
    normal: 'text-base sm:text-lg',
    large: 'text-lg sm:text-xl md:text-2xl',
    xl: 'text-xl sm:text-2xl md:text-3xl'
  }[textSize] || 'text-lg sm:text-xl md:text-2xl';

  const choiceTextClass = {
    normal: 'text-xs sm:text-sm',
    large: 'text-sm sm:text-base md:text-lg',
    xl: 'text-base sm:text-lg md:text-xl'
  }[textSize] || 'text-sm sm:text-base md:text-lg';

  const choiceBadgeClass = {
    normal: 'w-6 h-6 text-xs',
    large: 'w-8 h-8 text-sm',
    xl: 'w-9 h-9 text-base'
  }[textSize] || 'w-8 h-8 text-sm';

  return (
    <div className={`mx-auto space-y-6 transition-all duration-350 ${started ? 'max-w-6xl' : 'max-w-3xl'}`}>
      
      {/* 1. START LOBBY BOARD */}
      {!started ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-md text-center max-w-lg mx-auto">
          {questions.length === 0 ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} />
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{test?.name}</h1>
              <p className="text-rose-500 dark:text-rose-400 text-sm mt-3 font-semibold">
                No questions available matching your class level (Class {user?.class || 'Universal'}).
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 leading-relaxed">
                Please contact your test administrator to configure your assigned class standard or questions.
              </p>
              <button
                onClick={() => navigate('/examiner')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold active:scale-98 transition-all mt-8"
              >
                Back to Dashboard
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 flex items-center justify-center mx-auto mb-6">
                <Award size={32} />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{test?.name}</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Ready for evaluation? Please confirm the conditions below.</p>

              <div className="mt-8 border border-slate-100 dark:border-slate-800/40 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-900/50 text-left text-xs text-slate-600 space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0" />
                  <span><strong>Duration:</strong> {test?.duration} minutes absolute limit.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0" />
                  <span><strong>Security:</strong> Fullscreen mode is enforced. Do not leave the active window.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 shrink-0" />
                  <span><strong>Single Take:</strong> Re-takes are locked once initialized.</span>
                </div>
              </div>

              <button
                onClick={handleStartExam}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary-600/25 active:scale-98 transition-all mt-8"
              >
                Start Assessment & Enter Fullscreen
              </button>
            </>
          )}
        </div>
      ) : (
        
        /* 2. ACTIVE TEST WORKSPACE */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Left / Main Workspace Content */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Fullscreen Alert Banner */}
            {!isFullscreen && (
              <div className="flex items-center justify-between p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-405 border-2 border-rose-500 dark:border-rose-900/50 rounded-2xl text-xs shadow-md animate-pulse">
                <div className="flex items-center gap-3">
                  <ShieldAlert size={18} className="shrink-0 text-rose-600 dark:text-rose-400" />
                  <div>
                    <div className="font-bold text-sm text-rose-800 dark:text-rose-400">Security Alert: Fullscreen mode deactivated!</div>
                    <div className="mt-1 text-slate-650 dark:text-slate-400">
                      Please re-enter fullscreen mode immediately. You have{' '}
                      <span className="font-extrabold text-sm text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/50 px-1.5 py-0.5 rounded">
                        {fullscreenCountdown} seconds
                      </span>{' '}
                      remaining, or your test will be terminated and submitted with <strong className="text-rose-650 dark:text-rose-400">0 marks</strong>.
                    </div>
                  </div>
                </div>
                <button
                  onClick={requestReEnterFullscreen}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-600/20 active:scale-98 transition-all shrink-0 ml-4"
                >
                  Re-Enter Fullscreen
                </button>
              </div>
            )}

            {/* Test Title / Progress Header */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex items-center justify-between gap-4">
              <div className="flex-1 col-span-1">
                <h3 className="text-md font-bold text-slate-900 dark:text-white truncate max-w-sm sm:max-w-md">{test?.name}</h3>
                {/* Progress bar */}
                <div className="flex items-center gap-3 mt-2">
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full flex-1 overflow-hidden">
                    <div 
                      className="h-full bg-primary-600 rounded-full transition-all duration-300"
                      style={{ width: `${percentComplete}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                    {answeredCount} / {totalQuestions} Answered
                  </span>
                </div>
              </div>

              {/* Floating Timer Widget */}
              <div className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border font-mono font-bold text-sm shadow-sm ${timeLeft <= 60 ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40 animate-pulse' : 'bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800'}`}>
                <Clock size={16} />
                {formatTime(timeLeft)}
              </div>
            </div>

            {/* Question Display Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-md space-y-6">
              
              {/* Question Counter Tag & Text Size Controls */}
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800/40">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-450">
                  Question {currentIdx + 1} of {totalQuestions}
                </span>

                <div className="flex items-center gap-3">
                  {/* Font Size Adjuster Selector */}
                  <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-850 p-1 rounded-xl border border-slate-200/40 dark:border-slate-700/40">
                    <button
                      type="button"
                      onClick={() => setTextSize('normal')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${textSize === 'normal' ? 'bg-white dark:bg-slate-900 text-primary-600 shadow-sm border border-slate-200/40 dark:border-slate-700/40' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-350'}`}
                      title="Small Text Size"
                    >
                      A
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextSize('large')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${textSize === 'large' ? 'bg-white dark:bg-slate-900 text-primary-600 shadow-sm border border-slate-200/40 dark:border-slate-700/40' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-350'}`}
                      title="Medium Text Size"
                    >
                      A+
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextSize('xl')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${textSize === 'xl' ? 'bg-white dark:bg-slate-900 text-primary-600 shadow-sm border border-slate-200/40 dark:border-slate-700/40' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-350'}`}
                      title="Large Text Size"
                    >
                      A++
                    </button>
                  </div>

                  {selectedAnswers[activeQuestion.id] && (
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-450 border border-emerald-100/50 dark:border-emerald-900/20 rounded-md font-bold">
                      Saved
                    </span>
                  )}
                </div>
              </div>

              {/* Question Text - preserve newlines from Excel */}
              <h2 className={`${questionSizeClass} font-bold text-slate-900 dark:text-white leading-relaxed font-sans`} style={{ whiteSpace: 'pre-wrap' }}>
                {activeQuestion.question}
              </h2>

              {/* Optional Image Support */}
              {activeQuestion.imageUrl && (
                <div className="relative mt-4 overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 max-h-[600px] bg-slate-50/50 flex justify-center group">
                  <img 
                    src={activeQuestion.imageUrl.startsWith('http') ? activeQuestion.imageUrl : `${import.meta.env.VITE_API_BASE_URL || 'https://vaagaimcqbk.vinothvk.in'}${activeQuestion.imageUrl}`} 
                    alt="Question Diagram" 
                    className="object-contain max-h-[600px] w-auto cursor-zoom-in transition-transform duration-200 hover:scale-[1.01]"
                    onClick={() => setZoomImage(true)}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="absolute bottom-3 right-3 bg-slate-900/75 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Click to Zoom
                  </div>
                </div>
              )}

              {/* Choices Options Grid */}
              <div className="grid grid-cols-1 gap-4 pt-4">
                {activeOptions.map((opt) => {
                  const isSelected = selectedAnswers[activeQuestion.id] === opt.label;
                  return (
                    <button
                      key={opt.label}
                      onClick={() => selectOption(activeQuestion.id, opt.label)}
                      className={`flex items-start gap-4 p-4 border rounded-2xl text-left transition-all ${isSelected ? 'border-primary-600 bg-primary-50/30 dark:bg-primary-950/15 text-slate-900 dark:text-white ring-2 ring-primary-600/10' : 'border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'}`}
                    >
                      {/* Circle badge identifier */}
                      <div className={`${choiceBadgeClass} rounded-full flex items-center justify-center font-bold shrink-0 border mt-0.5 ${isSelected ? 'bg-primary-600 border-primary-600 text-white shadow-sm' : 'border-slate-350 dark:border-slate-700 text-slate-500 bg-white dark:bg-slate-900'}`}>
                        {opt.label}
                      </div>
                      <span className={`${choiceTextClass} font-semibold leading-relaxed`}>{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation Controls Bar */}
            <div className="flex items-center justify-between gap-4">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => prev - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-350 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
              >
                <ArrowLeft size={14} /> Previous
              </button>

              {currentIdx < totalQuestions - 1 ? (
                <button
                  onClick={() => setCurrentIdx(prev => prev + 1)}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  Next <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={handleFormSubmit}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-600/20 active:scale-98 transition-all disabled:opacity-50"
                >
                  <Send size={14} /> {submitting ? 'Submitting Answers...' : 'Submit Assessment'}
                </button>
              )}
            </div>

          </div>

          {/* Right Column: Question Palette Sidebar */}
          <div className="lg:col-span-1 sticky top-6 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-md space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800/60 pb-3">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Question Palette</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Quickly select or navigate questions</p>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentIdx;
                  const isAnswered = !!selectedAnswers[q.id];

                  let btnClass = "w-full aspect-square flex items-center justify-center font-mono font-bold text-xs rounded-xl transition-all ";
                  if (isCurrent) {
                    btnClass += "bg-primary-600 text-white shadow-md ring-2 ring-primary-500/20";
                  } else if (isAnswered) {
                    btnClass += "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-450";
                  } else {
                    btnClass += "bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800";
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIdx(idx)}
                      className={btnClass}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Status Indicators Legend */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-primary-600 rounded-md shrink-0" />
                  <span>Current</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800 rounded-md shrink-0" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-md shrink-0" />
                  <span>Pending</span>
                </div>
              </div>

              {/* Submit Button in Sidebar */}
              <div className="pt-2">
                <button
                  onClick={handleFormSubmit}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/10 disabled:opacity-50"
                >
                  <Send size={12} /> Submit Exam
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Lightbox / Zoom Image Modal */}
      {zoomImage && activeQuestion?.imageUrl && (
        <div 
          className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomImage(false)}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full flex flex-col items-center justify-center">
            <button 
              onClick={() => setZoomImage(false)}
              className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 text-white rounded-full px-4 py-2 transition-all text-xs font-bold"
            >
              Close (ESC or Click outside)
            </button>
            <img 
              src={activeQuestion.imageUrl.startsWith('http') ? activeQuestion.imageUrl : `${import.meta.env.VITE_API_BASE_URL || 'https://vaagaimcqbk.vinothvk.in'}${activeQuestion.imageUrl}`} 
              alt="Zoomed Diagram"
              className="object-contain max-w-full max-h-[85vh] rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Confirm Test Submission Modal */}
      <ConfirmModal
        isOpen={showSubmitConfirm}
        title={unansweredCount > 0 ? "Submit Unfinished Exam?" : "Submit Assessment?"}
        message={unansweredCount > 0 
          ? `You have ${unansweredCount} unanswered question(s) left. Are you sure you want to submit the exam for evaluation?`
          : "Are you sure you want to finalize and submit your answers? You will not be able to modify them after submission."
        }
        onConfirm={() => {
          setShowSubmitConfirm(false);
          submitExamAnswers();
        }}
        onCancel={() => setShowSubmitConfirm(false)}
        confirmText="Yes, Submit"
        type={unansweredCount > 0 ? "warning" : "info"}
      />
    </div>
  );
};

export default MCQTest;
