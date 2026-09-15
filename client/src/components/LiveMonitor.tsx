import React, { useState, useRef, useEffect } from 'react';
import { CurrentApplicationContext, ApplicationState } from '../types';
import {
  ExternalLink, Eye, CheckCircle, Clock, Maximize2, Minimize2,
  Zap, TrendingUp, Activity, AlertTriangle, Loader
} from 'lucide-react';

interface LiveMonitorProps {
  state: ApplicationState;
  context: CurrentApplicationContext | null;
  screenshotBase64: string | null;
}

const STATE_LABEL: Partial<Record<ApplicationState, { text: string; color: string; icon: React.ReactNode }>> = {
  IDLE:                   { text: 'Idle',                  color: '#71717a',  icon: <Activity size={13} /> },
  DISCOVERING:            { text: 'Discovering Jobs',       color: '#e4e4e7',  icon: <Loader size={13} className="spin" /> },
  JOB_FOUND:              { text: 'Job Found',              color: '#ffffff',  icon: <CheckCircle size={13} /> },
  MATCH_VALIDATION:       { text: 'Evaluating Match',       color: '#d4d4d8',  icon: <Loader size={13} className="spin" /> },
  OPENING_APPLICATION:    { text: 'Opening Application',    color: '#e4e4e7',  icon: <Loader size={13} className="spin" /> },
  FILLING_FIELDS:         { text: 'Filling Form Fields',    color: '#ffffff',  icon: <Zap size={13} /> },
  GENERATING_GPT_RESPONSE:{ text: 'AI Generating Answer',   color: '#d4d4d8',  icon: <Loader size={13} className="spin" /> },
  VALIDATING_APPLICATION: { text: 'Validating Form',        color: '#e4e4e7',  icon: <CheckCircle size={13} /> },
  READY_TO_SUBMIT:        { text: 'Ready to Submit',        color: '#ffffff',  icon: <TrendingUp size={13} /> },
  SUBMITTING:             { text: 'Submitting…',            color: '#e4e4e7',  icon: <Loader size={13} className="spin" /> },
  SUBMITTED:              { text: 'Submitted ✓',            color: '#ffffff',  icon: <CheckCircle size={13} /> },
  WAITING_FOR_USER:       { text: 'Awaiting Your Input',    color: '#d4d4d8',  icon: <AlertTriangle size={13} /> },
  PAUSED:                 { text: 'Paused',                 color: '#a1a1aa',  icon: <AlertTriangle size={13} /> },
  RETURN_TO_SEARCH:       { text: 'Returning to Search',    color: '#a1a1aa',  icon: <Loader size={13} className="spin" /> },
  NEXT_JOB:               { text: 'Next Job',               color: '#e4e4e7',  icon: <Zap size={13} /> },
  ERROR:                  { text: 'Error',                  color: '#a1a1aa',  icon: <AlertTriangle size={13} /> },
  STOPPED:                { text: 'Stopped',                color: '#71717a',  icon: <Activity size={13} /> },
};

