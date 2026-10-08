import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { getHealth } from '../api/client.js';

/**
 * Navigation component — fixed top bar with dark maroon glass effect.
 */
export function Navbar({ activePage, onNavigate }) {
  const links = [
    { id: 'home',           label: 'Home' },
    { id: 'scam-detector',  label: 'Scam Detector' },
    { id: 'investigation',  label: 'Investigation' },
    { id: 'about',          label: 'How It Works' },
  ];

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(10, 5, 7, 0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--clr-border)',
      boxShadow: '0 1px 20px rgba(0,0,0,0.6)',
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', height: '64px', justifyContent: 'space-between' }}>
        {/* Logo */}
        <button
          onClick={() => onNavigate('home')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, var(--clr-accent), var(--clr-maroon-700))',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 12px rgba(192,51,74,0.4)',
          }}>
            <Shield size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.02em', color: 'var(--clr-text-primary)' }}>
            Trace<span style={{ color: 'var(--clr-accent)' }}>Shield</span>
          </span>
        </button>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {links.map(link => (
            <button
              key={link.id}
              onClick={() => onNavigate(link.id)}
              style={{
                cursor: 'pointer',
                padding: '0.5rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem', fontWeight: 500,
                color: activePage === link.id ? 'var(--clr-text-primary)' : 'var(--clr-text-muted)',
                background: activePage === link.id ? 'var(--clr-accent-muted)' : 'transparent',
                border: activePage === link.id ? '1px solid var(--clr-accent-border)' : '1px solid transparent',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Status pill */}
        <BackendStatus />
      </div>
    </nav>
  );
}

function BackendStatus() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let mounted = true;
    const check = () => {
      getHealth()
        .then(d => { if (mounted) setStatus(d); })
        .catch(() => { if (mounted) setStatus(null); });
    };

    check();
    const interval = setInterval(check, 8000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!status) {
    return (
      <div className="badge badge-neutral" style={{ gap: '0.5rem' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--clr-text-dim)' }} />
        Connecting...
      </div>
    );
  }

  const aiMode = status.capabilities?.ai_model;
  const isRealAI = aiMode === 'hf-inference';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div className={`badge ${isRealAI ? 'badge-success' : 'badge-warning'}`}>
        <div className={`pulse-dot ${isRealAI ? 'green' : ''}`} style={{ width: 6, height: 6 }} />
        {isRealAI ? 'AI Active' : 'Local Mode'}
      </div>
    </div>
  );
}

/**
 * Risk score visual indicator
 */
export function RiskMeter({ score, size = 'md' }) {
  const color = score >= 70 ? 'var(--clr-danger)' : score >= 40 ? 'var(--clr-warning)' : 'var(--clr-success)';
  const label = score >= 70 ? 'High Risk' : score >= 40 ? 'Medium Risk' : 'Low Risk';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--clr-text-muted)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: size === 'lg' ? '1.5rem' : '1rem', fontWeight: 800, color }}>{score}</span>
      </div>
      <div className="risk-bar-track">
        <div className="risk-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}

/**
 * Verdict badge — SCAM or LEGITIMATE
 */
export function VerdictBadge({ verdict }) {
  const isScam = verdict === 'SCAM';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.5rem 1.25rem',
      borderRadius: 100,
      fontWeight: 800, fontSize: '0.875rem', letterSpacing: '0.08em', textTransform: 'uppercase',
      background: isScam ? 'rgba(229,62,62,0.15)' : 'rgba(56,161,105,0.15)',
      color: isScam ? '#fc8181' : '#68d391',
      border: `1px solid ${isScam ? 'rgba(229,62,62,0.3)' : 'rgba(56,161,105,0.3)'}`,
    }}>
      {isScam ? <AlertTriangle size={15} /> : <CheckCircle size={15} />}
      {verdict}
    </div>
  );
}

/**
 * Loading state component
 */
