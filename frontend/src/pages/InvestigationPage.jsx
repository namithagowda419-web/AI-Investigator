import { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen, Plus, Search, Brain, Globe, Newspaper,
  ChevronRight, Network, Clock, AlertTriangle, User,
  RefreshCw, ExternalLink, Zap
} from 'lucide-react';
import { createCase, analyzeCase, listCases, getCase, extractEntities, webSearch, intelligenceSearch } from '../api/client.js';
import { LoadingState, ErrorState, EmptyState, SectionHeader, EntityChip, ApiUnavailableBanner } from '../components/UI.jsx';

// ── Investigation Page (main shell) ───────────────────────────────────────────
export default function InvestigationPage() {
  const [view, setView] = useState('list'); // list | create | case
  const [cases, setCases] = useState([]);
  const [activeCase, setActiveCase] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listCases();
      setCases(data.cases || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCases(); }, [loadCases]);

  const openCase = async (id) => {
    setLoading(true);
    try {
      const data = await getCase(id);
      setActiveCase(data.case);
      setView('case');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCaseCreated = (newCase) => {
    setCases(prev => [newCase, ...prev]);
    setActiveCase(newCase);
    setView('case');
  };

  return (
    <div className="page-content">
      <div className="container" style={{ maxWidth: 1100 }}>
        {/* Header */}
        <div className="flex justify-between items-start animate-fadeInUp" style={{ paddingTop: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <SectionHeader
            label="Investigation Workspace"
            title={view === 'list' ? 'Cases' : view === 'create' ? 'New Case' : activeCase?.name || 'Case Details'}
          />
          <div className="flex gap-2">
            {view !== 'list' && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setView('list'); setActiveCase(null); }}>
                <FolderOpen size={14} /> All Cases
              </button>
            )}
            {view === 'list' && (
              <button className="btn btn-primary btn-sm" onClick={() => setView('create')}>
                <Plus size={14} /> New Case
              </button>
            )}
          </div>
        </div>

        {error && <ErrorState error={error} onRetry={loadCases} />}

        {view === 'list' && (
          <CaseList cases={cases} loading={loading} onOpen={openCase} onCreate={() => setView('create')} />
        )}
        {view === 'create' && (
          <CreateCaseForm onCreated={handleCaseCreated} onCancel={() => setView('list')} />
        )}
        {view === 'case' && activeCase && (
          <CaseDashboard
            key={activeCase.id}
            caseData={activeCase}
            onRefresh={async () => {
              const data = await getCase(activeCase.id);
              setActiveCase(data.case);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Case List ─────────────────────────────────────────────────────────────────
function CaseList({ cases, loading, onOpen, onCreate }) {
  if (loading) return <LoadingState message="Loading cases..." />;
  if (cases.length === 0) return (
    <EmptyState
      icon={FolderOpen}
      title="No Cases Yet"
      description="Create your first investigation case to get started."
      action={<button className="btn btn-primary" onClick={onCreate}><Plus size={16} /> Create Case</button>}
    />
  );

  const riskColors = { Critical: '#fc8181', High: '#f6c57e', Medium: '#63b3ed', Low: '#68d391', Unknown: 'var(--clr-text-muted)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {cases.map((c, i) => (
        <div
          key={c.id}
          className="card animate-fadeInUp"
          style={{ animationDelay: `${i * 0.04}s`, cursor: 'pointer' }}
          onClick={() => onOpen(c.id)}
        >
          <div className="flex justify-between items-start">
            <div style={{ flex: 1 }}>
              <div className="flex items-center gap-3 mb-1">
                <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>{c.name}</h3>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 700, color: riskColors[c.risk_level] || 'var(--clr-text-muted)',
                  background: `${riskColors[c.risk_level]}18`, padding: '0.2rem 0.625rem',
                  borderRadius: 100, border: `1px solid ${riskColors[c.risk_level]}30`,
                }}>{c.risk_level}</span>
              </div>
              {c.description && (
                <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}
                   className="truncate">{c.description}</p>
              )}
              <div className="flex gap-4" style={{ fontSize: '0.8125rem', color: 'var(--clr-text-muted)' }}>
                <span>{c.entity_count} entities</span>
                <span>{c.connection_count} connections</span>
                <span>{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--clr-text-dim)', flexShrink: 0, marginLeft: '1rem' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Create Case Form ──────────────────────────────────────────────────────────
function CreateCaseForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({ name: '', description: '', entities: '', notes: '', evidence: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Case name is required.'); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await createCase(form);
      onCreated(data.case);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const field = (name, label, placeholder, isTextarea = false, hint = '') => (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--clr-text-secondary)' }}>
        {label}
      </label>
      {isTextarea ? (
        <textarea className="textarea" placeholder={placeholder} value={form[name]}
          onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))} style={{ minHeight: 100 }} />
      ) : (
        <input className="input" type="text" placeholder={placeholder} value={form[name]}
          onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))} />
      )}
      {hint && <p style={{ fontSize: '0.8125rem', color: 'var(--clr-text-muted)', marginTop: '0.375rem' }}>{hint}</p>}
    </div>
  );

  return (
    <div className="card animate-fadeInUp" style={{ maxWidth: 680 }}>
      <form onSubmit={handleSubmit}>
        {field('name', 'Case Name *', 'e.g. Job Scam — Victim Report #42')}
        {field('description', 'Case Description', 'Brief overview of what happened...', true)}
        {field('entities', 'Suspected Entities', 'Names, phone numbers, emails, organizations, URLs... (one per line or comma-separated)', true,
          'Enter any known entities. The AI will extract and categorize them.')}
        {field('evidence', 'Evidence / Messages', 'Paste any messages, screenshots descriptions, or relevant content...', true)}
        {field('notes', 'Investigator Notes', 'Your observations, timeline, background information...', true)}

        {error && <div className="alert alert-danger mb-4"><AlertTriangle size={14} />{error}</div>}

        <div className="flex gap-3">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><div className="spinner spinner-sm" /> Creating...</> : <><Plus size={16} /> Create Case</>}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ── Case Dashboard ────────────────────────────────────────────────────────────
