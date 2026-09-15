import React from 'react';
import { ApplicationState } from '../types';
import { ArrowRight, CheckCircle, Clock } from 'lucide-react';

interface StateMachineVisualizerProps {
  currentState: ApplicationState;
}

const FLOW_STATES: Array<{ id: ApplicationState; label: string; short: string }> = [
  { id: 'DISCOVERING', label: 'Discovering', short: 'DISC' },
  { id: 'JOB_FOUND', label: 'Job Found', short: 'FOUND' },
  { id: 'MATCH_VALIDATION', label: 'Match Check', short: 'MATCH' },
  { id: 'OPENING_APPLICATION', label: 'Opening App', short: 'OPEN' },
  { id: 'FILLING_FIELDS', label: 'Filling Fields', short: 'FILL' },
  { id: 'WAITING_FOR_USER', label: 'Waiting on User', short: 'USER' },
  { id: 'GENERATING_GPT_RESPONSE', label: 'GPT Response', short: 'GPT' },
  { id: 'VALIDATING_APPLICATION', label: 'Validating', short: 'VAL' },
  { id: 'READY_TO_SUBMIT', label: 'Ready', short: 'RDY' },
  { id: 'SUBMITTING', label: 'Submitting', short: 'SUB' },
  { id: 'SUBMITTED', label: 'Submitted', short: 'DONE' },
  { id: 'RETURN_TO_SEARCH', label: 'Return to Search', short: 'BACK' },
  { id: 'NEXT_JOB', label: 'Next Job', short: 'NEXT' }
];

export const StateMachineVisualizer: React.FC<StateMachineVisualizerProps> = ({ currentState }) => {
  const currentIndex = FLOW_STATES.findIndex(s => s.id === currentState);

  return (
    <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            State Machine Execution Pipeline
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#e4e4e7' }}>
          Active: <strong style={{ color: '#ffffff' }}>{currentState}</strong>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        overflowX: 'auto',
        paddingBottom: '8px',
        scrollbarWidth: 'none'
      }}>
        {FLOW_STATES.map((step, idx) => {
          const isActive = step.id === currentState;
          const isPassed = currentIndex !== -1 && idx < currentIndex;

          let bg = 'rgba(255, 255, 255, 0.03)';
          let border = 'rgba(255, 255, 255, 0.07)';
          let color = 'var(--text-dim)';

          if (isActive) {
            bg = 'rgba(255, 255, 255, 0.12)';
            border = 'rgba(255, 255, 255, 0.35)';
            color = '#ffffff';
          } else if (isPassed) {
            bg = 'rgba(255, 255, 255, 0.06)';
            border = 'rgba(255, 255, 255, 0.12)';
            color = 'var(--text-muted)';
          }

          return (
            <React.Fragment key={step.id}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: bg,
                  border: `1px solid ${border}`,
                  color,
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 700 : 500,
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 0 16px rgba(255, 255, 255, 0.12)' : 'none',
                  transition: 'all 0.25s ease'
                }}
              >
                {isActive && (
                  <span style={{
                    display: 'inline-block',
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    boxShadow: '0 0 8px rgba(255, 255, 255, 0.8)'
                  }} />
                )}
                {isPassed && <CheckCircle size={12} color="#d4d4d8" />}
                {!isActive && !isPassed && <Clock size={11} color="var(--text-dim)" />}
                <span>{step.label}</span>
              </div>
              {idx < FLOW_STATES.length - 1 && (
                <ArrowRight size={12} color="var(--text-dim)" style={{ opacity: 0.5, flexShrink: 0 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
