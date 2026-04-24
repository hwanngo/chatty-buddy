import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './main.css';
await import('katex/dist/katex.min.css');

import { initPromise } from './i18n';
await initPromise;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
