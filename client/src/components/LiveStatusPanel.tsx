import React from 'react';
import { ApplicationState, CurrentApplicationContext, AutomationStatistics } from '../types';
import { Play, Pause, Square, Globe, Briefcase, Tag, Compass, Layers, CheckCircle2, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { SessionConfig } from './SessionConfigPanel';

interface LiveStatusPanelProps {
  state: ApplicationState;
  context: CurrentApplicationContext | null;
  stats: AutomationStatistics;
  config: SessionConfig;
  isRunning: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export const LiveStatusPanel: React.FC<LiveStatusPanelProps> = ({
  state,
  context,
  stats,
  config,
  isRunning,
  isPaused,
  onStart,
  onPause,
  onResume,
  onStop,
}) => {
  // Determine automation status label & color
  let automationStatus = 'IDLE';
  let statusColor = '#64748b';

  if (state === 'WAITING_FOR_USER') {
    automationStatus = 'WAITING FOR USER';
    statusColor = '#f59e0b';
  } else if (isPaused || state === 'PAUSED') {
    automationStatus = 'PAUSED';
    statusColor = '#eab308';
  } else if (isRunning) {
    automationStatus = 'RUNNING';
    statusColor = '#10b981';
  } else if (state === 'ERROR') {
    automationStatus = 'ERROR';
    statusColor = '#f43f5e';
  }

  // Derive current action text
  const currentActionText = context?.currentAction
    ? context.currentAction
    : isRunning
    ? state.replace(/_/g, ' ').toLowerCase()
    : 'Ready to start';

  const currentJobText = context?.company && context?.jobTitle
    ? `${context.company} — ${context.jobTitle}`
    : context?.jobTitle || (isRunning ? 'Scanning listings…' : 'None');

  return (
    <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', marginBottom: '24px' }}>
      {/* Panel Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(7, 10, 18, 0.7)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Compass size={16} color="var(--accent-cyan)" />
          <span style={{
            fontSize: '0.82rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}>
            LIVE STATUS
          </span>
        </div>

        {/* Status indicator badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '4px 12px',
          borderRadius: '99px',
          background: `${statusColor}18`,
          border: `1px solid ${statusColor}45`
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: statusColor,
            boxShadow: isRunning && !isPaused ? `0 0 10px ${statusColor}` : 'none'
          }} />
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            color: statusColor,
            letterSpacing: '0.06em'
          }}>
            {automationStatus}
          </span>
        </div>
      </div>

      {/* Status Details Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '12px 24px',
        padding: '18px 20px',
        fontSize: '0.85rem'
      }}>
        {/* Left Column: Target & Navigation details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ color: 'var(--text-dim)', minWidth: '105px', fontWeight: 600 }}>Automation:</span>
            <span style={{ color: statusColor, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
              {automationStatus}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ color: 'var(--text-dim)', minWidth: '105px', fontWeight: 600 }}>Website:</span>
            <span style={{
              color: 'var(--accent-cyan)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              wordBreak: 'break-all'
            }}>
              {config.websiteUrl}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ color: 'var(--text-dim)', minWidth: '105px', fontWeight: 600 }}>Field:</span>
            <span style={{ color: '#ffffff', fontWeight: 600 }}>{config.targetField || 'All'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ color: 'var(--text-dim)', minWidth: '105px', fontWeight: 600 }}>Role:</span>
            <span style={{ color: '#ffffff', fontWeight: 600 }}>{config.targetRole}</span>
          </div>
        </div>

        {/* Right Column: Execution progress details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ color: 'var(--text-dim)', minWidth: '115px', fontWeight: 600 }}>Current Job:</span>
            <span style={{ color: '#ffffff', fontWeight: 700 }}>{currentJobText}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ color: 'var(--text-dim)', minWidth: '115px', fontWeight: 600 }}>Action:</span>
            <span style={{
              color: 'var(--accent-amber)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <ArrowRight size={13} /> {currentActionText}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ color: 'var(--text-dim)', minWidth: '115px', fontWeight: 600 }}>Applications:</span>
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>
              {stats.applicationsSubmitted} submitted
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Skipped:</span>
              <span style={{ color: '#c084fc', fontWeight: 700 }}>{stats.skipped ?? 0}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Waiting for user:</span>
              <span style={{
                color: stats.waitingForUser > 0 ? '#fbbf24' : 'var(--text-muted)',
                fontWeight: 700
              }}>
                {stats.waitingForUser}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLS Section */}
      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(5, 8, 16, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em'
        }}>
          CONTROLS
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* START */}
          <button
            onClick={onStart}
            disabled={isRunning}
            className="btn btn-primary"
            style={{
              padding: '8px 18px',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              opacity: isRunning ? 0.45 : 1,
              cursor: isRunning ? 'not-allowed' : 'pointer'
            }}
          >
            <Play size={14} fill="currentColor" />
            <span>START</span>
          </button>

          {/* PAUSE */}
          <button
            onClick={onPause}
            disabled={!isRunning || isPaused}
            className="btn btn-secondary"
            style={{
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              opacity: !isRunning || isPaused ? 0.4 : 1,
              cursor: !isRunning || isPaused ? 'not-allowed' : 'pointer'
            }}
          >
            <Pause size={14} />
            <span>PAUSE</span>
          </button>

          {/* RESUME */}
          <button
            onClick={onResume}
            disabled={!isRunning || !isPaused}
            className="btn btn-secondary"
            style={{
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              borderColor: isRunning && isPaused ? 'rgba(234, 179, 8, 0.4)' : undefined,
              color: isRunning && isPaused ? '#eab308' : undefined,
              opacity: !isRunning || !isPaused ? 0.4 : 1,
              cursor: !isRunning || !isPaused ? 'not-allowed' : 'pointer'
            }}
          >
            <Play size={14} />
            <span>RESUME</span>
          </button>

          {/* STOP */}
          <button
            onClick={onStop}
            disabled={!isRunning}
            className="btn btn-danger"
            style={{
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              opacity: !isRunning ? 0.4 : 1,
              cursor: !isRunning ? 'not-allowed' : 'pointer'
            }}
          >
            <Square size={14} fill="currentColor" />
            <span>STOP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
