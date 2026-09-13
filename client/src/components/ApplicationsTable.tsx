import React, { useState } from 'react';
import { ApplicationRecord } from '../types';
import { ExternalLink, Search, CheckCircle, AlertCircle, Clock, Eye, X } from 'lucide-react';

interface ApplicationsTableProps {
  applications: ApplicationRecord[];
  onRefresh: () => void;
}

export const ApplicationsTable: React.FC<ApplicationsTableProps> = ({ applications, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);

  const filtered = applications.filter(app => {
    const matchesSearch =
      app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.job_title.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: ApplicationRecord['status']) => {
    switch (status) {
      case 'SUBMITTED':
        return <span className="badge badge-emerald">SUBMITTED</span>;
      case 'APPLYING':
        return <span className="badge badge-cyan">APPLYING</span>;
      case 'PENDING_REVIEW':
        return <span className="badge badge-amber">PENDING REVIEW</span>;
      case 'FAILED':
        return <span className="badge badge-rose">FAILED</span>;
      case 'SKIPPED':
        return <span className="badge badge-indigo">SKIPPED</span>;
      default:
        return <span className="badge badge-indigo">{status}</span>;
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>Application Database & History</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Persistent audit log preventing duplicates and tracking submission statuses</p>
        </div>

        {/* Search & Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '32px', width: '220px' }}
              placeholder="Search company or title..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {['ALL', 'SUBMITTED', 'PENDING_REVIEW', 'SKIPPED', 'FAILED'].map(s => (
              <button
                key={s}
                className={`nav-tab ${statusFilter === s ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
          No applications match current filters.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Company</th>
                <th style={{ padding: '12px 14px' }}>Role / Job Title</th>
                <th style={{ padding: '12px 14px' }}>Match Score</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
                <th style={{ padding: '12px 14px' }}>Date Applied</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => (
                <tr key={app.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', transition: 'background 0.15s ease' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#ffffff' }}>
                    {app.company}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{app.job_title}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {app.match_score !== undefined ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: app.match_score >= 80 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                        color: app.match_score >= 80 ? '#34d399' : '#22d3ee'
                      }}>
                        {app.match_score}%
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {getStatusBadge(app.status)}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                    {app.date_applied ? new Date(app.date_applied).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                        onClick={() => setSelectedApp(app)}
                        title="View Details & Generated Answers"
                      >
                        <Eye size={13} />
                        Details
                      </button>
                      <a
                        href={app.job_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ padding: '5px 8px' }}
                        title="Open Job URL"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Drawer / Modal */}
      {selectedApp && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(4, 7, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>{selectedApp.job_title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedApp.company} • {getStatusBadge(selectedApp.status)}</p>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: '6px' }}
                onClick={() => setSelectedApp(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '22px', overflowY: 'auto', flex: 1 }}>
              {selectedApp.match_reason && (
                <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(6, 182, 212, 0.08)', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.25)', fontSize: '0.85rem' }}>
                  <strong style={{ color: 'var(--accent-cyan)' }}>Match Evaluation: </strong>
                  {selectedApp.match_reason}
                </div>
              )}

              {selectedApp.gpt_answers && Object.keys(selectedApp.gpt_answers).length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '10px' }}>
                    AI Contextual Answers Generated:
                  </h4>
                  {Object.entries(selectedApp.gpt_answers).map(([q, a], i) => (
                    <div key={i} style={{ marginBottom: '12px', padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>{q}</div>
                      <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{String(a)}</div>
                    </div>
                  ))}
                </div>
              )}

              {selectedApp.fields_filled && Object.keys(selectedApp.fields_filled).length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-indigo)', marginBottom: '10px' }}>
                    Fields Filled:
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                    {Object.entries(selectedApp.fields_filled).map(([k, v], i) => (
                      <div key={i} style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--text-dim)', display: 'block' }}>{k}</span>
                        <strong style={{ color: 'var(--text-main)' }}>{String(v)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedApp.error_message && (
                <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(244, 63, 94, 0.1)', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.3)', color: 'var(--accent-rose)', fontSize: '0.85rem' }}>
                  <strong>Error Log: </strong>{selectedApp.error_message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
