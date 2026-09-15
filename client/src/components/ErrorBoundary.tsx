import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    copied: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught UI error:', error, errorInfo);
  }

  private handleCopy = () => {
    if (this.state.error) {
      navigator.clipboard.writeText(
        `AutoMix UI Error:\n${this.state.error.name}: ${this.state.error.message}\n\nStack:\n${this.state.error.stack}`
      );
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#09090b',
          color: '#fafafa',
          padding: '24px',
          fontFamily: 'Inter, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            backgroundColor: '#121215',
            border: '1px solid #27272a',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444'
              }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#fafafa' }}>
                  Application Interface Error
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#a1a1aa' }}>
                  AutoMix encountered an unexpected render issue.
                </p>
              </div>
            </div>

            <div style={{
              backgroundColor: '#09090b',
              border: '1px solid #18181b',
              borderRadius: '8px',
              padding: '14px',
              fontSize: '12px',
              fontFamily: 'JetBrains Mono, monospace',
              color: '#d4d4d8',
              overflowX: 'auto',
              maxHeight: '180px',
              marginBottom: '20px'
            }}>
              {this.state.error?.message || 'Unknown runtime exception'}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={this.handleCopy}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  color: '#e4e4e7',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                {this.state.copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                {this.state.copied ? 'Copied Trace' : 'Copy Trace'}
              </button>

              <button
                onClick={this.handleReload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  border: 'none',
                  color: '#09090b',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={14} />
                Reload Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
