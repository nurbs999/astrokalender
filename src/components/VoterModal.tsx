import React, { useState, useEffect } from 'react';
import { User, Mail, Sparkles, X, Check, LogOut } from 'lucide-react';
import { Voter } from '../types';

interface VoterModalProps {
  isOpen: boolean;
  currentVoter: Voter | null;
  onSave: (voter: Voter) => void;
  onClose: () => void;
  onLogout?: () => void;
}

export const VoterModal: React.FC<VoterModalProps> = ({
  isOpen,
  currentVoter,
  onSave,
  onClose,
  onLogout,
}) => {
  const [name, setName] = useState(currentVoter?.name || '');
  const [email, setEmail] = useState(currentVoter?.email || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError('Bitte gib deinen Namen ein.');
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }

    onSave({
      name: trimmedName,
      email: trimmedEmail,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-950/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md rounded-2xl bg-space-900 border border-white/10 shadow-2xl p-6 sm:p-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Glow Accent */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-astro-cyan/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-space-800 transition-colors z-20"
          title="Schließen"
          aria-label="Schließen"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-astro-cyan/10 border border-astro-cyan/30 text-astro-cyan shadow-glow-cyan">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xl text-white">
              {currentVoter ? 'Wählerdaten bearbeiten' : 'Willkommen beim Voting!'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Gib kurz Name & E-Mail ein, um deine Stimmen zu speichern.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-6 bg-white/5 p-3 rounded-xl border border-white/5">
          🌌 Deine E-Mail wird genutzt, um deine Bewertungen wiederzuerkennen. Wenn du später wiederkommst, werden deine bisherigen Stimmen automatisch geladen.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-astro-cyan" />
              Dein Name / Alias:
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Sternengucker Max"
              className="w-full px-3.5 py-2.5 rounded-xl bg-space-850 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-astro-cyan focus:ring-1 focus:ring-astro-cyan transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-astro-cyan" />
              Deine E-Mail-Adresse:
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="max@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-space-850 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-astro-cyan focus:ring-1 focus:ring-astro-cyan transition-colors"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-space-800 hover:bg-space-700 text-slate-300 text-sm font-medium transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-astro-cyan to-astro-blue text-space-950 text-sm font-semibold hover:shadow-glow-cyan transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Speichern & Abstimmen</span>
            </button>
          </div>

          {currentVoter && onLogout && (
            <div className="pt-2 text-center border-t border-white/5 mt-2">
              <button
                type="button"
                onClick={onLogout}
                className="text-xs text-rose-400 hover:text-rose-300 font-mono hover:underline inline-flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Als {currentVoter.name} abmelden</span>
              </button>
            </div>
          )}
        </form>

      </div>
    </div>
  );
};

