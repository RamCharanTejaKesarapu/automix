import React from 'react';
import { Play, Pause, Square, Sparkles, Shield, Cpu, Sliders } from 'lucide-react';
import { ApplicationState } from '../types';

interface HeaderProps {
  state: ApplicationState;
  isRunning: boolean;
  isPaused: boolean;
  autoSubmit: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  state,
  isRunning,
  isPaused,
  autoSubmit,
  onStart,
  onPause,
  onResume,
  onStop,
  onOpenSettings
}) => {
  const getBadgeColor = (s: ApplicationState) => {
    switch (s) {
      case 'DISCOVERING':
      case 'NEXT_JOB':
      case 'RETURN_TO_SEARCH':
        return 'badge-cyan';
      case 'OPENING_APPLICATION':
      case 'FILLING_FIELDS':
      case 'GENERATING_GPT_RESPONSE':
        return 'badge-indigo';
      case 'SUBMITTED':
        return 'badge-emerald';
      case 'WAITING_FOR_USER':
        return 'badge-amber pulse-warning';
      case 'ERROR':
        return 'badge-rose';
      case 'PAUSED':
        return 'badge-amber';
      default:
        return 'badge-indigo';
    }
  };

  return (
    <header className="glass-panel" style={{ padding: '16px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #27272a, #09090b)', border: '1px solid rgba(255, 255, 255, 0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.6)' }}>
          <Sparkles size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #ffffff 0%, #a1a1aa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AutoMix
            </h1>
            <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>AI JOB AGENT</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Autonomous Job Application & Browser Intelligence Engine</p>
        </div>
      </div>

      {/* State & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {/* Auto submit pill */}
        <div className={`badge ${autoSubmit ? 'badge-emerald' : 'badge-amber'}`} style={{ textTransform: 'none', padding: '6px 12px' }}>
          <Shield size={13} />
          Auto-Submit: {autoSubmit ? 'ON' : 'OFF (Approval)'}
        </div>

        {/* State Badge */}
        <div className={`badge ${getBadgeColor(state)}`} style={{ padding: '6px 14px' }}>
          <Cpu size={14} />
          <span>{state.replace(/_/g, ' ')}</span>
        </div>

        {/* Action Buttons */}
        {!isRunning ? (
          <button id="start-btn" className="btn btn-primary" onClick={onStart}>
            <Play size={16} fill="currentColor" />
            Start Applying
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isPaused ? (
              <button id="pause-btn" className="btn btn-amber" onClick={onPause}>
                <Pause size={16} />
                Pause
              </button>
            ) : (
              <button id="resume-btn" className="btn btn-emerald" onClick={onResume}>
                <Play size={16} fill="currentColor" />
                Resume
              </button>
            )}
            <button id="stop-btn" className="btn btn-rose" onClick={onStop}>
              <Square size={16} fill="currentColor" />
              Stop
            </button>
          </div>
        )}

        {/* Settings button */}
        <button
          id="settings-btn"
          className="btn btn-secondary"
          onClick={onOpenSettings}
          title="Configure API Keys & Settings"
          style={{ padding: '10px 12px' }}
        >
          <Sliders size={16} />
        </button>
      </div>
    </header>
  );
};
