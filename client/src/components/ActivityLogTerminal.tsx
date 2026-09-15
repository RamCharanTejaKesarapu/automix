import React, { useRef, useEffect, useState } from 'react';
import { ActivityLog } from '../types';
import { Terminal, ArrowDown } from 'lucide-react';

interface ActivityLogTerminalProps {
  logs: ActivityLog[];
}

export const ActivityLogTerminal: React.FC<ActivityLogTerminalProps> = ({ logs }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const renderLogPrefix = (log: ActivityLog) => {
    const action = log.action.trim();
    if (action.startsWith('✓')) {
      return <span style={{ color: '#ffffff', fontWeight: 800, marginRight: '8px', fontSize: '0.95rem' }}>✓</span>;
    }
    if (action.startsWith('→')) {
      return <span style={{ color: '#e4e4e7', fontWeight: 800, marginRight: '8px', fontSize: '0.95rem' }}>→</span>;
    }

    switch (log.level) {
      case 'SUCCESS':
        return <span style={{ color: '#ffffff', fontWeight: 800, marginRight: '8px', fontSize: '0.95rem' }}>✓</span>;
      case 'WARN':
        return <span style={{ color: '#d4d4d8', fontWeight: 800, marginRight: '8px', fontSize: '0.95rem' }}>⚠</span>;
      case 'ERROR':
        return <span style={{ color: '#a1a1aa', fontWeight: 800, marginRight: '8px', fontSize: '0.95rem' }}>✕</span>;
      default:
        return <span style={{ color: '#e4e4e7', fontWeight: 800, marginRight: '8px', fontSize: '0.95rem' }}>→</span>;
    }
  };

  const getLogColor = (log: ActivityLog) => {
    const action = log.action.trim();
    if (action.startsWith('✓') || log.level === 'SUCCESS') return '#ffffff';
    if (log.level === 'WARN') return '#d4d4d8';
    if (log.level === 'ERROR') return '#a1a1aa';
    if (action.startsWith('→')) return '#e4e4e7';
    return '#d4d4d8';
  };

  const cleanActionText = (action: string) => {
    return action.replace(/^[✓→]\s*/, '');
  };

  return (
    <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(12, 12, 15, 0.75)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={15} color="#e4e4e7" />
          <span style={{
            fontSize: '0.82rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}>
            LIVE ACTIVITY LOG
          </span>
        </div>

        <button
          onClick={() => setAutoScroll(!autoScroll)}
          style={{
            background: 'transparent',
            border: 'none',
            color: autoScroll ? '#ffffff' : 'var(--text-dim)',
            fontSize: '0.72rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <ArrowDown size={12} />
          Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
        </button>
      </div>

      <div
        ref={terminalRef}
        className="terminal-view"
        style={{
          maxHeight: '260px',
          overflowY: 'auto',
          padding: '14px 18px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.82rem',
          lineHeight: '1.6'
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: 'var(--text-dim)', fontStyle: 'italic', padding: '8px 0' }}>
            No activity logged yet. Click START to begin automated discovery and application.
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                padding: '3px 0',
                borderBottom: '1px solid rgba(255, 255, 255, 0.02)'
              }}
            >
              <span style={{
                color: 'var(--text-dim)',
                fontSize: '0.72rem',
                minWidth: '70px',
                flexShrink: 0,
                marginTop: '1px'
              }}>
                {log.timestamp}
              </span>

              {renderLogPrefix(log)}

              <div style={{ flex: 1 }}>
                {(log.job_title || log.company) && (
                  <span style={{ color: '#ffffff', marginRight: '6px', fontWeight: 600 }}>
                    [{log.company || 'Job'}]
                  </span>
                )}
                <span style={{ color: getLogColor(log) }}>
                  {cleanActionText(log.action)}
                </span>
                {log.result && (
                  <span style={{ color: '#e4e4e7', marginLeft: '6px' }}>
                    — {log.result}
                  </span>
                )}
                {log.error && (
                  <span style={{ color: '#a1a1aa', marginLeft: '6px' }}>
                    (Error: {log.error})
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
