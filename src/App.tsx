import { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles, Filter, CheckCircle2, Circle, ArrowUpDown,
  RefreshCw, CalendarDays, Rocket, AlertCircle, MailCheck
} from 'lucide-react';
import { Photo, Voter, Vote, Rating, PhotoVoteSummary } from './types';
import {
  fetchPhotos, fetchUserVotes, saveVote, fetchAllVotesSummary,
  isUsingLiveSupabase, registerOrUpdateVoter
} from './lib/api';
import { Navbar } from './components/Navbar';
import { PhotoCard } from './components/PhotoCard';
import { Lightbox } from './components/Lightbox';
import { VoterModal } from './components/VoterModal';
import { EmailVerificationModal } from './components/EmailVerificationModal';
import { AdminDashboard } from './components/AdminDashboard';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { ToastContainer, ToastMessage } from './components/Toast';

const LS_CURRENT_VOTER = 'astrovote_current_voter_v1';

export function App() {
  // Photos & Data
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<Record<string, PhotoVoteSummary>>({});

  // Voter & Votes
  const [currentVoter, setCurrentVoter] = useState<Voter | null>(() => {
    try {
      const stored = localStorage.getItem(LS_CURRENT_VOTER);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [userVotes, setUserVotes] = useState<Record<string, Vote>>({});

  // Navigation / View Modes
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    return window.location.hash === '#admin';
  });

  // Modals & UI States
  const [isVoterModalOpen, setIsVoterModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState<Photo | null>(null);
  const [pendingVote, setPendingVote] = useState<{ photoId: string; rating: Rating; month: number | null } | null>(null);

  // Gallery Filters
  const [filterMode, setFilterMode] = useState<'all' | 'unvoted' | 'voted'>('all');
  const [sortMode, setSortMode] = useState<'default' | 'top_rated' | 'title'>('default');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Sync hash for #admin
  useEffect(() => {
    const handleHashChange = () => {
      setIsAdminMode(window.location.hash === '#admin');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const toggleAdmin = () => {
    if (isAdminMode) {
      window.location.hash = '';
      setIsAdminMode(false);
    } else {
      window.location.hash = 'admin';
      setIsAdminMode(true);
    }
  };

  // Initial Data Load
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedPhotos, summaryMap] = await Promise.all([
        fetchPhotos(),
        fetchAllVotesSummary(),
      ]);
      setPhotos(fetchedPhotos);
      setSummaries(summaryMap);
    } catch (err) {
      console.error('Error loading initial data:', err);
      addToast('Fehler beim Laden der Fotos', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load User Votes when currentVoter changes
  const loadUserVotes = useCallback(async (voter: Voter | null) => {
    if (!voter?.email) {
      setUserVotes({});
      return;
    }
    try {
      const votes = await fetchUserVotes(voter.email);
      setUserVotes(votes);
    } catch (err) {
      console.error('Error fetching user votes:', err);
    }
  }, []);

  useEffect(() => {
    loadUserVotes(currentVoter);
  }, [currentVoter, loadUserVotes]);

  // Execute a vote
  const handleVote = async (photoId: string, rating: Rating, month: number | null) => {
    if (!currentVoter) {
      // Prompt voter for identity first
      setPendingVote({ photoId, rating, month });
      setIsVoterModalOpen(true);
      return;
    }

    const photo = photos.find(p => p.id === photoId);
    const photoTitle = photo ? photo.title : 'Bild';

    // Optimistic UI update
    setUserVotes(prev => ({
      ...prev,
      [photoId]: {
        photo_id: photoId,
        voter_email: currentVoter.email,
        rating,
        suggested_month: month,
        updated_at: new Date().toISOString()
      }
    }));

    try {
      await saveVote({
        voter_email: currentVoter.email,
        voter_name: currentVoter.name,
        photo_id: photoId,
        rating,
        suggested_month: month
      });

      // Refresh community summaries
      const updatedSummaries = await fetchAllVotesSummary();
      setSummaries(updatedSummaries);

      if (rating === 'up') {
        addToast(`👍 Stimme für "${photoTitle}" gespeichert!`);
      } else if (month !== null) {
        addToast(`📅 Monat für "${photoTitle}" gespeichert.`);
      } else {
        addToast(`Stimme für "${photoTitle}" zurückgenommen.`);
      }

      // Check if user has now voted on all photos!
      const totalVotedAfter = Object.values({
        ...userVotes,
        [photoId]: { rating, suggested_month: month }
      }).filter(v => v.rating !== 'none' || v.suggested_month !== null).length;

      if (totalVotedAfter === photos.length && photos.length > 0) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        addToast('🎉 Großartig! Du hast alle Astrofotos für den Kalender bewertet!', 'success');
      }

    } catch (err) {
      console.error('Failed to save vote:', err);
      addToast('Fehler beim Speichern der Stimme', 'error');
      // Re-fetch to rollback
      loadUserVotes(currentVoter);
    }
  };

  // Save new Voter from Modal
  const handleSaveVoter = async (voterInput: Voter) => {
    try {
      const registeredVoter = await registerOrUpdateVoter({
        name: voterInput.name,
        email: voterInput.email
      });

      setCurrentVoter(registeredVoter);
      localStorage.setItem(LS_CURRENT_VOTER, JSON.stringify(registeredVoter));
      addToast(`Willkommen, ${registeredVoter.name}!`);

      // Fetch previous votes for this email
      const previousVotes = await fetchUserVotes(registeredVoter.email);
      setUserVotes(previousVotes);

      // If not verified, trigger verification modal
      if (!registeredVoter.is_verified) {
        setIsVerificationModalOpen(true);
      }

      // If there was a pending vote click, execute it now!
      if (pendingVote) {
        const { photoId, rating, month } = pendingVote;
        setPendingVote(null);
        handleVote(photoId, rating, month);
      }
    } catch (err) {
      console.error('Error saving voter:', err);
    }
  };

  const handleEmailVerified = async (verifiedVoter: Voter) => {
    setCurrentVoter(verifiedVoter);
    localStorage.setItem(LS_CURRENT_VOTER, JSON.stringify(verifiedVoter));
    addToast('🎉 E-Mail erfolgreich bestätigt! Deine Stimmen sind jetzt gültig.', 'success');
    const updatedSummaries = await fetchAllVotesSummary();
    setSummaries(updatedSummaries);
  };

  // Lightbox navigation
  const handleLightboxNavigate = (direction: 'prev' | 'next') => {
    if (!activeLightboxPhoto) return;
    const currentIndex = photos.findIndex(p => p.id === activeLightboxPhoto.id);
    if (currentIndex === -1) return;

    if (direction === 'prev') {
      const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
      setActiveLightboxPhoto(photos[prevIndex]);
    } else {
      const nextIndex = (currentIndex + 1) % photos.length;
      setActiveLightboxPhoto(photos[nextIndex]);
    }
  };

  // Filtered & Sorted Photos for Gallery
  const displayPhotos = useMemo(() => {
    let result = [...photos];

    // Filter
    if (filterMode === 'voted') {
      result = result.filter(p => {
        const v = userVotes[p.id];
        return v && (v.rating !== 'none' || v.suggested_month !== null);
      });
    } else if (filterMode === 'unvoted') {
      result = result.filter(p => {
        const v = userVotes[p.id];
        return !v || (v.rating === 'none' && v.suggested_month === null);
      });
    }

    // Sort
    if (sortMode === 'top_rated') {
      result.sort((a, b) => {
        const upA = summaries[a.id]?.upvotes ?? 0;
        const upB = summaries[b.id]?.upvotes ?? 0;
        return upB - upA;
      });
    } else if (sortMode === 'title') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [photos, filterMode, sortMode, userVotes, summaries]);

  const votedCount = Object.values(userVotes).filter(
    v => v.rating !== 'none' || v.suggested_month !== null
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-space-950 text-slate-100 selection:bg-astro-cyan/30">

      {/* Navigation Header */}
      <Navbar
        currentVoter={currentVoter}
        totalPhotos={photos.length}
        votedCount={votedCount}
        isSupabaseLive={isUsingLiveSupabase()}
        onOpenVoterModal={() => setIsVoterModalOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenVerificationModal={() => setIsVerificationModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {isAdminMode ? (
          <AdminDashboard
            photos={photos}
            onPhotosUpdated={loadData}
            onExit={() => {
              window.location.hash = '';
              setIsAdminMode(false);
            }}
          />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

            {/* Hero Section */}
            <div className="relative text-center max-w-3xl mx-auto mb-10 sm:mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-astro-cyan/10 border border-astro-cyan/30 text-astro-cyan text-xs font-mono mb-4 backdrop-blur-md shadow-glow-cyan/20">
                <Rocket className="w-3.5 h-3.5 animate-bounce" />
                <span>Astro-Kalender Jahresabstimmung</span>
              </div>

              <h1 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tight text-white leading-tight">
                Unsere Aufnahmen für den{' '}
                <span className="bg-gradient-to-r from-astro-cyan via-astro-blue to-astro-purple bg-clip-text text-transparent">
                  Jahreskalender 2027
                </span>
              </h1>

              <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
                Stimme für jedes Foto mit <strong>Daumen hoch (👍)</strong> ab und schlage den passenden Kalendermonat vor. Deine Stimmen werden sicher gespeichert und fließen direkt in das Gesamtergebnis ein.
              </p>

              {/* Progress Bar Card */}
              <div className="mt-6 p-4 rounded-2xl bg-space-900/60 border border-white/10 backdrop-blur-md max-w-xl mx-auto flex items-center justify-between gap-4">
                <div className="text-left">
                  <div className="text-xs font-mono text-slate-400">Dein Abstimmungs-Status:</div>
                  <div className="text-sm font-semibold text-white mt-0.5">
                    {votedCount} von {photos.length} Fotos bewertet
                  </div>
                </div>

                <div className="flex-1 max-w-[200px]">
                  <div className="w-full h-2.5 bg-space-800 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-astro-cyan to-astro-lime rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${photos.length > 0 ? (votedCount / photos.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="text-right font-mono text-xs font-bold text-astro-cyan">
                  {photos.length > 0 ? Math.round((votedCount / photos.length) * 100) : 0}%
                </div>
              </div>

              {/* Unverified Email Warning Banner */}
              {currentVoter && !currentVoter.is_verified && (
                <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-200 backdrop-blur-md max-w-xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/20">
                  <div className="flex items-center gap-2.5 text-left">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                    <div className="text-xs">
                      <strong className="text-white block">E-Mail-Bestätigung erforderlich:</strong>
                      Deine Stimmen werden erst gezählt, wenn du deine E-Mail ({currentVoter.email}) bestätigst.
                    </div>
                  </div>
                  <button
                    onClick={() => setIsVerificationModalOpen(true)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-400 text-space-950 font-bold text-xs hover:bg-amber-300 transition-colors shrink-0 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <MailCheck className="w-3.5 h-3.5" />
                    <span>Jetzt bestätigen</span>
                  </button>
                </div>
              )}
            </div>

            {/* Filter and Control Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 bg-space-900/40 p-3 rounded-2xl border border-white/5 backdrop-blur-md">

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-space-950/70 border border-white/10 text-xs">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${filterMode === 'all'
                    ? 'bg-space-800 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Alle ({photos.length})</span>
                </button>

                <button
                  onClick={() => setFilterMode('unvoted')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${filterMode === 'unvoted'
                    ? 'bg-space-800 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  <Circle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Noch offen ({photos.length - votedCount})</span>
                </button>

                <button
                  onClick={() => setFilterMode('voted')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${filterMode === 'voted'
                    ? 'bg-space-800 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Bewertet ({votedCount})</span>
                </button>
              </div>

              {/* Sorting selector */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">Sortierung:</span>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as 'default' | 'top_rated' | 'title')}
                  className="bg-space-850 hover:bg-space-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-astro-cyan transition-colors"
                >
                  <option value="default">Standardreihenfolge</option>
                  <option value="top_rated">Beliebteste (Meiste Stimmen 👍)</option>
                  <option value="title">Titel (A-Z)</option>
                </select>
              </div>

            </div>

            {/* Gallery Grid */}
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-4 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-astro-cyan" />
                <p className="text-sm font-mono">Lade Astrofotografien aus dem Kosmos...</p>
              </div>
            ) : photos.length === 0 ? (
              <div className="py-20 text-center rounded-2xl bg-space-900/60 border border-astro-cyan/30 p-8 max-w-lg mx-auto backdrop-blur-md">
                <Sparkles className="w-12 h-12 text-astro-cyan mx-auto mb-3 animate-pulse" />
                <h3 className="text-lg font-bold text-white">Supabase verbunden – Datenbank ist bereit!</h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Deine Live-Datenbank ist aktiv, enthält aber aktuell noch keine Fotos. Öffne den Admin-Bereich, um eigene Bilder hochzuladen oder die Beispielfotos mit einem Klick zu importieren.
                </p>
                <button
                  onClick={toggleAdmin}
                  className="mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-r from-astro-cyan to-astro-blue text-space-950 font-bold text-xs shadow-glow-cyan hover:shadow-cyan-500/50 transition-all"
                >
                  Admin-Bereich öffnen (Fotos hochladen)
                </button>
              </div>
            ) : displayPhotos.length === 0 ? (
              <div className="py-20 text-center rounded-2xl bg-space-900/40 border border-white/5 p-8">
                <CalendarDays className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-200">Keine Fotos in dieser Ansicht</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {filterMode === 'unvoted'
                    ? '🎉 Großartig! Du hast bereits alle Fotos bewertet.'
                    : 'Es wurden noch keine passenden Fotos gefunden.'}
                </p>
                {filterMode !== 'all' && (
                  <button
                    onClick={() => setFilterMode('all')}
                    className="mt-4 px-4 py-2 rounded-xl bg-space-800 text-xs text-astro-cyan border border-astro-cyan/30 hover:bg-space-700 transition-colors"
                  >
                    Alle Fotos anzeigen
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {displayPhotos.map((photo, index) => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    userVote={userVotes[photo.id]}
                    summary={summaries[photo.id]}
                    isVoterVerified={currentVoter?.is_verified ?? false}
                    onVote={handleVote}
                    onOpenLightbox={(p) => setActiveLightboxPhoto(p)}
                    index={index}
                  />
                ))}
              </div>
            )}

            {/* Hint Box for Community */}
            <div className="mt-16 p-6 rounded-2xl bg-space-900/40 border border-white/10 backdrop-blur-md max-w-2xl mx-auto text-center">
              <div className="inline-flex p-2.5 rounded-xl bg-astro-cyan/10 text-astro-cyan mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-slate-200">
                Wie geht es nach dem Voting weiter?
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Nach Ende der Abstimmungsphase wählt das Kalenderteam die 12 Motive mit den besten Netto-Upvotes aus und teilt sie anhand eurer Monatsempfehlungen den Kalendermonaten Januar bis Dezember zu.
              </p>
            </div>

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 bg-space-950/90 py-8 px-4 text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-astro-cyan animate-pulse" />
            <span>Astro-Kalender Voting App &bull; GitHub Pages Static SPA</span>
          </div>

          <div className="flex items-center gap-6">
          </div>
        </div>
      </footer>

      {/* Lightbox Modal */}
      <Lightbox
        photo={activeLightboxPhoto}
        photos={photos}
        userVote={activeLightboxPhoto ? userVotes[activeLightboxPhoto.id] : undefined}
        onClose={() => setActiveLightboxPhoto(null)}
        onNavigate={handleLightboxNavigate}
        onVote={handleVote}
      />

      {/* Voter Identification Modal */}
      <VoterModal
        isOpen={isVoterModalOpen}
        currentVoter={currentVoter}
        onSave={handleSaveVoter}
        onClose={() => {
          setIsVoterModalOpen(false);
          setPendingVote(null);
        }}
      />

      {/* Email Verification Modal */}
      <EmailVerificationModal
        isOpen={isVerificationModalOpen}
        voter={currentVoter}
        onVerified={handleEmailVerified}
        onClose={() => setIsVerificationModalOpen(false)}
      />

      {/* Supabase Configuration Modal */}
      <SupabaseConfigModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigChanged={() => {
          loadData();
          if (currentVoter) loadUserVotes(currentVoter);
        }}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

    </div>
  );
}
export default App;
