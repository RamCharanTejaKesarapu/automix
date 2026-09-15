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
      icon: <Search size={18} color="#f4f4f5" />,
      borderColor: 'rgba(255, 255, 255, 0.12)',
      glowColor: 'rgba(255, 255, 255, 0.05)'
    },
    {
      title: 'Matching Jobs',
      value: stats.matchingJobs,
      icon: <CheckCircle2 size={18} color="#e4e4e7" />,
      borderColor: 'rgba(255, 255, 255, 0.12)',
      glowColor: 'rgba(255, 255, 255, 0.05)'
    },
    {
      title: 'Applications Submitted',
      value: stats.applicationsSubmitted,
      icon: <Send size={18} color="#ffffff" />,
      borderColor: 'rgba(255, 255, 255, 0.18)',
      glowColor: 'rgba(255, 255, 255, 0.08)'
    },
    {
      title: 'Skipped',
      value: stats.skipped ?? 0,
      icon: <XCircle size={18} color="#a1a1aa" />,
      borderColor: 'rgba(255, 255, 255, 0.08)',
      glowColor: 'rgba(255, 255, 255, 0.03)'
    },
    {
      title: 'Waiting for User',
      value: stats.waitingForUser,
      icon: <AlertTriangle size={18} color="#d4d4d8" />,
      borderColor: stats.waitingForUser > 0 ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.08)',
      glowColor: stats.waitingForUser > 0 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)'
    },
    {
      title: 'Failed',
      value: stats.failed,
      icon: <XCircle size={18} color="#71717a" />,
      borderColor: 'rgba(255, 255, 255, 0.08)',
      glowColor: 'rgba(255, 255, 255, 0.03)'
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
            background: `radial-gradient(circle at top right, ${card.glowColor} 0%, rgba(18, 18, 21, 0.95) 70%)`
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
