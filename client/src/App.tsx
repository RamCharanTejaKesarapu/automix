import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  ApplicationState,
  CurrentApplicationContext,
  AutomationStatistics,
  PendingPrompt,
  ActivityLog,
  ApplicationRecord
} from './types';
import { Header } from './components/Header';
import { StateMachineVisualizer } from './components/StateMachineVisualizer';
import { LiveMonitor } from './components/LiveMonitor';
import { LiveStatusPanel } from './components/LiveStatusPanel';
import { StatsGrid } from './components/StatsGrid';
import { SessionConfigPanel, SessionConfig } from './components/SessionConfigPanel';
import { CandidateProfileEditor } from './components/CandidateProfileEditor';
import { ApplicationsTable } from './components/ApplicationsTable';
import { ActivityLogTerminal } from './components/ActivityLogTerminal';
import { HumanInTheLoopModal } from './components/HumanInTheLoopModal';
import { SettingsModal } from './components/SettingsModal';
import { LayoutDashboard, UserCheck, Database, Sliders } from 'lucide-react';
import './App.css';

export const App: React.FC = () => {
  const [appState, setAppState] = useState<ApplicationState>('IDLE');
  const [context, setContext] = useState<CurrentApplicationContext | null>(null);
  const [stats, setStats] = useState<AutomationStatistics>({
    jobsFound: 0,
    matchingJobs: 0,
    applicationsSubmitted: 0,
    skipped: 0,
    waitingForUser: 0,
    failed: 0
  });
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<PendingPrompt | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'applications'>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  // Session Input Parameters
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>({
    websiteUrl: 'https://remoteok.com/remote-engineer-jobs',
    targetField: 'Data Science',
    targetRole: 'Data Science Intern',
    targetLocation: 'India',
    keywords: 'Python, SQL, Machine Learning',
    maxApplications: 25,
    autoSubmit: false,
    matchThreshold: 65,
    headless: false
  });

  const wsRef = useRef<WebSocket | null>(null);

  // Establish WebSocket connection with exponential backoff auto-reconnect
  useEffect(() => {
    let reconnectTimeout: any;
    let reconnectAttempts = 0;

    const connectWS = () => {
      setConnectionStatus('connecting');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log('[App] WebSocket connected');
        setConnectionStatus('connected');
        reconnectAttempts = 0;
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'INIT_STATE':
              if (msg.data) {
                setIsRunning(msg.data.isRunning);
                setIsPaused(msg.data.isPaused);
                setAppState(msg.data.state);
                setContext(msg.data.context);
                setStats(msg.data.stats);
                if (msg.data.config) {
                  setSessionConfig(prev => ({ ...prev, ...msg.data.config }));
                }
              }
              if (msg.activePrompt) setPendingPrompt(msg.activePrompt);
              if (msg.logs) setLogs(msg.logs.reverse());
              break;

            case 'STATE_UPDATE':
              setAppState(msg.data.state);
              setContext(msg.data.context);
              setStats(msg.data.stats);

              if (msg.data.state === 'SUBMITTED') {
                confetti({
                  particleCount: 80,
                  spread: 60,
                  origin: { y: 0.6 },
                  colors: ['#ffffff', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a']
                });
                fetchApplications();
              }
              if (msg.data.state === 'STOPPED' || msg.data.state === 'IDLE') {
                setIsRunning(false);
                setIsPaused(false);
              }
              break;

            case 'HITL_PROMPT':
              setPendingPrompt(msg.data);
              break;

            case 'HITL_RESOLVED':
              setPendingPrompt(null);
              break;

            case 'BROWSER_FRAME':
              if (msg.data?.image) {
                setScreenshotBase64(msg.data.image);
              }
              break;

            case 'NEW_LOG':
              setLogs(prev => [...prev, msg.data]);
              break;
          }
        } catch (e) {
          console.error('[App] Failed to parse ws message', e);
        }
      };

      socket.onclose = () => {
        setConnectionStatus('disconnected');
        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 12000);
        console.log(`[App] WebSocket closed, retrying in ${Math.round(delay / 1000)}s...`);
        reconnectAttempts++;
        reconnectTimeout = setTimeout(connectWS, delay);
      };
    };

    connectWS();
    fetchApplications();

    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      setApplications(data.applications || []);
      if (data.stats) {
        setStats(prev => ({
          ...prev,
          applicationsSubmitted: data.stats.submitted
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStart = async () => {
    try {
      setIsRunning(true);
      setIsPaused(false);
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionConfig)
      });
      if (!res.ok) {
        const error = await res.json();
        alert(`Failed to start: ${error.error}`);
        setIsRunning(false);
      }
    } catch (err: any) {
      alert(`Error starting session: ${err.message}`);
      setIsRunning(false);
    }
  };

  const handlePause = async () => {
    setIsPaused(true);
    await fetch('/api/session/pause', { method: 'POST' });
  };

  const handleResume = async () => {
    setIsPaused(false);
    await fetch('/api/session/resume', { method: 'POST' });
  };

  const handleStop = async () => {
    await fetch('/api/session/stop', { method: 'POST' });
    setIsRunning(false);
    setIsPaused(false);
  };

  const handleHitlSubmit = async (promptId: string, answer: string, savePermanently: boolean) => {
    try {
      const res = await fetch('/api/hitl/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId, answer, savePermanently })
      });
      if (res.ok) {
        setPendingPrompt(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="app-container fade-in">
      {/* Top Header */}
      <Header
        state={appState}
        isRunning={isRunning}
        isPaused={isPaused}
        autoSubmit={sessionConfig.autoSubmit}
        connectionStatus={connectionStatus}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onStop={handleStop}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Navigation Tabs */}
      <div className="nav-tab-list">
        <button
          className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={16} />
          <span>Dashboard & Live Monitor</span>
        </button>
        <button
          className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <UserCheck size={16} />
          <span>Candidate Profile & Truth</span>
        </button>
        <button
          className={`nav-tab ${activeTab === 'applications' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('applications');
            fetchApplications();
          }}
        >
          <Database size={16} />
          <span>Applications Database ({applications.length})</span>
        </button>
      </div>

      {/* Tab: Dashboard */}
      {activeTab === 'dashboard' && (
        <>
          {/* Live Browser Preview - FIRST and DOMINANT */}
          <LiveMonitor
            state={appState}
            context={context}
            screenshotBase64={screenshotBase64}
          />

          {/* LIVE STATUS & CONTROLS Card */}
          <LiveStatusPanel
            state={appState}
            context={context}
            stats={stats}
            config={sessionConfig}
            isRunning={isRunning}
            isPaused={isPaused}
            onStart={handleStart}
            onPause={handlePause}
            onResume={handleResume}
            onStop={handleStop}
          />

          {/* Real-time statistics counters */}
          <StatsGrid stats={stats} />

          {/* State Machine Visualizer */}
          <StateMachineVisualizer currentState={appState} />

          {/* Main User Input & Criteria Panel - collapse when running */}
          {!isRunning && (
            <SessionConfigPanel
              config={sessionConfig}
              onChange={(updates) => setSessionConfig(prev => ({ ...prev, ...updates }))}
              disabled={isRunning}
            />
          )}

          {/* Live Activity Log Stream */}
          <ActivityLogTerminal logs={logs} />
        </>
      )}

      {/* Tab: Candidate Profile */}
      {activeTab === 'profile' && (
        <CandidateProfileEditor onSaved={fetchApplications} />
      )}

      {/* Tab: Applications Table */}
      {activeTab === 'applications' && (
        <ApplicationsTable
          applications={applications}
          onRefresh={fetchApplications}
        />
      )}

      {/* Human In The Loop Modal (Prompt / CAPTCHA / Confirmation) */}
      <HumanInTheLoopModal
        prompt={pendingPrompt}
        onSubmit={handleHitlSubmit}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default App;
