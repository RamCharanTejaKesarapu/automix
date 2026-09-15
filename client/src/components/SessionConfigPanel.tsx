import React from 'react';
import { Globe, Briefcase, MapPin, Tag, Hash, ShieldCheck, Monitor, Sliders } from 'lucide-react';

export interface SessionConfig {
  websiteUrl: string;
  targetField: string;
  targetRole: string;
  targetLocation: string;
  keywords: string;
  maxApplications: number;
  autoSubmit: boolean;
  matchThreshold: number;
  headless: boolean;
}

interface SessionConfigPanelProps {
  config: SessionConfig;
  onChange: (updates: Partial<SessionConfig>) => void;
  disabled?: boolean;
}

export const SessionConfigPanel: React.FC<SessionConfigPanelProps> = ({ config, onChange, disabled }) => {
  return (
    <div className="glass-panel" style={{ padding: '22px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Target Job & Search Parameters</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Configure real website target, role constraints, and automation behaviors</p>
        </div>
        <span className="badge badge-grey" style={{ fontSize: '0.7rem' }}>TARGET CRITERIA</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '18px' }}>
        {/* Website URL */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
            <Globe size={14} color="#e4e4e7" />
            <span>WEBSITE URL (Real Job Board / Company Portal)</span>
          </label>
          <input
            id="website-url-input"
            type="url"
            className="form-input"
            value={config.websiteUrl}
            onChange={(e) => onChange({ websiteUrl: e.target.value })}
            placeholder="https://example.com/careers or https://remoteok.com"
            disabled={disabled}
          />
        </div>

        {/* Target Field */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
            <Briefcase size={14} color="var(--accent-cyan)" />
            <span>TARGET FIELD / INDUSTRY</span>
          </label>
          <input
            id="target-field-input"
            type="text"
            className="form-input"
            value={config.targetField}
            onChange={(e) => onChange({ targetField: e.target.value })}
            placeholder="e.g. Data Science, Machine Learning"
            disabled={disabled}
            required
          />
        </div>

        {/* Target Role */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
            <Briefcase size={14} color="var(--accent-cyan)" />
            <span>TARGET ROLE / JOB TITLE</span>
          </label>
          <input
            id="target-role-input"
            type="text"
            className="form-input"
            value={config.targetRole}
            onChange={(e) => onChange({ targetRole: e.target.value })}
            placeholder="e.g. Data Science Intern"
            disabled={disabled}
            required
          />
        </div>

        {/* Location */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
            <MapPin size={14} color="var(--accent-cyan)" />
            <span>OPTIONAL LOCATION</span>
          </label>
          <input
            id="target-location-input"
            type="text"
            className="form-input"
            value={config.targetLocation}
            onChange={(e) => onChange({ targetLocation: e.target.value })}
            placeholder="e.g. India, Remote, San Francisco"
            disabled={disabled}
          />
        </div>

        {/* Keywords */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
            <Tag size={14} color="var(--accent-cyan)" />
            <span>OPTIONAL KEYWORDS</span>
          </label>
          <input
            id="target-keywords-input"
            type="text"
            className="form-input"
            value={config.keywords}
            onChange={(e) => onChange({ keywords: e.target.value })}
            placeholder="e.g. Python, SQL, PyTorch"
            disabled={disabled}
          />
        </div>

        {/* Max Applications */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
            <Hash size={14} color="var(--accent-cyan)" />
            <span>MAX APPLICATIONS LIMIT</span>
          </label>
          <input
            id="max-apps-input"
            type="number"
            min={1}
            max={200}
            className="form-input"
            value={config.maxApplications}
            onChange={(e) => onChange({ maxApplications: parseInt(e.target.value, 10) || 10 })}
            disabled={disabled}
          />
        </div>

        {/* Match Threshold */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              <Sliders size={14} color="#e4e4e7" />
              <span>MIN MATCH SCORE:</span>
            </label>
            <strong style={{ fontSize: '0.85rem', color: '#ffffff' }}>{config.matchThreshold}%</strong>
          </div>
          <input
            id="match-threshold-slider"
            type="range"
            min={40}
            max={95}
            step={5}
            value={config.matchThreshold}
            onChange={(e) => onChange({ matchThreshold: parseInt(e.target.value, 10) })}
            style={{ width: '100%', accentColor: '#ffffff', cursor: 'pointer' }}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Safety & Mode Toggles */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
        {/* Auto Submit Toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
          <input
            id="auto-submit-toggle"
            type="checkbox"
            checked={config.autoSubmit}
            onChange={(e) => onChange({ autoSubmit: e.target.checked })}
            style={{ width: '18px', height: '18px', accentColor: '#ffffff' }}
            disabled={disabled}
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} color={config.autoSubmit ? '#ffffff' : '#a1a1aa'} />
            <strong>Automatic Submission:</strong> {config.autoSubmit ? 'ON (Auto-Submit)' : 'OFF (Requires My Confirmation)'}
          </span>
        </label>

        {/* Headless Toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
          <input
            id="headless-toggle"
            type="checkbox"
            checked={!config.headless}
            onChange={(e) => onChange({ headless: !e.target.checked })}
            style={{ width: '18px', height: '18px', accentColor: '#ffffff' }}
            disabled={disabled}
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Monitor size={16} color="#e4e4e7" />
            <strong>Visible Browser Window:</strong> {!config.headless ? 'Visible (Headful)' : 'Headless (Live Stream Only)'}
          </span>
        </label>
      </div>
    </div>
  );
};
