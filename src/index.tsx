import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { restoreLocalStorage, watchAppHide } from './services/dataVault';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

const render = () => {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
};

// A fresh install restores the public data vault natively (before this
// bundle runs). The WebView's localStorage lives outside that copy, so the
// few app-owned entries are restored from Preferences first.
restoreLocalStorage()
  .catch(() => { /* the vault is best effort */ })
  .finally(() => {
    watchAppHide();
    render();
  });
