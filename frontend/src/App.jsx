import React, { useState } from 'react';
import { Navbar } from './components/UI.jsx';
import HomePage from './pages/HomePage.jsx';
import ScamDetectorPage from './pages/ScamDetectorPage.jsx';
import InvestigationPage from './pages/InvestigationPage.jsx';
import AboutPage from './pages/AboutPage.jsx';

export default function App() {
  const [activePage, setActivePage] = useState('home');

  const renderPage = () => {
    switch (activePage) {
      case 'home':          return <HomePage onNavigate={setActivePage} />;
      case 'scam-detector': return <ScamDetectorPage />;
      case 'investigation': return <InvestigationPage />;
      case 'about':         return <AboutPage />;
      default:              return <HomePage onNavigate={setActivePage} />;
    }
  };

  return (
    <div id="traceshield-app">
      <Navbar activePage={activePage} onNavigate={setActivePage} />
      <main>{renderPage()}</main>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--clr-border)',
      padding: '1.5rem 0',
      textAlign: 'center',
      color: 'var(--clr-text-dim)',
      fontSize: '0.8125rem',
    }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span>
            <strong style={{ color: 'var(--clr-text-muted)' }}>TraceShield</strong> · AI Investigation Platform
          </span>
          <span>
            All AI outputs are indicative only and require independent verification. Not legal advice.
          </span>
          <span>Powered by Qwen2.5 · FastAPI · React</span>
        </div>
      </div>
    </footer>
  );
}
