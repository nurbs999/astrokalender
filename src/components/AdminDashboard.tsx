import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Upload, BarChart3, Users, Image as ImageIcon, Trash2, Edit2, Check,
  Lock, ArrowLeft, AlertCircle, FileCheck, RefreshCw, Sparkles, Key, DownloadCloud, X,
  ShieldCheck, AlertTriangle, FileSpreadsheet, ChevronDown, ChevronUp, Search, ThumbsUp, Calendar,
  CheckCircle2, Pin, CalendarDays, RotateCcw, Maximize2, BookOpen, ImageOff
} from 'lucide-react';
import { Photo, PhotoVoteSummary, VoterStats, DetailedVote, MONTH_NAMES, getMonthLabel, getMonthShortLabel } from '../types';
import { compressImage, CompressionResult, DINA3_MAX_WIDTH, DINA3_MAX_HEIGHT } from '../lib/imageCompressor';
import {
  uploadPhoto, updatePhoto, deletePhoto, fetchAllVotesSummary,
  fetchVotersList, fetchAllVotesDetailed, seedDemoPhotosToSupabase, isUsingLiveSupabase,
  uploadImageFile, deleteStorageImage, verifyAdminPasswordWithSupabase, updateAdminPasswordInSupabase,
  fetchCalendarSelections, saveCalendarSelection, clearAllCalendarSelections
} from '../lib/api';

interface AdminDashboardProps {
  photos: Photo[];
  onPhotosUpdated: () => void;
  onExit: () => void;
  calendarSelections?: Record<number, string>;
  onSaveCalendarSelection?: (slot: number, photoId: string | null) => Promise<void>;
  onOpenCalendarModal?: () => void;
}

const LS_ADMIN_PASSWORD_KEY = 'astrovote_admin_custom_pin';

