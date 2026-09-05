import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted Montserrat (700/900): bundled locally so display text renders in
// the real font immediately instead of flashing a fallback (FOUT).
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/900.css';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
