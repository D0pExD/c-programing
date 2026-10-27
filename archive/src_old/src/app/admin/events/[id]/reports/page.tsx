'use client';

import React, { use } from 'react';
import {
  FileSpreadsheet,
  Download,
  Users,
  Trophy,
  HelpCircle,
  Clock,
  ChevronLeft,
} from 'lucide-react';

export default function AdminReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const reports = [
    {
      type: 'attendance',
      title: 'Student Attendance Register',
      description: 'Full roster of participants with university roll numbers, names, teams, and join timestamps.',
      icon: Users,
    },
    {
      type: 'teams',
      title: 'Team Composition & Captains',
      description: 'Team names, color identifiers, active captain names, member counts, and current standing.',
      icon: Users,
    },
    {
      type: 'leaderboard',
      title: 'Tournament Final Standings',
      description: 'Official ranking with tie-break metrics: total points, correct answers, and cumulative speed.',
      icon: Trophy,
    },
    {
      type: 'ledger',
      title: 'Detailed Score Ledger',
      description: 'Immutable audit trail of all score transactions, speed bonuses, wagers, and manual adjustments.',
      icon: Clock,
    },
    {
      type: 'questions',
      title: 'Question Bank & Specifications',
      description: 'Complete round-by-round breakdown of questions, types, base points, and speed bonuses.',
      icon: HelpCircle,
    },
  ];

  const handleDownload = (type: string) => {
    window.open(`/api/admin/events/${eventId}/reports?type=${type}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3 pb-6 border-b border-slate-800">
        <a
          href={`/admin/events/${eventId}/control`}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </a>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            <span>Tournament Data Reports & CSV Exports</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative CSV exports ready for university academic grading and grading archiving.
          </p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.type}
              className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-4 shadow-xl"
            >
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{r.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{r.description}</p>
                </div>
              </div>

              <button
                onClick={() => handleDownload(r.type)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow"
              >
                <Download className="w-4 h-4" />
                <span>EXPORT CSV</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
