import React, { useState } from 'react';
import { Database, Key, Globe, Check, AlertTriangle, X, RefreshCw, HelpCircle } from 'lucide-react';
import { getStoredSupabaseConfig, saveStoredSupabaseConfig, resetDemoData, getSupabaseClient } from '../lib/api';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged,
}) => {
  const currentConfig = getStoredSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setTesting(true);

    try {
      if (!url.trim() && !anonKey.trim()) {
        // Clear config, revert to demo mode
        saveStoredSupabaseConfig('', '');
        setStatusMsg({ type: 'success', text: 'Auf Demo-/Offline-Modus zurückgesetzt!' });
        onConfigChanged();
        setTimeout(onClose, 800);
        return;
      }

      if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
        throw new Error('Supabase URL muss mit https:// beginnen und .supabase.co enthalten.');
      }

      if (anonKey.length < 20) {
        throw new Error('Der anon public key scheint ungültig zu sein.');
      }

      // Save and test query
      saveStoredSupabaseConfig(url.trim(), anonKey.trim());
      const client = getSupabaseClient();
      if (!client) throw new Error('Supabase Client konnte nicht erzeugt werden.');

      const { error } = await client.from('photos').select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        throw new Error(`Verbindungsfehler: ${error.message} (Tipp: Wurde schema.sql in Supabase ausgeführt?)`);
      }

      setStatusMsg({ type: 'success', text: 'Verbindung zu Supabase erfolgreich hergestellt!' });
      onConfigChanged();
      setTimeout(onClose, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setStatusMsg({ type: 'error', text: msg });
    } finally {
      setTesting(false);
    }
  };

  const handleResetDemo = () => {
    if (confirm('Möchtest du wirklich alle lokalen Demo-Daten zurücksetzen?')) {
      resetDemoData();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-950/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-space-900 border border-white/10 shadow-2xl p-6 sm:p-8 overflow-hidden">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-space-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-astro-cyan/10 border border-astro-cyan/30 text-astro-cyan">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-white">
              Backend & Supabase Konfiguration
            </h3>
            <p className="text-xs text-slate-400">
              Verbinde dein kostenloses Supabase-Projekt für Live-Multiplayer-Voting
            </p>
          </div>
        </div>

        <div className="bg-space-850 p-3.5 rounded-xl border border-white/5 text-xs text-slate-300 mb-5 leading-relaxed">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-astro-cyan shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-white mb-1">Schnellstart mit Supabase:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400">
                <li>Erstelle ein Projekt auf <span className="text-astro-cyan font-mono">supabase.com</span>.</li>
                <li>Führe das Skript <span className="text-slate-200 font-mono">supabase/schema.sql</span> im SQL Editor aus.</li>
                <li>Kopiere hier deine Projekt-URL und den <strong>anon public key</strong> hinein.</li>
              </ol>
            </div>
          </div>
        </div>

        <form onSubmit={handleTestAndSave} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-astro-cyan" />
              Supabase Project URL:
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full px-3 py-2 rounded-xl bg-space-850 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-astro-cyan"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-astro-cyan" />
              Supabase Anon Public Key:
            </label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3 py-2 rounded-xl bg-space-850 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-astro-cyan"
            />
          </div>

          {statusMsg && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${statusMsg.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
            >
              {statusMsg.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleResetDemo}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-space-800 hover:bg-space-700 text-slate-400 hover:text-slate-200 text-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Demo-Daten zurücksetzen</span>
            </button>

            <button
              type="submit"
              disabled={testing}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-astro-cyan to-astro-blue text-space-950 font-semibold text-xs hover:shadow-glow-cyan transition-all disabled:opacity-50"
            >
              {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{url && anonKey ? 'Verbindung prüfen & speichern' : 'Demo-Modus nutzen'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

