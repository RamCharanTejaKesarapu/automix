import React, { useState, useEffect } from 'react';
import { User, FileText, Briefcase, GraduationCap, Award, Shield, Save, Upload, Trash2, Plus, BrainCircuit } from 'lucide-react';
import { LearnedAnswer } from '../types';

interface CandidateProfileEditorProps {
  onSaved: () => void;
}

export const CandidateProfileEditor: React.FC<CandidateProfileEditorProps> = ({ onSaved }) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'education' | 'experience' | 'skills' | 'documents' | 'learned'>('personal');
  const [learnedAnswers, setLearnedAnswers] = useState<LearnedAnswer[]>([]);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
    fetchLearnedAnswers();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLearnedAnswers = async () => {
    try {
      const res = await fetch('/api/learned-answers');
      const data = await res.json();
      setLearnedAnswers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      if (res.ok) {
        setStatusMsg('Profile successfully saved!');
        setTimeout(() => setStatusMsg(null), 3000);
        onSaved();
      }
    } catch (err: any) {
      setStatusMsg(`Error saving profile: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('resume', file);

    setUploadingResume(true);
    try {
      const res = await fetch('/api/upload/resume', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setProfile((prev: any) => ({
          ...prev,
          resumePath: data.filePath,
          resumeFileName: data.fileName
        }));
        setStatusMsg(`Uploaded ${data.fileName} successfully!`);
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploadingResume(false);
    }
  };

  const handleDeleteLearned = async (id: string) => {
    await fetch(`/api/learned-answers/${id}`, { method: 'DELETE' });
    fetchLearnedAnswers();
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Profile...</div>;
  }

  if (!profile) return null;

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>Candidate Truth Profile</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Primary source of truth for all automated form responses</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {statusMsg && <span style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: 600 }}>{statusMsg}</span>}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </div>

      {/* Profile sub-tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '20px', overflowX: 'auto' }}>
        <button className={`nav-tab ${activeTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveTab('personal')}>
          <User size={15} /> Personal Info
        </button>
        <button className={`nav-tab ${activeTab === 'education' ? 'active' : ''}`} onClick={() => setActiveTab('education')}>
          <GraduationCap size={15} /> Education
        </button>
        <button className={`nav-tab ${activeTab === 'experience' ? 'active' : ''}`} onClick={() => setActiveTab('experience')}>
          <Briefcase size={15} /> Experience & Internships
        </button>
        <button className={`nav-tab ${activeTab === 'skills' ? 'active' : ''}`} onClick={() => setActiveTab('skills')}>
          <Award size={15} /> Skills & Projects
        </button>
        <button className={`nav-tab ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>
          <FileText size={15} /> Resume & Cover Letter
        </button>
        <button className={`nav-tab ${activeTab === 'learned' ? 'active' : ''}`} onClick={() => setActiveTab('learned')}>
          <BrainCircuit size={15} /> Learned Q&A Bank ({learnedAnswers.length})
        </button>
      </div>

      {/* Tab: Personal Info */}
      {activeTab === 'personal' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Full Name</label>
            <input className="form-input" value={profile.fullName} onChange={e => setProfile({ ...profile, fullName: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Email Address</label>
            <input className="form-input" type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Phone Number</label>
            <input className="form-input" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>City, State, Country</label>
            <input className="form-input" value={profile.location} onChange={e => setProfile({ ...profile, location: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>LinkedIn URL</label>
            <input className="form-input" value={profile.linkedin} onChange={e => setProfile({ ...profile, linkedin: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>GitHub URL</label>
            <input className="form-input" value={profile.github} onChange={e => setProfile({ ...profile, github: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Portfolio / Website</label>
            <input className="form-input" value={profile.portfolio} onChange={e => setProfile({ ...profile, portfolio: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Work Authorization</label>
            <select className="form-select" value={profile.workAuthorization} onChange={e => setProfile({ ...profile, workAuthorization: e.target.value })}>
              <option value="Yes">Yes (Legally authorized)</option>
              <option value="No">No</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Requires Sponsorship?</label>
            <select className="form-select" value={profile.requiresSponsorship} onChange={e => setProfile({ ...profile, requiresSponsorship: e.target.value })}>
              <option value="No">No (Does not require sponsorship)</option>
              <option value="Yes">Yes (Requires visa sponsorship)</option>
            </select>
          </div>
        </div>
      )}

      {/* Tab: Education */}
      {activeTab === 'education' && (
        <div>
          {profile.education.map((edu: any, i: number) => (
            <div key={i} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Degree</label>
                  <input className="form-input" value={edu.degree} onChange={e => {
                    const next = [...profile.education];
                    next[i].degree = e.target.value;
                    setProfile({ ...profile, education: next });
                  }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>University / School</label>
                  <input className="form-input" value={edu.university} onChange={e => {
                    const next = [...profile.education];
                    next[i].university = e.target.value;
                    setProfile({ ...profile, education: next });
                  }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Major</label>
                  <input className="form-input" value={edu.major} onChange={e => {
                    const next = [...profile.education];
                    next[i].major = e.target.value;
                    setProfile({ ...profile, education: next });
                  }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Graduation Year</label>
                  <input className="form-input" value={edu.graduationYear} onChange={e => {
                    const next = [...profile.education];
                    next[i].graduationYear = e.target.value;
                    setProfile({ ...profile, education: next });
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Experience */}
      {activeTab === 'experience' && (
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginBottom: '10px' }}>Work Experience</h3>
          {profile.workExperience.map((exp: any, i: number) => (
            <div key={i} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Company</label>
                  <input className="form-input" value={exp.company} onChange={e => {
                    const next = [...profile.workExperience];
                    next[i].company = e.target.value;
                    setProfile({ ...profile, workExperience: next });
                  }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Role</label>
                  <input className="form-input" value={exp.role} onChange={e => {
                    const next = [...profile.workExperience];
                    next[i].role = e.target.value;
                    setProfile({ ...profile, workExperience: next });
                  }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Dates</label>
                  <input className="form-input" value={`${exp.startDate} - ${exp.endDate}`} onChange={e => {
                    const next = [...profile.workExperience];
                    next[i].startDate = e.target.value;
                    setProfile({ ...profile, workExperience: next });
                  }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Description</label>
                <textarea rows={2} className="form-textarea" value={exp.description} onChange={e => {
                  const next = [...profile.workExperience];
                  next[i].description = e.target.value;
                  setProfile({ ...profile, workExperience: next });
                }} />
              </div>
            </div>
          ))}

          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#d4d4d8', margin: '20px 0 10px' }}>Internships</h3>
          {profile.internships.map((intern: any, i: number) => (
            <div key={i} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Company</label>
                  <input className="form-input" value={intern.company} onChange={e => {
                    const next = [...profile.internships];
                    next[i].company = e.target.value;
                    setProfile({ ...profile, internships: next });
                  }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Role</label>
                  <input className="form-input" value={intern.role} onChange={e => {
                    const next = [...profile.internships];
                    next[i].role = e.target.value;
                    setProfile({ ...profile, internships: next });
                  }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Description</label>
                <textarea rows={2} className="form-textarea" value={intern.description} onChange={e => {
                  const next = [...profile.internships];
                  next[i].description = e.target.value;
                  setProfile({ ...profile, internships: next });
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Skills & Projects */}
      {activeTab === 'skills' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
              TECHNICAL SKILLS (Comma Separated)
            </label>
            <textarea
              rows={3}
              className="form-textarea"
              value={profile.skills.join(', ')}
              onChange={e => {
                const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                setProfile({ ...profile, skills: arr });
              }}
            />
          </div>

          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#d4d4d8', marginBottom: '8px' }}>
            KEY PROJECTS
          </label>
          {profile.projects.map((proj: any, i: number) => (
            <div key={i} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Project Title</label>
                  <input className="form-input" value={proj.title} onChange={e => {
                    const next = [...profile.projects];
                    next[i].title = e.target.value;
                    setProfile({ ...profile, projects: next });
                  }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Technologies Used</label>
                  <input className="form-input" value={Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies} onChange={e => {
                    const next = [...profile.projects];
                    next[i].technologies = e.target.value.split(',').map(s => s.trim());
                    setProfile({ ...profile, projects: next });
                  }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Description</label>
                <textarea rows={2} className="form-textarea" value={proj.description} onChange={e => {
                  const next = [...profile.projects];
                  next[i].description = e.target.value;
                  setProfile({ ...profile, projects: next });
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Documents */}
      {activeTab === 'documents' && (
        <div>
          {/* File upload widget */}
          <div style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px dashed rgba(255, 255, 255, 0.25)', marginBottom: '20px', textAlign: 'center' }}>
            <Upload size={32} color="#e4e4e7" style={{ margin: '0 auto 10px' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>Resume / CV File for Auto-Upload</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              {profile.resumeFileName ? `Current attached file: ${profile.resumeFileName}` : 'Select a PDF, DOCX, or TXT resume to attach'}
            </p>
            <input
              type="file"
              id="resume-file-input"
              accept=".pdf,.docx,.txt,.md"
              onChange={handleResumeUpload}
              style={{ display: 'none' }}
            />
            <label htmlFor="resume-file-input" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              {uploadingResume ? 'Uploading...' : 'Choose File to Upload'}
            </label>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              FULL RESUME TEXT (Parsed for GPT Contextual Grounding)
            </label>
            <textarea
              rows={8}
              className="form-textarea"
              value={profile.resumeText}
              onChange={e => setProfile({ ...profile, resumeText: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
              DEFAULT COVER LETTER TEMPLATE
            </label>
            <textarea
              rows={6}
              className="form-textarea"
              value={profile.coverLetter}
              onChange={e => setProfile({ ...profile, coverLetter: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Tab: Learned Q&A Bank */}
      {activeTab === 'learned' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>Persistent Question & Answer Memory</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Answers provided during Human-in-the-Loop prompts are remembered permanently here so you are never asked twice.</p>
          </div>

          {learnedAnswers.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>
              No custom answers learned yet. As the agent encounters unique questions and you provide answers, they will be saved here automatically!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {learnedAnswers.map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ flex: 1, marginRight: '16px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', marginBottom: '2px' }}>{item.questionPattern}</div>
                    <div style={{ fontSize: '0.8rem', color: '#ffffff' }}>Answer: <strong>{item.answer}</strong></div>
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 10px', color: '#a1a1aa' }}
                    onClick={() => handleDeleteLearned(item.id)}
                    title="Delete Answer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
