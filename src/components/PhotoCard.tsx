import React from 'react';
import { ThumbsUp, Calendar, Maximize2, Camera, Clock, CheckCircle } from 'lucide-react';
import { Photo, Vote, PhotoVoteSummary, Rating, MONTH_NAMES, getMonthLabel } from '../types';

interface PhotoCardProps {
  photo: Photo;
  userVote?: Vote;
  summary?: PhotoVoteSummary;
  isVoterVerified?: boolean;
  onVote: (photoId: string, rating: Rating, month: number | null) => void;
  onOpenLightbox: (photo: Photo) => void;
  index: number;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  userVote,
  summary,
  isVoterVerified,
  onVote,
  onOpenLightbox,
  index
}) => {
  const currentRating = userVote?.rating || 'none';
  const currentMonth = userVote?.suggested_month ?? null;
  const hasVoted = currentRating !== 'none' || currentMonth !== null;

  const handleRatingClick = (newRating: Rating) => {
    // If clicking same rating, reset to 'none'
    const finalRating = currentRating === newRating ? 'none' : newRating;
    onVote(photo.id, finalRating, currentMonth);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
    // If user selects month but hasn't picked a rating yet, default to 'up'
    const finalRating = currentRating === 'none' ? 'up' : currentRating;
    onVote(photo.id, finalRating, val);
  };

  return (
    <div className="group relative rounded-2xl bg-space-900/70 border border-white/10 hover:border-astro-cyan/40 backdrop-blur-md overflow-hidden flex flex-col transition-all duration-300 hover:shadow-glow-cyan/20 hover:-translate-y-1">

      {/* Voted badge indicator */}
      {hasVoted && (
        <div className={`absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-[11px] font-medium backdrop-blur-md shadow-lg shadow-black/40 ${isVoterVerified ? 'bg-emerald-500/90' : 'bg-amber-500/90'
          }`}>
          <CheckCircle className="w-3.5 h-3.5" />
          <span>{isVoterVerified ? 'Gezählt (Verifiziert)' : 'Vorgemerkt (Unbestätigt)'}</span>
        </div>
      )}

      {/* Number Badge */}
      <div className="absolute top-3 right-3 z-20 flex items-center justify-center w-7 h-7 rounded-full bg-space-950/80 border border-white/20 text-xs font-mono text-slate-300 backdrop-blur-md shadow-md">
        #{index + 1}
      </div>

      {/* Image Preview with Lightbox Trigger (DIN A3 1:1.4142 Aspect Ratio) */}
      <div
        className="relative aspect-[1.4142/1] overflow-hidden bg-space-950 cursor-pointer group/img flex items-center justify-center"
        onClick={() => onOpenLightbox(photo)}
      >
        <img
          src={photo.image_url}
          alt={photo.title}
          loading="lazy"
          className="w-full h-full object-contain transition-transform duration-700 ease-out group-hover/img:scale-105"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-space-900 via-transparent to-transparent opacity-80" />

        {/* Hover Zoom Prompt */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 bg-space-950/40 backdrop-blur-[2px]">
          <span className="flex items-center gap-2 px-4 py-2 rounded-xl bg-space-900/90 border border-white/20 text-sm font-medium text-slate-100 shadow-xl">
            <Maximize2 className="w-4 h-4 text-astro-cyan" />
            Großansicht öffnen
          </span>
        </div>

        {/* Community Upvotes Pill on Image */}
        {summary && summary.upvotes > 0 && (
          <div className="absolute bottom-3 right-3 z-10 px-2.5 py-1 rounded-lg bg-space-950/85 border border-white/10 text-xs font-mono backdrop-blur-md flex items-center gap-1.5 shadow-md">
            <ThumbsUp className="w-3 h-3 text-emerald-400 fill-emerald-400" />
            <span className="text-emerald-400 font-bold">{summary.upvotes}</span>
            <span className="text-[10px] text-slate-400">{summary.upvotes === 1 ? 'Stimme' : 'Stimmen'}</span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          {/* Title & Author */}
          <h3 className="font-display font-semibold text-lg text-slate-100 group-hover:text-astro-cyan transition-colors line-clamp-1">
            {photo.title}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Foto: <span className="text-slate-200 font-medium">{photo.author}</span>
          </p>

          {/* Technical Details Badges */}
          {(photo.telescope || photo.exposure) && (
            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-mono text-slate-400">
              {photo.telescope && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-slate-300">
                  <Camera className="w-3 h-3 text-astro-blue" />
                  <span className="truncate max-w-[190px]">{photo.telescope}</span>
                </span>
              )}
              {photo.exposure && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-slate-300">
                  <Clock className="w-3 h-3 text-astro-purple" />
                  <span className="truncate max-w-[190px]">{photo.exposure}</span>
                </span>
              )}
            </div>
          )}

          {/* Description if any */}
          {photo.description && (
            <p className="text-xs text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
              {photo.description}
            </p>
          )}
        </div>

        {/* Voting & Month Recommendation Controls */}
        <div className="pt-3 border-t border-white/10 flex flex-col gap-3">

          {/* UPVOTE BUTTON */}
          <button
            type="button"
            onClick={() => handleRatingClick('up')}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-xs sm:text-sm transition-all border ${currentRating === 'up'
              ? 'bg-gradient-to-r from-emerald-400 to-astro-lime text-space-950 border-emerald-300 font-bold shadow-glow-lime'
              : 'bg-space-800/80 hover:bg-space-800 text-slate-200 border-white/10 hover:border-emerald-500/40 hover:text-emerald-300'
              }`}
          >
            <ThumbsUp className={`w-4 h-4 ${currentRating === 'up' ? 'fill-current' : ''}`} />
            <span>{currentRating === 'up' ? 'Gefällt mir (Stimme abgegeben)' : 'Gefällt mir (Stimme abgeben)'}</span>
            {summary && summary.upvotes > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${currentRating === 'up' ? 'bg-space-950/20 text-space-950 font-bold' : 'bg-white/10 text-slate-300'}`}>
                {summary.upvotes}
              </span>
            )}
          </button>

          {/* Month Recommendation Dropdown */}
          <div className="relative">
            <label className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 mb-1">
              <Calendar className="w-3.5 h-3.5 text-astro-cyan" />
              <span>Monatsempfehlung für Kalender:</span>
            </label>
            <div className="relative">
              <select
                value={currentMonth !== null ? currentMonth : ''}
                onChange={handleMonthChange}
                className="w-full appearance-none bg-space-850 hover:bg-space-800 border border-white/10 focus:border-astro-cyan rounded-xl py-2 pl-3 pr-8 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-astro-cyan transition-colors cursor-pointer"
              >
                <option value="">Keine Präferenz / Nicht festgelegt</option>
                <option value={0}>📖 Deckblatt (Titelbild)</option>
                {MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}. {name} {i === 0 || i === 11 ? '❄️' : i >= 2 && i <= 4 ? '🌱' : i >= 5 && i <= 7 ? '☀️' : '🍂'}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Top Month from Community if exists */}
            {summary?.topMonth && (
              <p className="text-[10px] text-astro-cyan/90 font-mono mt-1.5 flex items-center justify-between">
                <span>Community-Tipp:</span>
                <span className="font-semibold text-slate-300">
                  {summary.topMonth.percentage}% empfehlen {getMonthLabel(summary.topMonth.month)}
                </span>
              </p>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

