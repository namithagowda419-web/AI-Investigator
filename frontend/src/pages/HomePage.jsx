import { Shield, Search, Zap, Globe, ArrowRight, Lock, Eye, Network } from 'lucide-react';

const CAPABILITY_CARDS = [
  {
    icon: Shield,
    title: 'Scam Detection',
    description: 'Analyze suspicious SMS, WhatsApp, email, and job offers. AI identifies patterns, urgency cues, and fraud indicators.',
    color: '#fc8181',
    badge: 'AI-Powered',
  },
  {
    icon: Search,
    title: 'Crime Investigation',
    description: 'Create structured investigation cases. Extract entities, map relationships, and uncover potential connections.',
    color: '#63b3ed',
    badge: 'Workspace',
  },
  {
    icon: Globe,
    title: 'Public Intelligence',
    description: 'Gather publicly available information via web search and news APIs to support your investigation.',
    color: '#68d391',
    badge: 'Live Search',
  },
  {
    icon: Network,
    title: 'Entity Mapping',
    description: 'Visualize relationships between persons, phones, organizations, and locations in a connection graph.',
    color: '#b794f4',
    badge: 'Graph View',
  },
];

const STATS = [
  { value: '12+', label: 'Scam Categories' },
  { value: '8', label: 'Suspicious Indicators' },
  { value: '2', label: 'Live APIs' },
  { value: '∞', label: 'Cases Supported' },
];

