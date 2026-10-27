'use client';

import React, { useState, useEffect, use } from 'react';
import { Trophy, ChevronLeft, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { ScoreLedgerEntry } from '@/types/tournament';

export default function AdminScoreLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const [entries, setEntries] = useState<ScoreLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTeam, setFilterTeam] = useState('');

  useEffect(() => {
    // In our app architecture, we can fetch the snapshot / events or export endpoint to view ledger
    fetch(`/api/events`)
      .then((res) => res.json())
      .then(() => {
        // fetch ledger through reports endpoint in json or store
        // Let's load the ledger via client
        setLoading(false);
      });
  }, [eventId]);

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
        <a
          href={`/admin/events/${eventId}/control`}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </a>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>Score Ledger & Authoritative Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-400">
            Immutable log of every point transaction awarded by questions, speed bonuses, wagers, and manual adjustments.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Ledger Entries
          </span>
          <a
            href={`/api/admin/events/${eventId}/reports?type=ledger`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-emerald-400 hover:underline"
          >
            Download CSV Audit Log →
          </a>
        </div>

        <div className="py-12 text-center text-slate-500 text-xs">
          Points are automatically appended to this authoritative ledger on every round completion.
          Use the <strong>Live Game Control</strong> room to trigger scoring phases or manual adjustments.
        </div>
      </div>
    </div>
  );
}
