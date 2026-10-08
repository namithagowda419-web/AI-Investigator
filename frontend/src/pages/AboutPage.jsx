import { Shield, Brain, Globe, Network, Database, Zap, Lock, Eye, Newspaper } from 'lucide-react';
import { SectionHeader } from '../components/UI.jsx';

const STEPS = [
  {
    number: '01',
    title: 'Input Suspicious Content',
    description: 'Paste any suspicious message, job offer, bank alert, or case details into the platform.',
    icon: Eye,
  },
  {
    number: '02',
    title: 'AI Analysis',
    description: 'Qwen2.5 AI processes the content, identifying scam patterns, entities, and risk indicators.',
    icon: Brain,
  },
  {
    number: '03',
    title: 'Web Intelligence',
    description: 'Tavily Search and NewsAPI gather publicly available context around entities and keywords.',
    icon: Globe,
  },
  {
    number: '04',
    title: 'Entity Mapping',
    description: 'Extracted entities (persons, phones, orgs, URLs) are mapped into a relationship network.',
    icon: Network,
  },
  {
    number: '05',
    title: 'Investigation Leads',
    description: 'AI generates prioritized leads, verification steps, and missing information gaps.',
    icon: Zap,
  },
  {
    number: '06',
    title: 'Review & Report',
    description: 'Investigators review findings, add notes, and document the case with appropriate caveats.',
    icon: Database,
  },
];

const TECH_STACK = [
  { name: 'Frontend', items: ['React 19', 'Vite', 'Lucide Icons', 'Vanilla CSS'] },
  { name: 'Backend', items: ['Python 3.12', 'FastAPI', 'Pydantic v2', 'httpx'] },
  { name: 'AI / ML', items: ['Qwen2.5-1.5B-Instruct', 'HF Inference API', 'QLoRA (future)', 'Rule-based fallback'] },
  { name: 'External APIs', items: ['Tavily Search', 'NewsAPI.org'] },
];

const MODEL_DETAILS = [
  { label: 'Base Model', value: 'Qwen/Qwen2.5-1.5B-Instruct' },
  { label: 'Fine-tuning Method', value: 'QLoRA (4-bit + LoRA adapters)' },
  { label: 'Training Examples', value: '5,076' },
  { label: 'Validation Examples', value: '282' },
  { label: 'Chat Format', value: 'Qwen chat (system/user/assistant)' },
  { label: 'Current Mode', value: 'HF Inference API / Rule-based fallback' },
];

const ETHICAL = [
  'Never states that an AI finding proves guilt',
  'All leads marked as "potential" or "requires verification"',
  'Clear distinction between demo/fallback and real AI output',
  'External APIs clearly labeled as "public-source intelligence"',
  'Users warned that results must be independently verified',
  'No fabricated API responses or fake AI predictions',
];

