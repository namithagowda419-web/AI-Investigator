import { useState } from 'react';
import { Shield, AlertTriangle, ChevronDown, ChevronUp, Copy, Check, RotateCcw } from 'lucide-react';
import { analyzeScam } from '../api/client.js';
import { RiskMeter, VerdictBadge, LoadingState, ErrorState, SectionHeader } from '../components/UI.jsx';

const EXAMPLE_SCAMS = [
  {
    label: 'Bank KYC Alert',
    text: `Dear Customer, Your SBI account is BLOCKED! Complete KYC immediately or account will be permanently suspended. Click here: http://sbi-kyc-verify.tk/update and enter your details to avoid legal action. Urgent response required within 24 hours. - SBI Bank Team`,
  },
  {
    label: 'Job Offer Scam',
    text: `Congratulations! You have been selected for a Work From Home opportunity. Earn ₹25,000 per week doing simple data entry tasks. No experience needed. Registration fee only ₹999. Send money to UPI: fraudster@ybl to activate your account. Call HR: +91 99999 00000`,
  },
  {
    label: 'Digital Arrest Threat',
    text: `This is CBI Officer Rajesh Kumar speaking. Your Aadhaar number has been linked to a money laundering case. An arrest warrant has been issued in your name. To avoid immediate arrest, transfer ₹50,000 to our secure account for investigation purposes. This is your final warning.`,
  },
  {
    label: 'Lottery Win',
    text: `CONGRATULATIONS! You have won ₹45,00,000 in the KBC Lucky Draw! Your number was selected among 10 million participants. To claim your prize, send processing fee of ₹2,500 to our agent. Contact: lucky.prize2024@gmail.com. Offer valid for 48 hours only!`,
  },
];

