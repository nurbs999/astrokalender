import React, { useState, useEffect, useMemo } from 'react';
import { X, CalendarDays, Sparkles, User, Users, BookOpen, Maximize2, ImageOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { Photo, Vote, PhotoVoteSummary, MONTH_NAMES } from '../types';

interface CalendarPreviewModalProps {
  isOpen: boolean;
  photos: Photo[];
  userVotes: Record<string, Vote>;
  summaries: Record<string, PhotoVoteSummary>;
  onClose: () => void;
  onOpenLightbox: (photo: Photo) => void;
}

export const CalendarPreviewModal: React.FC<CalendarPreviewModalProps> = ({
  isOpen,
  photos,
  userVotes,
  summaries,
  onClose,
  onOpenLightbox,
}) => {
  const [viewMode, setViewMode] = useState<'personal' | 'community'>('personal');
  // If multiple photos are assigned to the same slot (0..12), track which index is shown
  const [activeSlotIndex, setActiveSlotIndex] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Map slots 0..12 -> Photo[] for personal selection vs community top picks
  const slotPhotosMap = useMemo(() => {
    const map: Record<number, Photo[]> = {};
    for (let m = 0; m <= 12; m++) {
      map[m] = [];
    }

    if (viewMode === 'personal') {
      Object.values(userVotes).forEach((vote) => {
        if (vote.suggested_month !== null && vote.suggested_month !== undefined && vote.suggested_month >= 0 && vote.suggested_month <= 12) {
          const p = photos.find((ph) => ph.id === vote.photo_id);
          if (p) {
            map[vote.suggested_month].push(p);
          }
        }
      });
    } else {
      // Community mode: for each slot 0..12, find photos that received votes for that month, sorted by count for that month + total upvotes
      for (let m = 0; m <= 12; m++) {
        const candidates = photos
          .map((p) => {
            const s = summaries[p.id];
            const monthCount = s?.monthCounts?.[m] || 0;
            const upvotes = s?.upvotes || 0;
            return { photo: p, monthCount, upvotes };
          })
          .filter((item) => item.monthCount > 0)
          .sort((a, b) => {
            if (b.monthCount !== a.monthCount) return b.monthCount - a.monthCount;
            return b.upvotes - a.upvotes;
          });

        map[m] = candidates.map((c) => c.photo);
      }
    }

    return map;
  }, [viewMode, userVotes, photos, summaries]);

  if (!isOpen) return null;

  const coverPhotos = slotPhotosMap[0] || [];
  const activeCoverIdx = Math.min(activeSlotIndex[0] || 0, Math.max(0, coverPhotos.length - 1));
  const currentCoverPhoto = coverPhotos[activeCoverIdx] || null;

  const filledMonthsCount = Array.from({ length: 12 }, (_, i) => i + 1).filter(
    (m) => (slotPhotosMap[m]?.length || 0) > 0
  ).length;

  const cycleSlot = (slot: number, delta: number, total: number) => {
    setActiveSlotIndex((prev) => {
      const curr = prev[slot] || 0;
      const next = (curr + delta + total) % total;
      return { ...prev, [slot]: next };
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-space-950/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      {/* 90% Width and 90% Height Popup Container */}
      <div
        className="w-[90vw] h-[90vh] rounded-2xl bg-space-900 border border-white/15 shadow-2xl flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-space-950/90 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-astro-cyan/10 border border-astro-cyan/30 text-astro-cyan">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base sm:text-lg text-white flex items-center gap-2">
                <span>Astro-Kalender 2027 – Vorschau</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-astro-cyan/15 text-astro-cyan border border-astro-cyan/30">
                  {coverPhotos.length > 0 ? 'Deckblatt ✓' : 'Kein Deckblatt'} • {filledMonthsCount}/12 Monate
                </span>
              </h2>
              <p className="text-xs text-slate-400 hidden sm:block">
                Übersicht des Kalenderdeckblatts und aller 12 Monatsblätter im 3×4-Raster (DIN A3)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Switcher: Personal vs Community */}
            <div className="flex items-center p-1 rounded-xl bg-space-900 border border-white/10 text-xs font-mono">
              <button
                type="button"
                onClick={() => setViewMode('personal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${viewMode === 'personal'
                    ? 'bg-astro-cyan text-space-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                  }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Meine Auswahl</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('community')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${viewMode === 'community'
                    ? 'bg-astro-cyan text-space-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                  }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Community-Favoriten</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-space-850 hover:bg-space-800 text-slate-400 hover:text-white border border-white/10 transition-colors"
              title="Schließen (Esc)"
              aria-label="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Main Content: Deckblatt on Top + 3x4 Month Grid Below */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* 1. KALENDERDECKBLATT (TOP CENTER) */}
          <div className="max-w-lg mx-auto">
            <div className="rounded-2xl bg-gradient-to-b from-amber-500/10 via-space-950/90 to-space-950/90 border border-amber-400/40 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-amber-500/10 border-b border-amber-400/20">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-300">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>KALENDER-DECKBLATT (TITELBILD)</span>
                </div>
                {coverPhotos.length > 1 && (
                  <div className="flex items-center gap-1 text-[11px] font-mono text-amber-200">
                    <button
                      type="button"
                      onClick={() => cycleSlot(0, -1, coverPhotos.length)}
                      className="p-0.5 rounded hover:bg-white/10"
                      title="Vorheriges Bild"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span>
                      {activeCoverIdx + 1} / {coverPhotos.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => cycleSlot(0, 1, coverPhotos.length)}
                      className="p-0.5 rounded hover:bg-white/10"
                      title="Nächstes Bild"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-3">
                {currentCoverPhoto ? (
                  <div>
                    <div
                      onClick={() => {
                        onClose();
                        onOpenLightbox(currentCoverPhoto);
                      }}
                      className="relative aspect-[1.4142/1] w-full rounded-xl overflow-hidden bg-space-950 border border-white/10 cursor-pointer group flex items-center justify-center"
                    >
                      <img
                        src={currentCoverPhoto.image_url}
                        alt={currentCoverPhoto.title}
                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-space-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-space-900/90 border border-white/20 text-xs text-white font-medium shadow-lg">
                          <Maximize2 className="w-3.5 h-3.5 text-astro-cyan" />
                          Großansicht
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between px-1">
                      <div className="truncate">
                        <div className="text-xs font-semibold text-white truncate">{currentCoverPhoto.title}</div>
                        <div className="text-[11px] text-slate-400 truncate">Foto: {currentCoverPhoto.author}</div>
                      </div>
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[1.4142/1] w-full rounded-xl border border-dashed border-white/10 bg-space-950/50 flex flex-col items-center justify-center p-4 text-center">
                    <ImageOff className="w-7 h-7 text-slate-600 mb-2" />
                    <p className="text-xs font-medium text-slate-400">Noch kein Deckblatt ausgewählt</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Wähle bei deinem Favoriten in der Galerie „📖 Deckblatt (Titelbild)“ aus.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. 3x4 RASTER DER 12 MONATE (JANUAR - DEZEMBER) */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-astro-cyan" />
                <span>Monatsblätter Januar – Dezember (3×4 Raster)</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-500">
                Klicke auf ein Bild für die Großansicht
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {MONTH_NAMES.map((monthName, idx) => {
                const monthNum = idx + 1;
                const assignedPhotos = slotPhotosMap[monthNum] || [];
                const activeIdx = Math.min(
                  activeSlotIndex[monthNum] || 0,
                  Math.max(0, assignedPhotos.length - 1)
                );
                const activePhoto = assignedPhotos[activeIdx] || null;

                return (
                  <div
                    key={monthNum}
                    className={`rounded-xl border transition-all overflow-hidden flex flex-col ${activePhoto
                        ? 'bg-space-950/90 border-astro-cyan/30 shadow-lg'
                        : 'bg-space-950/40 border-white/10'
                      }`}
                  >
                    {/* Month Card Header */}
                    <div
                      className={`flex items-center justify-between px-3 py-1.5 border-b text-xs font-mono ${activePhoto
                          ? 'bg-astro-cyan/10 border-astro-cyan/20 text-astro-cyan font-bold'
                          : 'bg-space-900/60 border-white/5 text-slate-400'
                        }`}
                    >
                      <span>
                        {monthNum}. {monthName}
                      </span>
                      {assignedPhotos.length > 1 && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-300">
                          <button
                            type="button"
                            onClick={() => cycleSlot(monthNum, -1, assignedPhotos.length)}
                            className="p-0.5 rounded hover:bg-white/10"
                            title="Vorheriges Bild"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                          <span>
                            {activeIdx + 1}/{assignedPhotos.length}
                          </span>
                          <button
                            type="button"
                            onClick={() => cycleSlot(monthNum, 1, assignedPhotos.length)}
                            className="p-0.5 rounded hover:bg-white/10"
                            title="Nächstes Bild"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Month Image or Empty State */}
                    <div className="p-2.5 flex-1 flex flex-col justify-between">
                      {activePhoto ? (
                        <>
                          <div
                            onClick={() => {
                              onClose();
                              onOpenLightbox(activePhoto);
                            }}
                            className="relative aspect-[1.4142/1] w-full rounded-lg overflow-hidden bg-space-900 border border-white/10 cursor-pointer group flex items-center justify-center"
                          >
                            <img
                              src={activePhoto.image_url}
                              alt={activePhoto.title}
                              loading="lazy"
                              className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-space-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-space-900/90 border border-white/20 text-[11px] text-white font-medium">
                                <Maximize2 className="w-3 h-3 text-astro-cyan" />
                                Öffnen
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 px-0.5">
                            <div className="text-xs font-medium text-slate-100 truncate" title={activePhoto.title}>
                              {activePhoto.title}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              Foto: {activePhoto.author}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="aspect-[1.4142/1] w-full rounded-lg border border-dashed border-white/5 bg-space-900/30 flex flex-col items-center justify-center p-2 text-center">
                          <ImageOff className="w-5 h-5 text-slate-700 mb-1" />
                          <span className="text-[11px] text-slate-500 font-mono">Noch unbesetzt</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