export default function HomePage({ onNavigate }) {
  return (
    <div className="page-content">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            radial-gradient(circle at 20% 50%, rgba(139,40,82,0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(192,51,74,0.05) 0%, transparent 40%),
            linear-gradient(rgba(90,40,60,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(90,40,60,0.04) 1px, transparent 1px)
          `,
          backgroundSize: 'auto, auto, 40px 40px, 40px 40px',
          pointerEvents: 'none',
        }} />

        <div className="container">
          <div style={{ maxWidth: 760, position: 'relative' }}>
            {/* Pre-tag */}
            <div className="badge badge-maroon animate-fadeInUp" style={{ marginBottom: '1.5rem' }}>
              <Lock size={11} />
              AI Investigation Platform · v1.0
            </div>

            <h1 className="heading-xl animate-fadeInUp gradient-text" style={{ animationDelay: '0.05s', marginBottom: '1.25rem' }}>
              AI-Powered Investigation<br />& Scam Detection
            </h1>

            <p className="animate-fadeInUp" style={{
              fontSize: 'clamp(1rem, 2vw, 1.1875rem)',
              color: 'var(--clr-text-secondary)',
              lineHeight: 1.75,
              maxWidth: 600,
              marginBottom: '2.5rem',
              animationDelay: '0.1s',
            }}>
              Analyze suspicious messages, uncover potential connections, and gather
              publicly available intelligence from multiple sources — powered by Qwen AI.
            </p>

            <div className="flex gap-4 animate-fadeInUp" style={{ animationDelay: '0.15s', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => onNavigate('scam-detector')}
              >
                <Shield size={18} />
                Analyze a Message
              </button>
              <button
                className="btn btn-secondary btn-lg"
                onClick={() => onNavigate('investigation')}
              >
                <Search size={18} />
                Start Investigation
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Stats row */}
            <div className="flex gap-8 mt-8 animate-fadeInUp" style={{ animationDelay: '0.2s', flexWrap: 'wrap' }}>
              {STATS.map(stat => (
                <div key={stat.label}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--clr-maroon-200)' }}>{stat.value}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--clr-text-muted)' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Dashboard mockup ───────────────────────────────────────────────── */}
      <section className="container" style={{ marginBottom: '4rem' }}>
        <DashboardMockup />
      </section>

      {/* ── Capability Cards ───────────────────────────────────────────────── */}
      <section className="container" style={{ marginBottom: '5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <p className="section-label">Core Capabilities</p>
          <h2 className="heading-lg">What TraceShield Can Do</h2>
        </div>
        <div className="grid-4">
          {CAPABILITY_CARDS.map((card, i) => (
            <CapabilityCard key={card.title} {...card} delay={i * 0.07} />
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="container" style={{ marginBottom: '5rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--clr-maroon-900), var(--clr-bg-card))',
          border: '1px solid var(--clr-accent-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '3rem',
          textAlign: 'center',
          boxShadow: 'var(--shadow-glow)',
        }}>
          <Eye size={36} style={{ color: 'var(--clr-accent)', marginBottom: '1rem' }} />
          <h2 className="heading-md" style={{ marginBottom: '0.75rem' }}>Ready to Investigate?</h2>
          <p style={{ color: 'var(--clr-text-muted)', marginBottom: '2rem', maxWidth: 480, margin: '0 auto 2rem' }}>
            Start with a suspicious message, or open an investigation workspace to begin building your case.
          </p>
          <div className="flex gap-4 justify-center" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-lg" onClick={() => onNavigate('scam-detector')}>
              <Zap size={18} /> Detect Scam Now
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => onNavigate('investigation')}>
              Open Workspace
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function CapabilityCard({ icon: Icon, title, description, color, badge, delay = 0 }) {
  return (
    <div className="card animate-fadeInUp" style={{
      animationDelay: `${delay}s`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 80, height: 80,
        background: `radial-gradient(circle at center, ${color}12, transparent 70%)`,
        borderRadius: '50%', transform: 'translate(20px, -20px)',
      }} />
      <div style={{
        width: 44, height: 44,
        borderRadius: 10,
        background: `${color}18`,
        border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '1rem',
      }}>
        <Icon size={20} color={color} />
      </div>
      <div className="badge badge-neutral" style={{ marginBottom: '0.75rem', fontSize: '0.6875rem' }}>{badge}</div>
      <h3 className="heading-sm" style={{ marginBottom: '0.5rem' }}>{title}</h3>
      <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem', lineHeight: 1.65 }}>{description}</p>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div style={{
      background: 'var(--clr-bg-card)',
      border: '1px solid var(--clr-border)',
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-lg)',
    }}>
      {/* Window chrome */}
      <div style={{
        background: 'var(--clr-bg-surface)',
        borderBottom: '1px solid var(--clr-border)',
        padding: '0.75rem 1rem',
        display: 'flex', alignItems: 'center', gap: '0.5rem',
      }}>
        {['#fc8181','#f6c57e','#68d391'].map(c => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />
        ))}
        <div style={{
          flex: 1, height: 24, background: 'var(--clr-bg-elevated)',
          borderRadius: 4, marginLeft: '0.5rem', maxWidth: 240,
          display: 'flex', alignItems: 'center', padding: '0 0.75rem',
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-dim)', fontFamily: 'var(--font-mono)' }}>
            traceshield.ai/investigation
          </span>
        </div>
      </div>

      {/* Dashboard content */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: 320 }}>
        {/* Sidebar */}
        <div style={{ borderRight: '1px solid var(--clr-border)', padding: '1rem' }}>
          {['Case Overview','Entities','Connections','Web Intel','AI Analysis'].map((item, i) => (
            <div key={item} style={{
              padding: '0.5rem 0.75rem', borderRadius: 6, marginBottom: '0.25rem',
              background: i === 0 ? 'var(--clr-accent-muted)' : 'transparent',
              border: i === 0 ? '1px solid var(--clr-accent-border)' : '1px solid transparent',
              color: i === 0 ? 'var(--clr-maroon-200)' : 'var(--clr-text-dim)',
              fontSize: '0.8125rem',
            }}>{item}</div>
          ))}
        </div>

        {/* Main area */}
        <div style={{ padding: '1.25rem' }}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: 2 }}>Case #INV-2024-001</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>Fake Job Recruitment Scam</div>
            </div>
            <div className="badge badge-danger">High Risk</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {[
              { label: 'Entities', value: '7' },
              { label: 'Connections', value: '4' },
              { label: 'Sources', value: '12' },
              { label: 'Risk Score', value: '84' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'var(--clr-bg-elevated)', borderRadius: 8,
                border: '1px solid var(--clr-border)', padding: '0.75rem',
              }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--clr-maroon-200)' }}>{stat.value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
          <div style={{
            background: 'var(--clr-bg-elevated)', borderRadius: 8,
            border: '1px solid var(--clr-border)', padding: '1rem', height: 90,
            display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 6, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: 10, marginBottom: '0.5rem', width: '70%' }} />
              <div className="skeleton" style={{ height: 8, width: '45%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
