'use client';

import React, { useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-c';

export function CodeBlock({ code }: { code: string }) {
  useEffect(() => {
    Prism.highlightAll();
  }, [code]);

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-800 bg-[#060913] shadow-xl my-3 text-left">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-400 font-mono">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          <span className="ml-1 text-[11px] text-slate-400">program.c</span>
        </div>
        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
          ANSI C
        </span>
      </div>
      <pre className="p-4 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed text-slate-200">
        <code className="language-c">{code}</code>
      </pre>
    </div>
  );
}
