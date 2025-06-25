import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Only use StrictMode in development to avoid double API calls in production
const isProduction = import.meta.env.PROD;

createRoot(document.getElementById('root')!).render(
  isProduction ? (
    <App />
  ) : (
    <StrictMode>
      <App />
    </StrictMode>
  )
);