export default function AboutPage() {
  return (
    <div className="page-content">
      <div className="container" style={{ maxWidth: 1000 }}>
        <div className="animate-fadeInUp" style={{ paddingTop: '2rem' }}>
          <SectionHeader
            label="About TraceShield"
            title="How It Works"
            description="A professional AI-powered investigation and scam detection platform built for clarity, accuracy, and responsible use."
          />
        </div>

        {/* ── Hero description ───────────────────────────────────────── */}
        <div className="card animate-fadeInUp mb-6" style={{ animationDelay: '0.05s', borderColor: 'var(--clr-accent-border)' }}>
          <div className="flex gap-4 items-start">
            <div style={{
              width: 48, height: 48, flexShrink: 0,
              background: 'linear-gradient(135deg, var(--clr-accent), var(--clr-maroon-700))',
              borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={24} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.75rem' }}>TraceShield Platform</h2>
              <p style={{ color: 'var(--clr-text-secondary)', lineHeight: 1.75, marginBottom: '0.75rem' }}>
                TraceShield combines a fine-tunable Qwen2.5 AI model with structured investigation workflows
                and external public-source intelligence APIs to create a comprehensive fraud and crime
                investigation assistant — suitable for cybercrime analysts, law enforcement support tools,
                fintech fraud teams, and research applications.
              </p>
              <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem', lineHeight: 1.7 }}>
                <strong style={{ color: 'var(--clr-maroon-200)' }}>Important:</strong> TraceShield is an investigative assistance tool.
                It does not constitute legal evidence. All outputs require independent verification by qualified professionals.
              </p>
            </div>
          </div>
        </div>

        {/* ── How it works steps ─────────────────────────────────────── */}
        <div style={{ marginBottom: '3rem' }}>
          <h3 className="heading-md mb-4">Investigation Workflow</h3>
          <div style={{ position: 'relative' }}>
            {STEPS.map((step, i) => (
              <div key={step.number} className="animate-fadeInUp" style={{
                animationDelay: `${i * 0.06}s`,
                display: 'flex', gap: '1.5rem', marginBottom: '1.25rem', alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 48, height: 48, flexShrink: 0,
                  background: 'var(--clr-bg-elevated)',
                  border: '1px solid var(--clr-accent-border)',
                  borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <step.icon size={20} style={{ color: 'var(--clr-accent)' }} />
                </div>
                <div className="card" style={{ flex: 1 }}>
                  <div className="flex items-center gap-3 mb-1">
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--clr-text-dim)' }}>{step.number}</span>
                    <h4 style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{step.title}</h4>
                  </div>
                  <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem', lineHeight: 1.65 }}>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── AI Model ──────────────────────────────────────────────── */}
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Brain size={20} style={{ color: 'var(--clr-accent)' }} />
            <h3 className="heading-sm">AI Model Architecture</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {MODEL_DETAILS.map(item => (
              <div key={item.label} style={{
                background: 'var(--clr-bg-elevated)', borderRadius: 8, border: '1px solid var(--clr-border)',
                padding: '0.75rem 1rem',
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', marginBottom: '0.25rem' }}>{item.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--clr-text-secondary)', fontWeight: 500 }}>{item.value}</div>
              </div>
            ))}
          </div>
          <div style={{
            background: 'var(--clr-bg-elevated)', border: '1px solid var(--clr-border)',
            borderRadius: 8, padding: '1rem',
            fontFamily: 'var(--font-mono)', fontSize: '0.8125rem',
            color: 'var(--clr-text-secondary)', lineHeight: 1.7,
          }}>
            <div style={{ color: 'var(--clr-text-muted)', marginBottom: '0.5rem' }}># QLoRA Fine-tuning Architecture</div>
            <div><span style={{ color: 'var(--clr-maroon-300)' }}>Base:</span> Qwen2.5-1.5B-Instruct (4-bit quantized via BitsAndBytes)</div>
            <div><span style={{ color: 'var(--clr-maroon-300)' }}>Adapters:</span> LoRA (rank=16, alpha=32, target: q_proj, v_proj)</div>
            <div><span style={{ color: 'var(--clr-maroon-300)' }}>Format:</span> {'{"system": "...", "user": "message", "assistant": "SCAM|LEGITIMATE"}'}</div>
            <div><span style={{ color: 'var(--clr-maroon-300)' }}>Dataset:</span> 5,076 train / 282 val examples</div>
          </div>
        </div>

        {/* ── External APIs ────────────────────────────────────────── */}
        <div className="grid-2 mb-6">
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <Globe size={18} style={{ color: 'var(--clr-accent)' }} />
              <h4 className="heading-sm">Tavily Search API</h4>
            </div>
            <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem', lineHeight: 1.65, marginBottom: '1rem' }}>
              AI-optimized web search providing up-to-date public information. Used for entity research, domain lookups, and contextual intelligence gathering.
            </p>
            <div style={{ fontSize: '0.8125rem', color: 'var(--clr-text-dim)' }}>
              Free tier: 1,000 searches/month · <a href="https://app.tavily.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--clr-maroon-300)' }}>app.tavily.com</a>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <Newspaper size={18} style={{ color: 'var(--clr-accent)' }} />
              <h4 className="heading-sm">NewsAPI.org</h4>
            </div>
            <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem', lineHeight: 1.65, marginBottom: '1rem' }}>
              Access to 150,000+ news sources. Searches news articles by entity, keyword, or organization to surface recent public reporting relevant to a case.
            </p>
            <div style={{ fontSize: '0.8125rem', color: 'var(--clr-text-dim)' }}>
              Free tier: 100 req/day · <a href="https://newsapi.org" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--clr-maroon-300)' }}>newsapi.org</a>
            </div>
          </div>
        </div>

        {/* ── Tech Stack ───────────────────────────────────────────── */}
        <div className="card mb-6">
          <h3 className="heading-sm mb-4">Technology Stack</h3>
          <div className="grid-4">
            {TECH_STACK.map(cat => (
              <div key={cat.name}>
                <p className="section-label mb-2">{cat.name}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {cat.items.map(item => (
                    <div key={item} style={{
                      fontSize: '0.875rem', color: 'var(--clr-text-secondary)',
                      background: 'var(--clr-bg-elevated)', border: '1px solid var(--clr-border)',
                      borderRadius: 6, padding: '0.35rem 0.75rem',
                      fontFamily: item.includes('.') || item.includes('v') ? 'var(--font-mono)' : undefined,
                    }}>{item}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Ethical principles ───────────────────────────────────── */}
        <div className="card" style={{ borderColor: 'rgba(56,161,105,0.25)' }}>
          <div className="flex items-center gap-3 mb-4">
            <Lock size={18} style={{ color: 'var(--clr-success)' }} />
            <h3 className="heading-sm">Responsible AI Principles</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {ETHICAL.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--clr-success)', flexShrink: 0, marginTop: 7 }} />
                <span style={{ fontSize: '0.9375rem', color: 'var(--clr-text-secondary)', lineHeight: 1.6 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
