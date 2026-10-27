'use client';

import React, { useState } from 'react';
import { Target, Zap, ShieldAlert, Crosshair, Award } from 'lucide-react';
import { motion } from 'framer-motion';

interface BattleshipRadarProps {
  tokensAvailable: number;
  revealedCells: { row: number; col: number; type: 'SHIP' | 'BONUS' | 'EMPTY' }[];
  isCaptain: boolean;
  onAttack?: (row: number, col: number) => Promise<void>;
  readOnly?: boolean;
}

export const BattleshipRadar: React.FC<BattleshipRadarProps> = ({
  tokensAvailable,
  revealedCells,
  isCaptain,
  onAttack,
  readOnly = false,
}) => {
  const [selectedCoord, setSelectedCoord] = useState<{ row: number; col: number } | null>(null);
  const [attacking, setAttacking] = useState(false);

  const isCellRevealed = (r: number, c: number) => {
    return revealedCells.find((cell) => cell.row === r && cell.col === c);
  };

  const handleCellClick = (r: number, c: number) => {
    if (readOnly || !isCaptain) return;
    if (isCellRevealed(r, c)) return;
    setSelectedCoord({ row: r, col: c });
  };

  const handleFire = async () => {
    if (!selectedCoord || !onAttack) return;
    setAttacking(true);
    try {
      await onAttack(selectedCoord.row, selectedCoord.col);
      setSelectedCoord(null);
    } finally {
      setAttacking(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      {/* Radar ambient sweep overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,rgba(0,245,160,0.15)_0,transparent_70%)]" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Crosshair className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white tracking-wide">4×4 ARRAY BATTLESHIP</h3>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            matrix[4][4] Memory Coordinate Strike
          </p>
        </div>

        {/* Tokens pill */}
        <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full">
          <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-300">
            Attack Tokens: <span className="font-bold text-emerald-400 text-sm">{tokensAvailable}</span>
          </span>
        </div>
      </div>

      {/* Grid container with 2D array matrix indices */}
      <div className="flex justify-center mb-6">
        <div className="inline-block">
          {/* Column Indices */}
          <div className="flex pl-10 mb-2">
            {[0, 1, 2, 3].map((c) => (
              <div key={c} className="w-16 text-center text-xs font-mono font-bold text-slate-400">
                col [{c}]
              </div>
            ))}
          </div>

          {/* Rows */}
          {[0, 1, 2, 3].map((r) => (
            <div key={r} className="flex items-center mb-2">
              {/* Row Index Label */}
              <div className="w-10 text-right pr-3 text-xs font-mono font-bold text-slate-400">
                [{r}]
              </div>

              {/* Grid cells */}
              <div className="flex space-x-2">
                {[0, 1, 2, 3].map((c) => {
                  const revealed = isCellRevealed(r, c);
                  const isSelected = selectedCoord?.row === r && selectedCoord?.col === c;

                  let cellClass = 'bg-slate-800/80 border-slate-700 hover:border-emerald-400 hover:bg-slate-800';
                  if (isSelected) {
                    cellClass = 'border-2 border-emerald-400 bg-emerald-500/20 shadow-[0_0_15px_rgba(0,245,160,0.5)]';
                  }

                  if (revealed) {
                    if (revealed.type === 'SHIP') {
                      cellClass = 'bg-rose-500/20 border-rose-500/80 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]';
                    } else if (revealed.type === 'BONUS') {
                      cellClass = 'bg-amber-500/20 border-amber-500/80 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]';
                    } else {
                      cellClass = 'bg-slate-950/80 border-slate-800 text-slate-500';
                    }
                  }

                  return (
                    <motion.button
                      key={c}
                      whileHover={!revealed && !readOnly ? { scale: 1.05 } : {}}
                      whileTap={!revealed && !readOnly ? { scale: 0.95 } : {}}
                      onClick={() => handleCellClick(r, c)}
                      disabled={readOnly || !!revealed || !isCaptain}
                      className={`w-16 h-16 rounded-xl border flex flex-col items-center justify-center transition-all relative ${cellClass}`}
                    >
                      {revealed ? (
                        revealed.type === 'SHIP' ? (
                          <>
                            <ShieldAlert className="w-6 h-6 text-rose-400 mb-0.5" />
                            <span className="text-[10px] font-bold text-rose-300">+100</span>
                          </>
                        ) : revealed.type === 'BONUS' ? (
                          <>
                            <Award className="w-6 h-6 text-amber-400 mb-0.5" />
                            <span className="text-[10px] font-bold text-amber-300">+50</span>
                          </>
                        ) : (
                          <span className="text-xs font-mono text-slate-600">MISS</span>
                        )
                      ) : isSelected ? (
                        <Crosshair className="w-6 h-6 text-emerald-400 animate-spin" />
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500 select-none">
                          [{r}][{c}]
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      {!readOnly && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            {selectedCoord ? (
              <span>
                Target Selected: <strong className="text-emerald-400 font-mono">[{selectedCoord.row}][{selectedCoord.col}]</strong>
              </span>
            ) : isCaptain ? (
              <span>Click any unrevealed cell above to target.</span>
            ) : (
              <span>Team Captain controls radar targeting.</span>
            )}
          </div>

          {isCaptain && selectedCoord && (
            <button
              onClick={handleFire}
              disabled={attacking || tokensAvailable <= 0}
              className="px-6 py-2.5 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              <Target className="w-4 h-4" />
              <span>{attacking ? 'TARGETING...' : 'FIRE RADAR STRIKE (1 TOKEN)'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