export const LiveMonitor: React.FC<LiveMonitorProps> = ({ state, context, screenshotBase64 }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const prevImgRef = useRef<string | null>(null);

  // Track frame updates to show FPS-like indicator
  const [frameCount, setFrameCount] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const liveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (screenshotBase64 && screenshotBase64 !== prevImgRef.current) {
      prevImgRef.current = screenshotBase64;
      setFrameCount(n => n + 1);
      setIsLive(true);
      if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
      liveTimerRef.current = setTimeout(() => setIsLive(false), 2500);
    }
  }, [screenshotBase64]);

  const stateInfo = STATE_LABEL[state] ?? { text: state, color: '#64748b', icon: <Activity size={13} /> };
  const percent = context && context.totalFields > 0
    ? Math.min(100, Math.round((context.filledFields / context.totalFields) * 100))
    : 0;

  const isActive = !['IDLE', 'STOPPED', 'ERROR'].includes(state);

  return (
    <>
      {/* Fullscreen backdrop overlay */}
      {isFullscreen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)',
            zIndex: 9998, backdropFilter: 'blur(4px)'
          }}
          onClick={() => setIsFullscreen(false)}
        />
      )}

      {/* Main Browser Preview Panel */}
      <div
        className={`glass-panel ${isActive ? 'pulse-border' : ''}`}
        style={{
          marginBottom: '20px',
          position: isFullscreen ? 'fixed' : 'relative',
          inset: isFullscreen ? '20px' : 'auto',
          zIndex: isFullscreen ? 9999 : 'auto',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          borderColor: isActive ? 'rgba(255, 255, 255, 0.22)' : undefined,
          boxShadow: isActive ? '0 0 30px rgba(255, 255, 255, 0.06), var(--shadow-card)' : undefined,
        }}
      >
        {/* Header Row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(12, 12, 15, 0.75)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Live indicator dot */}
              <div style={{
                width: 9, height: 9, borderRadius: '50%',
                background: isLive ? '#ffffff' : (isActive ? '#d4d4d8' : '#52525b'),
                boxShadow: isLive ? '0 0 10px rgba(255, 255, 255, 0.9)' : 'none',
                transition: 'background 0.3s ease, box-shadow 0.3s ease'
              }} />
              <span style={{
                fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)',
                textTransform: 'uppercase', letterSpacing: '0.06em'
              }}>
                {isLive ? 'LIVE' : 'Browser Preview'}
              </span>
            </div>

            {/* State pill */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '4px 10px', borderRadius: '99px',
              background: `${stateInfo.color}18`,
              border: `1px solid ${stateInfo.color}40`,
              fontSize: '0.72rem', fontWeight: 600, color: stateInfo.color
            }}>
              {stateInfo.icon}
              <span>{stateInfo.text}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {screenshotBase64 && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                Frame #{frameCount}
              </span>
            )}
            <span className="badge badge-cyan" style={{ fontSize: '0.62rem' }}>CHROMIUM CDP</span>
            <button
              onClick={() => setIsFullscreen(f => !f)}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen browser view'}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)',
                borderRadius: '8px', padding: '6px 8px', cursor: 'pointer',
                color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>

        {/* Browser Viewport */}
        <div style={{
          position: 'relative',
          background: '#070709',
          minHeight: isFullscreen ? 'calc(100vh - 280px)' : '560px',
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {screenshotBase64 ? (
            <>
              <img
                src={`data:image/jpeg;base64,${screenshotBase64}`}
                alt="Live Chromium Browser Session"
                onLoad={() => setImgLoaded(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  opacity: imgLoaded ? 1 : 0.6,
                  transition: 'opacity 0.15s ease'
                }}
              />
              {/* Scanline overlay for premium feel */}
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
                zIndex: 1
              }} />
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Eye size={28} color="rgba(255, 255, 255, 0.5)" />
              </div>
              <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Browser Preview Offline
              </p>
              <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                Live Chromium screencast will stream here when automation begins.
              </span>
              <div style={{ marginTop: '20px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {['20+ FPS via CDP', 'Real cursor movements', 'Live click ripples', 'Action status badges'].map(f => (
                  <span key={f} style={{
                    padding: '4px 10px', borderRadius: '99px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    fontSize: '0.72rem', color: '#a1a1aa'
                  }}>{f}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Status Bar */}
        {context?.jobUrl && (
          <div style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(4, 6, 14, 0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
              {context.jobUrl}
            </span>
            <a
              href={context.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--accent-cyan)', textDecoration: 'none', flexShrink: 0 }}
            >
              Open <ExternalLink size={11} />
            </a>
          </div>
        )}
      </div>

      {/* Current Application Info Card */}
      {(context?.company || context?.jobTitle || context?.currentFieldName) && (
        <div className="glass-panel" style={{ padding: '18px 20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Current Application
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '99px', background: `${stateInfo.color}18`, border: `1px solid ${stateInfo.color}30`, fontSize: '0.7rem', fontWeight: 600, color: stateInfo.color }}>
              {stateInfo.icon}&nbsp;{stateInfo.text}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', alignItems: 'start' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', marginBottom: '3px' }}>
                {context?.jobTitle || 'Evaluating Role…'}
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                {context?.company || '—'}
              </p>
            </div>

            {/* Field Progress */}
            {context && context.totalFields > 0 && (
              <div style={{ textAlign: 'right', minWidth: '120px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Fields filled</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                  {context.filledFields} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>/ {context.totalFields}</span>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {context && context.totalFields > 0 && (
            <div style={{ marginTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                <span>Form Completion</span>
                <strong style={{ color: '#ffffff' }}>{percent}%</strong>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  width: `${percent}%`, height: '100%',
                  background: 'linear-gradient(90deg, #52525b 0%, #ffffff 100%)',
                  borderRadius: '3px', transition: 'width 0.4s ease'
                }} />
              </div>
            </div>
          )}

          {/* Active field */}
          {context?.currentFieldName && (
            <div style={{
              marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 12px', background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.15)',
              fontSize: '0.8rem', color: '#f4f4f5'
            }}>
              <Clock size={13} />
              Processing field: <strong>{context.currentFieldName}</strong>
            </div>
          )}
        </div>
      )}
    </>
  );
};
