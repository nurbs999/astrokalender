import React from 'react';
import { Sparkles, User, Database, Award, AlertCircle, ArrowRight, LogOut, CalendarDays } from 'lucide-react';
import { Voter, MONTH_NAMES, MONTH_SHORT_NAMES } from '../types';

interface NavbarProps {
  currentVoter: Voter | null;
  totalPhotos: number;
  votedCount: number;
  selectedMonths: number[];
  duplicateMonths?: number[];
  isSupabaseLive: boolean;
  onOpenVoterModal: () => void;
  onOpenSupabaseModal: () => void;
  onOpenVerificationModal: () => void;
  onOpenCalendarModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentVoter,
  selectedMonths,
  duplicateMonths = [],
  onOpenVoterModal,
  onOpenVerificationModal,
  onOpenCalendarModal,
  onLogout,
}) => {
  const row1 = [1, 2, 3, 4, 5, 6];
  const row2 = [7, 8, 9, 10, 11, 12];
  const hasCover = selectedMonths.includes(0);
  const isCoverDuplicate = duplicateMonths.includes(0);
  const hasDuplicates = duplicateMonths.length > 0;
  const selectedCount = selectedMonths.filter((m) => m >= 1 && m <= 12).length;

  const renderMonthRow = (months: number[]) => (
    <div className="grid grid-cols-6 gap-1 w-full">
      {months.map((m) => {
        const isSelected = selectedMonths.includes(m);
        const isDuplicate = duplicateMonths.includes(m);
        const shortName = MONTH_SHORT_NAMES[m - 1];
        const fullName = MONTH_NAMES[m - 1];

        return (
          <div
            key={m}
            title={
              isDuplicate
                ? `${fullName}: ⚠️ Achtung Doppelbelegung! Dasselbe Bild ist mehrfach im Kalender ausgewählt.`
                : `${fullName}: ${isSelected ? 'Mindestens ein Bild ausgewählt' : 'Noch kein Bild zugewiesen'}`
            }
            className={`px-1 py-0.5 rounded text-[10px] font-mono text-center border transition-all duration-300 ${
              isDuplicate
                ? 'border-2 border-rose-500 bg-rose-500/25 text-rose-300 font-bold ring-1 ring-rose-500/50 scale-[1.03] shadow-sm'
                : isSelected
                ? 'bg-astro-cyan/25 border-astro-cyan text-astro-cyan font-bold shadow-glow-cyan/20 scale-[1.02]'
                : 'bg-space-900/60 border-white/5 text-slate-500'
            }`}
          >
            {shortName}
          </div>
        );
      })}
    </div>
  );

  return (
    <header className="sticky top-0 z-40 bg-space-950/80 backdrop-blur-md border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[5rem] py-2 sm:py-2.5 transition-all">

          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => { if (window.location.hash) window.location.hash = ''; }}>
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

          {/* Calendar Months Progress in Header (2 Rows, clickable for Preview Modal) */}
          <button
            type="button"
            onClick={onOpenCalendarModal}
            title="Klicken, um die Kalender-Vorschau (Deckblatt & 12 Monate) zu öffnen"
            className={`hidden lg:flex flex-col items-center gap-1.5 w-76 xl:w-80 min-w-[18.5rem] bg-space-900/40 hover:bg-space-900/80 p-2 sm:p-2.5 rounded-xl border backdrop-blur-md transition-all cursor-pointer group shrink-0 ${
              hasDuplicates
                ? 'border-rose-500/40 bg-rose-950/20 shadow-glow-rose/10'
                : 'border-white/10 hover:border-astro-cyan/50'
            }`}
          >
            <div className="flex items-center justify-between w-full text-[11px] font-mono px-0.5 flex-wrap gap-1">
              <span className="text-slate-300 group-hover:text-astro-cyan flex items-center gap-1.5 transition-colors shrink-0">
                <CalendarDays className="w-3.5 h-3.5 text-astro-cyan" />
                <span>Vorschau</span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] border transition-all ${
                    isCoverDuplicate
                      ? 'border-2 border-rose-500 bg-rose-500/25 text-rose-300 font-bold ring-1 ring-rose-500/50 shadow-sm'
                      : hasCover
                      ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold shadow-sm'
                      : 'bg-space-900/60 border-white/5 text-slate-500'
                  }`}
                  title={isCoverDuplicate ? 'Deckblatt: ⚠️ Achtung Doppelbelegung! Dasselbe Bild ist auch für andere Monate ausgewählt.' : undefined}
                >
                  Deckblatt
                </span>
                {hasDuplicates && (
                  <span className="text-[9px] font-bold text-rose-300 bg-rose-500/25 border border-rose-500/50 px-1.5 py-0.2 rounded-full animate-pulse shrink-0" title="Doppelbelegung: Mindestens ein Bild ist für mehrere Monate ausgewählt!">
                    ⚠️ Duplikat
                  </span>
                )}
                <span className={`font-semibold shrink-0 ${hasDuplicates ? 'text-rose-400' : selectedCount === 12 ? 'text-emerald-400' : 'text-astro-cyan'}`}>
                  {selectedCount} / 12
                </span>
              </div>
            </div>
            {renderMonthRow(row1)}
            {renderMonthRow(row2)}
          </button>

          {/* Actions & Voter Badge */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">

            {/* Prominent Badge with Arrow pointing to login if not registered */}
            {!currentVoter && (
              <button
                onClick={onOpenVoterModal}
                className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-astro-cyan/20 via-astro-blue/20 to-astro-purple/20 border border-astro-cyan/50 text-astro-cyan hover:text-white text-xs font-semibold shadow-glow-cyan hover:scale-[1.02] transition-all cursor-pointer animate-pulse"
                title="Jetzt registrieren, um Stimmen abzugeben"
              >
                <span>Zum Abstimmen mit Email registrieren</span>
                <ArrowRight className="w-3.5 h-3.5 animate-bounce-horizontal" />
              </button>
            )}

            {/* Email verification reminder badge if logged in but unverified */}
            {currentVoter && !currentVoter.is_verified && (
              <button
                onClick={onOpenVerificationModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium hover:bg-amber-500/30 transition-all animate-pulse"
                title="Klicke hier, um deine E-Mail zu bestätigen"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>E-Mail bestätigen</span>
              </button>
            )}

            {/* Voter identification badge / Login Button */}
            <button
              onClick={onOpenVoterModal}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all shadow-sm group ${!currentVoter
                ? 'bg-astro-cyan/10 hover:bg-astro-cyan/20 border-astro-cyan/40 text-astro-cyan shadow-glow-cyan/30'
                : currentVoter.is_verified
                  ? 'bg-space-850 hover:bg-space-800 border-emerald-500/30 text-slate-200'
                  : 'bg-space-850 hover:bg-space-800 border-amber-500/30 text-slate-200'
                }`}
              title={currentVoter ? "Wählerdaten ändern" : "Jetzt registrieren"}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${!currentVoter ? 'bg-astro-cyan text-space-950 font-bold' : currentVoter.is_verified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-[10px] text-slate-400 leading-tight">
                  {!currentVoter ? 'Anmelden' : currentVoter.is_verified ? 'Verifiziert' : 'Unbestätigt'}
                </div>
                <div className="font-medium text-slate-100 max-w-[120px] truncate">
                  {currentVoter ? currentVoter.name : 'Nicht angemeldet'}
                </div>
              </div>
            </button>

            {/* Logout Button */}
            {currentVoter && (
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-space-850 hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 text-xs font-mono transition-colors"
                title="Als Wähler abmelden"
                aria-label="Abmelden"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Abmelden</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile: Prominent Registration Badge below Header if not registered */}
        {!currentVoter && (
          <div className="md:hidden pb-3">
            <button
              onClick={onOpenVoterModal}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-astro-cyan/20 to-astro-purple/30 border border-astro-cyan/50 text-astro-cyan text-xs font-semibold shadow-glow-cyan animate-pulse"
            >
              <span>Zum Abstimmen mit Email registrieren</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Mobile Calendar Months Progress (2 Rows, clickable for Preview Modal) */}
        <div className="lg:hidden pb-3">
          <button
            type="button"
            onClick={onOpenCalendarModal}
            className={`w-full bg-space-900/40 hover:bg-space-900/70 p-2.5 rounded-xl border transition-all text-left ${
              hasDuplicates
                ? 'border-rose-500/40 bg-rose-950/20 shadow-glow-rose/10'
                : 'border-white/10 hover:border-astro-cyan/40'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5 px-0.5 flex-wrap gap-1">
              <span className="flex items-center gap-1.5 text-slate-300 shrink-0">
                <CalendarDays className="w-3.5 h-3.5 text-astro-cyan" />
                <span>Kalender-Vorschau öffnen</span>
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] border transition-all ${
                    isCoverDuplicate
                      ? 'border-2 border-rose-500 bg-rose-500/25 text-rose-300 font-bold ring-1 ring-rose-500/50 shadow-sm'
                      : hasCover
                      ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold'
                      : 'bg-space-900/60 border-white/5 text-slate-500'
                  }`}
                  title={isCoverDuplicate ? 'Deckblatt: ⚠️ Achtung Doppelbelegung! Dasselbe Bild ist auch für andere Monate ausgewählt.' : undefined}
                >
                  Deckblatt
                </span>
                {hasDuplicates && (
                  <span className="text-[9px] font-bold text-rose-300 bg-rose-500/25 border border-rose-500/50 px-1.5 py-0.2 rounded-full animate-pulse">
                    ⚠️ Duplikat
                  </span>
                )}
                <span className={`font-semibold ${hasDuplicates ? 'text-rose-400' : selectedCount === 12 ? 'text-emerald-400' : 'text-astro-cyan'}`}>
                  {selectedCount} / 12
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              {renderMonthRow(row1)}
              {renderMonthRow(row2)}
            </div>
          </button>
        </div>

      </div>
    </header>
  );
};