function CaseDashboard({ caseData, onRefresh }) {
  const [activeTab, setActiveTab] = useState(caseData?.analysis ? 'analysis' : 'overview');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [localCase, setLocalCase] = useState(caseData);

  useEffect(() => {
    setLocalCase(caseData);
    if (caseData?.analysis && (!localCase?.analysis || activeTab === 'overview')) {
      // Default to analysis tab when fresh analysis is available
      setActiveTab('analysis');
    }
  }, [caseData]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      await analyzeCase(localCase.id);
      await onRefresh();
      const data = await getCase(localCase.id);
      setLocalCase(data.case);
      setActiveTab('analysis');
    } catch (e) {
      setError(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const riskColor = { Critical: '#fc8181', High: '#f6c57e', Medium: '#63b3ed', Low: '#68d391', Unknown: 'var(--clr-text-muted)' }[localCase.risk_level] || 'var(--clr-text-muted)';

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'entities', label: `Entities (${localCase.entity_count || 0})` },
    { id: 'connections', label: `Connections (${localCase.connection_count || 0})` },
    { id: 'intel', label: 'Web Intel' },
    { id: 'analysis', label: 'AI Analysis' },
    { id: 'timeline', label: 'Timeline' },
  ];

  return (
    <div className="animate-fadeInUp">
      {/* Stats row */}
      <div className="grid-4 mb-6">
        {[
          { label: 'Risk Level', value: localCase.risk_level, color: riskColor },
          { label: 'Entities', value: localCase.entity_count || 0, color: '#63b3ed' },
          { label: 'Connections', value: localCase.connection_count || 0, color: '#b794f4' },
          { label: 'Sources', value: localCase.source_count || 0, color: '#68d391' },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: stat.color, marginBottom: '0.25rem' }}>{stat.value}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--clr-text-muted)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* AI Analyze button if no analysis exists */}
      {!localCase.analysis && (
        <div className="card mb-4" style={{ borderColor: 'var(--clr-accent-border)', background: 'var(--clr-accent-muted)' }}>
          <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Run AI Investigation Analysis</h3>
              <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem' }}>Extract entities, identify relationships, and generate investigation leads.</p>
            </div>
            <button className="btn btn-primary" onClick={runAnalysis} disabled={analyzing}>
              {analyzing ? <><div className="spinner spinner-sm" /> Analyzing...</> : <><Brain size={16} /> Analyze Case</>}
            </button>
          </div>
          {error && <div className="alert alert-danger mt-3"><AlertTriangle size={14} />{error}</div>}
        </div>
      )}

      {localCase.analysis && (
        <div className="flex justify-end mb-3">
          <button className="btn btn-ghost btn-sm" onClick={runAnalysis} disabled={analyzing}>
            <RefreshCw size={14} /> {analyzing ? 'Re-analyzing...' : 'Re-analyze'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview'     && <OverviewTab c={localCase} onNavigateTab={setActiveTab} />}
      {activeTab === 'entities'     && <EntitiesTab c={localCase} onCaseUpdate={setLocalCase} />}
      {activeTab === 'connections'  && <ConnectionsTab c={localCase} />}
      {activeTab === 'intel'        && <WebIntelTab c={localCase} onCaseUpdate={setLocalCase} />}
      {activeTab === 'analysis'     && <AIAnalysisTab c={localCase} />}
      {activeTab === 'timeline'     && <TimelineTab c={localCase} />}
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ c, onNavigateTab }) {
  const analysis = c.analysis;
  const connections = c.connections || [];
  const topConnections = connections.slice(0, 4);

  return (
    <div className="grid-2">
      <div>
        {/* Investigation Summary & Insights if available */}
        {analysis && (
          <div className="card mb-4" style={{ borderColor: 'var(--clr-accent-border)', background: 'var(--clr-bg-surface)' }}>
            <div className="flex justify-between items-center mb-2">
              <p className="section-label" style={{ marginBottom: 0 }}>Investigation Insights & Findings</p>
              <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>AI Assessed</span>
            </div>
            <p style={{ color: 'var(--clr-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.65, marginBottom: '1rem' }}>
              {analysis.summary}
            </p>

            {analysis.suspicious_patterns?.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--clr-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Key Detected Patterns
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {analysis.suspicious_patterns.slice(0, 2).map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.875rem', color: 'var(--clr-text-secondary)' }}>
                      <AlertTriangle size={14} style={{ color: 'var(--clr-warning)', flexShrink: 0, marginTop: 3 }} />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.investigation_leads?.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--clr-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Priority Action Lead
                </p>
                <div className="card-elevated" style={{ padding: '0.625rem 0.875rem' }}>
                  <span className="badge badge-danger" style={{ fontSize: '0.7rem', marginBottom: '0.25rem', display: 'inline-block' }}>
                    {analysis.investigation_leads[0].priority.toUpperCase()}
                  </span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{analysis.investigation_leads[0].lead}</div>
                  {analysis.investigation_leads[0].action && (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--clr-text-muted)', marginTop: '0.25rem' }}>
                      {analysis.investigation_leads[0].action}
                    </div>
                  )}
                </div>
              </div>
            )}

            {onNavigateTab && (
              <button className="btn btn-primary btn-sm" onClick={() => onNavigateTab('analysis')} style={{ width: '100%', justifyContent: 'center' }}>
                <Brain size={14} /> Open Full Investigation Dossier ({analysis.investigation_leads?.length || 0} Leads, {connections.length} Connections)
              </button>
            )}
          </div>
        )}

        <div className="card mb-4">
          <p className="section-label mb-2">Case Information</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <InfoRow label="Case ID" value={c.id.slice(0, 8).toUpperCase()} mono />
            <InfoRow label="Status" value={c.status?.toUpperCase() || 'OPEN'} />
            <InfoRow label="Risk Level" value={c.risk_level} />
            <InfoRow label="Created" value={new Date(c.created_at).toLocaleString()} />
          </div>
        </div>

        {c.description && (
          <div className="card mb-4">
            <p className="section-label mb-2">Description</p>
            <p style={{ color: 'var(--clr-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.7 }}>{c.description}</p>
          </div>
        )}
      </div>

      <div>
        {/* Mapped Connections Preview */}
        {connections.length > 0 && (
          <div className="card mb-4">
            <div className="flex justify-between items-center mb-2">
              <p className="section-label" style={{ marginBottom: 0 }}>Mapped Connections ({connections.length})</p>
              {onNavigateTab && (
                <button className="btn btn-ghost btn-sm" onClick={() => onNavigateTab('connections')} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                  <Network size={12} /> View Topology
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '0.75rem' }}>
              {topConnections.map((conn, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  fontSize: '0.8125rem', padding: '0.4rem 0.6rem',
                  background: 'var(--clr-bg-elevated)', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--clr-border-subtle)', flexWrap: 'wrap'
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--clr-text-primary)', fontFamily: 'var(--font-mono)' }}>{conn.source}</span>
                  <span style={{ color: 'var(--clr-text-dim)', fontSize: '0.75rem' }}>→ {conn.type} →</span>
                  <span style={{ fontWeight: 600, color: 'var(--clr-text-primary)', fontFamily: 'var(--font-mono)' }}>{conn.target}</span>
                </div>
              ))}
            </div>
            {connections.length > 4 && onNavigateTab && (
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigateTab('connections')} style={{ width: '100%', justifyContent: 'center' }}>
                <Network size={14} /> Open Interactive Topology Graph ({connections.length} Links)
              </button>
            )}
          </div>
        )}

        {c.evidence && (
          <div className="card mb-4">
            <p className="section-label mb-2">Evidence / Attached Content</p>
            <pre style={{
              color: 'var(--clr-text-secondary)',
              fontSize: '0.875rem',
              lineHeight: 1.6,
              background: 'var(--clr-bg-elevated)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--clr-border)',
              whiteSpace: 'pre-wrap',
              fontFamily: 'var(--font-mono)',
            }}>{c.evidence}</pre>
          </div>
        )}

        {c.notes && (
          <div className="card mb-4">
            <p className="section-label mb-2">Investigator Notes</p>
            <p style={{ color: 'var(--clr-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.7 }}>{c.notes}</p>
          </div>
        )}

        {c.activity?.length > 0 && (
          <div className="card">
            <p className="section-label mb-3">Recent Activity</p>
            {c.activity.slice(-5).reverse().map((a, i) => (
              <div key={i} style={{
                display: 'flex', gap: '0.75rem', paddingBottom: '0.75rem',
                borderBottom: i < 4 ? '1px solid var(--clr-border-subtle)' : 'none',
                marginBottom: i < 4 ? '0.75rem' : 0,
              }}>
                <Clock size={14} style={{ color: 'var(--clr-text-dim)', flexShrink: 0, marginTop: 3 }} />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{a.action}</div>
                  {a.detail && <div style={{ fontSize: '0.8125rem', color: 'var(--clr-text-muted)' }}>{a.detail}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Entities Tab ──────────────────────────────────────────────────────────────
function EntitiesTab({ c, onCaseUpdate }) {
  const [extractText, setExtractText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const entities = Array.isArray(c.entities) ? c.entities : [];

  const handleExtract = async () => {
    if (!extractText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await extractEntities(extractText);
      const newEntities = [...entities, ...data.entities];
      onCaseUpdate(prev => ({ ...prev, entities: newEntities, entity_count: newEntities.length }));
      setExtractText('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Extract tool */}
      <div className="card mb-4">
        <p className="section-label mb-2">Extract Entities from Text</p>
        <textarea
          className="textarea"
          placeholder="Paste any text to extract entities (names, phones, emails, locations, URLs)..."
          value={extractText}
          onChange={e => setExtractText(e.target.value)}
          style={{ minHeight: 80, marginBottom: '0.75rem' }}
        />
        {error && <div className="alert alert-danger mb-3"><AlertTriangle size={14} />{error}</div>}
        <button className="btn btn-primary btn-sm" onClick={handleExtract} disabled={loading || !extractText.trim()}>
          {loading ? <><div className="spinner spinner-sm" />Extracting...</> : <><Zap size={14} />Extract Entities</>}
        </button>
      </div>

      {entities.length === 0 ? (
        <EmptyState icon={User} title="No Entities Yet" description="Run AI analysis or extract entities manually above." />
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
          {entities.map((e, i) => (
            <EntityChip key={i} type={e.type || 'Other'} value={e.value || JSON.stringify(e)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Connections Tab ───────────────────────────────────────────────────────────
function ConnectionsTab({ c }) {
  const [viewMode, setViewMode] = useState('graph'); // 'graph' | 'list'
  const connections = c.connections || [];
  const analysis = c.analysis;
  const relationships = analysis?.relationships || [];

  if (connections.length === 0 && relationships.length === 0) {
    return <EmptyState icon={Network} title="No Connections Mapped" description="Run AI Analysis to identify potential relationships between entities." />;
  }

  const items = relationships.length > 0 ? relationships : connections;

  // Build unique nodes and links for SVG visual graph
  const nodeMap = new Map();
  items.forEach(item => {
    const src = item.entity_a || item.source || 'Entity A';
    const tgt = item.entity_b || item.target || 'Entity B';
    if (!nodeMap.has(src)) nodeMap.set(src, { id: src });
    if (!nodeMap.has(tgt)) nodeMap.set(tgt, { id: tgt });
  });

  const nodes = Array.from(nodeMap.values());
  const width = 640;
  const height = 320;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.38;

  nodes.forEach((node, idx) => {
    const angle = (idx / (nodes.length || 1)) * 2 * Math.PI - Math.PI / 2;
    node.x = cx + radius * Math.cos(angle);
    node.y = cy + radius * Math.sin(angle);
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <div className="alert alert-info" style={{ flex: 1, marginRight: '1rem', marginBottom: 0, padding: '0.5rem 0.75rem', fontSize: '0.8125rem' }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Connections are potential investigative leads only. Require independent verification.</span>
        </div>
        <div className="flex gap-1">
          <button
            className={`btn btn-sm ${viewMode === 'graph' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('graph')}
          >
            <Network size={14} /> Graph
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('list')}
          >
            List ({items.length})
          </button>
        </div>
      </div>

      {viewMode === 'graph' && (
        <div className="card mb-4" style={{ padding: '1rem', background: 'var(--clr-bg-surface)', overflow: 'hidden' }}>
          <div style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '0.8125rem', color: 'var(--clr-text-muted)' }}>
            Entity Relationship Topology · {nodes.length} Nodes · {items.length} Links
          </div>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', maxHeight: 360 }}>
            <defs>
              <linearGradient id="linkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--clr-accent)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#63b3ed" stopOpacity="0.6" />
              </linearGradient>
            </defs>

            {/* Links */}
            {items.map((rel, idx) => {
              const srcId = rel.entity_a || rel.source;
              const tgtId = rel.entity_b || rel.target;
              const sNode = nodeMap.get(srcId);
              const tNode = nodeMap.get(tgtId);
              if (!sNode || !tNode) return null;
              return (
                <g key={`link-${idx}`}>
                  <line
                    x1={sNode.x} y1={sNode.y}
                    x2={tNode.x} y2={tNode.y}
                    stroke="url(#linkGrad)"
                    strokeWidth="2"
                    strokeDasharray={rel.confidence === 'low' ? '4 4' : 'none'}
                  />
                  <text
                    x={(sNode.x + tNode.x) / 2}
                    y={(sNode.y + tNode.y) / 2 - 4}
                    fill="var(--clr-text-muted)"
                    fontSize="10"
                    textAnchor="middle"
                    style={{ background: 'var(--clr-bg-elevated)' }}
                  >
                    {rel.relationship || rel.type}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((node, idx) => {
              const isEvidence = node.id.toLowerCase().includes('evidence') || node.id.toLowerCase().includes('record') || node.id.toLowerCase().includes('exhibit');
              const nodeColor = isEvidence ? '#f6ad55' : 'var(--clr-accent)';
              return (
                <g key={`node-${idx}`}>
                  <circle
                    cx={node.x} cy={node.y}
                    r="18"
                    fill="var(--clr-bg-card)"
                    stroke={nodeColor}
                    strokeWidth="2.5"
                  />
                  <circle
                    cx={node.x} cy={node.y}
                    r="6"
                    fill={nodeColor}
                  />
                  <title>{node.id} ({isEvidence ? 'Case Evidence' : 'Investigative Entity'})</title>
                  <text
                    x={node.x}
                    y={node.y + (node.y > cy ? 30 : -24)}
                    fill="var(--clr-text-primary)"
                    fontSize="11"
                    fontWeight="600"
                    textAnchor="middle"
                    fontFamily="var(--font-mono)"
                  >
                    {node.id.length > 22 ? node.id.slice(0, 20) + '...' : node.id}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="flex justify-center gap-4 mt-2" style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--clr-accent)', display: 'inline-block' }} />
              Entity Node
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f6ad55', display: 'inline-block' }} />
              Evidence Node
            </span>
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {items.map((rel, i) => (
            <div key={i} className="card-elevated" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{
                background: 'var(--clr-accent-muted)', border: '1px solid var(--clr-accent-border)',
                borderRadius: 6, padding: '0.375rem 0.75rem', fontSize: '0.875rem', fontWeight: 600,
                fontFamily: 'var(--font-mono)',
              }}>{rel.entity_a || rel.source}</div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  display: 'inline-block',
                  background: 'var(--clr-bg-elevated)', border: '1px solid var(--clr-border)',
                  borderRadius: 100, padding: '0.25rem 0.875rem',
                  fontSize: '0.75rem', color: 'var(--clr-text-muted)', fontStyle: 'italic',
                }}>{rel.relationship || rel.type}</div>
              </div>
              <div style={{
                background: 'var(--clr-accent-muted)', border: '1px solid var(--clr-accent-border)',
                borderRadius: 6, padding: '0.375rem 0.75rem', fontSize: '0.875rem', fontWeight: 600,
                fontFamily: 'var(--font-mono)',
              }}>{rel.entity_b || rel.target}</div>
              <span className={`badge badge-${rel.confidence === 'high' ? 'warning' : rel.confidence === 'medium' ? 'info' : 'neutral'}`}>
                {rel.confidence || 'medium'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Web Intel Tab ─────────────────────────────────────────────────────────────
function WebIntelTab({ c }) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('web');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (customQ) => {
    const q = customQ || query;
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = searchType === 'web'
        ? await webSearch(q)
        : await intelligenceSearch(q);
      setResults({ type: searchType, query: q, data });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChipClick = (val) => {
    setQuery(val);
    handleSearch(val);
  };

  return (
    <div>
      <div className="card mb-4">
        <p className="section-label mb-2">Public Intelligence Search</p>
        <div className="flex gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
          {[['web', Globe, 'Web Search (Tavily)'], ['news', Newspaper, 'News Intel (NewsAPI)']].map(([id, Icon, label]) => (
            <button key={id} className={`btn btn-sm ${searchType === id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSearchType(id)}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>

        {/* Quick Search Chips from Case */}
        {c && (
          <div style={{ marginBottom: '0.875rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', display: 'block', marginBottom: '0.375rem' }}>
              Quick Search Case Entities:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.2rem 0.625rem', fontSize: '0.75rem' }}
                onClick={() => handleChipClick(c.name)}
              >
                {c.name}
              </button>
              {Array.isArray(c.entities) && c.entities.slice(0, 6).map((ent, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0.2rem 0.625rem', fontSize: '0.75rem' }}
                  onClick={() => handleChipClick(ent.value)}
                >
                  <span style={{ opacity: 0.6, marginRight: 4 }}>{ent.type}:</span>
                  {ent.value}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <input className="input" placeholder="Search name, organization, domain, keywords..." value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          <button className="btn btn-primary" onClick={() => handleSearch()} disabled={loading || !query.trim()}>
            {loading ? <div className="spinner spinner-sm" /> : <Search size={16} />}
          </button>
        </div>
      </div>

      {loading && <LoadingState message={`Searching ${searchType === 'web' ? 'web' : 'news'} for "${query}"...`} />}
      {error && <ErrorState error={error} />}

      {results && !loading && (
        <div className="animate-fadeIn">
          <div className="alert alert-info mb-4" style={{ fontSize: '0.8125rem' }}>
            <Globe size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            Public-source intelligence only. Information should be independently verified before drawing any conclusions.
          </div>

          {results.type === 'web' && results.data.results?.map((r, i) => (
            <div key={i} className="card mb-3">
              <div className="flex justify-between items-start mb-1">
                <a href={r.url} target="_blank" rel="noopener noreferrer"
                   style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--clr-maroon-200)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  {r.title} <ExternalLink size={12} />
                </a>
                <span className="badge badge-neutral">{r.relevance_score}%</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--clr-text-muted)', marginBottom: '0.5rem' }}>{r.source}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--clr-text-secondary)', lineHeight: 1.6 }}>{r.summary}</p>
            </div>
          ))}

          {results.type === 'news' && results.data.articles?.map((a, i) => (
            <div key={i} className="card mb-3">
              <div className="flex justify-between items-start mb-1">
                <a href={a.url} target="_blank" rel="noopener noreferrer"
                   style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--clr-maroon-200)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  {a.title} <ExternalLink size={12} />
                </a>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--clr-text-muted)', marginBottom: '0.5rem' }}>
                {a.source} · {a.published_at ? new Date(a.published_at).toLocaleDateString() : ''}
              </p>
              {a.description && (
                <p style={{ fontSize: '0.875rem', color: 'var(--clr-text-secondary)', lineHeight: 1.6 }}>{a.description}</p>
              )}
            </div>
          ))}

          {!results.data.available && (
            <ApiUnavailableBanner
              service={results.type === 'web' ? 'Tavily Search' : 'NewsAPI'}
              message={results.data.error}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── AI Analysis Tab ───────────────────────────────────────────────────────────
function AIAnalysisTab({ c }) {
  const analysis = c.analysis;
  if (!analysis) {
    return <EmptyState icon={Brain} title="No AI Analysis Yet" description="Click 'Analyze Case' to run AI investigation analysis." />;
  }

  const riskLevel = analysis.risk_level || c.risk_level || 'Unknown';
  const riskColors = {
    Critical: { text: '#fc8181', bg: 'rgba(252,129,129,0.12)', border: 'rgba(252,129,129,0.3)' },
    High:     { text: '#f6c57e', bg: 'rgba(246,197,126,0.12)', border: 'rgba(246,197,126,0.3)' },
    Medium:   { text: '#63b3ed', bg: 'rgba(99,179,237,0.12)',  border: 'rgba(99,179,237,0.3)' },
    Low:      { text: '#68d391', bg: 'rgba(104,211,145,0.12)', border: 'rgba(104,211,145,0.3)' },
    Unknown:  { text: 'var(--clr-text-muted)', bg: 'rgba(255,255,255,0.05)', border: 'var(--clr-border)' }
  }[riskLevel] || { text: 'var(--clr-text-muted)', bg: 'rgba(255,255,255,0.05)', border: 'var(--clr-border)' };

  const entities = Array.isArray(c.entities) && c.entities.length > 0
    ? c.entities
    : (Array.isArray(analysis.key_entities) ? analysis.key_entities : (Array.isArray(analysis.entities) ? analysis.entities : []));

  const connections = Array.isArray(c.connections) && c.connections.length > 0
    ? c.connections
    : (Array.isArray(analysis.relationships) ? analysis.relationships : []);

  const keyFindings = analysis.key_findings || [];
  const relationshipChains = analysis.relationship_chains || [];
  const timelineEvents = analysis.timeline || analysis.timeline_clues || [];
  const evidenceGaps = analysis.evidence_gaps || analysis.missing_information || [];

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. KEY FINDINGS */}
      {keyFindings.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--clr-accent-border)', background: 'var(--clr-bg-surface)' }}>
          <div className="flex justify-between items-center mb-3" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <p className="section-label" style={{ marginBottom: 2 }}>Evidence-Driven Investigation</p>
              <h3 style={{ fontWeight: 700, fontSize: '1.125rem' }}>Key Findings</h3>
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.35rem 0.85rem', borderRadius: 100,
              background: riskColors.bg, color: riskColors.text, border: `1px solid ${riskColors.border}`,
              fontWeight: 700, fontSize: '0.8125rem', letterSpacing: '0.04em'
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: riskColors.text }} />
              RISK LEVEL: {riskLevel.toUpperCase()}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem' }}>
            {keyFindings.map((item, idx) => (
              <div key={idx} className="card-elevated" style={{ padding: '0.75rem 1rem', borderLeft: '3px solid var(--clr-accent)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--clr-text-primary)', margin: '0.25rem 0', fontFamily: 'var(--font-mono)' }}>
                  {item.value}
                </div>
                {item.status && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--clr-text-secondary)', lineHeight: 1.4 }}>
                    {item.status}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. RELATIONSHIPS */}
      {relationshipChains.length > 0 && (
        <div className="card">
          <p className="section-label" style={{ marginBottom: 2 }}>Link Analysis & Flow</p>
          <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.875rem' }}>Relationships</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {relationshipChains.map((chain, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.625rem 0.875rem', background: 'var(--clr-bg-elevated)',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--clr-border-subtle)',
                fontSize: '0.9375rem', fontWeight: 500, color: 'var(--clr-text-primary)'
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', background: 'var(--clr-accent-muted)',
                  color: 'var(--clr-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, flexShrink: 0
                }}>
                  {idx + 1}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{chain}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. TIMELINE */}
      {timelineEvents.length > 0 && (
        <div className="card">
          <p className="section-label" style={{ marginBottom: 2 }}>Chronological Reconstruction</p>
          <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.875rem' }}>Timeline</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {timelineEvents.map((event, idx) => (
              <div key={idx} style={{
                display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                padding: '0.625rem 0.75rem', background: 'var(--clr-bg-elevated)',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--clr-border-subtle)'
              }}>
                <Clock size={16} style={{ color: 'var(--clr-accent)', flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: '0.9375rem', color: 'var(--clr-text-secondary)', lineHeight: 1.5 }}>
                  {event}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. INVESTIGATIVE LEADS */}
      {analysis.investigation_leads?.length > 0 && (
        <div className="card">
          <p className="section-label" style={{ marginBottom: 2 }}>Actionable Priorities</p>
          <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.875rem' }}>
            Investigative Leads ({analysis.investigation_leads.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {analysis.investigation_leads.map((lead, idx) => (
              <div key={idx} className="card-elevated" style={{ padding: '0.875rem 1rem' }}>
                <div className="flex items-start gap-3">
                  <span className={`badge badge-${lead.priority === 'high' ? 'danger' : lead.priority === 'medium' ? 'warning' : 'neutral'}`} style={{ marginTop: 2 }}>
                    {(lead.priority || 'medium').toUpperCase()}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.25rem', color: 'var(--clr-text-primary)' }}>
                      {lead.lead}
                    </p>
                    {lead.action && (
                      <p style={{ fontSize: '0.875rem', color: 'var(--clr-text-muted)', lineHeight: 1.5 }}>
                        <strong style={{ color: 'var(--clr-text-secondary)' }}>Recommended Action:</strong> {lead.action}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. EVIDENCE GAPS */}
      {evidenceGaps.length > 0 && (
        <div className="card">
          <p className="section-label" style={{ marginBottom: 2 }}>Critical Information Shortfalls</p>
          <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.875rem' }}>Evidence Gaps</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {evidenceGaps.map((item, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.5rem 0.75rem', background: 'rgba(252,129,129,0.06)',
                borderRadius: 'var(--radius-sm)', border: '1px solid rgba(252,129,129,0.18)',
                fontSize: '0.875rem', color: 'var(--clr-text-secondary)'
              }}>
                <span style={{ color: '#fc8181', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1 }}>•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Extracted Indicators & Entities */}
      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="section-label" style={{ marginBottom: 2 }}>Case Elements</p>
            <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Extracted Entities ({entities.length})</h3>
          </div>
        </div>
        {entities.length === 0 ? (
          <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem' }}>No key entities recorded.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
            {entities.map((e, idx) => (
              <EntityChip key={idx} type={e.type || 'Other'} value={e.value || (typeof e === 'string' ? e : JSON.stringify(e))} />
            ))}
          </div>
        )}
      </div>

      {/* 7. Executive Summary */}
      <div className="card">
        <p className="section-label" style={{ marginBottom: 2 }}>Case Overview</p>
        <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.75rem' }}>Executive Summary</h3>
        <p style={{ color: 'var(--clr-text-secondary)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
          {analysis.summary}
        </p>
      </div>

      {/* 8. Suggested Verification Steps */}
      {analysis.verification_steps?.length > 0 && (
        <div className="card">
          <p className="section-label" style={{ marginBottom: 2 }}>Procedural Protocol</p>
          <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.875rem' }}>Suggested Verification Steps</h3>
          <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem', margin: 0 }}>
            {analysis.verification_steps.map((step, idx) => (
              <li key={idx} style={{ fontSize: '0.9375rem', color: 'var(--clr-text-secondary)', lineHeight: 1.6 }}>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Legal & Investigative Neutrality Notice */}
      <div className="alert alert-info" style={{ fontSize: '0.8125rem' }}>
        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          <strong>Investigative Neutrality Notice:</strong> All persons mentioned, including persons of interest, are investigative leads requiring verification. Reported observations do not imply legal culpability or criminal guilt. Independent verification by authorized personnel is strictly required.
        </span>
      </div>
    </div>
  );
}

// ── Timeline Tab ──────────────────────────────────────────────────────────────
function TimelineTab({ c }) {
  const clues = c.analysis?.timeline_clues || [];
  const activity = c.activity || [];

  return (
    <div>
      {clues.length > 0 && (
        <div className="card mb-4">
          <p className="section-label mb-3">AI-Identified Timeline Clues</p>
          {clues.map((clue, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.625rem 0', borderBottom: i < clues.length - 1 ? '1px solid var(--clr-border-subtle)' : 'none' }}>
              <Clock size={14} style={{ color: 'var(--clr-accent)', flexShrink: 0, marginTop: 3 }} />
              <span style={{ fontSize: '0.9375rem', color: 'var(--clr-text-secondary)' }}>{clue}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <p className="section-label mb-3">Case Activity Log</p>
        {activity.length === 0 ? (
          <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem' }}>No activity recorded yet.</p>
        ) : (
          [...activity].reverse().map((a, i) => (
            <div key={i} style={{
              display: 'flex', gap: '1rem', paddingBottom: '0.875rem',
              borderBottom: i < activity.length - 1 ? '1px solid var(--clr-border-subtle)' : 'none',
              marginBottom: i < activity.length - 1 ? '0.875rem' : 0,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: 'var(--clr-accent)',
                flexShrink: 0, marginTop: 6,
              }} />
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{a.action}</div>
                {a.detail && <div style={{ fontSize: '0.8125rem', color: 'var(--clr-text-muted)', marginBottom: '0.25rem' }}>{a.detail}</div>}
                <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-dim)', fontFamily: 'var(--font-mono)' }}>
                  {new Date(a.time).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────
function InfoRow({ label, value, mono = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
      <span style={{ fontSize: '0.875rem', color: 'var(--clr-text-muted)' }}>{label}</span>
      <span style={{ fontSize: '0.875rem', fontFamily: mono ? 'var(--font-mono)' : undefined, color: 'var(--clr-text-secondary)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}
