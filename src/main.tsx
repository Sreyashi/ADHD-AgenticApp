import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { track } from '@vercel/analytics'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

window.addEventListener('error', (event) => {
  track('js_error', { message: event.message, source: event.filename ?? 'unknown' });
});

window.addEventListener('unhandledrejection', (event) => {
  track('js_error', { message: String(event.reason), source: 'unhandledrejection' });
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