export function LoadingState({ message = 'Analyzing...', large = false }) {
  return (
    <div style={{ textAlign: 'center', padding: large ? '4rem 2rem' : '2rem' }}>
      <div className={`spinner ${large ? 'spinner-lg' : ''}`} style={{ margin: '0 auto 1rem' }} />
      <p style={{ color: 'var(--clr-text-muted)', fontSize: large ? '1rem' : '0.875rem' }}>{message}</p>
    </div>
  );
}

/**
 * Error state component
 */
export function ErrorState({ error, onRetry }) {
  return (
    <div className="alert alert-danger animate-fadeIn" style={{ flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <AlertTriangle size={16} />
        <strong>Error</strong>
      </div>
      <p style={{ fontSize: '0.875rem' }}>{error}</p>
      {onRetry && (
        <button className="btn btn-sm btn-secondary" onClick={onRetry} style={{ alignSelf: 'flex-start' }}>
          Try Again
        </button>
      )}
    </div>
  );
}

/**
 * Empty state component
 */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--clr-text-muted)' }}>
      {Icon && <Icon size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />}
      <h3 style={{ marginBottom: '0.5rem', color: 'var(--clr-text-secondary)', fontWeight: 600 }}>{title}</h3>
      {description && <p style={{ fontSize: '0.875rem', marginBottom: action ? '1.25rem' : 0 }}>{description}</p>}
      {action}
    </div>
  );
}

/**
 * API unavailable banner
 */
export function ApiUnavailableBanner({ service, message }) {
  return (
    <div className="alert alert-warning animate-fadeIn">
      <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
      <div>
        <strong>{service} Unavailable</strong>
        <p style={{ marginTop: '0.25rem', fontSize: '0.8125rem' }}>{message}</p>
      </div>
    </div>
  );
}

/**
 * Section header with optional label
 */
export function SectionHeader({ label, title, description }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {label && <p className="section-label">{label}</p>}
      <h2 className="heading-md">{title}</h2>
      {description && <p style={{ color: 'var(--clr-text-muted)', marginTop: '0.25rem', fontSize: '0.9375rem' }}>{description}</p>}
    </div>
  );
}

/**
 * Entity type chip
 */
export function EntityChip({ type, value }) {
  const colorMap = {
    Person: { bg: 'rgba(66,153,225,0.12)', color: '#63b3ed', border: 'rgba(66,153,225,0.2)' },
    Phone: { bg: 'rgba(72,187,120,0.12)', color: '#68d391', border: 'rgba(72,187,120,0.2)' },
    Email: { bg: 'rgba(214,158,46,0.12)', color: '#f6c57e', border: 'rgba(214,158,46,0.2)' },
    Organization: { bg: 'rgba(159,122,234,0.12)', color: '#b794f4', border: 'rgba(159,122,234,0.2)' },
    Location: { bg: 'rgba(237,137,54,0.12)', color: '#fbd38d', border: 'rgba(237,137,54,0.2)' },
    URL: { bg: 'rgba(229,62,62,0.12)', color: '#fc8181', border: 'rgba(229,62,62,0.2)' },
    IP: { bg: 'rgba(56,178,172,0.12)', color: '#81e6d9', border: 'rgba(56,178,172,0.2)' },
    Amount: { bg: 'rgba(129,230,217,0.12)', color: '#b2f5ea', border: 'rgba(129,230,217,0.2)' },
    Date: { bg: 'rgba(192,51,74,0.12)', color: 'var(--clr-maroon-200)', border: 'rgba(192,51,74,0.2)' },
  };
  const style = colorMap[type] || colorMap.Date;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
      background: style.bg, color: style.color,
      border: `1px solid ${style.border}`,
      borderRadius: 100, padding: '0.25rem 0.75rem',
      fontSize: '0.8125rem', fontWeight: 500,
    }}>
      <span style={{ fontSize: '0.6875rem', fontWeight: 700, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{type}</span>
      <span style={{ fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  );
}
