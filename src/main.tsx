import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Montserrat (latin 700/900) is self-hosted under /public/fonts and declared
// with font-display: optional in index.css; index.html preloads both woff2
// files so headings render in the real font without a fallback flash (FOUT).
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
