import React from 'react';
import { AutomationStatistics } from '../types';
import { Search, CheckCircle2, Send, AlertTriangle, XCircle } from 'lucide-react';

interface StatsGridProps {
  stats: AutomationStatistics;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
  const cards = [
    {
      title: 'Jobs Found',
      value: stats.jobsFound,
      icon: <Search size={18} color="var(--accent-cyan)" />,
      borderColor: 'rgba(6, 182, 212, 0.25)',
      glowColor: 'rgba(6, 182, 212, 0.15)'
    },
    {
      title: 'Matching Jobs',
      value: stats.matchingJobs,
      icon: <CheckCircle2 size={18} color="var(--accent-blue)" />,
      borderColor: 'rgba(59, 130, 246, 0.25)',
      glowColor: 'rgba(59, 130, 246, 0.15)'
    },
    {
      title: 'Applications Submitted',
      value: stats.applicationsSubmitted,
      icon: <Send size={18} color="var(--accent-emerald)" />,
      borderColor: 'rgba(16, 185, 129, 0.25)',
      glowColor: 'rgba(16, 185, 129, 0.15)'
    },
    {
      title: 'Waiting for User',
      value: stats.waitingForUser,
      icon: <AlertTriangle size={18} color="var(--accent-amber)" />,
      borderColor: stats.waitingForUser > 0 ? 'rgba(245, 158, 11, 0.6)' : 'rgba(245, 158, 11, 0.25)',
      glowColor: 'rgba(245, 158, 11, 0.15)'
    },
    {
      title: 'Failed / Skipped',
      value: stats.failed,
      icon: <XCircle size={18} color="var(--accent-rose)" />,
      borderColor: 'rgba(244, 63, 94, 0.25)',
      glowColor: 'rgba(244, 63, 94, 0.15)'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    }}>
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="glass-panel"
          style={{
            padding: '16px 20px',
            borderColor: card.borderColor,
            background: `radial-gradient(circle at top right, ${card.glowColor} 0%, rgba(14, 21, 37, 0.9) 65%)`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{card.title}</span>
            {card.icon}
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
};
