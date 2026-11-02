import React, { useState } from 'react';
import { MailCheck, CheckCircle2, AlertCircle, X, ShieldCheck, KeyRound, RefreshCw, Send } from 'lucide-react';
import { Voter } from '../types';
import { verifyVoterEmail, sendOtpEmail } from '../lib/api';

interface EmailVerificationModalProps {
  isOpen: boolean;
  voter: Voter | null;
  onVerified: (updatedVoter: Voter) => void;
  onClose: () => void;
}

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  isOpen,
  voter,
  onVerified,
  onClose,
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendMsg, setResendMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isResending, setIsResending] = useState(false);

  if (!isOpen || !voter) return null;

  const handleResendEmail = async () => {
    setIsResending(true);
    setResendMsg(null);
    try {
      const res = await sendOtpEmail(voter.email);
      if (res.success) {
        setResendMsg({ text: '✉️ Neue Bestätigungsmail wurde gesendet! Bitte prüfe deinen Posteingang & Spam-Ordner.' });
      } else {
        setResendMsg({
          text: `Supabase E-Mail Meldung: ${res.error || 'Versand fehlgeschlagen'}`,
          isError: true
        });
      }
    } catch {
      setResendMsg({ text: 'Verbindungsfehler beim E-Mail-Versand.', isError: true });
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanCode = code.trim();
    if (!cleanCode) {
      setError('Bitte gib den 6-stelligen Bestätigungscode ein.');
      return;
    }

    setIsSubmitting(true);
    try {
      const isValid = await verifyVoterEmail(voter.email, cleanCode);
      if (isValid) {
        setSuccess(true);
        const updatedVoter: Voter = {
          ...voter,
          is_verified: true,
          verified_at: new Date().toISOString()
        };
        setTimeout(() => {
          onVerified(updatedVoter);
          onClose();
        }, 1000);
      } else {
        setError('Ungültiger Code. Bitte überprüfe deine Eingabe oder nutze den Demo-Code 123456.');
      }
    } catch {
      setError('Fehler bei der Bestätigung. Bitte erneut versuchen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseDemoCode = () => {
    const suggested = voter.verification_code || '123456';
    setCode(suggested);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-950/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-space-900 border border-astro-cyan/30 shadow-2xl p-6 sm:p-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Accent */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-space-800 transition-colors"
          title="Später bestätigen"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-glow-lime">
            <MailCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-white">
              E-Mail-Adresse bestätigen
            </h3>
            <p className="text-xs text-slate-400">
              Nur verifizierte Stimmen fließen in die Kalenderwertung ein
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-space-850 border border-white/5 text-xs text-slate-300 mb-5 leading-relaxed">
          <p className="mb-1.5">
            Wir haben eine Bestätigungsmail an <strong className="text-astro-cyan">{voter.email}</strong> gesendet.
          </p>
          <p className="text-[11px] text-slate-400 mb-2.5 leading-normal">
            👉 Klicke einfach auf den <strong>Bestätigungslink in der E-Mail</strong> (die Seite verifiziert sich dann automatisch) oder gib den Code unten ein.
          </p>

          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/5 text-slate-400">
            <button
              type="button"
              onClick={handleResendEmail}
              disabled={isResending}
              className="text-astro-cyan hover:underline font-mono flex items-center gap-1 disabled:opacity-50"
            >
              {isResending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              <span>E-Mail erneut senden</span>
            </button>

            <button
              type="button"
              onClick={handleUseDemoCode}
              className="text-slate-400 hover:text-white font-mono flex items-center gap-1"
              title="Test-Code einfügen"
            >
              <KeyRound className="w-3 h-3" />
              <span>Test-Code: {voter.verification_code || '123456'}</span>
            </button>
          </div>

          {resendMsg && (
            <div className={`mt-2.5 p-2 rounded-lg text-[11px] font-mono ${
              resendMsg.isError ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
            }`}>
              {resendMsg.text}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5">
              6-stelliger Bestätigungscode:
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="z. B. 123456"
              className="w-full text-center tracking-[0.5em] font-mono text-xl py-3 px-4 rounded-xl bg-space-850 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-astro-cyan focus:ring-1 focus:ring-astro-cyan transition-colors"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>E-Mail erfolgreich verifiziert! Deine Stimmen zählen jetzt.</span>
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-space-800 hover:bg-space-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Später bestätigen
            </button>
            <button
              type="submit"
              disabled={isSubmitting || success}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-400 to-astro-lime text-space-950 text-xs font-bold hover:shadow-glow-lime transition-all disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Jetzt verifizieren</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

