import React, { useRef, useEffect, useState } from 'react';
import { ActivityLog } from '../types';
import { Terminal, Check, AlertCircle, Info, AlertTriangle, ArrowDown } from 'lucide-react';

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

  const getLogIcon = (level: ActivityLog['level']) => {
    switch (level) {
      case 'SUCCESS':
        return <Check size={13} color="var(--accent-emerald)" style={{ flexShrink: 0, marginTop: '2px' }} />;
      case 'WARN':
        return <AlertTriangle size={13} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: '2px' }} />;
      case 'ERROR':
        return <AlertCircle size={13} color="var(--accent-rose)" style={{ flexShrink: 0, marginTop: '2px' }} />;
      default:
        return <Info size={13} color="var(--accent-cyan)" style={{ flexShrink: 0, marginTop: '2px' }} />;
    }
  };

  const getLogColor = (level: ActivityLog['level']) => {
    switch (level) {
      case 'SUCCESS':
        return '#34d399';
      case 'WARN':
        return '#fbbf24';
      case 'ERROR':
        return '#fb7185';
      default:
        return '#f1f5f9';
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={16} color="var(--accent-cyan)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Live Automation Event Stream
          </span>
        </div>

        <button
          onClick={() => setAutoScroll(!autoScroll)}
          style={{
            background: 'transparent',
            border: 'none',
            color: autoScroll ? 'var(--accent-cyan)' : 'var(--text-dim)',
            fontSize: '0.75rem',
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

      <div ref={terminalRef} className="terminal-view">
        {logs.length === 0 ? (
          <div style={{ color: 'var(--text-dim)', fontStyle: 'italic', padding: '10px 0' }}>
            No activity logged yet. Start an automation run to view live events.
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="log-row">
              <span className="log-timestamp">{log.timestamp}</span>
              {getLogIcon(log.level)}
              <div style={{ flex: 1 }}>
                {(log.job_title || log.company) && (
                  <span style={{ color: 'var(--accent-cyan)', marginRight: '6px', fontWeight: 600 }}>
                    [{log.company || 'Job'}]
                  </span>
                )}
                <span style={{ color: getLogColor(log.level) }}>{log.action}</span>
                {log.result && (
                  <span style={{ color: 'var(--accent-emerald)', marginLeft: '6px' }}>
                    → {log.result}
                  </span>
                )}
                {log.error && (
                  <span style={{ color: 'var(--accent-rose)', marginLeft: '6px' }}>
                    — Error: {log.error}
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
