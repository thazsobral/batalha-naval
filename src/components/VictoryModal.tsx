import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Skull, RotateCcw, Eye, ArrowLeft, Target } from 'lucide-react';
import { AttackRecord, PlacedShip } from '../types/game';

interface VictoryModalProps {
  isWinner: boolean;
  winnerName: string;
  myAttacks: AttackRecord[];
  opponentAttacks: AttackRecord[];
  onRematch: () => void;
  onExit: () => void;
  onInspectBoard: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isWinner,
  winnerName,
  myAttacks,
  opponentAttacks,
  onRematch,
  onExit,
  onInspectBoard,
}) => {
  useEffect(() => {
    if (isWinner) {
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#10b981', '#3b82f6', '#f59e0b'],
        });
      } catch {
        // ignore
      }
    }
  }, [isWinner]);

  const totalShots = myAttacks.length;
  const hits = myAttacks.filter((a) => a.result === 'hit').length;
  const accuracy = totalShots > 0 ? Math.round((hits / totalShots) * 100) : 0;
  const shipsSunk = myAttacks.filter((a) => a.sunkShipName).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)] text-center">
        {/* Crown or Skull Badge */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 mx-auto border-2 shadow-lg">
          {isWinner ? (
            <div className="w-full h-full rounded-full bg-emerald-950/80 border-emerald-400 flex items-center justify-center text-emerald-400">
              <Trophy className="w-10 h-10 animate-bounce" />
            </div>
          ) : (
            <div className="w-full h-full rounded-full bg-red-950/80 border-red-500 flex items-center justify-center text-red-400">
              <Skull className="w-10 h-10 animate-pulse" />
            </div>
          )}
        </div>

        {/* Headline */}
        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-slate-100">
          {isWinner ? 'Vitória Naval!' : 'Derrota em Combate'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          {isWinner
            ? 'Você destruiu todas as 5 embarcações da frota inimiga!'
            : `${winnerName} conquistou o controle das águas territoriais.`}
        </p>

        {/* Match Statistics */}
        <div className="grid grid-cols-3 gap-2 my-5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200">
          <div>
            <div className="text-[10px] text-slate-400 font-mono uppercase">Disparos</div>
            <div className="text-lg font-bold text-cyan-400 font-mono">{totalShots}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-mono uppercase">Precisão</div>
            <div className="text-lg font-bold text-emerald-400 font-mono">{accuracy}%</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-mono uppercase">Afundados</div>
            <div className="text-lg font-bold text-amber-400 font-mono">{shipsSunk}/5</div>
          </div>
        </div>

        {/* Opponent Fleet Reveal Notice */}
        <div className="text-xs text-cyan-300/90 bg-cyan-950/40 p-2.5 rounded-lg border border-cyan-800/60 mb-5 flex items-center justify-center gap-1.5">
          <Eye className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Todas as embarcações secretas do oponente agora estão visíveis no radar!</span>
        </div>

        {/* Buttons */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={onInspectBoard}
            className="w-full py-2.5 px-4 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/60 text-cyan-300 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition"
          >
            <Eye className="w-4 h-4" />
            <span>Inspecionar Campo de Batalha Revelado</span>
          </button>

          <button
            type="button"
            onClick={onRematch}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Jogar Novamente / Revanche</span>
          </button>

          <button
            type="button"
            onClick={onExit}
            className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Menu Inicial</span>
          </button>
        </div>
      </div>
    </div>
  );
};
