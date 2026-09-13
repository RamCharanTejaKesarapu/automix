import React, { useState, useEffect } from 'react';
import { X, Key, Shield, Cpu, Check, Save } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [maskedKey, setMaskedKey] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState<'MINIMAL' | 'STANDARD' | 'STRICT'>('STANDARD');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/llm');
      const data = await res.json();
      setMaskedKey(data.apiKeyMasked || '');
      setBaseUrl(data.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai');
      setModel(data.model || 'gemini-3.6-flash');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { baseUrl, model };
    if (apiKey.trim()) {
      payload.apiKey = apiKey.trim();
    }

    try {
      const res = await fetch('/api/settings/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        fetchSettings();
      }
    } catch (err) {
      alert('Failed to save settings');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(4, 7, 18, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1200,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '540px' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>AI & Automation Settings</h3>
          </div>
          <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ padding: '22px' }}>
          {/* API Key */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              <Key size={14} color="var(--accent-cyan)" />
              <span>AI API KEY (OPENAI / GEMINI)</span>
            </label>
            <input
              type="password"
              className="form-input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={maskedKey ? `Configured: ${maskedKey} (leave blank to keep)` : 'Enter API Key'}
            />
            <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
              Stored securely in environment variables & database. Never exposed to browser forms.
            </span>
          </div>

          {/* Base URL */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              API BASE URL
            </label>
            <input
              type="text"
              className="form-input"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://generativelanguage.googleapis.com/v1beta/openai or https://api.openai.com/v1"
            />
          </div>

          {/* Model */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              AI MODEL
            </label>
            <input
              type="text"
              className="form-input"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gemini-3.6-flash, gpt-4o, gpt-4o-mini"
            />
          </div>

          {/* Privacy Layer */}
          <div style={{ marginBottom: '22px', padding: '14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Shield size={16} color="var(--accent-emerald)" />
              <strong style={{ fontSize: '0.85rem', color: '#ffffff' }}>Configurable Privacy Layer</strong>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Sanitizes sensitive candidate data (SSN, banking info, street address) before sending to the LLM.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['MINIMAL', 'STANDARD', 'STRICT'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setPrivacyLevel(lvl)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: privacyLevel === lvl ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    border: privacyLevel === lvl ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    color: privacyLevel === lvl ? '#ffffff' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
            {saved && <span style={{ color: 'var(--accent-emerald)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={14} /> Saved!</span>}
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={15} />
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
