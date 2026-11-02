import React from 'react';
import { Sparkles, User, Shield, Database, Award } from 'lucide-react';
import { Voter } from '../types';

interface NavbarProps {
  currentVoter: Voter | null;
  totalPhotos: number;
  votedCount: number;
  isAdmin: boolean;
  isSupabaseLive: boolean;
  onOpenVoterModal: () => void;
  onOpenSupabaseModal: () => void;
  onToggleAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentVoter,
  totalPhotos,
  votedCount,
  isAdmin,
  isSupabaseLive,
  onOpenVoterModal,
  onOpenSupabaseModal,
  onToggleAdmin,
}) => {
  const percentVoted = totalPhotos > 0 ? Math.round((votedCount / totalPhotos) * 100) : 0;

  return (
    <header className="sticky top-0 z-40 bg-space-950/80 backdrop-blur-md border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { if (window.location.hash) window.location.hash = ''; }}>
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-astro-cyan/20 to-astro-purple/30 border border-astro-cyan/40 shadow-glow-cyan">
              <Sparkles className="w-6 h-6 text-astro-cyan animate-pulse" />
              <div className="absolute -inset-0.5 rounded-xl bg-astro-cyan/20 blur-sm -z-10" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-xl tracking-wide bg-gradient-to-r from-white via-slate-200 to-astro-cyan bg-clip-text text-transparent">
                  Astro-Kalender
                </span>
                <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full bg-astro-cyan/10 text-astro-cyan border border-astro-cyan/30">
                  Voting
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Wähle die besten Astrofotos für das Jahr
              </p>
            </div>
          </div>

          {/* Voting Progress in Header */}
          <div className="hidden md:flex flex-col items-center gap-1.5 w-64">
            <div className="flex items-center justify-between w-full text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-astro-cyan" />
                Fortschritt
              </span>
              <span className="text-astro-cyan font-semibold">
                {votedCount} / {totalPhotos} bewertet ({percentVoted}%)
              </span>
            </div>
            <div className="w-full h-2 bg-space-800 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-astro-cyan via-astro-blue to-astro-lime rounded-full transition-all duration-500 ease-out"
                style={{ width: `${percentVoted}%` }}
              />
            </div>
          </div>

          {/* Actions & Voter Badge */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Supabase status badge */}
            <button
              onClick={onOpenSupabaseModal}
              title={isSupabaseLive ? "Supabase verbunden" : "Demo-Modus aktiv. Klicke zur Konfiguration von Supabase"}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors border ${isSupabaseLive
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                : "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
                }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{isSupabaseLive ? "Supabase Live" : "Demo Modus"}</span>
            </button>

            {/* Voter identification badge */}
            <button
              onClick={onOpenVoterModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-space-850 hover:bg-space-800 border border-white/10 hover:border-white/20 text-xs text-slate-200 transition-all shadow-sm group"
            >
              <div className="w-6 h-6 rounded-full bg-astro-cyan/20 flex items-center justify-center text-astro-cyan">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-[10px] text-slate-400 leading-tight">Wähler</div>
                <div className="font-medium text-slate-100 max-w-[120px] truncate">
                  {currentVoter ? currentVoter.name : 'Nicht angemeldet'}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Progress Bar */}
        <div className="md:hidden pb-3">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>Fortschritt: {votedCount} von {totalPhotos}</span>
            <span className="text-astro-cyan">{percentVoted}%</span>
          </div>
          <div className="w-full h-1.5 bg-space-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-astro-cyan to-astro-lime rounded-full transition-all duration-300"
              style={{ width: `${percentVoted}%` }}
            />
          </div>
        </div>

      </div>
    </header>
  );
};

