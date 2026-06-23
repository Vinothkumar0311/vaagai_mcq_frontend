import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { examinerApi } from "../../services/api";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import {
  Award,
  CheckCircle,
  XCircle,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

export const Result = () => {
  const { id } = useParams(); // Result ID or Test ID
  const { user } = useAuth();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const data = await examinerApi.getResultDetails(id, user.email);
        setResult(data);
      } catch (err) {
        const msg =
          err.response?.data?.error ||
          err.message ||
          "Failed to load graded scorecard.";
        setErrorMsg(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };
    if (user?.email) {
      fetchResult();
    }
  }, [id, user]);

  if (loading) {
    return <LoadingSkeleton type="test-taking" />;
  }

  if (!result) {
    const isUnpublished = errorMsg.toLowerCase().includes("publish");
    return (
      <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md mx-auto px-6">
        <AlertCircle className="mx-auto text-rose-500 mb-2" size={36} />
        <h3 className="font-bold text-slate-700 dark:text-slate-350">
          {isUnpublished ? "Results Unpublished" : "Result Not Found"}
        </h3>
        <p className="text-slate-450 dark:text-slate-500 text-sm mt-1 mb-6">
          {errorMsg || "Grader scorecard was not created or access was denied."}
        </p>
        <Link
          to="/examiner/tests"
          className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs transition-colors"
        >
          Back to My Assessments
        </Link>
      </div>
    );
  }

  const percent = (result.score / result.total) * 100;
  const passed = percent >= 50;

  // Grade feedback text
  let feedbackTitle = "Keep Practicing!";
  let feedbackDesc =
    "Review the incorrect questions below to improve your understanding of the concepts.";

  if (percent >= 90) {
    feedbackTitle = "Outstanding Performance!";
    feedbackDesc =
      "You have demonstrated absolute mastery over these assessment subjects. Excellent job!";
  } else if (percent >= 70) {
    feedbackTitle = "Great Effort!";
    feedbackDesc =
      "You scored well on this assessment. Minor review of concepts will get you to perfection.";
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Back button */}
      <Link
        to="/examiner/tests"
        className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Assessments
      </Link>

      {/* Graded scorecard header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-md text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
          <Award size={32} />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/40 dark:border-slate-700/40 rounded-md uppercase">
            {result.testId}
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {result.testName}
          </h1>
          <p className="text-slate-450 dark:text-slate-500 text-xs">
            Evaluated on {new Date(result.submittedAt).toLocaleString()}
          </p>
        </div>

        {/* Big circular score widget */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-6 py-4">
          <div className="flex items-baseline gap-1 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 px-6 py-4 rounded-3xl shadow-inner">
            <span className="text-4xl font-extrabold text-slate-800 dark:text-white">
              {result.score}
            </span>
            <span className="text-slate-400 text-sm">/ {result.total}</span>
            <span className="text-xs text-slate-450 font-bold ml-2">
              Questions
            </span>
          </div>

          <div
            className={`px-6 py-4 rounded-3xl border font-bold text-lg shadow-sm ${passed ? "bg-emerald-50 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30" : "bg-rose-50 dark:bg-rose-950/10 text-rose-600 dark:text-rose-450 border-rose-100 dark:border-rose-900/30"}`}
          >
            {percent.toFixed(0)}% Score
          </div>
        </div>

        <div className="max-w-md mx-auto pt-2">
          <h3 className="font-bold text-slate-800 dark:text-slate-200">
            {feedbackTitle}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {feedbackDesc}
          </p>
        </div>
      </div>

      {/* Response analysis / Question breakdown */}
      {result.questions && result.questions.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white font-sans tracking-tight">
            Grader Response Analysis
          </h3>

          <div className="space-y-6">
            {result.questions.map((q, idx) => {
              // Find matching selected answer
              const answerObj = result.answers?.find(
                (a) => a.questionId === q.id,
              );
              const selectedOption = answerObj?.selectedOption || "";
              const isCorrect =
                selectedOption.toUpperCase() === q.correctAnswer.toUpperCase();

              // Get option texts
              const optionTexts = {
                A: q.optionA,
                B: q.optionB,
                C: q.optionC,
                D: q.optionD,
              };

              return (
                <div
                  key={q.id}
                  className={`bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm space-y-4 ${isCorrect ? "border-emerald-200 dark:border-emerald-950/40 bg-emerald-50/10 dark:bg-emerald-950/5" : "border-rose-200 dark:border-rose-950/40 bg-rose-50/10 dark:bg-rose-950/5"}`}
                >
                  {/* Question Title & Grader Pill */}
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-xs font-bold text-slate-400 shrink-0 mt-0.5">
                      Question {idx + 1}
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0 ${isCorrect ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20" : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/20"}`}
                    >
                      {isCorrect ? (
                        <CheckCircle size={12} />
                      ) : (
                        <XCircle size={12} />
                      )}
                      {isCorrect
                        ? "Correct"
                        : selectedOption === ""
                          ? "Unanswered"
                          : "Incorrect"}
                    </span>
                  </div>

                  {/* Question Text */}
                  <h4 className="font-bold text-slate-900 dark:text-white leading-relaxed text-base font-sans">
                    {q.question}
                  </h4>

                  {/* Optional Diagram image */}
                  {q.imageUrl && (
                    <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 max-h-[500px] bg-slate-50/50 flex justify-start">
                      <img
                        src={
                          q.imageUrl.startsWith("http")
                            ? q.imageUrl
                            : `${import.meta.env.VITE_API_BASE_URL || "https://vaagaimcqbk.vinothvk.in"}${q.imageUrl}`
                        }
                        alt="Diagram"
                        className="object-contain max-h-[500px] w-auto"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                  )}

                  {/* Answer Analysis Highlights */}
                  <div className="grid grid-cols-1 gap-2 pt-2 text-sm">
                    {/* User Selection */}
                    <div
                      className={`p-3 rounded-xl border ${isCorrect ? "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/20 text-emerald-800 dark:text-emerald-350" : "bg-rose-50/40 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20 text-rose-800 dark:text-rose-350"}`}
                    >
                      <span className="font-bold">Your Response: </span>
                      {selectedOption ? (
                        <span>
                          <strong>[{selectedOption}]</strong>{" "}
                          {optionTexts[selectedOption]}
                        </span>
                      ) : (
                        <span className="italic font-normal">
                          No option selected
                        </span>
                      )}
                    </div>

                    {/* Correct answer display if they were wrong */}
                    {!isCorrect && (
                      <div className="p-3 rounded-xl border bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/20 text-emerald-800 dark:text-emerald-350">
                        <span className="font-bold">Correct Solution: </span>
                        <span>
                          <strong>[{q.correctAnswer}]</strong>{" "}
                          {optionTexts[q.correctAnswer]}
                        </span>
                      </div>
                    )}

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/60 text-slate-650 dark:text-slate-350">
                        <span className="font-bold block text-slate-850 dark:text-slate-250 mb-1">
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
    </div>
  );
};

export default Result;
