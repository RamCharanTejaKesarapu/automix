import React, { useState } from 'react';
import { PendingPrompt } from '../types';
import { AlertTriangle, ShieldAlert, CheckCircle2, BookmarkPlus, Send } from 'lucide-react';

interface HumanInTheLoopModalProps {
  prompt: PendingPrompt | null;
  onSubmit: (promptId: string, answer: string, savePermanently: boolean) => void;
}

export const HumanInTheLoopModal: React.FC<HumanInTheLoopModalProps> = ({ prompt, onSubmit }) => {
  const [answer, setAnswer] = useState('');
  const [savePermanently, setSavePermanently] = useState(true);

  if (!prompt) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer && !prompt.options) return;
    const finalAnswer = answer || (prompt.options ? prompt.options[0] : '');
    onSubmit(prompt.id, finalAnswer, savePermanently);
    setAnswer('');
  };

  const handleSelectOption = (opt: string) => {
    setAnswer(opt);
  };

  const isCaptcha = prompt.type === 'CAPTCHA_VERIFICATION';
  const isSubmission = prompt.type === 'SUBMISSION_CONFIRMATION';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(4, 7, 18, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          border: isCaptcha
            ? '2px solid rgba(245, 158, 11, 0.8)'
            : isSubmission
            ? '2px solid rgba(16, 185, 129, 0.8)'
            : '2px solid rgba(6, 182, 212, 0.8)',
          boxShadow: isCaptcha
            ? '0 0 35px rgba(245, 158, 11, 0.4)'
            : '0 0 35px rgba(6, 182, 212, 0.4)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 22px',
          background: isCaptcha
            ? 'rgba(245, 158, 11, 0.15)'
            : isSubmission
            ? 'rgba(16, 185, 129, 0.15)'
            : 'rgba(6, 182, 212, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          {isCaptcha ? (
            <ShieldAlert size={24} color="var(--accent-amber)" />
          ) : isSubmission ? (
            <CheckCircle2 size={24} color="var(--accent-emerald)" />
          ) : (
            <AlertTriangle size={24} color="var(--accent-cyan)" />
          )}
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{prompt.title}</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {prompt.jobTitle} • {prompt.company}
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '22px' }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', marginBottom: '16px', lineHeight: 1.4 }}>
            {prompt.question}
          </p>

          {isCaptcha ? (
            <div style={{ marginBottom: '20px', padding: '14px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.25)', fontSize: '0.85rem', color: 'var(--text-main)' }}>
              A security verification (e.g. Cloudflare Turnstile or CAPTCHA) has been triggered. If running headful, complete the challenge in the open browser window, then click <strong>Continue</strong> below.
            </div>
          ) : null}

          {/* Options if provided */}
          {prompt.options && prompt.options.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>SELECT AN OPTION:</span>
              {prompt.options.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectOption(opt)}
                  style={{
                    textAlign: 'left',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: answer === opt ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: answer === opt ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    color: answer === opt ? '#ffffff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: answer === opt ? 600 : 400,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : !isCaptcha ? (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  YOUR ANSWER:
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  autoFocus
                  required
                />
              </div>
            </form>
          ) : null}

          {/* Save permanently checkbox */}
          {!isCaptcha && !isSubmission && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.825rem', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '20px' }}>
              <input
                type="checkbox"
                checked={savePermanently}
                onChange={(e) => setSavePermanently(e.target.checked)}
                style={{ accentColor: 'var(--accent-cyan)', width: '16px', height: '16px' }}
              />
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <BookmarkPlus size={14} color="var(--accent-cyan)" />
                Save this answer permanently to my profile (never ask again)
              </span>
            </label>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            {isSubmission ? (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onSubmit(prompt.id, 'Cancel / Skip', false)}
                >
                  Skip Job
                </button>
                <button
                  type="button"
                  className="btn btn-emerald"
                  onClick={() => onSubmit(prompt.id, 'Approve & Submit', false)}
                >
                  <Send size={15} />
                  Approve & Submit Application
                </button>
              </>
            ) : isCaptcha ? (
              <button
                type="button"
                className="btn btn-amber"
                onClick={() => onSubmit(prompt.id, 'Verification Completed, Continue', false)}
              >
                Verification Completed, Continue
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={!answer.trim()}
                onClick={(e) => handleSubmit(e)}
              >
                <Send size={15} />
                Submit Answer & Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