export const getExpectedAdminPassword = (): string => {
  const custom = localStorage.getItem(LS_ADMIN_PASSWORD_KEY);
  if (custom && custom.trim()) return custom.trim();
  return import.meta.env.VITE_ADMIN_PASSWORD || '';
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  photos,
  onPhotosUpdated,
  onExit,
  calendarSelections: propsCalendarSelections,
  onSaveCalendarSelection,
  onOpenCalendarModal,
}) => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('astrovote_admin_auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Calendar Selections (curated photos for slot 0..12)
  const [calendarSelections, setCalendarSelections] = useState<Record<number, string>>(
    propsCalendarSelections || {}
  );

  useEffect(() => {
    if (propsCalendarSelections) {
      setCalendarSelections(propsCalendarSelections);
    }
  }, [propsCalendarSelections]);

  // Password change modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Seeding state
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState('');

  // Tab State: 'ranking' | 'calendar_curation' | 'votes_audit' | 'voters' | 'upload' | 'manage'
  const [activeTab, setActiveTab] = useState<'ranking' | 'calendar_curation' | 'votes_audit' | 'voters' | 'upload' | 'manage'>('ranking');

  // Stats and summaries
  const [summaries, setSummaries] = useState<Record<string, PhotoVoteSummary>>({});
  const [voters, setVoters] = useState<VoterStats[]>([]);
  const [allDetailedVotes, setAllDetailedVotes] = useState<DetailedVote[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Votes Audit Search, Filter & Accordion State
  const [auditSearch, setAuditSearch] = useState('');
  const [auditMonthFilter, setAuditMonthFilter] = useState<'all' | number>('all');
  const [auditOnlyWithVotes, setAuditOnlyWithVotes] = useState(false);
  const [expandedPhotoIds, setExpandedPhotoIds] = useState<Record<string, boolean>>({});

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
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editCompressionResult, setEditCompressionResult] = useState<CompressionResult | null>(null);
  const [isEditCompressing, setIsEditCompressing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [isEditDragging, setIsEditDragging] = useState(false);
  const [isUploadDragging, setIsUploadDragging] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Load stats
  const loadDashboardData = async () => {
    setLoadingStats(true);
    try {
      const [sumRes, votersRes, detailedVotesRes, calRes] = await Promise.all([
        fetchAllVotesSummary(),
        fetchVotersList(),
        fetchAllVotesDetailed(),
        fetchCalendarSelections(),
      ]);
      setSummaries(sumRes);
      setVoters(votersRes);
      setAllDetailedVotes(detailedVotesRes);
      setCalendarSelections(calRes);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSelectSlotPhoto = async (slot: number, photoId: string | null) => {
    if (onSaveCalendarSelection) {
      await onSaveCalendarSelection(slot, photoId);
    } else {
      await saveCalendarSelection(slot, photoId);
      onPhotosUpdated();
    }
    setCalendarSelections(prev => {
      const next = { ...prev };
      if (photoId) next[slot] = photoId;
      else delete next[slot];
      return next;
    });
  };

  const handleResetAllSelections = async () => {
    if (!confirm('Möchtest du wirklich alle manuellen Kalender-Festlegungen zurücksetzen? Der Kalender richtet sich dann wieder rein nach den Stimmen der Community.')) return;
    await clearAllCalendarSelections();
    setCalendarSelections({});
    onPhotosUpdated();
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated, photos]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const result = await verifyAdminPasswordWithSupabase(passwordInput.trim());
      if (result.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem('astrovote_admin_auth', 'true');
        setAuthError('');
      } else {
        setAuthError(result.error || 'Falsches Passwort. Bitte überprüfe deine Eingabe.');
      }
    } catch (err) {
      setAuthError('Fehler bei der Anmeldung. Bitte versuche es erneut.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    const pwd = newPassword.trim();
    setIsSavingPassword(true);
    localStorage.setItem(LS_ADMIN_PASSWORD_KEY, pwd);
    try {
      await updateAdminPasswordInSupabase(pwd);
      setPasswordSuccess('Admin-Passwort erfolgreich geändert und in Supabase synchronisiert!');
    } catch {
      setPasswordSuccess('Admin-Passwort lokal gespeichert (Supabase-Sync nicht verfügbar).');
    } finally {
      setIsSavingPassword(false);
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setNewPassword('');
        setPasswordSuccess('');
      }, 1400);
    }
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
  const processUploadFile = async (file: File) => {
    setSelectedFile(file);
    setUploadError('');
    setUploadSuccess('');
    setIsCompressing(true);

    // Dateinamen ohne Dateiendung automatisch als Titel / Bildnamen übernehmen
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').trim();
    if (nameWithoutExt) {
      setTitle(nameWithoutExt);
    }

    try {
      // Compress with DIN A3 containment (max 1920x1358 px, 1:1.4142) & 85% JPEG quality
      const res = await compressImage(file, DINA3_MAX_WIDTH, DINA3_MAX_HEIGHT, 0.85);
      setCompressionResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kompression fehlgeschlagen';
      setUploadError(msg);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUploadFile(file);
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

  const handleOpenEdit = (photo: Photo) => {
    setEditingPhoto(photo);
    setEditFile(null);
    setEditCompressionResult(null);
    setIsEditCompressing(false);
    setIsSavingEdit(false);
    setIsEditDragging(false);
    setEditError('');
  };

  const processEditFile = async (file: File) => {
    setEditFile(file);
    setEditError('');
    setIsEditCompressing(true);

    try {
      const res = await compressImage(file, DINA3_MAX_WIDTH, DINA3_MAX_HEIGHT, 0.85);
      setEditCompressionResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kompression des neuen Bildes fehlgeschlagen';
      setEditError(msg);
    } finally {
      setIsEditCompressing(false);
    }
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processEditFile(file);
  };

  const handleCancelNewEditImage = () => {
    setEditFile(null);
    setEditCompressionResult(null);
    setIsEditCompressing(false);
    setIsEditDragging(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto) return;

    setIsSavingEdit(true);
    setEditError('');

    try {
      let newImageUrl: string | undefined = undefined;

      // If a new image was selected and compressed, upload it
      if (editCompressionResult) {
        newImageUrl = await uploadImageFile(editCompressionResult.blob, editCompressionResult.file.name);

        // Delete old storage image if replacing
        if (editingPhoto.image_url && editingPhoto.image_url !== newImageUrl) {
          deleteStorageImage(editingPhoto.image_url).catch(console.warn);
        }
      }

      await updatePhoto(editingPhoto.id, {
        title: editingPhoto.title.trim(),
        author: editingPhoto.author.trim(),
        ...(newImageUrl ? { image_url: newImageUrl } : {})
      });

      setEditingPhoto(null);
      setEditFile(null);
      setEditCompressionResult(null);
      onPhotosUpdated();
      loadDashboardData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Aktualisieren';
      setEditError(msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Sorted photos by Upvotes
  const rankedPhotos = [...photos].sort((a, b) => {
    const upA = summaries[a.id]?.upvotes ?? 0;
    const upB = summaries[b.id]?.upvotes ?? 0;
    return upB - upA;
  });

  // Group detailed votes by photoId
  const votesByPhoto = useMemo(() => {
    const map: Record<string, DetailedVote[]> = {};
    photos.forEach(p => { map[p.id] = []; });
    allDetailedVotes.forEach(v => {
      if (!map[v.photo_id]) map[v.photo_id] = [];
      map[v.photo_id].push(v);
    });
    return map;
  }, [photos, allDetailedVotes]);

  // Duplicate Analysis Report across all photos
  const duplicateReport = useMemo(() => {
    const duplicateCases: { photo: Photo; email: string; count: number; votes: DetailedVote[] }[] = [];
    photos.forEach(photo => {
      const photoVotes = votesByPhoto[photo.id] || [];
      const emailMap: Record<string, DetailedVote[]> = {};
      photoVotes.forEach(v => {
        const email = v.voter_email.toLowerCase().trim();
        if (!emailMap[email]) emailMap[email] = [];
        emailMap[email].push(v);
      });
      Object.entries(emailMap).forEach(([email, votesList]) => {
        if (votesList.length > 1) {
          duplicateCases.push({ photo, email, count: votesList.length, votes: votesList });
        }
      });
    });

    return {
      hasDuplicates: duplicateCases.length > 0,
      totalDuplicates: duplicateCases.length,
      duplicateCases,
    };
  }, [photos, votesByPhoto]);

  // Accordion toggle helpers
  const togglePhotoExpanded = (photoId: string) => {
    setExpandedPhotoIds(prev => ({
      ...prev,
      [photoId]: prev[photoId] === undefined ? false : !prev[photoId]
    }));
  };

  const expandAllPhotos = () => {
    const all: Record<string, boolean> = {};
    photos.forEach(p => { all[p.id] = true; });
    setExpandedPhotoIds(all);
  };

  const collapseAllPhotos = () => {
    const all: Record<string, boolean> = {};
    photos.forEach(p => { all[p.id] = false; });
    setExpandedPhotoIds(all);
  };

  // CSV Export for votes audit
  const handleExportCsv = () => {
    const headers = [
      'Foto-ID',
      'Foto-Titel',
      'Fotograf',
      'Wähler-Name',
      'Wähler-E-Mail',
      'Bewertung',
      'Monatsempfehlung',
      'E-Mail-Status',
      'Zeitstempel (UTC)'
    ];

    const rows: string[][] = [];
    photos.forEach(photo => {
      const votes = votesByPhoto[photo.id] || [];
      if (votes.length === 0) {
        rows.push([
          photo.id,
          photo.title,
          photo.author,
          '-',
          '-',
          'Keine Stimmen',
          '-',
          '-',
          '-'
        ]);
      } else {
        votes.forEach(v => {
          const monthLabel = v.suggested_month !== null && v.suggested_month !== undefined
            ? getMonthLabel(v.suggested_month)
            : 'Keine Präferenz';
          rows.push([
            photo.id,
            photo.title,
            photo.author,
            v.voter_name || '-',
            v.voter_email,
            v.rating === 'up' ? 'Gefällt mir (👍)' : v.rating === 'down' ? 'Dagegen (👎)' : 'Neutral',
            monthLabel,
            v.is_verified ? 'Verifiziert' : 'Unbestätigt',
            v.updated_at || '-'
          ]);
        });
      }
    });

    const csvContent = [
      headers.map(h => `"${h}"`).join(';'),
      ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(';'))
    ].join('\r\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `astrokalender_stimmen_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filtered photos for audit view
  const filteredAuditPhotos = useMemo(() => {
    return photos.filter(photo => {
      const votes = votesByPhoto[photo.id] || [];

      // Only with votes filter
      if (auditOnlyWithVotes && votes.length === 0) return false;

      // Month filter
      if (auditMonthFilter !== 'all') {
        const matchesMonth = votes.some(v => v.suggested_month === auditMonthFilter);
        if (!matchesMonth) return false;
      }

      // Search query (photo title, author, voter name, voter email)
      if (auditSearch.trim()) {
        const q = auditSearch.toLowerCase().trim();
        const matchesPhoto = photo.title.toLowerCase().includes(q) || photo.author.toLowerCase().includes(q);
        const matchesVoter = votes.some(v =>
          (v.voter_name && v.voter_name.toLowerCase().includes(q)) ||
          v.voter_email.toLowerCase().includes(q)
        );
        if (!matchesPhoto && !matchesVoter) return false;
      }

      return true;
    });
  }, [photos, votesByPhoto, auditOnlyWithVotes, auditMonthFilter, auditSearch]);

  // Calendar Curation Winner Map (Slot 0..12 -> Active Photo, candidates and status)
  const slotWinnerMap = useMemo(() => {
    const map: Record<number, { photo: Photo | null; isManual: boolean; candidates: { photo: Photo; count: number }[] }> = {};

    const comparePhotosForSlot = (pA: Photo, pB: Photo, slot: number) => {
      const countA = summaries[pA.id]?.monthCounts?.[slot] || 0;
      const countB = summaries[pB.id]?.monthCounts?.[slot] || 0;
      if (countB !== countA) return countB - countA;
      const upA = summaries[pA.id]?.upvotes || 0;
      const upB = summaries[pB.id]?.upvotes || 0;
      if (upB !== upA) return upB - upA;
      return pA.title.localeCompare(pB.title);
    };

    for (let slot = 0; slot <= 12; slot++) {
      const candidates = photos
        .filter((p) => (summaries[p.id]?.monthCounts?.[slot] || 0) > 0)
        .sort((a, b) => comparePhotosForSlot(a, b, slot))
        .map(p => ({ photo: p, count: summaries[p.id]?.monthCounts?.[slot] || 0 }));

      const manualId = calendarSelections[slot];
      if (manualId) {
        const manualPhoto = photos.find(p => p.id === manualId);
        if (manualPhoto) {
          map[slot] = { photo: manualPhoto, isManual: true, candidates };
          continue;
        }
      }

      const topCandidate = candidates[0]?.photo || null;
      map[slot] = { photo: topCandidate, isManual: false, candidates };
    }

    return map;
  }, [photos, summaries, calendarSelections]);

  // Duplicate calculation across all 13 slots
  const calendarDuplicateReport = useMemo(() => {
    const photoToSlots: Record<string, number[]> = {};
    Object.entries(slotWinnerMap).forEach(([slotStr, data]) => {
      if (data.photo) {
        const slot = parseInt(slotStr, 10);
        if (!photoToSlots[data.photo.id]) photoToSlots[data.photo.id] = [];
        photoToSlots[data.photo.id].push(slot);
      }
    });

    const duplicateSlots = new Set<number>();
    const conflicts: { photo: Photo; slots: number[] }[] = [];

    Object.entries(photoToSlots).forEach(([photoId, slots]) => {
      if (slots.length > 1) {
        slots.forEach(s => duplicateSlots.add(s));
        const ph = photos.find(p => p.id === photoId);
        if (ph) conflicts.push({ photo: ph, slots });
      }
    });

    return {
      hasDuplicates: duplicateSlots.size > 0,
      totalDuplicates: duplicateSlots.size,
      duplicateSlots: Array.from(duplicateSlots),
      conflicts,
    };
  }, [slotWinnerMap, photos]);

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
              Geschützter Zugang mit sicherer Verifizierung über deine Supabase-Datenbank.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Admin Passwort"
                disabled={isLoggingIn}
                className="w-full px-4 py-3 rounded-xl bg-space-850 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-astro-purple disabled:opacity-50"
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
              disabled={isLoggingIn}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-astro-purple to-astro-blue text-white font-semibold text-sm hover:shadow-glow-purple transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Wird in Supabase geprüft...
                </>
              ) : (
                'Anmelden'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

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
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${activeTab === 'ranking'
            ? 'bg-astro-purple text-white shadow-glow-purple font-semibold'
            : 'bg-space-850 hover:bg-space-800 text-slate-300 border border-white/5'
            }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Auswertung & Rankings ({rankedPhotos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('calendar_curation')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${activeTab === 'calendar_curation'
            ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-space-950 font-bold shadow-sm'
            : 'bg-space-850 hover:bg-space-800 text-slate-300 border border-white/5'
            }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Kalender-Kuration & Monate (13)</span>
          {calendarDuplicateReport.hasDuplicates ? (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold animate-pulse">
              {calendarDuplicateReport.duplicateSlots.length} Duplikat{calendarDuplicateReport.duplicateSlots.length > 1 ? 'e' : ''}!
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
              ✓
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('votes_audit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${activeTab === 'votes_audit'
            ? 'bg-astro-cyan text-space-950 font-bold shadow-glow-cyan'
            : 'bg-space-850 hover:bg-space-800 text-slate-300 border border-white/5'
            }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Stimmen pro Bild & Audit ({allDetailedVotes.length})</span>
          {duplicateReport.hasDuplicates ? (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold">
              !
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
              ✓
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('voters')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${activeTab === 'voters'
            ? 'bg-astro-lime text-space-950 font-semibold shadow-glow-lime'
            : 'bg-space-850 hover:bg-space-800 text-slate-300 border border-white/5'
            }`}
        >
          <Users className="w-4 h-4" />
          <span>Wähler-Liste ({voters.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${activeTab === 'upload'
            ? 'bg-amber-400 text-space-950 font-semibold shadow-sm'
            : 'bg-space-850 hover:bg-space-800 text-slate-300 border border-white/5'
            }`}
        >
          <Upload className="w-4 h-4" />
          <span>Bild-Upload & Kompression (DIN A3)</span>
        </button>

        <button
          onClick={() => setActiveTab('manage')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${activeTab === 'manage'
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
              Rangliste nach Stimmen (👍 Gefällt mir)
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

                    {/* Center: Vote Count */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center min-w-[90px]">
                        <div className="text-xs font-mono">👍 Stimmen</div>
                        <div className="font-bold text-lg">{s.upvotes}</div>
                      </div>
                    </div>

                    {/* Right: Month Distribution Bars */}
                    <div className="w-full lg:max-w-md bg-space-950/70 p-3 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-mono text-slate-400">Monats-/Deckblatt-Empfehlung:</span>
                        {s.topMonth ? (
                          <span className="text-astro-cyan font-semibold">
                            🏆 {s.topMonth.percentage}% empfehlen {getMonthLabel(s.topMonth.month)}
                          </span>
                        ) : (
                          <span className="text-slate-500">Keine Monate vorgeschlagen</span>
                        )}
                      </div>

                      {/* Mini Bar Chart for Deckblatt (0) + 12 Months (1..12) */}
                      <div className="flex gap-1 h-8 items-end">
                        {Array.from({ length: 13 }, (_, i) => i).map((monthNum) => {
                          const count = s.monthCounts[monthNum] || 0;
                          const heightPct = totalMonthVotes > 0 ? (count / totalMonthVotes) * 100 : 0;
                          const isTop = s.topMonth?.month === monthNum;

                          return (
                            <div
                              key={monthNum}
                              className="group/month relative flex-1 flex flex-col items-center h-full justify-end"
                            >
                              <div
                                style={{ height: `${Math.max(heightPct > 0 ? 15 : 4, heightPct)}%` }}
                                className={`w-full rounded-t-sm transition-all ${count === 0
                                  ? 'bg-space-800'
                                  : isTop
                                    ? 'bg-gradient-to-t from-astro-cyan to-astro-blue'
                                    : 'bg-slate-600 hover:bg-slate-500'
                                  }`}
                              />
                              <span className={`text-[9px] font-mono mt-1 ${monthNum === 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                                {monthNum === 0 ? 'D' : monthNum}
                              </span>

                              {/* Tooltip */}
                              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover/month:opacity-100 transition-opacity bg-space-900 border border-white/20 text-[10px] text-white px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                                {getMonthLabel(monthNum)}: {count} Stimmen ({Math.round(heightPct)}%)
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

      {/* TAB: KALENDER-KURATION & MONATE */}
      {activeTab === 'calendar_curation' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Box */}
          <div className="bg-space-900/80 border border-white/10 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div>
                <h2 className="font-display font-semibold text-lg text-white mb-1 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-amber-400" />
                  Kalender-Kuration & Verbindliche Monatsauswahl
                </h2>
                <p className="text-xs text-slate-400">
                  Lege fest, welches Foto verbindlich für das Deckblatt und die 12 Kalendermonate genommen wird. Bei Duplikaten (wenn ein Bild in mehreren Monaten führend ist) kannst du hier den Sieger bestimmen.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {onOpenCalendarModal && (
                  <button
                    type="button"
                    onClick={onOpenCalendarModal}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-space-800 hover:bg-space-700 text-astro-cyan text-xs font-semibold border border-white/10 transition-colors shadow-sm"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Kalender-Vorschau öffnen</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleResetAllSelections}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-space-800 hover:bg-rose-500/15 text-slate-400 hover:text-rose-300 text-xs font-medium border border-white/10 hover:border-rose-500/30 transition-colors"
                  title="Alle manuellen Festlegungen zurücksetzen"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Alle Festlegungen löschen</span>
                </button>
              </div>
            </div>

            {/* Metrics Pills */}
            <div className="flex flex-wrap items-center gap-3 pt-4">
              <span className="px-3 py-1 rounded-lg bg-space-850 border border-white/10 text-xs font-mono text-slate-300">
                Motive gesamt: <strong className="text-white">13</strong> (1 Deckblatt + 12 Monate)
              </span>
              <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300">
                Fest vom Admin bestimmt: <strong>{Object.keys(calendarSelections).length}</strong>
              </span>
              <span className="px-3 py-1 rounded-lg bg-astro-cyan/10 border border-astro-cyan/30 text-xs font-mono text-astro-cyan">
                Automatisch via Community-Favorit: <strong>{13 - Object.keys(calendarSelections).length}</strong>
              </span>
              {calendarDuplicateReport.hasDuplicates ? (
                <span className="px-3 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-xs font-mono text-rose-300 font-bold flex items-center gap-1.5 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{calendarDuplicateReport.duplicateSlots.length} Monate mit Doppelbelegung!</span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-xs font-mono text-emerald-300 font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>Alle 13 Motive eindeutig – Keine Duplikate</span>
                </span>
              )}
            </div>
          </div>

          {/* Conflict Resolution Banner */}
          {calendarDuplicateReport.hasDuplicates && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border-2 border-rose-500/40 text-rose-200 text-xs shadow-xl backdrop-blur-md space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
                <strong className="text-white text-sm font-semibold">
                  Achtung: Doppelbelegung im Kalender erkannt!
                </strong>
              </div>
              <p className="text-rose-200 text-xs">
                Die folgenden Fotos sind aktuell für mehr als einen Monat ausgewählt:
              </p>
              <ul className="list-disc list-inside space-y-1 text-rose-300 font-mono text-xs pl-2">
                {calendarDuplicateReport.conflicts.map((conf, cIdx) => (
                  <li key={cIdx}>
                    Bild <strong>„{conf.photo.title}“</strong> (Foto: {conf.photo.author}) ist aktiv für:{' '}
                    <span className="text-white font-bold">
                      {conf.slots.map(s => s === 0 ? 'Deckblatt' : `${s}. ${MONTH_NAMES[s - 1]}`).join(' und ')}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-slate-300 text-xs pt-1">
                👉 <strong>Lösung:</strong> Wähle unten bei einem der betroffenen Monate eines der alternativen Bilder aus der Kandidatenliste aus und klicke auf <em>„Als Monatsbild festlegen“</em>.
              </p>
            </div>
          )}

          {/* 1. DECKBLATT (HERO CARD) */}
          <div className="bg-space-900/80 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">Kalender-Deckblatt (Titelbild)</h3>
                  <p className="text-xs text-slate-400">Das Titelmotiv des Jahreskalenders 2027</p>
                </div>
              </div>
              {slotWinnerMap[0]?.isManual ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Festgelegt vom Admin
                </span>
              ) : slotWinnerMap[0]?.photo ? (
                <span className="px-2.5 py-1 rounded-full bg-astro-cyan/15 border border-astro-cyan/30 text-astro-cyan text-xs font-mono">
                  👥 Community-Favorit
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-space-800 text-slate-400 text-xs font-mono">
                  Noch unbesetzt
                </span>
              )}
            </div>

            {slotWinnerMap[0]?.photo ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 relative aspect-[1.4142/1] rounded-xl overflow-hidden bg-space-950 border border-white/10 flex items-center justify-center">
                  <img
                    src={slotWinnerMap[0].photo.image_url}
                    alt={slotWinnerMap[0].photo.title}
                    className="w-full h-full object-contain"
                  />
                  {calendarDuplicateReport.duplicateSlots.includes(0) && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded bg-rose-500/90 text-white font-mono text-[10px] font-bold shadow-md animate-pulse">
                      ⚠️ Duplikat
                    </div>
                  )}
                </div>

                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <h4 className="font-display font-bold text-lg text-white">{slotWinnerMap[0].photo.title}</h4>
                    <p className="text-xs text-slate-400">Fotograf: <strong className="text-slate-200">{slotWinnerMap[0].photo.author}</strong></p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-mono">
                        {summaries[slotWinnerMap[0].photo.id]?.monthCounts?.[0] || 0} Stimmen als Deckblatt
                      </span>
                      <span className="px-2 py-0.5 rounded bg-space-800 text-slate-400 text-xs font-mono">
                        {summaries[slotWinnerMap[0].photo.id]?.upvotes || 0} Upvotes insgesamt
                      </span>
                    </div>
                  </div>

                  {calendarDuplicateReport.duplicateSlots.includes(0) && (
                    <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Dieses Bild ist auch für andere Kalendermonate ausgewählt! Lege unten ein alternatives Bild fest.</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    {slotWinnerMap[0].isManual ? (
                      <button
                        type="button"
                        onClick={() => handleSelectSlotPhoto(0, null)}
                        className="px-4 py-2 rounded-xl bg-space-800 hover:bg-space-700 text-slate-300 hover:text-rose-300 text-xs font-mono border border-white/10 transition-colors"
                      >
                        Freigeben (wieder automatischen Community-Favoriten nutzen)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectSlotPhoto(0, slotWinnerMap[0].photo!.id)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-space-950 font-bold text-xs font-mono hover:from-amber-300 hover:to-amber-400 transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Pin className="w-3.5 h-3.5" />
                        <span>Dieses Bild als Deckblatt festlegen</span>
                      </button>
                    )}
                  </div>

                  {/* Alternative Candidates for Cover */}
                  {slotWinnerMap[0].candidates.filter(c => c.photo.id !== slotWinnerMap[0].photo?.id).length > 0 && (
                    <div className="pt-3 border-t border-white/10">
                      <span className="text-xs font-mono text-slate-400 block mb-2">Alternative Deckblatt-Kandidaten:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {slotWinnerMap[0].candidates
                          .filter(c => c.photo.id !== slotWinnerMap[0].photo?.id)
                          .map(({ photo: cPhoto, count }) => (
                            <div key={cPhoto.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-space-850 border border-white/5">
                              <div className="flex items-center gap-2 min-w-0">
                                <img src={cPhoto.image_url} alt={cPhoto.title} className="w-10 h-8 object-cover rounded bg-space-900 shrink-0" />
                                <div className="truncate text-xs">
                                  <div className="font-medium text-white truncate">{cPhoto.title}</div>
                                  <div className="text-[10px] text-slate-400">{count} Stimmen</div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSelectSlotPhoto(0, cPhoto.id)}
                                className="px-2.5 py-1 rounded-lg bg-space-800 hover:bg-amber-400 hover:text-space-950 text-amber-300 text-[11px] font-mono transition-colors shrink-0"
                              >
                                Festlegen
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Manual Dropdown Selector */}
                  <div className="pt-2">
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleSelectSlotPhoto(0, e.target.value);
                      }}
                      defaultValue=""
                      className="text-xs font-mono bg-space-850 border border-white/10 rounded-xl px-3 py-2 text-slate-300 w-full max-w-sm focus:outline-none focus:border-amber-400"
                    >
                      <option value="" disabled>Anderes Bild aus Galerie als Deckblatt wählen...</option>
                      {photos.map(p => (
                        <option key={p.id} value={p.id}>{p.title} ({p.author})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <ImageOff className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm">Noch kein Deckblatt ausgewählt.</p>
                <div className="mt-4 max-w-xs mx-auto">
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleSelectSlotPhoto(0, e.target.value);
                    }}
                    defaultValue=""
                    className="text-xs font-mono bg-space-850 border border-white/10 rounded-xl px-3 py-2 text-slate-300 w-full focus:outline-none focus:border-amber-400"
                  >
                    <option value="" disabled>Bild als Deckblatt zuweisen...</option>
                    {photos.map(p => (
                      <option key={p.id} value={p.id}>{p.title} ({p.author})</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* 2. DIE 12 MONATE (JANUAR - DEZEMBER) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-astro-cyan" />
                <span>Die 12 Kalendermonate (Januar – Dezember)</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Klicke bei einem Monat auf „Festlegen“, um den Favoriten zu fixieren oder Duplikate aufzulösen
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {MONTH_NAMES.map((mName, idx) => {
                const monthNum = idx + 1;
                const data = slotWinnerMap[monthNum];
                const isDuplicate = calendarDuplicateReport.duplicateSlots.includes(monthNum);
                const otherCandidates = data?.candidates?.filter(c => c.photo.id !== data.photo?.id) || [];

                return (
                  <div
                    key={monthNum}
                    className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden ${
                      isDuplicate
                        ? 'border-2 border-rose-500 bg-rose-950/20 shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/50'
                        : data?.isManual
                        ? 'border-emerald-500/40 bg-space-900/95 shadow-md'
                        : data?.photo
                        ? 'border-white/10 bg-space-900/70 hover:border-astro-cyan/30'
                        : 'border-dashed border-white/10 bg-space-950/40'
                    }`}
                  >
                    {/* Month Card Header */}
                    <div className={`p-3.5 border-b flex items-center justify-between text-xs font-mono ${
                      isDuplicate
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-bold'
                        : data?.isManual
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 font-bold'
                        : 'bg-space-850/80 border-white/5 text-slate-300'
                    }`}>
                      <span className="flex items-center gap-1.5 font-bold">
                        {isDuplicate && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                        <span>{monthNum}. {mName}</span>
                      </span>
                      {data?.isManual ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-500/50 text-emerald-300 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Fest
                        </span>
                      ) : data?.photo ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-astro-cyan/15 text-astro-cyan border border-astro-cyan/30">
                          Community
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Unbesetzt</span>
                      )}
                    </div>

                    {/* Month Active Photo */}
                    <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                      {data?.photo ? (
                        <div>
                          <div className="relative aspect-[1.4142/1] rounded-xl overflow-hidden bg-space-950 border border-white/10 flex items-center justify-center">
                            <img
                              src={data.photo.image_url}
                              alt={data.photo.title}
                              className="w-full h-full object-contain"
                            />
                            {isDuplicate && (
                              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-rose-500 text-white font-mono text-[9px] font-bold shadow-md animate-pulse">
                                ⚠️ Doppelbelegung
                              </div>
                            )}
                          </div>

                          <div className="mt-2.5">
                            <div className="font-semibold text-xs text-white truncate" title={data.photo.title}>
                              {data.photo.title}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              Foto: {data.photo.author}
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono mt-1 text-slate-400">
                              <span className="text-astro-cyan font-bold">
                                {summaries[data.photo.id]?.monthCounts?.[monthNum] || 0} Stimmen für {getMonthShortLabel(monthNum)}
                              </span>
                              <span>
                                {summaries[data.photo.id]?.upvotes || 0} Upvotes
                              </span>
                            </div>
                          </div>

                          {/* Quick Pin / Release Action */}
                          <div className="mt-2.5">
                            {data.isManual ? (
                              <button
                                type="button"
                                onClick={() => handleSelectSlotPhoto(monthNum, null)}
                                className="w-full py-1.5 rounded-lg bg-space-850 hover:bg-space-800 text-slate-400 hover:text-rose-300 border border-white/10 text-xs font-mono transition-colors"
                              >
                                Freigeben (Community nutzen)
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSelectSlotPhoto(monthNum, data.photo!.id)}
                                className="w-full py-1.5 rounded-lg bg-astro-cyan hover:bg-cyan-300 text-space-950 font-bold text-xs font-mono transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                              >
                                <Pin className="w-3 h-3" />
                                <span>Als {getMonthShortLabel(monthNum)} festlegen</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-[1.4142/1] rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center p-3 text-center text-slate-500 text-xs">
                          <ImageOff className="w-6 h-6 mb-1 text-slate-600" />
                          <span>Noch kein Bild zugewiesen</span>
                        </div>
                      )}

                      {/* Alternatives / Candidates with votes */}
                      <div className="pt-2 border-t border-white/10 space-y-2">
                        {otherCandidates.length > 0 && (
                          <div>
                            <span className="text-[10px] font-mono text-slate-400 block mb-1.5">
                              Andere Vorschläge für {mName}:
                            </span>
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                              {otherCandidates.map(({ photo: cPhoto, count }) => (
                                <div key={cPhoto.id} className="flex items-center justify-between gap-1.5 p-1.5 rounded-lg bg-space-850 border border-white/5 text-[11px]">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <img src={cPhoto.image_url} alt={cPhoto.title} className="w-8 h-6 object-cover rounded bg-space-900 shrink-0" />
                                    <div className="truncate">
                                      <div className="font-medium text-white truncate text-[11px]">{cPhoto.title}</div>
                                      <div className="text-[9px] text-slate-400">{count} Stimmen</div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectSlotPhoto(monthNum, cPhoto.id)}
                                    className="px-2 py-0.5 rounded bg-space-800 hover:bg-astro-cyan hover:text-space-950 text-astro-cyan text-[10px] font-mono transition-colors shrink-0"
                                    title={`Foto "${cPhoto.title}" als verbindliches Bild für ${mName} festlegen`}
                                  >
                                    Festlegen
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Manual photo select dropdown */}
                        <div>
                          <select
                            onChange={(e) => {
                              if (e.target.value) handleSelectSlotPhoto(monthNum, e.target.value);
                            }}
                            defaultValue=""
                            className="w-full text-[10px] font-mono bg-space-850 border border-white/10 rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-astro-cyan truncate"
                          >
                            <option value="" disabled>Aus allen Fotos wählen...</option>
                            {photos.map(p => (
                              <option key={p.id} value={p.id}>{p.title} ({p.author})</option>
                            ))}
                          </select>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VOTES AUDIT (WER HAT FÜR WELCHE BILDER GESTIMMT) */}
      {activeTab === 'votes_audit' && (
        <div className="space-y-6">
          <div className="bg-space-900/80 border border-white/10 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div>
                <h2 className="font-display font-semibold text-lg text-white mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-astro-cyan" />
                  Stimmen-Audit: Wer hat für welche Bilder abgestimmt?
                </h2>
                <p className="text-xs text-slate-400">
                  Detaillierte Übersicht aller abgegebenen Stimmen pro Bild mit Wählerangaben, Monatsvorschlägen und automatischer Duplikat-Validierung.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={expandAllPhotos}
                  className="px-3 py-1.5 rounded-xl bg-space-850 hover:bg-space-800 text-slate-300 hover:text-white border border-white/10 text-xs transition-colors flex items-center gap-1.5"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Alle aufklappen</span>
                </button>
                <button
                  type="button"
                  onClick={collapseAllPhotos}
                  className="px-3 py-1.5 rounded-xl bg-space-850 hover:bg-space-800 text-slate-300 hover:text-white border border-white/10 text-xs transition-colors flex items-center gap-1.5"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Alle zuklappen</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-astro-lime text-space-950 font-bold text-xs hover:shadow-glow-lime transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>CSV Exportieren</span>
                </button>
              </div>
            </div>

            {/* Top Metric & Integrity Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
              <div className="p-4 rounded-xl bg-space-950/70 border border-white/10">
                <div className="text-[11px] font-mono text-slate-400 mb-1">Abgegebene Stimmen</div>
                <div className="text-2xl font-bold font-mono text-white flex items-center justify-between">
                  <span>{allDetailedVotes.length}</span>
                  <ThumbsUp className="w-5 h-5 text-astro-cyan opacity-80" />
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Über alle {photos.length} Fotos hinweg</div>
              </div>

              <div className="p-4 rounded-xl bg-space-950/70 border border-white/10">
                <div className="text-[11px] font-mono text-slate-400 mb-1">Registrierte Wähler</div>
                <div className="text-2xl font-bold font-mono text-astro-lime flex items-center justify-between">
                  <span>{voters.length}</span>
                  <Users className="w-5 h-5 text-astro-lime opacity-80" />
                </div>
                <div className="text-[10px] text-slate-400 mt-1">{voters.filter(v => v.is_verified).length} mit verifizierter E-Mail</div>
              </div>

              <div className="p-4 rounded-xl bg-space-950/70 border border-white/10">
                <div className="text-[11px] font-mono text-slate-400 mb-1">Fotos mit Stimmen</div>
                <div className="text-2xl font-bold font-mono text-astro-purple flex items-center justify-between">
                  <span>{photos.filter(p => (votesByPhoto[p.id]?.length || 0) > 0).length} / {photos.length}</span>
                  <ImageIcon className="w-5 h-5 text-astro-purple opacity-80" />
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Im Kalender-Voting bewertet</div>
              </div>

              <div className={`p-4 rounded-xl border ${duplicateReport.hasDuplicates
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}>
                <div className="text-[11px] font-mono mb-1 flex items-center justify-between">
                  <span>Duplikat-Prüfung</span>
                  {duplicateReport.hasDuplicates ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                </div>
                <div className="text-sm font-bold flex items-center gap-1.5">
                  {duplicateReport.hasDuplicates ? (
                    <span>⚠️ {duplicateReport.totalDuplicates} Duplikat-Fälle!</span>
                  ) : (
                    <span>✓ Keine doppelten Stimmen</span>
                  )}
                </div>
                <div className="text-[10px] mt-1 text-slate-300">
                  {duplicateReport.hasDuplicates
                    ? 'Achtung: Mehrfache Stimmabgaben für denselben Wähler auf einem Foto gefunden.'
                    : '100% Einzigartigkeit: Max. 1 Stimme pro Wähler je Foto.'}
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-space-950/50 rounded-xl border border-white/10 mb-6">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Foto-Titel, Fotograf oder Wähler-Name/E-Mail filtern..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-space-850 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-astro-cyan"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={auditMonthFilter}
                  onChange={(e) => setAuditMonthFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
                  className="bg-space-850 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-astro-cyan cursor-pointer"
                >
                  <option value="all">Alle Monate / Deckblatt</option>
                  <option value={0}>📖 Nur Deckblatt</option>
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i + 1} value={i + 1}>📅 Nur {name}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setAuditOnlyWithVotes(prev => !prev)}
                  className={`px-3 py-2 rounded-lg text-xs font-mono border transition-colors flex items-center gap-1.5 cursor-pointer ${auditOnlyWithVotes
                    ? 'bg-astro-cyan/20 border-astro-cyan text-astro-cyan font-semibold'
                    : 'bg-space-850 border-white/10 text-slate-400 hover:text-white'
                    }`}
                >
                  <span>Nur mit Stimmen</span>
                </button>
              </div>
            </div>

            {/* List of Photos with Votes */}
            <div className="space-y-4">
              {filteredAuditPhotos.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Keine Fotos entsprechen den aktuellen Filtern.
                </div>
              ) : (
                filteredAuditPhotos.map((photo, photoIdx) => {
                  const votes = votesByPhoto[photo.id] || [];
                  const isExpanded = expandedPhotoIds[photo.id] ?? true;

                  // Check duplicates on this specific photo
                  const emailCountMap: Record<string, number> = {};
                  votes.forEach(v => {
                    const e = v.voter_email.toLowerCase().trim();
                    emailCountMap[e] = (emailCountMap[e] || 0) + 1;
                  });
                  const photoHasDuplicate = Object.values(emailCountMap).some(count => count > 1);

                  // Month summaries for this photo
                  const photoMonthCounts: Record<number, number> = {};
                  votes.forEach(v => {
                    if (v.suggested_month !== null && v.suggested_month !== undefined) {
                      photoMonthCounts[v.suggested_month] = (photoMonthCounts[v.suggested_month] || 0) + 1;
                    }
                  });

                  return (
                    <div
                      key={photo.id}
                      className={`rounded-2xl border transition-all overflow-hidden ${photoHasDuplicate
                        ? 'bg-rose-950/20 border-rose-500/50 shadow-lg'
                        : 'bg-space-850/70 border-white/10 hover:border-white/20'
                        }`}
                    >
                      {/* Photo Header Bar */}
                      <div
                        onClick={() => togglePhotoExpanded(photo.id)}
                        className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer select-none bg-space-900/50 hover:bg-space-900 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-space-950 flex items-center justify-center font-mono font-bold text-xs text-slate-400 shrink-0 border border-white/10">
                            #{photoIdx + 1}
                          </div>
                          <img
                            src={photo.image_url}
                            alt={photo.title}
                            className="w-16 h-11 object-contain rounded-lg bg-space-950 border border-white/10 shrink-0"
                          />
                          <div className="truncate min-w-0">
                            <h3 className="font-semibold text-sm text-white truncate">{photo.title}</h3>
                            <p className="text-xs text-slate-400 truncate">Fotograf: {photo.author}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end sm:self-center">
                          {/* Month breakdown tags */}
                          <div className="hidden lg:flex items-center gap-1 text-[10px] font-mono">
                            {Object.entries(photoMonthCounts).map(([mStr, count]) => {
                              const m = parseInt(mStr, 10);
                              return (
                                <span
                                  key={m}
                                  className={`px-1.5 py-0.5 rounded border ${m === 0
                                    ? 'bg-amber-400/15 border-amber-400/30 text-amber-300'
                                    : 'bg-astro-cyan/10 border-astro-cyan/20 text-astro-cyan'
                                    }`}
                                >
                                  {count}x {m === 0 ? 'Deckblatt' : MONTH_NAMES[m - 1]}
                                </span>
                              );
                            })}
                          </div>

                          {/* Vote count pill */}
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 ${votes.length > 0
                            ? 'bg-astro-cyan/15 text-astro-cyan border border-astro-cyan/30'
                            : 'bg-space-950 text-slate-500 border border-white/5'
                            }`}>
                            <ThumbsUp className="w-3 h-3" />
                            <span>{votes.length} {votes.length === 1 ? 'Stimme' : 'Stimmen'}</span>
                          </span>

                          {/* Duplicate badge for this photo */}
                          {photoHasDuplicate ? (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              <span>Doppelte Stimme erkannt!</span>
                            </span>
                          ) : votes.length > 0 ? (
                            <span className="px-2 py-1 rounded-xl text-[11px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hidden md:inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Keine Duplikate ({votes.length} eindeutige Wähler)</span>
                            </span>
                          ) : null}

                          {/* Accordion Chevron */}
                          <div className="p-1 rounded-lg text-slate-400 hover:text-white">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Voter Table */}
                      {isExpanded && (
                        <div className="border-t border-white/10 p-4 bg-space-950/60">
                          {votes.length === 0 ? (
                            <p className="text-slate-500 text-xs py-3 text-center italic">
                              Bisher wurden noch keine Stimmen für dieses Foto abgegeben.
                            </p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-white/10 text-slate-400 font-mono text-[11px]">
                                    <th className="py-2.5 px-3">Wähler</th>
                                    <th className="py-2.5 px-3">E-Mail</th>
                                    <th className="py-2.5 px-3">E-Mail Status</th>
                                    <th className="py-2.5 px-3">Bewertung</th>
                                    <th className="py-2.5 px-3">Monatsempfehlung</th>
                                    <th className="py-2.5 px-3">Stimmabgabe am</th>
                                    <th className="py-2.5 px-3 text-right">Integrität</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                  {votes.map((vote, vIdx) => {
                                    const emailKey = vote.voter_email.toLowerCase().trim();
                                    const isDuplicateVote = emailCountMap[emailKey] > 1;

                                    return (
                                      <tr
                                        key={vote.id || `${vote.photo_id}-${vote.voter_email}-${vIdx}`}
                                        className={`transition-colors ${isDuplicateVote
                                          ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-200'
                                          : 'hover:bg-white/5'
                                          }`}
                                      >
                                        <td className="py-2.5 px-3 font-medium text-slate-200">
                                          {vote.voter_name || 'Anonym'}
                                        </td>
                                        <td className="py-2.5 px-3 font-mono text-astro-cyan text-[11px]">
                                          {vote.voter_email}
                                        </td>
                                        <td className="py-2.5 px-3">
                                          {vote.is_verified ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                                              ✓ Verifiziert
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30">
                                              ⏳ Unbestätigt
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3">
                                          {vote.rating === 'up' ? (
                                            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold font-mono">
                                              <ThumbsUp className="w-3 h-3 fill-emerald-400" />
                                              <span>Gefällt mir</span>
                                            </span>
                                          ) : (
                                            <span className="text-slate-500 font-mono">–</span>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 font-mono">
                                          {vote.suggested_month === 0 ? (
                                            <span className="px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/30 font-semibold">
                                              📖 Deckblatt
                                            </span>
                                          ) : vote.suggested_month && vote.suggested_month >= 1 && vote.suggested_month <= 12 ? (
                                            <span className="px-2 py-0.5 rounded-lg bg-astro-cyan/15 text-astro-cyan border border-astro-cyan/30">
                                              📅 {getMonthLabel(vote.suggested_month)}
                                            </span>
                                          ) : (
                                            <span className="text-slate-500">– Keine</span>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                                          {vote.updated_at ? new Date(vote.updated_at).toLocaleString('de-DE') : '–'}
                                        </td>
                                        <td className="py-2.5 px-3 text-right">
                                          {isDuplicateVote ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500 text-white font-mono text-[10px] font-bold animate-pulse">
                                              ⚠️ Duplikat!
                                            </span>
                                          ) : (
                                            <span className="text-emerald-400 font-mono text-[10px]">
                                              ✓ 1 Stimme
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
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
              Bilder werden im Browser automatisch auf DIN A3 (max. 1920 × 1358 px, Seitenverhältnis 1:1,4142) skaliert und als 85% JPEG komprimiert, bevor sie hochgeladen werden.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-6">

              {/* File Drop / Select Area */}
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-2">
                  Originaldatei auswählen (RAW / High-Res JPG / PNG 10–50 MB möglich):
                </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsUploadDragging(true); }}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsUploadDragging(true); }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setIsUploadDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsUploadDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type.startsWith('image/')) {
                      processUploadFile(file);
                    }
                  }}
                  className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer group ${isUploadDragging
                    ? 'border-astro-cyan bg-astro-cyan/15 ring-2 ring-astro-cyan/50 shadow-glow-cyan'
                    : 'border-white/20 hover:border-astro-cyan/60 bg-space-950/40 hover:bg-space-950/60'
                    }`}
                >
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
                      {isUploadDragging
                        ? 'Bilddatei hier loslassen...'
                        : selectedFile
                          ? selectedFile.name
                          : 'Klicke hier oder ziehe eine Bilddatei hinein'}
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
                  <span>Komprimiere Bild im Browser per HTML5 Canvas (DIN A3 Contain)...</span>
                </div>
              )}

              {compressionResult && !isCompressing && (
                <div className="p-5 rounded-2xl bg-space-950 border border-emerald-500/30 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-semibold">
                      <FileCheck className="w-4 h-4" />
                      Clientseitiges Pre-Processing erfolgreich (DIN A3)
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

                  {/* Visual Preview preserving true aspect ratio */}
                  <div className="relative max-h-72 overflow-hidden rounded-xl border border-white/10 bg-space-900/60 flex items-center justify-center p-2">
                    <img
                      src={compressionResult.dataUrl}
                      alt="Komprimierte Vorschau"
                      className="max-h-64 max-w-full object-contain rounded-lg shadow-md"
                    />
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-space-950/85 backdrop-blur-md text-[11px] font-mono text-slate-300 border border-white/10 flex items-center gap-2">
                      <span className="text-emerald-400 font-semibold">{compressionResult.compressedWidth} × {compressionResult.compressedHeight} px</span>
                      <span className="text-slate-500">•</span>
                      <span>Seitenverhältnis {(compressionResult.compressedWidth / compressionResult.compressedHeight).toFixed(3)}:1</span>
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
                    onClick={() => handleOpenEdit(photo)}
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
                <p className="text-xs text-slate-400">
                  Wird in deiner Supabase-Datenbank (<code className="text-astro-cyan">admin_config</code>) gespeichert
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveNewPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Neues Passwort</label>
                <input
                  type="password"
                  required
                  disabled={isSavingPassword}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Neues Passwort eingeben"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-space-850 border border-white/10 text-white text-sm focus:outline-none focus:border-astro-cyan disabled:opacity-50"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Tipp: Du kannst das Passwort auch jederzeit direkt im Supabase Dashboard unter <strong>Table Editor &rarr; admin_config</strong> eintragen oder anpassen.
                </p>
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
                  disabled={isSavingPassword}
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-space-800 text-slate-300 text-xs hover:bg-space-700 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-astro-cyan to-astro-blue text-space-950 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingPassword ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Wird gespeichert...
                    </>
                  ) : (
                    'Passwort speichern'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-space-900 border border-white/10 p-6 sm:p-7 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-astro-cyan" />
                <span>Foto bearbeiten</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingPhoto(null);
                  handleCancelNewEditImage();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-space-800 transition-colors"
                title="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">

              {/* Image Preview & Replacement Section with Drag & Drop */}
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-2">
                  Foto-Vorschau & Bilddatei (Klicken oder neues Bild hierher ziehen):
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsEditDragging(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsEditDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setIsEditDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsEditDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type.startsWith('image/')) {
                      processEditFile(file);
                    }
                  }}
                  className={`relative rounded-xl border-2 transition-all p-3 overflow-hidden ${isEditDragging
                    ? 'border-astro-cyan bg-astro-cyan/15 ring-2 ring-astro-cyan/50 shadow-glow-cyan'
                    : 'border-white/10 bg-space-950/80 hover:border-astro-cyan/40'
                    }`}
                >
                  {/* Drag overlay indicator */}
                  {isEditDragging && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-space-950/90 border-2 border-dashed border-astro-cyan rounded-xl backdrop-blur-sm pointer-events-none">
                      <Upload className="w-10 h-10 text-astro-cyan animate-bounce mb-2" />
                      <span className="text-sm font-bold text-white">Neues Bild hier loslassen</span>
                      <span className="text-xs text-astro-cyan font-mono mt-1">Wird automatisch auf DIN A3 optimiert</span>
                    </div>
                  )}

                  <div
                    onClick={() => editFileInputRef.current?.click()}
                    className="relative aspect-[1.4142/1] max-h-56 w-full overflow-hidden rounded-lg bg-space-900 flex items-center justify-center cursor-pointer group"
                    title="Klicken oder Bild hineinziehen, um das Foto zu ersetzen"
                  >
                    <img
                      src={editCompressionResult ? editCompressionResult.dataUrl : editingPhoto.image_url}
                      alt={editingPhoto.title}
                      className="max-h-full max-w-full object-contain rounded-md transition-transform duration-300 group-hover:scale-[1.02]"
                    />

                    {/* Status Pill on Preview */}
                    <div className="absolute top-2 left-2 px-2.5 py-1 rounded-md bg-space-950/85 backdrop-blur-md text-[11px] font-mono border border-white/10 pointer-events-none">
                      {editCompressionResult ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />
                          Neues Bild ausgewählt ({editCompressionResult.compressedWidth} × {editCompressionResult.compressedHeight} px)
                        </span>
                      ) : (
                        <span className="text-slate-400">Aktuelles Bild (Klicken oder neues Bild hier ablegen)</span>
                      )}
                    </div>
                  </div>

                  {/* Compression stats for new image */}
                  {editCompressionResult && (
                    <div className="mt-2.5 p-2.5 rounded-lg bg-space-900 border border-emerald-500/20 text-xs font-mono flex items-center justify-between">
                      <div className="text-slate-300 text-[11px]">
                        <span className="text-emerald-400 font-bold">{editCompressionResult.formattedCompressedSize}</span>
                        <span className="text-slate-500"> (vormals {editCompressionResult.formattedOriginalSize}, -{editCompressionResult.savingsPercent}%)</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelNewEditImage();
                        }}
                        className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline font-medium"
                      >
                        Altes Bild behalten
                      </button>
                    </div>
                  )}

                  {/* Hidden file input */}
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleEditFileChange}
                    className="hidden"
                    disabled={isEditCompressing || isSavingEdit}
                  />

                  {/* File selector input */}
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={isEditCompressing || isSavingEdit}
                      className="relative flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl border border-dashed border-white/20 hover:border-astro-cyan/60 bg-space-900/60 hover:bg-space-900 transition-colors cursor-pointer text-xs font-mono text-slate-300 hover:text-white"
                    >
                      {isEditCompressing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-astro-cyan" />
                          <span className="text-astro-cyan">Komprimiere neues Bild (DIN A3)...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-astro-cyan" />
                          <span>{editCompressionResult ? 'Anderes Bild wählen oder hierher ziehen' : 'Neues Bild wählen oder hierher ziehen (DIN A3)'}</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] font-mono text-slate-500 mt-1 text-center">
                      Drag & Drop direkt auf das Bild möglich. Wird automatisch auf DIN A3 optimiert.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Titel des Objekts *</label>
                <input
                  type="text"
                  value={editingPhoto.title}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-space-850 border border-white/10 text-white text-sm focus:border-astro-cyan focus:outline-none focus:ring-1 focus:ring-astro-cyan"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Fotograf *</label>
                <input
                  type="text"
                  value={editingPhoto.author}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, author: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-space-850 border border-white/10 text-white text-sm focus:border-astro-cyan focus:outline-none focus:ring-1 focus:ring-astro-cyan"
                  required
                />
              </div>

              {editError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPhoto(null);
                    handleCancelNewEditImage();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-space-800 hover:bg-space-700 text-slate-300 text-xs transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || isEditCompressing}
                  className="px-5 py-2.5 rounded-xl bg-astro-cyan hover:bg-astro-cyan/90 text-space-950 font-bold text-xs flex items-center gap-2 shadow-glow-cyan/20 transition-all disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Speichere Änderungen...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Änderungen speichern</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
