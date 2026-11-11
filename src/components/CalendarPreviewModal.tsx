import React, { useState, useEffect, useMemo } from 'react';
import { X, CalendarDays, Sparkles, User, Users, BookOpen, Maximize2, ImageOff, ChevronLeft, ChevronRight, AlertTriangle, Pin, Check } from 'lucide-react';
import { Photo, Vote, PhotoVoteSummary, MONTH_NAMES, getMonthShortLabel } from '../types';

interface CalendarPreviewModalProps {
  isOpen: boolean;
  photos: Photo[];
  userVotes: Record<string, Vote>;
  summaries: Record<string, PhotoVoteSummary>;
  calendarSelections?: Record<number, string>;
  isAdmin?: boolean;
  onSaveSelection?: (slot: number, photoId: string | null) => Promise<void>;
  onClose: () => void;
  onOpenLightbox: (photo: Photo) => void;
}

export const CalendarPreviewModal: React.FC<CalendarPreviewModalProps> = ({
  isOpen,
  photos,
  userVotes,
  summaries,
  calendarSelections = {},
  isAdmin = false,
  onSaveSelection,
  onClose,
  onOpenLightbox,
}) => {
  const [viewMode, setViewMode] = useState<'personal' | 'community'>('personal');
  // If multiple photos are assigned to the same slot (0..12), track which index is shown
  const [activeSlotIndex, setActiveSlotIndex] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!isOpen) return;

    // Falls der Nutzer noch keine eigenen Monatsauswahlen getroffen hat, direkt Community-Favoriten anzeigen
    const hasPersonalVotes = Object.values(userVotes).some(
      (v) => v.suggested_month !== null && v.suggested_month !== undefined
    );
    if (!hasPersonalVotes) {
      setViewMode('community');
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, userVotes]);

  // Map slots 0..12 -> Photo[] for personal selection vs community top picks
  const slotPhotosMap = useMemo(() => {
    const map: Record<number, Photo[]> = {};
    for (let m = 0; m <= 12; m++) {
      map[m] = [];
    }

    // Helper to sort photos for a specific month slot (0 = Deckblatt, 1..12 = Monate):
    // 1. Höchste Stimmenzahl für genau diesen Monat (z. B. meiste "Januar"-Stimmen)
    // 2. Bei Gleichstand: Gesamtzahl der Upvotes (👍)
    // 3. Stabiler Tie-Breaker: Titel alphabetisch
    const comparePhotosForSlot = (pA: Photo, pB: Photo, slot: number) => {
      const countA = summaries[pA.id]?.monthCounts?.[slot] || 0;
      const countB = summaries[pB.id]?.monthCounts?.[slot] || 0;
      if (countB !== countA) return countB - countA;
      const upA = summaries[pA.id]?.upvotes || 0;
      const upB = summaries[pB.id]?.upvotes || 0;
      if (upB !== upA) return upB - upA;
      return pA.title.localeCompare(pB.title);
    };

    if (viewMode === 'personal') {
      Object.values(userVotes).forEach((vote) => {
        if (vote.suggested_month !== null && vote.suggested_month !== undefined && vote.suggested_month >= 0 && vote.suggested_month <= 12) {
          const p = photos.find((ph) => ph.id === vote.photo_id);
          if (p) {
            map[vote.suggested_month].push(p);
          }
        }
      });

      // Wenn für einen Monat mehrere Bilder ausgewählt wurden, das mit den meisten Monatsstimmen an Position 1 setzen
      for (let m = 0; m <= 12; m++) {
        if (map[m].length > 1) {
          map[m].sort((a, b) => comparePhotosForSlot(a, b, m));
        }
      }
    } else {
      // Community-Modus: Für jeden Slot (0..12) alle Bilder mit Stimmen für diesen Monat sortiert nach Monatsstimmen
      for (let m = 0; m <= 12; m++) {
        let candidates = photos
          .filter((p) => (summaries[p.id]?.monthCounts?.[m] || 0) > 0)
          .sort((a, b) => comparePhotosForSlot(a, b, m));

        // Falls ein Bild vom Admin fest für diesen Monat ausgewählt wurde, an Position 1 setzen!
        const fixedPhotoId = calendarSelections[m];
        if (fixedPhotoId) {
          const fixedPhoto = photos.find((p) => p.id === fixedPhotoId);
          if (fixedPhoto) {
            candidates = [fixedPhoto, ...candidates.filter((p) => p.id !== fixedPhotoId)];
          }
        }

        map[m] = candidates;
      }
    }

    return map;
  }, [viewMode, userVotes, photos, summaries, calendarSelections]);

  const coverPhotos = slotPhotosMap[0] || [];
  const activeCoverIdx = Math.min(activeSlotIndex[0] || 0, Math.max(0, coverPhotos.length - 1));
  const currentCoverPhoto = coverPhotos[activeCoverIdx] || null;
  const currentCoverVotes = currentCoverPhoto ? (summaries[currentCoverPhoto.id]?.monthCounts?.[0] || 0) : 0;

  // Active photo for each slot (0 = Deckblatt, 1..12 = Monate)
  const activePhotoBySlot = useMemo(() => {
    const map: Record<number, Photo | null> = {};
    const cover = slotPhotosMap[0] || [];
    const coverIdx = Math.min(activeSlotIndex[0] || 0, Math.max(0, cover.length - 1));
    map[0] = cover[coverIdx] || null;

    for (let m = 1; m <= 12; m++) {
      const assigned = slotPhotosMap[m] || [];
      const activeIdx = Math.min(activeSlotIndex[m] || 0, Math.max(0, assigned.length - 1));
      map[m] = assigned[activeIdx] || null;
    }
    return map;
  }, [slotPhotosMap, activeSlotIndex]);

  // Uniqueness verification: Map each photo ID to all slots (0..12) where it is currently selected
  const photoSlotsMap = useMemo(() => {
    const map: Record<string, number[]> = {};
    Object.entries(activePhotoBySlot).forEach(([slotStr, photo]) => {
      if (photo) {
        const slot = parseInt(slotStr, 10);
        if (!map[photo.id]) map[photo.id] = [];
        map[photo.id].push(slot);
      }
    });
    return map;
  }, [activePhotoBySlot]);

  // Set of slots that violate uniqueness (same photo selected in > 1 slot)
  const duplicateSlots = useMemo(() => {
    const set = new Set<number>();
    Object.values(photoSlotsMap).forEach((slots) => {
      if (slots.length > 1) {
        slots.forEach((s) => set.add(s));
      }
    });
    return Array.from(set);
  }, [photoSlotsMap]);

  const getConflictSlotsForSlot = (slot: number): number[] => {
    const photo = activePhotoBySlot[slot];
    if (!photo) return [];
    const allSlots = photoSlotsMap[photo.id] || [];
    return allSlots.filter((s) => s !== slot);
  };

  const getConflictNames = (slot: number): string => {
    const conflicts = getConflictSlotsForSlot(slot);
    return conflicts.map(s => s === 0 ? 'Deckblatt' : `${s}. ${MONTH_NAMES[s - 1]}`).join(', ');
  };

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

  if (!isOpen) return null;

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
              <h2 className="font-display font-bold text-base sm:text-lg text-white flex flex-wrap items-center gap-2">
                <span>Astro-Kalender 2027 – Vorschau</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-astro-cyan/15 text-astro-cyan border border-astro-cyan/30">
                  {coverPhotos.length > 0 ? 'Deckblatt ✓' : 'Kein Deckblatt'} • {filledMonthsCount}/12 Monate
                </span>
                {duplicateSlots.length > 0 && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 font-semibold animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{duplicateSlots.length} Doppelbelegungen!</span>
                  </span>
                )}
                {isAdmin && (
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-astro-gold/20 text-astro-gold border border-astro-gold/40 flex items-center gap-1 font-semibold">
                    <Pin className="w-3 h-3" />
                    <span>Admin-Kuration aktiv</span>
                  </span>
                )}
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
                onClick={() => {
                  setViewMode('personal');
                  setActiveSlotIndex({});
                }}
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
                onClick={() => {
                  setViewMode('community');
                  setActiveSlotIndex({});
                }}
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

          {/* Uniqueness Warning Banner */}
          {duplicateSlots.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border-2 border-rose-500/40 text-rose-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
                <div>
                  <strong className="text-white block font-semibold text-sm">Achtung: Doppelbelegung im Kalender erkannt!</strong>
                  <span>
                    Ein oder mehrere Bilder sind für mehr als einen Monat bzw. das Deckblatt ausgewählt (rot umrandet).
                    {viewMode === 'community' && ' Nutze bei den rot umrandeten Monaten die Pfeile ‹ ›, um alternative Motive auszuwählen.'}
                  </span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-rose-500/30 text-rose-200 border border-rose-500/50 font-mono text-xs font-bold shrink-0">
                ⚠️ {duplicateSlots.length} betroffene Monate
              </span>
            </div>
          )}

          {/* 1. KALENDERDECKBLATT (TOP CENTER) */}
          <div className="max-w-lg mx-auto">
            <div className={`rounded-2xl bg-gradient-to-b from-amber-500/10 via-space-950/90 to-space-950/90 shadow-xl overflow-hidden transition-all ${
              duplicateSlots.includes(0)
                ? 'border-2 border-rose-500 ring-2 ring-rose-500/40 shadow-rose-950/60'
                : 'border border-amber-400/40'
            }`}>
              <div className={`flex items-center justify-between px-4 py-2 border-b transition-colors ${
                duplicateSlots.includes(0)
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-amber-500/10 border-amber-400/20 text-amber-300'
              }`}>
                <div className="flex items-center gap-2 text-xs font-mono font-bold">
                  {duplicateSlots.includes(0) ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  ) : (
                    <BookOpen className="w-4 h-4 text-amber-400" />
                  )}
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
                      <div className="truncate min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{currentCoverPhoto.title}</div>
                        <div className="text-[11px] text-slate-400 truncate">Foto: {currentCoverPhoto.author}</div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-amber-300 block">
                            {currentCoverVotes} {currentCoverVotes === 1 ? 'Stimme' : 'Stimmen'}
                          </span>
                          {coverPhotos.length > 1 && activeCoverIdx === 0 && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                              Top 1
                            </span>
                          )}
                        </div>
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      </div>
                    </div>
                    {duplicateSlots.includes(0) && (
                      <div className="mt-2 p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-1.5 animate-pulse">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                        <span><strong>Doppelbelegung:</strong> Dasselbe Bild ist auch für {getConflictNames(0)} ausgewählt!</span>
                      </div>
                    )}

                    {isAdmin && (
                      <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                        {calendarSelections[0] === currentCoverPhoto.id ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
                              <Check className="w-3.5 h-3.5" /> Festgelegtes Titelbild
                            </span>
                            <button
                              type="button"
                              onClick={() => onSaveSelection?.(0, null)}
                              className="text-xs text-slate-400 hover:text-rose-300 underline font-mono transition-colors"
                            >
                              Freigeben
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between w-full gap-2">
                            <span className="text-[11px] font-mono text-slate-400">
                              {calendarSelections[0] ? 'Anderes Bild festgelegt' : 'Community-Favorit'}
                            </span>
                            <button
                              type="button"
                              onClick={() => onSaveSelection?.(0, currentCoverPhoto.id)}
                              className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-space-950 font-bold text-xs font-mono transition-all flex items-center gap-1.5 shadow-sm"
                            >
                              <Pin className="w-3.5 h-3.5" />
                              <span>Dieses Bild als Deckblatt festlegen</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-[1.4142/1] w-full rounded-xl border border-dashed border-white/10 bg-space-950/50 flex flex-col items-center justify-center p-4 text-center">
                    <ImageOff className="w-7 h-7 text-slate-600 mb-2" />
                    <p className="text-xs font-medium text-slate-400">Noch kein Deckblatt ausgewählt</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Wähle bei deinem Favoriten in der Galerie „📖 Deckblatt (Titelbild)“ aus.
                    </p>
                    {isAdmin && (
                      <div className="mt-3 w-full max-w-xs">
                        <select
                          onChange={(e) => {
                            if (e.target.value) onSaveSelection?.(0, e.target.value);
                          }}
                          defaultValue=""
                          className="w-full text-xs font-mono bg-space-850 border border-white/15 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-400"
                        >
                          <option value="" disabled>Bild manuell als Deckblatt zuweisen...</option>
                          {photos.map(p => (
                            <option key={p.id} value={p.id}>{p.title} ({p.author})</option>
                          ))}
                        </select>
                      </div>
                    )}
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
                const activeMonthVotes = activePhoto ? (summaries[activePhoto.id]?.monthCounts?.[monthNum] || 0) : 0;
                const isMonthDuplicate = duplicateSlots.includes(monthNum);

                return (
                  <div
                    key={monthNum}
                    className={`rounded-xl border transition-all overflow-hidden flex flex-col ${
                      isMonthDuplicate
                        ? 'bg-space-950/95 border-2 border-rose-500 ring-2 ring-rose-500/40 shadow-lg shadow-rose-950/60'
                        : activePhoto
                        ? 'bg-space-950/90 border-astro-cyan/30 shadow-lg'
                        : 'bg-space-950/40 border-white/10'
                    }`}
                  >
                    {/* Month Card Header */}
                    <div
                      className={`flex items-center justify-between px-3 py-1.5 border-b text-xs font-mono transition-colors ${
                        isMonthDuplicate
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-bold'
                          : activePhoto
                          ? 'bg-astro-cyan/10 border-astro-cyan/20 text-astro-cyan font-bold'
                          : 'bg-space-900/60 border-white/5 text-slate-400'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        {isMonthDuplicate && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                        <span>
                          {monthNum}. {monthName}
                        </span>
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
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="truncate min-w-0">
                                <div className="text-xs font-medium text-slate-100 truncate" title={activePhoto.title}>
                                  {activePhoto.title}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  Foto: {activePhoto.author}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[10px] font-mono font-semibold text-astro-cyan block">
                                  {activeMonthVotes} {activeMonthVotes === 1 ? 'Stimme' : 'Stimmen'}
                                </span>
                                {assignedPhotos.length > 1 && activeIdx === 0 && (
                                  <span className="inline-block text-[9px] font-mono px-1 py-0.2 rounded bg-astro-cyan/20 text-astro-cyan font-bold">
                                    Top 1
                                  </span>
                                )}
                              </div>
                            </div>
                            {isMonthDuplicate && (
                              <div className="mt-1.5 p-1.5 rounded-lg bg-rose-500/15 border border-rose-500/35 text-rose-300 text-[10px] font-mono flex items-center gap-1 animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                                <span className="truncate">Doppelbelegung mit {getConflictNames(monthNum)}</span>
                              </div>
                            )}

                            {isAdmin && (
                              <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-1.5">
                                {calendarSelections[monthNum] === activePhoto.id ? (
                                  <div className="flex items-center justify-between w-full">
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">
                                      <Check className="w-2.5 h-2.5" /> Festgelegt
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => onSaveSelection?.(monthNum, null)}
                                      className="text-[10px] text-slate-400 hover:text-rose-300 underline font-mono transition-colors"
                                    >
                                      Freigeben
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between w-full gap-1">
                                    <span className="text-[10px] font-mono text-slate-400 truncate">
                                      {calendarSelections[monthNum] ? 'Anderes Bild' : 'Community'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => onSaveSelection?.(monthNum, activePhoto.id)}
                                      className="px-2 py-0.5 rounded bg-astro-cyan hover:bg-cyan-300 text-space-950 font-bold text-[10px] font-mono transition-colors flex items-center gap-1 shadow-sm shrink-0"
                                      title={`Dieses Bild fest für ${monthName} auswählen`}
                                    >
                                      <Pin className="w-2.5 h-2.5" />
                                      <span>Festlegen</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="aspect-[1.4142/1] w-full rounded-lg border border-dashed border-white/5 bg-space-900/30 flex flex-col items-center justify-center p-2 text-center">
                          <ImageOff className="w-5 h-5 text-slate-700 mb-1" />
                          <span className="text-[11px] text-slate-500 font-mono mb-1.5">Noch unbesetzt</span>
                          {isAdmin && (
                            <select
                              onChange={(e) => {
                                if (e.target.value) onSaveSelection?.(monthNum, e.target.value);
                              }}
                              defaultValue=""
                              className="w-full text-[10px] font-mono bg-space-850 border border-white/10 rounded px-1.5 py-1 text-slate-300 focus:outline-none focus:border-astro-cyan"
                            >
                              <option value="" disabled>Bild zuweisen...</option>
                              {photos.map(p => (
                                <option key={p.id} value={p.id}>{p.title} ({p.author})</option>
                              ))}
                            </select>
                          )}
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

