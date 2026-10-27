'use client';

import React, { useState, useEffect, use } from 'react';
import {
  HelpCircle,
  ChevronLeft,
  Download,
  Upload,
  Plus,
  Code,
  CheckCircle,
  Tag,
} from 'lucide-react';
import { CodeViewer } from '@/components/common/CodeViewer';
import { Question } from '@/types/tournament';

export default function AdminQuestionsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQ, setSelectedQ] = useState<Question | null>(null);

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/questions`);
      const data = await res.json();
      if (data.success && data.questions) {
        setQuestions(data.questions);
        if (!selectedQ && data.questions.length > 0) {
          setSelectedQ(data.questions[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [eventId]);

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(questions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `c_arena_questions_${eventId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B14] flex items-center justify-center text-slate-400 font-mono">
        Loading question bank...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <a
            href={`/admin/events/${eventId}/control`}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-emerald-400" />
              <span>Question Bank & Curriculum Packs</span>
            </h1>
            <p className="text-xs text-slate-400">
              Curated BCA First Year C programming questions spanning all 5 tournament rounds.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportJSON}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center space-x-2"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>EXPORT JSON PACK</span>
          </button>
        </div>
      </div>

      {/* Main split */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left (5 cols): Questions List */}
        <div className="md:col-span-5 space-y-2 max-h-[75vh] overflow-y-auto pr-1">
          {questions.map((q) => {
            const isSelected = selectedQ?.id === q.id;
            return (
              <div
                key={q.id}
                onClick={() => setSelectedQ(q)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-900 border-emerald-400 ring-1 ring-emerald-400 shadow-[0_0_15px_rgba(0,245,160,0.1)]'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                    ROUND {q.round} • {q.type}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {q.basePoints} PTS
                  </span>
                </div>
                <h3 className="font-bold text-sm text-white mt-1.5">{q.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-1 mt-1">{q.description}</p>
              </div>
            );
          })}
        </div>

        {/* Right (7 cols): Selected Question Inspection */}
        <div className="md:col-span-7">
          {selectedQ ? (
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 uppercase">
                    ROUND {selectedQ.round}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Time Limit: {selectedQ.timeLimitSeconds}s
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Base: {selectedQ.basePoints} PTS
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white">{selectedQ.title}</h2>
                <p className="text-xs text-slate-300 mt-1">{selectedQ.description}</p>
              </div>

              {/* Code viewer */}
              {selectedQ.codeSnippet && <CodeViewer code={selectedQ.codeSnippet} />}

              {/* Options */}
              {selectedQ.options && selectedQ.options.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Answer Options
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedQ.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border text-xs font-mono flex items-center space-x-2 ${
                          selectedQ.correctAnswer === opt.id
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center font-bold text-[10px]">
                          {opt.label}
                        </span>
                        <span>{opt.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correct Answer & Solution */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                <div className="text-emerald-400 font-bold flex items-center space-x-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>Correct Answer: {selectedQ.correctAnswer}</span>
                </div>
                <p className="text-slate-300 leading-relaxed font-sans">{selectedQ.explanation}</p>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-500 text-xs">
              Select a question to view full details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
