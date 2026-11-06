import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ThumbsUp, Calendar, Camera, Clock, User } from 'lucide-react';
import { Photo, Vote, Rating, PhotoVoteSummary, MONTH_NAMES, getMonthLabel } from '../types';

interface LightboxProps {
  photo: Photo | null;
  photos: Photo[];
  userVote?: Vote;
  summary?: PhotoVoteSummary;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onVote: (photoId: string, rating: Rating, month: number | null) => void;
}

export const Lightbox: React.FC<LightboxProps> = ({
  photo,
  photos,
  userVote,
  summary,
  onClose,
  onNavigate,
  onVote,
}) => {
  if (!photo) return null;

  const currentIndex = photos.findIndex(p => p.id === photo.id);
  const currentRating = userVote?.rating || 'none';
  const currentMonth = userVote?.suggested_month ?? null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onNavigate('prev');
      if (e.key === 'ArrowRight') onNavigate('next');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNavigate]);

  const handleRating = (rating: Rating) => {
    const finalRating = currentRating === rating ? 'none' : rating;
    onVote(photo.id, finalRating, currentMonth);
  };

  const handleMonth = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
    const finalRating = currentRating === 'none' ? 'up' : currentRating;
    onVote(photo.id, finalRating, val);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-space-950/95 backdrop-blur-xl animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={photo.title}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 z-20 bg-space-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-white/10 text-slate-300">
            {currentIndex + 1} / {photos.length}
          </span>
          <h2 className="text-base sm:text-lg font-display font-semibold text-slate-100 truncate max-w-md">
            {photo.title}
          </h2>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-space-850 hover:bg-space-800 text-slate-300 hover:text-white border border-white/10 transition-colors"
          aria-label="Schließen"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Image Area with Prev/Next buttons */}
      <div className="relative flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden select-none">

        {/* Previous Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate('prev'); }}
          className="absolute left-4 z-20 p-3 rounded-full bg-space-900/80 hover:bg-space-800 border border-white/10 text-slate-200 hover:text-astro-cyan transition-all backdrop-blur-md shadow-xl"
          aria-label="Vorheriges Foto"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* High-res Image */}
        <div className="relative max-w-full max-h-[75vh] flex items-center justify-center">
          <img
            src={photo.image_url}
            alt={photo.title}
            className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl border border-white/10 transition-transform duration-300"
          />
        </div>

        {/* Next Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate('next'); }}
          className="absolute right-4 z-20 p-3 rounded-full bg-space-900/80 hover:bg-space-800 border border-white/10 text-slate-200 hover:text-astro-cyan transition-all backdrop-blur-md shadow-xl"
          aria-label="Nächstes Foto"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="border-t border-white/10 bg-space-950/90 backdrop-blur-md px-6 py-4 z-20">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

          {/* Metadata */}
          <div className="text-left w-full md:w-auto">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <User className="w-3.5 h-3.5 text-astro-cyan" />
              <span>Fotograf: <strong className="text-white">{photo.author}</strong></span>
            </div>
            {(photo.telescope || photo.exposure) && (
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400 mt-1">
                {photo.telescope && (
                  <span className="flex items-center gap-1">
                    <Camera className="w-3 h-3 text-astro-blue" />
                    {photo.telescope}
                  </span>
                )}
                {photo.exposure && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-astro-purple" />
                    {photo.exposure}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Voting Action Controls */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleRating('up')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-all ${currentRating === 'up'
                    ? 'bg-gradient-to-r from-emerald-400 to-astro-lime text-space-950 border-emerald-300 font-bold shadow-glow-lime'
                    : 'bg-space-850 hover:bg-space-800 text-slate-200 border-white/10 hover:text-emerald-400'
                  }`}
              >
                <ThumbsUp className={`w-4 h-4 ${currentRating === 'up' ? 'fill-current' : ''}`} />
                <span>{currentRating === 'up' ? 'Gestimmt (Gefällt mir)' : 'Gefällt mir'}</span>
              </button>
            </div>

            {/* Month Picker in Lightbox */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-astro-cyan hidden sm:block" />
              <select
                value={currentMonth !== null ? currentMonth : ''}
                onChange={handleMonth}
                className="bg-space-850 hover:bg-space-800 border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-astro-cyan transition-colors cursor-pointer"
              >
                <option value="">Monat: Keine Präferenz</option>
                <option value={0}>📖 Deckblatt (Titelbild)</option>
                {MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}. {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Community Tip in Lightbox */}
            {summary?.topMonth && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-astro-cyan/10 border border-astro-cyan/25 text-xs text-astro-cyan font-mono">
                <span>Community-Tipp:</span>
                <span className="font-semibold text-white">
                  {summary.topMonth.percentage}% empfehlen {getMonthLabel(summary.topMonth.month)}
                </span>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
};

