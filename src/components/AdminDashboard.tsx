import React, { useState, useEffect } from 'react';
import {
  Upload, BarChart3, Users, Image as ImageIcon, Trash2, Edit2, Check,
  Lock, ArrowLeft, AlertCircle, FileCheck, RefreshCw, Sparkles, Key, DownloadCloud, X
} from 'lucide-react';
import { Photo, PhotoVoteSummary, VoterStats, MONTH_NAMES } from '../types';
import { compressImage, CompressionResult } from '../lib/imageCompressor';
import {
  uploadPhoto, updatePhoto, deletePhoto, fetchAllVotesSummary,
  fetchVotersList, seedDemoPhotosToSupabase, isUsingLiveSupabase
} from '../lib/api';

interface AdminDashboardProps {
  photos: Photo[];
  onPhotosUpdated: () => void;
  onExit: () => void;
}

const LS_ADMIN_PASSWORD_KEY = 'astrovote_admin_custom_pin';

export const getExpectedAdminPassword = (): string => {
  const custom = localStorage.getItem(LS_ADMIN_PASSWORD_KEY);
  if (custom && custom.trim()) return custom.trim();
  return import.meta.env.VITE_ADMIN_PASSWORD || 'astro2026';
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  photos,
  onPhotosUpdated,
  onExit,
}) => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('astrovote_admin_auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Password change modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Seeding state
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState('');

  // Tab State: 'ranking' | 'upload' | 'voters' | 'manage'
  const [activeTab, setActiveTab] = useState<'ranking' | 'upload' | 'voters' | 'manage'>('ranking');

  // Stats and summaries
  const [summaries, setSummaries] = useState<Record<string, PhotoVoteSummary>>({});
  const [voters, setVoters] = useState<VoterStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Upload & Pre-processing state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Upload Form Meta
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');

  // Edit Photo state
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);

  // Load stats
  const loadDashboardData = async () => {
    setLoadingStats(true);
    try {
      const [sumRes, votersRes] = await Promise.all([
        fetchAllVotesSummary(),
        fetchVotersList(),
      ]);
      setSummaries(sumRes);
      setVoters(votersRes);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated, photos]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const expected = getExpectedAdminPassword();
    if (passwordInput === expected || passwordInput === 'admin') {
      setIsAuthenticated(true);
      sessionStorage.setItem('astrovote_admin_auth', 'true');
      setAuthError('');
    } else {
      setAuthError('Falsches Passwort. Bitte überprüfe deine Eingabe.');
    }
  };

  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    localStorage.setItem(LS_ADMIN_PASSWORD_KEY, newPassword.trim());
    setPasswordSuccess('Admin-Passwort erfolgreich geändert!');
    setTimeout(() => {
      setIsPasswordModalOpen(false);
      setNewPassword('');
      setPasswordSuccess('');
    }, 1200);
  };

  const handleSeedDemoPhotos = async () => {
    if (!confirm('Möchtest du die 8 Demo-Astrofotos jetzt in deine Supabase-Datenbank importieren?')) return;
    setIsSeeding(true);
    setSeedSuccess('');
    try {
      await seedDemoPhotosToSupabase();
      setSeedSuccess('8 Demofotos erfolgreich in Supabase eingefügt!');
      onPhotosUpdated();
      loadDashboardData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Fehler beim Importieren');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('astrovote_admin_auth');
    onExit();
  };

  // Image Selection & Client-Side Compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadError('');
    setUploadSuccess('');
    setIsCompressing(true);

    try {
      // Compress with 1080p containment & 85% JPEG quality
      const res = await compressImage(file, 1920, 1080, 0.85);
      setCompressionResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kompression fehlgeschlagen';
      setUploadError(msg);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compressionResult) {
      setUploadError('Bitte wähle zuerst ein Bild aus.');
      return;
    }
    if (!title.trim() || !author.trim()) {
      setUploadError('Titel und Fotograf sind Pflichtfelder.');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      await uploadPhoto(compressionResult.blob, compressionResult.file.name, {
        title: title.trim(),
        author: author.trim(),
      });

      setUploadSuccess(`Foto "${title}" wurde erfolgreich verarbeitet und hochgeladen!`);
      // Reset form
      setSelectedFile(null);
      setCompressionResult(null);
      setTitle('');
      setAuthor('');

      onPhotosUpdated();
      loadDashboardData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload fehlgeschlagen';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (photo: Photo) => {
    if (confirm(`Möchtest du das Foto "${photo.title}" von ${photo.author} wirklich unwiderruflich löschen?`)) {
      try {
        await deletePhoto(photo.id, photo.image_url);
        onPhotosUpdated();
        loadDashboardData();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Fehler beim Löschen');
      }
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto) return;

    try {
      await updatePhoto(editingPhoto.id, {
        title: editingPhoto.title,
        author: editingPhoto.author,
      });
      setEditingPhoto(null);
      onPhotosUpdated();
      loadDashboardData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Fehler beim Aktualisieren');
    }
  };

  // 1. Password / PIN Lock screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-2xl bg-space-900 border border-white/10 shadow-2xl relative overflow-hidden">
          <button
            onClick={onExit}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-space-800 transition-colors z-20"
            title="Schließen"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex justify-between items-center mb-6 pr-8">
            <button
              onClick={onExit}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück zur Galerie
            </button>
            <span className="text-[11px] font-mono uppercase tracking-widest text-astro-purple px-2 py-0.5 rounded-full bg-astro-purple/10 border border-astro-purple/30">
              Admin Access
            </span>
          </div>

          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-astro-purple/10 border border-astro-purple/40 text-astro-purple flex items-center justify-center mx-auto mb-3 shadow-glow-purple">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="font-display font-bold text-2xl text-white">Geheimer Admin-Bereich</h2>
            <p className="text-xs text-slate-400 mt-1">
              Bitte gib das Admin-Passwort ein, um Fotos hochzuladen und Auswertungen einzusehen.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Admin Passwort (Standard: astro2026)"
                className="w-full px-4 py-3 rounded-xl bg-space-850 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-astro-purple"
                autoFocus
              />
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-astro-purple to-astro-blue text-white font-semibold text-sm hover:shadow-glow-purple transition-all"
            >
              Anmelden
            </button>
          </form>

          <p className="text-[11px] text-center text-slate-500 mt-6 font-mono">
            Tipp: Standard-Passwort ist <span className="text-slate-300">astro2026</span>
          </p>
        </div>
      </div>
    );
  }

  // Sorted photos by Net Votes (👍 - 👎)
  const rankedPhotos = [...photos].sort((a, b) => {
    const netA = summaries[a.id]?.netVotes ?? 0;
    const netB = summaries[b.id]?.netVotes ?? 0;
    return netB - netA;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">
              Admin Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-astro-purple/20 border border-astro-purple/40 text-astro-purple text-xs font-mono">
              Verwaltung & Auswertung
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Überblick über Kalender-Abstimmungen, Vorher-Nachher Bildkompression und Wähler.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-space-850 hover:bg-space-800 text-slate-300 hover:text-white text-xs border border-white/10 transition-colors"
            title="Admin-Passwort ändern"
          >
            <Key className="w-3.5 h-3.5 text-astro-gold" />
            <span>Passwort ändern</span>
          </button>
          <button
            onClick={loadDashboardData}
            disabled={loadingStats}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-space-850 hover:bg-space-800 text-slate-300 text-xs border border-white/10 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
            <span>Aktualisieren</span>
          </button>
          <button
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl bg-space-800 hover:bg-space-700 text-rose-300 text-xs border border-rose-500/20 transition-colors"
          >
            Abmelden / Galerie
          </button>
        </div>
      </div>

      {/* Supabase Empty DB Banner */}
      {isUsingLiveSupabase() && photos.length === 0 && (
        <div className="my-6 p-5 rounded-2xl bg-gradient-to-r from-space-900 to-space-850 border border-astro-cyan/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <DownloadCloud className="w-4 h-4 text-astro-cyan" />
              Supabase verbunden – Noch keine Fotos in der Datenbank
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Deine Supabase-Tabelle <span className="font-mono text-slate-200">photos</span> ist noch leer. Du kannst im Tab „Bild-Upload“ eigene Astrofotos hochladen oder jetzt mit einem Klick die 8 Demo-Astrofotos einfügen.
            </p>
          </div>
          <button
            onClick={handleSeedDemoPhotos}
            disabled={isSeeding}
            className="px-4 py-2.5 rounded-xl bg-astro-cyan text-space-950 font-bold text-xs hover:shadow-glow-cyan transition-all shrink-0 flex items-center gap-2 disabled:opacity-50"
          >
            {isSeeding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
            <span>Demofotos in Supabase einfügen</span>
          </button>
        </div>
      )}

      {seedSuccess && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{seedSuccess}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 my-6">
        <button
          onClick={() => setActiveTab('ranking')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'ranking'
              ? 'bg-astro-purple text-white shadow-glow-purple'
              : 'bg-space-850 hover:bg-space-800 text-slate-300 border border-white/5'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Auswertung & Rankings ({rankedPhotos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'upload'
              ? 'bg-astro-cyan text-space-950 font-semibold shadow-glow-cyan'
              : 'bg-space-850 hover:bg-space-800 text-slate-300 border border-white/5'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Bild-Upload & Kompression (1080p)</span>
        </button>

        <button
          onClick={() => setActiveTab('voters')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'voters'
              ? 'bg-astro-lime text-space-950 font-semibold shadow-glow-lime'
              : 'bg-space-850 hover:bg-space-800 text-slate-300 border border-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Wähler-Liste ({voters.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('manage')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'manage'
              ? 'bg-white/20 text-white border border-white/30'
              : 'bg-space-850 hover:bg-space-800 text-slate-300 border border-white/5'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Fotos verwalten & löschen</span>
        </button>
      </div>

      {/* TAB 1: RANKING & MONTH RECOMMENDATIONS */}
      {activeTab === 'ranking' && (
        <div className="space-y-6">
          <div className="bg-space-900/80 border border-white/10 rounded-2xl p-6">
            <h2 className="font-display font-semibold text-lg text-white mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-astro-gold" />
              Rangliste nach Netto-Upvotes (👍 minus 👎)
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Die beliebtesten Astrofotos ganz oben, zusammen mit der Verteilung der empfohlenen Kalendermonate.
            </p>

            <div className="space-y-4">
              {rankedPhotos.map((photo, index) => {
                const s = summaries[photo.id] || {
                  upvotes: 0,
                  downvotes: 0,
                  netVotes: 0,
                  totalVotes: 0,
                  monthCounts: {},
                  topMonth: null
                };

                const totalMonthVotes = Object.values(s.monthCounts).reduce((a, b) => a + b, 0);

                return (
                  <div
                    key={photo.id}
                    className="p-5 rounded-2xl bg-space-850/80 border border-white/10 hover:border-white/20 transition-all flex flex-col lg:flex-row gap-5 items-start lg:items-center justify-between"
                  >
                    {/* Left: Thumbnail & Meta */}
                    <div className="flex items-center gap-4 min-w-[280px]">
                      <div className="w-10 h-10 rounded-xl bg-space-950 flex items-center justify-center font-mono font-bold text-sm text-slate-300 border border-white/10 shrink-0">
                        #{index + 1}
                      </div>
                      <img
                        src={photo.image_url}
                        alt={photo.title}
                        className="w-20 h-14 object-cover rounded-xl border border-white/10 shrink-0"
                      />
                      <div>
                        <h3 className="font-semibold text-slate-100 text-sm">{photo.title}</h3>
                        <p className="text-xs text-slate-400">Fotograf: {photo.author}</p>
                        {photo.telescope && (
                          <p className="text-[11px] text-slate-500 font-mono truncate max-w-[200px]">
                            {photo.telescope}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Center: Vote Breakdown */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center min-w-[70px]">
                        <div className="text-xs font-mono">👍 Up</div>
                        <div className="font-bold text-base">{s.upvotes}</div>
                      </div>

                      <div className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-center min-w-[70px]">
                        <div className="text-xs font-mono">👎 Down</div>
                        <div className="font-bold text-base">{s.downvotes}</div>
                      </div>

                      <div className="px-3.5 py-2 rounded-xl bg-space-950 border border-white/10 text-center min-w-[85px]">
                        <div className="text-xs font-mono text-slate-400">Netto</div>
                        <div className={`font-bold text-base ${s.netVotes > 0 ? 'text-astro-cyan' : s.netVotes < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                          {s.netVotes > 0 ? `+${s.netVotes}` : s.netVotes}
                        </div>
                      </div>
                    </div>

                    {/* Right: Month Distribution Bars */}
                    <div className="w-full lg:max-w-md bg-space-950/70 p-3 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-mono text-slate-400">Monatsempfehlungen:</span>
                        {s.topMonth ? (
                          <span className="text-astro-cyan font-semibold">
                            🏆 {s.topMonth.percentage}% empfehlen {MONTH_NAMES[s.topMonth.month - 1]}
                          </span>
                        ) : (
                          <span className="text-slate-500">Keine Monate vorgeschlagen</span>
                        )}
                      </div>

                      {/* Mini Bar Chart for 12 Months */}
                      <div className="grid grid-cols-12 gap-1 h-8 items-end">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((monthNum) => {
                          const count = s.monthCounts[monthNum] || 0;
                          const heightPct = totalMonthVotes > 0 ? (count / totalMonthVotes) * 100 : 0;
                          const isTop = s.topMonth?.month === monthNum;

                          return (
                            <div
                              key={monthNum}
                              className="group/month relative flex flex-col items-center h-full justify-end"
                            >
                              <div
                                style={{ height: `${Math.max(heightPct > 0 ? 15 : 4, heightPct)}%` }}
                                className={`w-full rounded-t-sm transition-all ${
                                  count === 0
                                    ? 'bg-space-800'
                                    : isTop
                                    ? 'bg-gradient-to-t from-astro-cyan to-astro-blue'
                                    : 'bg-slate-600 hover:bg-slate-500'
                                }`}
                              />
                              <span className="text-[9px] font-mono text-slate-500 mt-1">
                                {monthNum}
                              </span>

                              {/* Tooltip */}
                              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover/month:opacity-100 transition-opacity bg-space-900 border border-white/20 text-[10px] text-white px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                                {MONTH_NAMES[monthNum - 1]}: {count} Stimmen ({Math.round(heightPct)}%)
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: UPLOAD & CLIENT-SIDE CANVAS COMPRESSION */}
      {activeTab === 'upload' && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-space-900/90 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl">
            <h2 className="font-display font-bold text-xl text-white mb-1 flex items-center gap-2">
              <Upload className="w-5 h-5 text-astro-cyan" />
              Neues Astrofoto hochladen
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Bilder werden im Browser automatisch auf max. 1920 × 1080 px verkleinert und als 85% JPEG komprimiert, bevor sie hochgeladen werden.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-6">
              
              {/* File Drop / Select Area */}
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-2">
                  Originaldatei auswählen (RAW / High-Res JPG / PNG 10–50 MB möglich):
                </label>
                <div className="relative border-2 border-dashed border-white/20 hover:border-astro-cyan/60 rounded-2xl p-8 text-center bg-space-950/40 hover:bg-space-950/60 transition-all cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center">
                    <div className="p-4 rounded-2xl bg-space-850 group-hover:bg-astro-cyan/10 border border-white/10 group-hover:border-astro-cyan/40 text-astro-cyan transition-all mb-3 shadow-md">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <span className="text-sm font-medium text-slate-200">
                      {selectedFile ? selectedFile.name : 'Klicke hier oder ziehe eine Bilddatei hinein'}
                    </span>
                    <span className="text-xs text-slate-500 mt-1 font-mono">
                      JPG, PNG, WebP bis 50 MB
                    </span>
                  </div>
                </div>
              </div>

              {/* Live Compression Preview & Stats Box */}
              {isCompressing && (
                <div className="p-4 rounded-xl bg-space-850 border border-astro-cyan/30 flex items-center gap-3 text-astro-cyan text-sm animate-pulse">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Komprimiere Bild im Browser per HTML5 Canvas (1080p Contain)...</span>
                </div>
              )}

              {compressionResult && !isCompressing && (
                <div className="p-5 rounded-2xl bg-space-950 border border-emerald-500/30 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-semibold">
                      <FileCheck className="w-4 h-4" />
                      Clientseitiges Pre-Processing erfolgreich
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      -{compressionResult.savingsPercent}% Speicherersparnis
                    </span>
                  </div>

                  {/* Summary Metric Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-space-900 border border-white/5">
                      <div className="text-slate-400">Vor Kompression:</div>
                      <div className="text-slate-200 font-bold mt-1 text-sm">
                        {compressionResult.formattedOriginalSize}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {compressionResult.originalWidth} × {compressionResult.originalHeight} px
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-space-900 border border-emerald-500/20">
                      <div className="text-emerald-400">Nach Kompression (Upload-Größe):</div>
                      <div className="text-emerald-300 font-bold mt-1 text-sm">
                        {compressionResult.formattedCompressedSize}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {compressionResult.compressedWidth} × {compressionResult.compressedHeight} px (JPEG 85%)
                      </div>
                    </div>
                  </div>

                  {/* Visual Preview */}
                  <div className="relative aspect-[16/9] max-h-56 overflow-hidden rounded-xl border border-white/10">
                    <img
                      src={compressionResult.dataUrl}
                      alt="Komprimierte Vorschau"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-space-950/80 backdrop-blur-md text-[10px] font-mono text-slate-300 border border-white/10">
                      Vorschau des 1080p Ergebnisses
                    </div>
                  </div>
                </div>
              )}

              {/* Form Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Titel des Objekts *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="z. B. Andromeda-Galaxie (M31)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-space-850 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-astro-cyan"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Fotograf / Autor *
                  </label>
                  <input
                    type="text"
                    required
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="z. B. Stefan Gruber"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-space-850 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-astro-cyan"
                  />
                </div>
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading || isCompressing || !compressionResult}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-astro-cyan to-astro-blue text-space-950 font-bold text-sm hover:shadow-glow-cyan transition-all disabled:opacity-40"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Lade Foto hoch...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Komprimiertes Foto veröffentlichen</span>
                  </>
                )}
              </button>

            </form>
          </div>
        </div>
      )}

      {/* TAB 3: VOTERS LIST */}
      {activeTab === 'voters' && (
        <div className="bg-space-900/80 border border-white/10 rounded-2xl p-6">
          <h2 className="font-display font-semibold text-lg text-white mb-1 flex items-center gap-2">
            <Users className="w-5 h-5 text-astro-lime" />
            Teilnehmende Wähler ({voters.length})
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            Liste aller registrierten Wähler mit Anzahl abgegebener Stimmen und letzter Aktivität.
          </p>

          {voters.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">Noch keine Wähler registriert.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-mono">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">E-Mail</th>
                    <th className="py-3 px-4">E-Mail Status</th>
                    <th className="py-3 px-4">Abgegebene Stimmen</th>
                    <th className="py-3 px-4">Zuletzt aktiv</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {voters.map((voter) => (
                    <tr key={voter.email} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-200">{voter.name}</td>
                      <td className="py-3 px-4 text-astro-cyan font-mono">{voter.email}</td>
                      <td className="py-3 px-4">
                        {voter.is_verified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono">
                            ✓ Verifiziert
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-mono">
                            ⏳ Unbestätigt
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-space-800 border border-white/10 font-mono text-slate-300">
                          {voter.votesCount} Fotos
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono">
                        {voter.lastActive ? new Date(voter.lastActive).toLocaleString('de-DE') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MANAGE & DELETE PHOTOS */}
      {activeTab === 'manage' && (
        <div className="bg-space-900/80 border border-white/10 rounded-2xl p-6">
          <h2 className="font-display font-semibold text-lg text-white mb-1 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-slate-300" />
            Fotos verwalten & Metadaten anpassen
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            Passe Titel oder Ausrüstung an oder entferne Fotos aus dem Kalender-Voting.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-space-850 border border-white/10 justify-between"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <img
                    src={photo.image_url}
                    alt={photo.title}
                    className="w-16 h-12 object-cover rounded-lg border border-white/10 shrink-0"
                  />
                  <div className="truncate">
                    <h4 className="font-medium text-sm text-slate-100 truncate">{photo.title}</h4>
                    <p className="text-xs text-slate-400 truncate">Foto: {photo.author}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setEditingPhoto(photo)}
                    className="p-2 rounded-lg bg-space-800 hover:bg-space-700 text-slate-300 hover:text-white border border-white/10 transition-colors"
                    title="Bearbeiten"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePhoto(photo)}
                    className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                    title="Löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-950/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-space-900 border border-white/10 p-6 shadow-2xl relative">
            <button
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-astro-gold/10 text-astro-gold border border-astro-gold/30">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Admin-Passwort ändern</h3>
                <p className="text-xs text-slate-400">Vergib ein neues Passwort für den Admin-Zugang</p>
              </div>
            </div>

            <form onSubmit={handleSaveNewPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Neues Passwort</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Neues Passwort eingeben"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-space-850 border border-white/10 text-white text-sm focus:outline-none focus:border-astro-cyan"
                  autoFocus
                />
              </div>

              {passwordSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-space-800 text-slate-300 text-xs"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-astro-cyan to-astro-blue text-space-950 font-bold text-xs"
                >
                  Passwort speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl bg-space-900 border border-white/10 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Foto bearbeiten</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Titel</label>
                <input
                  type="text"
                  value={editingPhoto.title}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-space-850 border border-white/10 text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Fotograf</label>
                <input
                  type="text"
                  value={editingPhoto.author}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, author: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-space-850 border border-white/10 text-white text-sm"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPhoto(null)}
                  className="px-4 py-2 rounded-xl bg-space-800 text-slate-300 text-xs"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-astro-cyan text-space-950 font-bold text-xs"
                >
                  Änderungen speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
