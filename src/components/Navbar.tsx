import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { soundController } from '../lib/audio';
import {
  Volume2,
  VolumeX,
  Share2,
  Copy,
  Check,
  Anchor,
  LogIn,
  LogOut,
  Users,
} from 'lucide-react';

interface NavbarProps {
  user: User | null;
  roomCode?: string;
  onLogin: () => void;
  onLogout: () => void;
  onBackToMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  roomCode,
  onLogin,
  onLogout,
  onBackToMenu,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(soundController.enabled);
  const [copied, setCopied] = useState(false);

  const toggleSound = () => {
    const next = soundController.toggle();
    setSoundEnabled(next);
    if (next) soundController.playRadarBlip();
  };

  const copyRoomLink = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      soundController.playClick();
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <header className="w-full bg-slate-950/80 backdrop-blur-md border-b border-cyan-900/50 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand / Title */}
        <div
          onClick={onBackToMenu}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 group-hover:border-cyan-400 transition shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Anchor className="w-5 h-5 text-cyan-400 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-widest text-slate-100 uppercase flex items-center gap-1.5">
              <span>Batalha Naval</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                100% ONLINE
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider hidden sm:block">
              SISTEMA DE RADAR TÁTICO MULTIPLAYER
            </p>
          </div>
        </div>

        {/* Room Code Share (if inside a room) */}
        {roomCode && (
          <div className="flex items-center gap-2 bg-slate-900/90 border border-cyan-500/40 px-3 py-1.5 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <div className="flex flex-col text-left">
              <span className="text-[9px] text-slate-400 uppercase font-mono leading-none">
                Código da Sala
              </span>
              <span className="text-xs sm:text-sm font-black font-mono text-cyan-300 tracking-wider">
                {roomCode}
              </span>
            </div>

            <button
              type="button"
              onClick={copyRoomLink}
              title="Copiar link da sala"
              className="p-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 transition flex items-center gap-1 text-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] text-emerald-400 hidden sm:inline">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[10px] hidden sm:inline">Copiar Link</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* User and Audio controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Audio toggle */}
          <button
            type="button"
            onClick={toggleSound}
            title={soundEnabled ? 'Silenciar Áudio' : 'Ativar Efeitos Sonoros'}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 transition"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* User Sign In / Profile */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Jogador'}
                  className="w-7 h-7 rounded-full border border-cyan-400/60"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-400 text-cyan-300 text-xs flex items-center justify-center font-bold">
                  {(user.displayName || 'J')[0].toUpperCase()}
                </div>
              )}
              <span className="text-xs font-semibold text-slate-200 hidden md:inline truncate max-w-[120px]">
                {user.displayName || 'Jogador'}
              </span>
              <button
                type="button"
                onClick={onLogout}
                title="Desconectar"
                className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/60 text-xs font-bold text-cyan-300 transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar com Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