export default function ScamDetectorPage() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showExamples, setShowExamples] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const handleAnalyze = async () => {
    if (!message.trim()) {
      setError('Please paste a suspicious message to analyze.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await analyzeScam(message);
      setResult(data.analysis);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessage('');
    setResult(null);
    setError(null);
    setCharCount(0);
  };

  const handleExample = (ex) => {
    setMessage(ex.text);
    setCharCount(ex.text.length);
    setShowExamples(false);
    setResult(null);
    setError(null);
  };

  return (
    <div className="page-content">
      <div className="container" style={{ maxWidth: 900 }}>
        <div className="animate-fadeInUp" style={{ paddingTop: '2rem' }}>
          <SectionHeader
            label="AI Scam Detection"
            title="Analyze Suspicious Messages"
            description="Paste any SMS, WhatsApp message, email, job offer, or suspicious text. Our AI will evaluate it for scam indicators."
          />
        </div>

        {/* ── Input Section ──────────────────────────────────────────────── */}
        <div className="card animate-fadeInUp" style={{ animationDelay: '0.05s', marginBottom: '1.5rem' }}>
          <div className="flex justify-between items-center mb-3">
            <label style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Message to Analyze</label>
            <div className="flex gap-2 items-center">
              <span style={{ fontSize: '0.8125rem', color: 'var(--clr-text-muted)' }}>{charCount}/5000</span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowExamples(!showExamples)}
              >
                Examples {showExamples ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          {showExamples && (
            <div className="animate-fadeIn" style={{
              background: 'var(--clr-bg-elevated)', border: '1px solid var(--clr-border)',
              borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '1rem',
            }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--clr-text-muted)', marginBottom: '0.75rem' }}>
                Try a sample message:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {EXAMPLE_SCAMS.map(ex => (
                  <button key={ex.label} className="btn btn-secondary btn-sm" onClick={() => handleExample(ex)}>
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <textarea
            className="textarea"
            placeholder="Paste a suspicious SMS, WhatsApp message, email, job offer, or any text you want to check..."
            value={message}
            onChange={e => { setMessage(e.target.value); setCharCount(e.target.value.length); }}
            style={{ minHeight: 180, fontFamily: 'var(--font-sans)', marginBottom: '1rem' }}
            maxLength={5000}
          />

          <div className="flex gap-3 items-center justify-between" style={{ flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['SMS', 'WhatsApp', 'Email', 'Job Offer', 'Bank Alert', 'Social Media'].map(type => (
                <span key={type} className="badge badge-neutral">{type}</span>
              ))}
            </div>
            <div className="flex gap-2">
              {(result || error) && (
                <button className="btn btn-ghost btn-sm" onClick={handleReset}>
                  <RotateCcw size={14} /> Reset
                </button>
              )}
              <button
                className="btn btn-primary"
                onClick={handleAnalyze}
                disabled={loading || !message.trim()}
              >
                {loading ? <><div className="spinner spinner-sm" /> Analyzing...</> : <><Shield size={16} /> Analyze Message</>}
              </button>
            </div>
          </div>
        </div>

        {/* ── Results ──────────────────────────────────────────────────────── */}
        {loading && <LoadingState message="AI is evaluating the message for scam indicators..." large />}
        {error && !loading && <ErrorState error={error} onRetry={handleAnalyze} />}
        {result && !loading && <ScamResult result={result} message={message} />}
      </div>
    </div>
  );
}

function ScamResult({ result, message }) {
  const { verdict, risk_score, category, indicators = [], explanation, mode } = result;
  const isScam = verdict === 'SCAM';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const reportText = `[TraceShield Scam Analysis Report]\nVerdict: ${verdict}\nRisk Score: ${risk_score}/100\nCategory: ${category}\nIndicators: ${indicators.join(', ') || 'None'}\nExplanation: ${explanation}\nAnalyzed Message: "${message ? message.slice(0, 150) + '...' : ''}"`;
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="animate-fadeInUp">
      {/* Mode indicator */}
      {mode === 'rule-based' && (
        <div className="alert alert-warning mb-4">
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span><strong>Local Mode:</strong> Results generated by local rule-based intelligence engine. Set HF_API_TOKEN in backend/.env for Qwen model inference.</span>
        </div>
      )}

      {/* Verdict header */}
      <div className="card mb-4" style={{
        background: isScam
          ? 'linear-gradient(135deg, rgba(229,62,62,0.08), var(--clr-bg-card))'
          : 'linear-gradient(135deg, rgba(56,161,105,0.08), var(--clr-bg-card))',
        borderColor: isScam ? 'rgba(229,62,62,0.3)' : 'rgba(56,161,105,0.3)',
      }}>
        <div className="flex justify-between items-start" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <p className="section-label" style={{ marginBottom: 0 }}>Verdict</p>
              <button className="btn btn-ghost btn-sm" onClick={handleCopy} title="Copy full report to clipboard" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                {copied ? <><Check size={12} color="#68d391" /> Copied!</> : <><Copy size={12} /> Copy Report</>}
              </button>
            </div>
            <VerdictBadge verdict={verdict} />
            <p style={{ marginTop: '0.75rem', color: 'var(--clr-text-muted)', fontSize: '0.875rem' }}>
              Category: <span style={{ color: 'var(--clr-text-secondary)', fontWeight: 500 }}>{category}</span>
            </p>
          </div>
          <div style={{ minWidth: 200, flex: 1, maxWidth: 280 }}>
            <p className="section-label mb-2">Risk Score</p>
            <RiskMeter score={risk_score} size="lg" />
          </div>
        </div>
      </div>

      {/* Indicators */}
      {indicators.length > 0 && (
        <div className="card mb-4">
          <p className="section-label mb-3">Suspicious Indicators Detected</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
            {indicators.map(ind => (
              <div key={ind} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'rgba(229,62,62,0.1)', border: '1px solid rgba(229,62,62,0.25)',
                borderRadius: 100, padding: '0.35rem 0.875rem',
                fontSize: '0.8125rem', color: '#fc8181', fontWeight: 500,
              }}>
                <AlertTriangle size={12} />
                {ind}
              </div>
            ))}
          </div>
          {isScam && (
            <div className="alert alert-danger mt-4" style={{ fontSize: '0.8125rem' }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>This message shows multiple indicators of potential fraud. Do not share personal information, click links, or make any payments. Report to cybercrime.gov.in</span>
            </div>
          )}
        </div>
      )}

      {/* AI Explanation */}
      <div className="card mb-4">
        <p className="section-label mb-2">AI Explanation</p>
        <p style={{ color: 'var(--clr-text-secondary)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
          {explanation}
        </p>
        <div className="mt-4" style={{
          background: 'var(--clr-bg-elevated)', borderRadius: 6,
          border: '1px solid var(--clr-border-subtle)',
          padding: '0.625rem 0.875rem',
          fontSize: '0.8125rem', color: 'var(--clr-text-muted)',
        }}>
          ⚠️ This analysis is indicative only. Results may not be 100% accurate. Always exercise caution and verify through official channels before taking any action.
        </div>
      </div>

      {/* Scam advice */}
      {isScam && (
        <div className="card" style={{ borderColor: 'rgba(229,62,62,0.2)' }}>
          <p className="section-label mb-3">Recommended Actions</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {[
              ['Do NOT click any links', '#fc8181'],
              ['Do NOT share OTP or PIN', '#fc8181'],
              ['Do NOT make any payment', '#fc8181'],
              ['Report to cybercrime.gov.in', '#68d391'],
              ['Block the sender', '#68d391'],
              ['Alert your bank if needed', '#68d391'],
            ].map(([text, color]) => (
              <div key={text} style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                fontSize: '0.875rem', color: 'var(--clr-text-secondary)',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                {text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
