'use client';

import React, { useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-c';

interface CodeViewerProps {
  code: string;
  selectedLine?: number;
  highlightedLine?: number;
  onSelectLine?: (lineNum: number) => void;
  interactiveLines?: boolean;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  code,
  selectedLine,
  highlightedLine,
  onSelectLine,
  interactiveLines = false,
}) => {
  useEffect(() => {
    Prism.highlightAll();
  }, [code]);

  const lines = code.split('\n');

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#060913] shadow-2xl">
      {/* Window bar header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-rose-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="ml-2 text-xs font-mono text-slate-400">solution.c</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          ANSI C99
        </span>
      </div>

      {/* Code and line numbers container */}
      <div className="overflow-x-auto text-sm font-mono">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const lineNum = idx + 1;
              const isSelected = selectedLine === lineNum;
              const isHighlighted = highlightedLine === lineNum;

              let rowBg = 'hover:bg-slate-800/40';
              if (isSelected) rowBg = 'bg-emerald-500/20 border-l-4 border-emerald-400';
              if (isHighlighted) rowBg = 'bg-rose-500/20 border-l-4 border-rose-400';

              return (
                <tr
                  key={lineNum}
                  onClick={() => interactiveLines && onSelectLine && onSelectLine(lineNum)}
                  className={`transition-colors ${rowBg} ${
                    interactiveLines ? 'cursor-pointer' : ''
                  }`}
                >
                  {/* Line Number Column */}
                  <td className="w-12 py-1 px-3 text-right select-none text-slate-500 text-xs border-r border-slate-800/60 font-mono">
                    {lineNum}
                  </td>
                  {/* Code Line Content */}
                  <td className="py-1 px-4 text-slate-200 whitespace-pre font-mono">
                    <code>{line || ' '}</code>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
